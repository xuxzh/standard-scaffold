import { useContext } from "react";
import { HostContext } from "./host-context";
import type { HostContextValue } from "./host-context-types";

/**
 * Read the latest host context inside a React component. Always returns a
 * defined value — in standalone mode this is the zero-valued default, in
 * wujie mode this is the most recent snapshot pushed by the host.
 *
 * The underlying store only changes identity when the host actually pushes
 * via `host:context-sync`, so this hook re-renders the component only on
 * real updates (login, language switch, etc.).
 */
export function useHostContext(): HostContextValue {
  return useContext(HostContext);
}
