# 实施计划模板

> **面向 Agent 执行者：** 优先使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans` 按任务执行本计划。步骤使用复选框 `- [ ]` 语法跟踪。

如果当前会话没有这些技能，就直接把这个模板当作手工执行清单，并保持同样的逐任务验证纪律。

**目标：**

**实现方式：**

**技术栈：**

---

## 文件清单

- 新建：
- 修改：
- 测试：

### 任务 1：[名称]

**文件：**

- 新建：
- 修改：
- 测试：

- [ ] **步骤 1：编写或更新失败检查**

```text
在这里写出精确的测试、断言或结构化验证内容。
```

- [ ] **步骤 2：运行检查，确认当前状态**

从仓库根目录执行。

执行：

```bash
pnpm --filter @repo/web test
```

预期：

```text
在这里记录实现前该检查的实际结果。
```

- [ ] **步骤 3：实现最小改动**

```text
在这里写出需要新增或修改的精确代码或文档内容。
```

- [ ] **步骤 4：再次运行验证**

从仓库根目录执行。

执行：

```bash
pnpm --filter @repo/web test
```

预期：

```text
在这里记录改动后的通过结果。
```

- [ ] **步骤 5：提交**

```bash
git status --short
git add docs/ai/templates/feature-spec-template.md docs/ai/templates/implementation-plan-template.md
git commit -m "docs: update planning templates"
```

这里只是示例。实际执行前，请把暂存文件和提交信息替换成当前切片的真实内容。
