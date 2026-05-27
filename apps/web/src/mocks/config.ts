export function isApiMockingEnabled() {
  return import.meta.env.VITE_ENABLE_API_MOCKING === "true";
}
