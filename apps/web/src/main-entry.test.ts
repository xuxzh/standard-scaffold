// @vitest-environment node

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');

describe('web stylesheet entry', () => {
  it('exposes Tailwind CSS to Wujie before the React module executes', () => {
    expect(indexHtml).toContain('<link rel="stylesheet" href="/src/styles.css" />');
    expect(mainSource).not.toContain('import "./styles.css";');
  });
});
