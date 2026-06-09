/* global console, process */
/* eslint-disable no-console */
// 此脚本是 apps/web 的 prebuild 钩子:
//   - 取本机当前时间(可由 BUILD_TZ 指定时区),格式化为 YY.MM.DD.HHmm
//   - 写入 src/generated/version.ts 供前端 import
//   - 同时把 ISO 时间戳与时区一起导出,便于日志/排障
//
// 重要:此脚本不在 Node 当前进程时区下计算;统一用 Intl.DateTimeFormat
// 强制按 BUILD_TZ 输出,这样无论本机 TZ 是什么,产出一致。
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, "..");
const generatedDir = resolve(appDir, "src/generated");
const outputPath = resolve(generatedDir, "version.ts");

const buildTimeZone = process.env.BUILD_TZ || "Asia/Shanghai";
const now = new Date();

// "sv-SE" 始终使用 ISO 8601 24 小时制,稳定可靠。
const localFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: buildTimeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
// format 结果形如 "2026-06-09 09:47"
const localStr = localFmt.format(now);
const [datePart, timePart] = localStr.split(" ");
const [yyyy, mm, dd] = datePart.split("-");
const [hh, mi] = timePart.split(":");
const appVersion = `${yyyy.slice(-2)}.${mm}.${dd}.${hh}${mi}`;

// 算目标时区在 now 这一时刻的 UTC offset(分钟),拼成 +08:00 这种形式。
function tzOffsetMinutes(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") === 24 ? 0 : get("hour"),
    get("minute"),
    get("second"),
  );
  return Math.round((asUTC - date.getTime()) / 60000);
}
const offsetMin = tzOffsetMinutes(now, buildTimeZone);
const sign = offsetMin >= 0 ? "+" : "-";
const abs = Math.abs(offsetMin);
const offHH = String(Math.floor(abs / 60)).padStart(2, "0");
const offMM = String(abs % 60).padStart(2, "0");
const isoWithSeconds = localStr.replace(" ", "T") + ":00";
const appBuildTimeIso = `${isoWithSeconds}${sign}${offHH}:${offMM}`;

const banner = `// 此文件由 scripts/generate-version.mjs 自动生成,请勿手改
export const APP_VERSION = ${JSON.stringify(appVersion)};
export const APP_BUILD_TIME_ISO = ${JSON.stringify(appBuildTimeIso)};
export const APP_BUILD_TIMEZONE = ${JSON.stringify(buildTimeZone)};
`;

mkdirSync(generatedDir, { recursive: true });
writeFileSync(outputPath, banner, "utf8");

console.log(`[generate-version] wrote ${outputPath}`);
console.log(`[generate-version] APP_VERSION=${appVersion}`);
console.log(`[generate-version] APP_BUILD_TIME_ISO=${appBuildTimeIso}`);
console.log(`[generate-version] timezone=${buildTimeZone}`);
