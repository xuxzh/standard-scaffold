import { create } from "zustand";

type AppStoreState = {
  activeScopeName: string | null;
  setActiveScopeName: (name: string | null) => void;
  resetAppStore: () => void;
};

const initialState = {
  activeScopeName: null,
} satisfies Pick<AppStoreState, "activeScopeName">;

export const useAppStore = create<AppStoreState>((set) => ({
  ...initialState,
  setActiveScopeName: (name) => set({ activeScopeName: name }),
  resetAppStore: () => set(initialState),
}));
