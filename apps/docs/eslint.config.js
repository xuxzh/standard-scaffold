import reactConfig from "@repo/eslint-config/react";

export default [
  {
    ignores: [".source", "dist", "node_modules"],
  },
  ...reactConfig,
];
