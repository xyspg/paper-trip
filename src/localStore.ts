// Guarded localStorage access. Reads/writes degrade to no-ops when storage is
// unavailable (private mode) or full (quota), so callers don't repeat try/catch.

export const readLocal = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const writeLocal = (key: string, value: string): boolean => {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    // unavailable or quota exceeded — caller decides how to surface this
    return false;
  }
};

export const removeLocal = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
};
