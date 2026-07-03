# Qiankun Migration Result

## Branches And Worktrees

- Child app: branch `codex-qiankun-migration` at `/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration`.
- Parent app: branch `codex-qiankun-migration` at `/Users/xuxz/repos/ruihui/rh-standard-product-platform/.worktrees/codex-qiankun-migration`.

## Implemented Scope

- Parent MES added `qiankun` while keeping `wujie` for the existing non-scaffold subapps.
- Parent MES added `MicroHostContextService` to build neutral host context props from MES session and i18n state.
- Parent MES added `QiankunWrapperComponent` using `loadMicroApp`, `experimentalStyleIsolation`, and `microApp.update`.
- Parent MES migrated these 6 packaging routes to qiankun:
  `packaging-type`, `packaging-level`, `packaging-spec`, `packaging-kit`, `packaging-rule`, `material-packaging-relation`.
- Child `apps/web` added qiankun Vite support and exported `bootstrap`, `mount`, `update`, and `unmount`.
- Child host context, auth bridge, and style hook logic now use neutral micro-host naming and qiankun props.
- Child Vite qiankun plugin uses `sandbox: false` because plugin sandbox transformation fails against the Vite prebuilt TanStack router dependency in dev mode.

## Verification

- Child typecheck: PASS.
- Child targeted migration tests: PASS.
- Child production build: PASS.
- Parent qiankun context service test: PASS.
- Parent qiankun wrapper component test: PASS.
- Parent full `rh-mes-frontend` test suite: PASS, `30 passed / 30 total`.
- Parent compile with `--skipLibCheck`: PASS.
- Local qiankun integration: PASS for mount/resource loading/React root rendering after disabling the child plugin sandbox transform.

## Known Blockers And Risks

- Child full test suite still has 2 packaging test failures that are not from the qiankun migration:
  `packaging-kit-page.test.tsx` quantity input expectation and `packaging-type-page.test.tsx` export-all text expectation.
- Child lint currently fails because `@eslint/js` is missing from the workspace eslint config dependency chain.
- Parent exact TypeScript compile fails on `@types/readable-stream@4.0.24` TS1170; compile passes with `--skipLibCheck`.
- Local mock MES login writes `USER_SESSION.Token: null`, so embedded auth token propagation still needs verification in a real session.
- Page-level UI regression checks for dialogs/dropdowns/scrolling are blocked until a real token lets the embedded packaging page render beyond auth error.
- Qiankun prefetch was intentionally skipped for the POC to keep first-load behavior easier to debug.

## Rollback Path

- Fast parent rollback: revert the route migration commit so the 6 packaging routes use `WujieWrapperComponent` again.
- Urgent rollback can leave the new `qiankun` dependency temporarily; remove it later in a cleanup commit.
- Child rollback to wujie requires reverting the qiankun Vite adapter, lifecycle, host context, auth bridge, and style hook commits together.

## Next Acceptance Checks

- Run the parent and child worktrees against a real MES login/session with a non-null access token.
- Verify one migrated packaging page does not redirect to embedded auth error.
- Exercise create/edit/delete dialogs, dropdowns, table scrolling, and fullscreen dialog behavior.
- After the POC is accepted, decide whether to add qiankun prefetch and whether to remove obsolete wujie-only child code permanently.
