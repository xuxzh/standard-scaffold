import "@testing-library/jest-dom/vitest";

type MatchMediaListener = (event: MediaQueryListEvent) => void;

let matchMediaMatches = false;
let navigatorLanguage = "zh-CN";
const matchMediaListeners = new Set<MatchMediaListener>();

export function setMatchMediaMatches(nextValue: boolean) {
  matchMediaMatches = nextValue;
  const event = { matches: nextValue } as MediaQueryListEvent;
  matchMediaListeners.forEach((listener) => listener(event));
}

export function setNavigatorLanguage(nextValue: string) {
  navigatorLanguage = nextValue;
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: matchMediaMatches,
    media: query,
    onchange: null,
    addEventListener: (_: string, listener: MatchMediaListener) => {
      matchMediaListeners.add(listener);
    },
    removeEventListener: (_: string, listener: MatchMediaListener) => {
      matchMediaListeners.delete(listener);
    },
    addListener: (listener: MatchMediaListener) => {
      matchMediaListeners.add(listener);
    },
    removeListener: (listener: MatchMediaListener) => {
      matchMediaListeners.delete(listener);
    },
    dispatchEvent: () => true
  })
});

Object.defineProperty(window.navigator, "language", {
  configurable: true,
  get: () => navigatorLanguage
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {}
});
