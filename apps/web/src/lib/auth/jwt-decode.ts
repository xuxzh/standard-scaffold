/**
 * Decodes the payload segment of a JSON Web Token.
 *
 * The token is treated as an opaque bearer string by the rest of the
 * application — we only need to read claims that the auth backend embedded
 * (e.g. `CompanyCode` / `FactoryCode`) for forwarding back into request
 * bodies. Signature verification is intentionally NOT performed: the real
 * authentication happens server-side when the `Authorization` header is
 * validated, and the signing key is never exposed to the browser.
 */
export function decodeJwtPayload<T extends Record<string, unknown> = Record<string, unknown>>(
  token: string,
): T | null {
  if (typeof token !== "string" || token.length === 0) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const payloadSegment = parts[1];
  if (payloadSegment.length === 0) {
    return null;
  }

  try {
    // base64URL → base64: replace URL-safe characters, then add padding.
    const base64 =
      payloadSegment.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (payloadSegment.length % 4)) % 4);

    const json = atob(base64);
    const parsed: unknown = JSON.parse(json);

    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as T;
  } catch {
    return null;
  }
}