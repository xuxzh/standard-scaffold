const accessTokenStorageKey = "accessToken";

export function getAccessToken() {
  return localStorage.getItem(accessTokenStorageKey);
}

export function setAccessTokenForTests(token: string) {
  localStorage.setItem(accessTokenStorageKey, token);
}

export function clearAccessTokenForTests() {
  localStorage.removeItem(accessTokenStorageKey);
}
