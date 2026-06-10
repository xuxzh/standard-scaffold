type FetchMock = {
  mock: {
    calls: Array<Parameters<typeof fetch>>;
  };
};

export function getFetchRequest(fetchMock: FetchMock, call = 0) {
  const [input, init] = fetchMock.mock.calls[call];
  const requestUrl =
    typeof input === "string" && input.startsWith("/")
      ? new URL(input, window.location.origin)
      : input;

  return input instanceof Request
    ? input
    : new Request(requestUrl, init);
}
