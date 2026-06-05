import { useEffect } from "react";

// Named wrapper for the one legitimate use of a bare-deps effect: external-system
// setup/cleanup on mount (DOM, browser APIs, subscriptions like WebSocket).
export const useMountEffect = (effect: () => void | (() => void)): void => {
  useEffect(effect, []);
};
