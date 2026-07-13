import { useCallback, useMemo } from "react";

/**
 * 将一组 Option（带 code/name 字段的字典）构造成 code→name 的 Map，
 * 供 React 组件在渲染期做 O(1) 名称查找。
 *
 * 调用方通过 `getCode` / `getName` 显式指定字段，避免对异构 Option 类型
 * （如 `MaterialUnitOption`、`TypeOption`）做耦合。
 *
 * 选项为空或未提供时返回空 Map，调用方可自行决定是否回退到原编码。
 */
export function buildCodeNameMap<T>(
  options: readonly T[] | undefined,
  getCode: (option: T) => string,
  getName: (option: T) => string,
): Map<string, string> {
  const map = new Map<string, string>();

  if (!options) {
    return map;
  }

  for (const option of options) {
    map.set(getCode(option), getName(option));
  }

  return map;
}

/**
 * 表格列渲染时使用的 hook：返回 `(code) => name` 解析函数。
 *
 * - 用 `useMemo` 缓存 Map，避免每次渲染重建。
 * - 用 `useCallback` 锁定函数引用，方便作为依赖传入 `useMemo`。
 * - 找不到对应名称时回退到原编码，保证单元格不会渲染空白。
 */
export function useOptionsNameResolver<T>(
  options: readonly T[] | undefined,
  getCode: (option: T) => string,
  getName: (option: T) => string,
): (code: string) => string {
  const map = useMemo(
    () => buildCodeNameMap(options, getCode, getName),
    [options, getCode, getName],
  );

  return useCallback((code: string) => map.get(code) ?? code, [map]);
}