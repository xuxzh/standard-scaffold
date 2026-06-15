import { createContext } from "react";
import type { HostContextValue } from "./host-context-types";

/**
 * Zero-valued host context. Used both as the default React context value
 * (so standalone consumers never see undefined) and as the SSR snapshot
 * for `useSyncExternalStore`.
 */
export const defaultHostContext: HostContextValue = {
  userInfo: null,
  menuInfo: [],
  functions: [],
  menuFunctions: [],
  roles: [],
  languageInfo: { currentLang: "zh-CN", defaultLang: "zh-CN" },
  languageDict: {},
  userSession: null
};

/**
 * React Context carrying the latest host snapshot. Kept in its own module
 * (separate from the provider component) so React Refresh treats the
 * provider file as a pure component module.
 */
export const HostContext = createContext<HostContextValue>(defaultHostContext);
