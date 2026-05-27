# 登录与 Token 刷新功能 Spec

## 背景

当前 Web 应用已有后台壳层、路由、通用 HTTP client、`token-store` 雏形和表单基础组件，但还缺少登录页、受保护路由和 accessToken 过期后的自动刷新机制。

登录和刷新接口来自本地接口文档 `/Users/xuxz/Downloads/登录相关接口.md`。本次任务涉及应用入口、路由保护、通用 API 鉴权、登录表单和 i18n，按 L2 处理；其中鉴权边界需要谨慎设计，但不引入权限模型或后端契约扩展。

## 目标

- 新增独立 `/login` 页面，使用 focused form 布局，不进入 `AdminLayout`。
- 登录成功后持久保存登录态，并跳回登录前被拦截的页面；没有 `redirect` 时进入 `/dashboard`。
- 保护后台壳内路由：`/dashboard`、`/packaging/...`、`/examples/embedded` 等需要登录。
- 保持 `/login` 和 `/examples/standalone` 为公开路由。
- 任意非登录、非刷新接口返回 HTTP `401` 时，判定 accessToken 过期，自动刷新 token 并重放原请求一次。
- 刷新失败、缺少 refreshToken 或重放后仍失败时，清空登录态并跳转到 `/login?redirect=当前页面`。
- 用户可见文案同步支持 `zh-CN` 和 `en-US`。

## 非目标

- 不实现注册、忘记密码、验证码、第三方登录或多因素认证。
- 不实现角色、权限点、菜单授权或按钮级权限。
- 不主动根据 JWT `exp` 预刷新 token；本次仅以 HTTP `401` 作为 accessToken 过期判定条件。
- 不改造后端接口契约，不切换到 Cookie 鉴权。
- 不引入 `localForage` 或额外持久化依赖。

## 接口契约

### 登录

- 方法：`POST`
- 路径：`/account/login`
- 请求体字段严格使用本次确认的大小写和拼写：

```json
{
  "UserCode": "DemoAdmin",
  "Passsword": "Icpt1357!!"
}
```

说明：接口文档示例中密码字段写作 `Password`，但本次需求确认要求严格使用 `Passsword`。实现和测试以本 spec 为准。

### 刷新 Token

- 方法：`POST`
- 路径：`/account/refresh`
- 请求体：

```json
{
  "RefreshToken": "<stored refresh token>"
}
```

说明：接口文档中的刷新请求示例包含重复字段和完整 token 对象片段，本次按最小明确契约实现，只传已保存的 refresh token 字符串。

### 响应

登录和刷新响应模型一致，均为 `DataResult`：

```json
{
  "Record": 1,
  "Attach": {
    "TokenType": "Bearer",
    "AccessToken": "<access token>",
    "ExpiresIn": 604800,
    "RefreshToken": "<refresh token>"
  },
  "Message": "[Platform]数据更新成功!",
  "Success": true,
  "Code": null
}
```

前端消费侧 token 模型：

- `tokenType`
- `accessToken`
- `expiresIn`
- `refreshToken`

## 存储策略

登录态默认跨浏览器重启保持，使用 `localStorage` 保存 token 信息。

选择 `localStorage` 的原因：

- token 是小体积字符串，不需要 IndexedDB 级别存储能力。
- 现有 `token-store` 已使用 `localStorage`，改动边界小。
- HTTP transport 需要同步读取 accessToken 拼接 `Authorization`，`localStorage` 更直接。
- `localForage` 的异步接口会牵动 transport/client 设计，但对本需求收益有限。

安全边界：

- `localStorage` 和 `localForage` 都可被前端 JavaScript 读取，面对 XSS 的风险本质接近。
- 更强隔离需要后端提供 `HttpOnly Secure SameSite` Cookie 契约，本次不包含。

## 路由与跳转

- `/login` 为独立公开路由。
- `/examples/standalone` 保持公开，继续用于脱壳示例或公开预览。
- 后台壳内页面需要登录：
  - `/dashboard`
  - `/examples/embedded`
  - `/packaging/packaging-type`
  - 后续新增的 `AdminLayout` 内页面默认纳入保护。
- 未登录访问受保护路由时跳转到 `/login?redirect=<encoded current path and search>`。
- 登录成功后：
  - 如果存在合法 `redirect`，跳转回该路径。
  - 如果不存在 `redirect`，跳转到 `/dashboard`。
