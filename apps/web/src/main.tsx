import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  disposeHostTokenBridge,
  initHostTokenBridge,
} from "@/lib/auth/host-token-bridge";
import { applyMicroHostProps, type MicroHostProps } from "@/lib/host-context";
import { App } from "./root-app";
import { isApiMockingEnabled } from "./mocks/config";
// When running inside the qiankun parent, the sub-app's `import "./styles.css"`
// is loaded as a child module. Vite still injects the stylesheet, but the
// resulting `<style data-vite-dev-id="...">` tag does NOT contain the
// custom-theme utility classes (`.text-primary`, `.bg-muted`,
// `.text-destructive`, etc.) — only Tailwind's default utilities. The custom
// utilities are only emitted when Vite processes styles.css as the entry CSS.
//
// To work around this, we also import the same file with `?inline`, which
// forces Vite to emit the fully compiled stylesheet (with the `@theme
// inline` mappings AND every custom utility class) as a string.
// `injectMicroHostStyles` appends that string to the real `document.head`
// once, at mount time, so the sub-app UI picks up the missing utility
// classes.
//
// The non-inline `import "./styles.css"` is kept for the standalone run,
// where Vite's standard CSS pipeline works correctly and HMR is convenient.
import "./styles.css";
import microHostStylesCss from "./styles.css?inline";

type QiankunWindow = Window & {
  __POWERED_BY_QIANKUN__?: boolean;
};

type QiankunMountProps = MicroHostProps & {
  container?: ParentNode;
};

let currentRoot: Root | null = null;
let currentRootElement: HTMLElement | null = null;
let currentInitialEntries: string[] | undefined;

async function enableApiMocking() {
  if (!isApiMockingEnabled()) {
    return;
  }

  const { worker } = await import("./mocks/browser");

  await worker.start({
    onUnhandledRequest: "bypass",
  });
}

function render(container: ParentNode = document, initialEntries?: string[]) {
  const rootEl = container.querySelector<HTMLElement>("#root");
  if (!rootEl) {
    return;
  }

  if (currentRoot && currentRootElement === rootEl) {
    return;
  }

  currentRoot?.unmount();
  currentInitialEntries = initialEntries;
  currentRoot = createRoot(rootEl);
  currentRootElement = rootEl;
  currentRoot.render(
    <StrictMode>
      <App initialEntries={currentInitialEntries} />
    </StrictMode>,
  );
}

function disposeRoot() {
  disposeHostTokenBridge();
  currentRoot?.unmount();
  currentRoot = null;
  currentRootElement = null;
  currentInitialEntries = undefined;
}

const MICRO_HOST_STYLE_ID = "scaffold-web-micro-host-styles";

/**
 * Inject the sub-app's compiled stylesheet into the host document.
 *
 * Why this is necessary:
 *   In dev mode, Vite injects CSS through the `updateStyle` helper, which
 *   appends a `<style data-vite-dev-id="...">` element to `document.head`.
 *   In the qiankun embed path the sub-app's `import "./styles.css"` is loaded
 *   as a child module, not as the Vite CSS entry, and the resulting inline
 *   style tag does NOT contain the custom-theme utility classes
 *   (`.text-primary`, `.bg-muted`, `.text-destructive`, etc.) — Tailwind v4
 *   only emits them when it scans styles.css as the Vite entry.
 *
 *   We also import the same file with `?inline`, which forces Vite to emit
 *   the fully compiled stylesheet (with `@theme inline` mappings AND every
 *   utility class) as a string. `injectMicroHostStyles` appends that string
 *   to the real `document.head` so the sub-app UI picks up the missing
 *   utility classes.
 */
function injectMicroHostStyles() {
  if (typeof document === "undefined") {
    return;
  }

  if (document.getElementById(MICRO_HOST_STYLE_ID)) {
    return;
  }

  // Vite's `?inline` mode returns the compiled stylesheet as a string.
  // We unwrap Tailwind's `@layer utilities { ... }` block so the utility
  // classes become un-layered rules. Without this rewrite, the utilities
  // sit inside the `utilities` cascade layer and lose to the parent app's
  // un-layered `body { color: ... }` rule (un-layered rules always win
  // against layered ones, regardless of selector specificity).
  //
  // We also wrap the unwrapped utilities in `[data-qiankun]` so the
  // override cannot leak into the parent app's own UI.
  const styleEl = document.createElement("style");
  styleEl.id = MICRO_HOST_STYLE_ID;
  styleEl.setAttribute("data-micro-host-style", "scaffold-web");
  styleEl.textContent = buildMicroHostCss(microHostStylesCss);
  document.head.appendChild(styleEl);
}

