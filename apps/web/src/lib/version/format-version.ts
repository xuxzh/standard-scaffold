/**
 * 把一个本地时间 `Date` 格式化为构建期版本号 `YY.MM.DD.HHmm`。
 *
 * 例:`new Date(2026, 5, 9, 9, 47)` -> `"26.06.09.0947"`。
 *
 * 函数本身不读 `new Date()`,总是接受调用方注入的时间,
 * 便于在测试或 `generate-version.mjs` 中精确控制。
 *
 * 月份按 JS `Date` 习惯从 0 开始,需在调用方自行 +1 传入(`getMonth() + 1`)。
 */
export function formatBuildVersion(date: Date): string {
  const year = String(date.getFullYear()).slice(-2);
  const month = padTwo(date.getMonth() + 1);
  const day = padTwo(date.getDate());
  const hour = padTwo(date.getHours());
  const minute = padTwo(date.getMinutes());

  return `${year}.${month}.${day}.${hour}${minute}`;
}

function padTwo(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}
