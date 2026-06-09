import reactConfig from "@repo/eslint-config/react";

// 在共享的 react config 之上,额外忽略由构建脚本生成的 src/generated/**,
// 避免 prebuild 重新生成文件时产生无意义的 lint 抖动。
// 用 spread 把 reactConfig(本身就是数组)拍平,避免 ESLint flat config 报
// "Unexpected array"。
export default [
  {
    ignores: ["src/generated/**"],
  },
  ...reactConfig,
];
