// @vitest-environment node

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('./main.tsx', import.meta.url), 'utf8');

describe('web stylesheet entry', () => {
  it('exposes Tailwind CSS to Wujie before the React module executes', () => {
    const activeIndexHtml = indexHtml.replace(/<!--[\s\S]*?-->/g, '');
    const stylesheetIndex = activeIndexHtml.search(
      /<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']\/src\/styles\.css\?direct["'])[^>]*>/i
    );
    const moduleScriptIndex = activeIndexHtml.search(
      /<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["']\/src\/main\.tsx["'])[^>]*>/i
    );

    expect(stylesheetIndex).toBeGreaterThanOrEqual(0);
    expect(moduleScriptIndex).toBeGreaterThan(stylesheetIndex);
    expect(mainSource).not.toMatch(/["']\.\/styles\.css(?:\?[^"']*)?["']/);
  });
});
