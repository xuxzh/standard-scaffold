const userDisplayStorageKey = "userDisplay";

export type UserDisplay = {
  userCode: string;
  displayName: string;
};

export function getUserDisplay(): UserDisplay | null {
  const rawValue = localStorage.getItem(userDisplayStorageKey);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<UserDisplay>;

    if (typeof parsed.userCode !== "string" || typeof parsed.displayName !== "string") {
      return null;
    }

    return {
      userCode: parsed.userCode,
      displayName: parsed.displayName
    };
  } catch {
    return null;
  }
}

export function setUserDisplay(userDisplay: UserDisplay) {
  localStorage.setItem(userDisplayStorageKey, JSON.stringify(userDisplay));
}

export function clearUserDisplay() {
  localStorage.removeItem(userDisplayStorageKey);
}