- 已登录访问 `/login` 时，跳转到 `redirect` 或 `/dashboard`。

`redirect` 仅允许站内路径，避免开放重定向风险。

## API 刷新与重放

推荐在 API client 层实现 401 刷新与请求重放，保持页面和 feature service 不感知刷新细节。

流程：

1. 普通请求携带 `Authorization: Bearer <accessToken>`。
2. 响应 HTTP 状态码为 `401`，且请求不是 `/account/login` 或 `/account/refresh`。
3. 如果存在 refreshToken，调用 `/account/refresh`。
4. 刷新成功后保存新的 token 信息。
5. 使用新 accessToken 重放原请求一次。
6. 如果刷新失败、没有 refreshToken，或重放后仍返回错误，清空登录态并触发登录跳转。

并发约束：

- 多个请求同时收到 `401` 时，应共享同一个 refresh promise，避免并发刷新覆盖 token。
- 等待中的请求在刷新成功后各自重放一次。
- 每个原请求最多因 `401` 自动重试一次，避免无限循环。

## 页面设计

登录页采用 Focused Form：

- 全屏独立页面，居中或轻微上移的单表单容器。
- 视觉风格克制、通用、适合后台脚手架，不使用营销型 hero。
- 页面保留品牌名 `Standard Scaffold` 和简短登录说明。
- 表单字段：
  - 用户编码：绑定请求字段 `UserCode`
  - 密码：绑定请求字段 `Passsword`
- 使用 `react-hook-form`、`zod`、`Field`、`FieldLabel`、`FieldError`、`Input` 和 `Button`。
- 提交中禁用按钮并展示 loading 状态。
- 登录失败展示接口错误或通用错误文案，不泄漏底层异常结构。
- 保留语言切换入口；主题切换可作为低优先级增强，如实现成本过高可不放入首版。

代码中不出现中文用户可见文案，文案走 i18n 资源。

## 受影响边界

- `apps/web/src/lib/auth/token-store.ts`：扩展 token 信息读写、清理和测试辅助。
- `apps/web/src/lib/api/*`：新增或扩展鉴权刷新、401 处理、请求重放能力。
- `apps/web/src/features/auth/*`：新增登录 contract、service 和必要测试。
- `apps/web/src/routes/login.tsx` 或 `apps/web/src/features/auth/login-page.tsx`：新增登录页面。
- `apps/web/src/root-app.tsx`：接入 `/login` 路由和受保护路由逻辑，保持 i18n 初始化和 provider 顺序不变。
- `apps/web/src/i18n/*`：新增 auth/login 文案资源并同步 `zh-CN`、`en-US`。
- `apps/web/src/app.test.tsx` 和相关单元测试：覆盖公开路由、受保护路由和登录跳转。

## 验收标准

- 未登录访问 `/dashboard` 会跳转到 `/login?redirect=/dashboard`。
- 未登录访问 `/packaging/packaging-type` 会跳转到带对应 redirect 的登录页。
- 未登录访问 `/examples/standalone` 不会跳转。
- 登录表单提交 `UserCode` 和 `Passsword`，字段大小写与拼写严格匹配 spec。
- 登录成功后保存 token，并回到登录前页面；没有 redirect 时进入 `/dashboard`。
- 已登录访问受保护路由可以正常渲染后台壳。
- 普通接口返回 HTTP `401` 时会调用 refresh。
- refresh 成功后保存新 token，并自动重放原请求一次。
- refresh 失败时清空 token，并跳回登录页。
- 用户可见文案在中文和英文语言下都可正常展示。

## 验证计划

- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web typecheck`
- `pnpm --filter @repo/web lint`
- 涉及主路由和登录闭环后，评估补充 `pnpm --filter @repo/web-e2e test:e2e`。

## 风险与未决事项

- 密码字段确认使用 `Passsword`，与接口文档示例 `Password` 不一致。若后端实际只接受 `Password`，登录会失败，需要后端或需求方再次确认。
- 当前接口文档没有失败响应示例，首版按现有 `DataResult` 和 `HttpClientError` 归一化处理。
- 当前没有权限模型，本次只做“是否登录”的路由保护。
- 如果后端未来改为 Cookie 鉴权，token-store 和 Authorization header 逻辑需要重新设计。
