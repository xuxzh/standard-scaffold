/* global console, process */
/* eslint-disable no-console */
// 此脚本是 apps/web 的 postbuild 钩子:
//   - 读取 src/generated/version.ts 的 APP_VERSION(同一字符串,前端展示也是它)
//   - 把 dist/ruihui-next/ 打成 dist/ruihui-next_<APP_VERSION>.zip
//
// 不在脚本里再 `new Date()` 算时间,保证 zip 文件名与页面显示永远一致。
import { createWriteStream, existsSync, statSync } from "node:fs";
import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, "..");
const versionFilePath = resolve(appDir, "src/generated/version.ts");
const distDir = resolve(appDir, "dist");
const ruihuiNextDir = resolve(distDir, "ruihui-next");

function fail(message) {
  console.error(`[package-dist] ${message}`);
  process.exit(1);
}

if (!existsSync(versionFilePath)) {
  fail(
    `找不到 ${versionFilePath};请先跑 prebuild 脚本(scripts/generate-version.mjs)。`,
  );
}

const versionSource = await readFile(versionFilePath, "utf8");
const versionMatch = versionSource.match(/APP_VERSION\s*=\s*"([^"]+)"/);
if (!versionMatch) {
  fail("无法从 version.ts 解析 APP_VERSION;格式是否被改坏?");
}
const appVersion = versionMatch[1];
if (!/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(appVersion)) {
  fail(`APP_VERSION 格式不合法: ${appVersion}`);
}

if (!existsSync(ruihuiNextDir)) {
  fail(
    `找不到 ${ruihuiNextDir};请确认 vite build 的 outDir 配置正确,并先跑过 build。`,
  );
}
const dirStat = await stat(ruihuiNextDir);
if (!dirStat.isDirectory()) {
  fail(`${ruihuiNextDir} 不是目录。`);
}

const zipPath = resolve(distDir, `ruihui-next_${appVersion}.zip`);
await mkdir(distDir, { recursive: true });

const output = createWriteStream(zipPath);
const archive = archiver("zip", { zlib: { level: 9 } });

const finished = new Promise((resolve, reject) => {
  output.on("close", resolve);
  archive.on("warning", (err) => {
    if (err.code === "ENOENT") {
      console.warn(`[package-dist] warning: ${err.message}`);
    } else {
      reject(err);
    }
  });
  archive.on("error", reject);
});

archive.pipe(output);
archive.directory(ruihuiNextDir, "ruihui-next");
await archive.finalize();
await finished;

const zipStat = statSync(zipPath);
const sizeKb = (zipStat.size / 1024).toFixed(1);
console.log(
  `[package-dist] created ${zipPath} (${sizeKb} KB)`,
);