/**
 * Extract the contents of `@layer utilities { ... }` from the compiled
 * stylesheet and re-emit them un-layered, wrapped in a `[data-qiankun]`
 * scope. The `!important` annotations on color properties defeat the
 * parent app's element-selector overrides inside the sub-app container.
 *
 * Why this is necessary:
 *   1. Tailwind v4 wraps utility classes in `@layer utilities`. The CSS
 *      Cascade specification gives un-layered rules precedence over
 *      layered rules regardless of selector specificity, so the parent
 *      app's `body { color: rgba(0, 0, 0, 0.85) }` would win over our
 *      layered `.text-primary` no matter what we did.
 *   2. Once the layer is unwrapped, `.text-primary` (specificity 0,1,0)
 *      still has to beat `body` (0,0,1) on the cascade axis. Specificity
 *      already handles that — but a few ng-zorro rules in the parent
 *      stylesheet use `!important`, so we add `!important` defensively
 *      to the color-affecting properties we care about.
 *   3. The `[data-qiankun]` wrapper keeps the override scoped to the
 *      sub-app container (qiankun's `experimentalStyleIsolation: true`
 *      stamps that attribute on the mount container) so the parent
 *      app's own UI is never affected.
 */
function buildMicroHostCss(escapeLiteral: string): string {
  // Vite serves `?inline` as a JS module whose default export is a
  // string literal. At runtime the JS engine has already turned
  // `\n` into real newlines, so the value we receive here is the actual
  // multi-line CSS — no further unescaping is required.
  const css = escapeLiteral;

  // Re-declare every `--color-*` token on the real document root.
  //
  // Tailwind v4 only emits `--color-*` mappings for tokens that are
  // actually referenced by utility classes. The `?inline` payload
  // therefore contains only the four tokens used by the visible utility
  // classes (`--color-primary`, `--color-destructive`, `--color-background`,
  // `--color-foreground`), missing `--color-muted`, `--color-accent`,
  // `--color-input`, `--color-border`, etc. — all of which are still
  // referenced by hover / dark / sidebar utility classes. As a result,
  // sub-app elements that depend on those tokens fall back to the
  // inherited body color from the parent app.
  //
  // The authoritative token list lives in `@theme inline` in
  // `src/styles.css`; we mirror it here so the embedded sub-app is
  // self-contained. Keep this in sync with that block.
  const themeTokens = `
:root, :host {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-hover: var(--primary-hover);
  --color-primary-active: var(--primary-active);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-destructive-hover: var(--destructive-hover);
  --color-destructive-active: var(--destructive-active);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-warning-bg: var(--warning-bg);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-success-bg: var(--success-bg);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-info-bg: var(--info-bg);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
}
`;

  // Extract the `@layer utilities { ... }` block. These are the actual
  // `.text-primary`, `.bg-muted`, etc. utility classes. We unwrap the
  // layer so the rules become un-layered (otherwise the parent app's
  // un-layered `body { color }` rule would always win per the CSS
  // Cascade spec), then add `!important` to color-affecting properties
  // to defeat any `!important` element selectors the parent may inject.
  const utilitiesMatch = css.match(
    /@layer\s+utilities\s*\{([\s\S]*?)\n\}\s*$/,
  );

  if (!utilitiesMatch) {
    // The compiled output is unexpectedly short. Inject the raw payload
    // anyway; it is at worst inert.
    return `${themeTokens}${css}`;
  }

  const body = utilitiesMatch[1];
  const importanted = body.replace(
    /(\b(?:color|background-color|background|border|border-color|fill|stroke|caret-color|outline-color|accent-color|column-rule-color|text-decoration-color)\s*:\s*[^;}]+)(?=\s*[;}])/g,
    "$1 !important",
  );

  // Seed the sub-app container with an explicit `color` so descendants
  // that rely on inheritance (e.g. the "destructive" Button variant in
  // the edit sheet) actually pick up the custom foreground token.
  return [
    themeTokens,
    `[data-qiankun] {\n  color: var(--color-foreground, inherit) !important;\n}\n`,
    `[data-qiankun] {\n${importanted}\n}`,
  ].join("");
}

function removeMicroHostStyles() {
  if (typeof document === "undefined") {
    return;
  }

  const existing = document.getElementById(MICRO_HOST_STYLE_ID);
  if (existing) {
    existing.remove();
  }
}

function initialEntriesFromProps(props: MicroHostProps): string[] | undefined {
  return props.initialPath ? [props.initialPath] : undefined;
}

export async function bootstrap() {}

export async function mount(props: QiankunMountProps) {
  document.documentElement.setAttribute("data-micro-host", "");
  injectMicroHostStyles();
  applyMicroHostProps(props);
  initHostTokenBridge();
  render(props.container ?? document, initialEntriesFromProps(props));
}

export async function update(props: MicroHostProps) {
  applyMicroHostProps(props);
}

export async function unmount() {
  document.documentElement.removeAttribute("data-micro-host");
  removeMicroHostStyles();
  disposeRoot();
}

if (!(window as QiankunWindow).__POWERED_BY_QIANKUN__) {
  void enableApiMocking().then(() => render());
}
