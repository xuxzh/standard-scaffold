import { Button } from "@repo/ui";

export function App() {
  return (
    <main className="app-shell">
      <section className="intro">
        <p className="eyebrow">Frontend Monorepo</p>
        <h1>Vite + React 19 + TypeScript</h1>
        <p>
          一个干净的 pnpm workspace 和 Turborepo 前端框架已经准备好。
        </p>
        <Button className="primary-action">开始构建</Button>
      </section>
    </main>
  );
}
