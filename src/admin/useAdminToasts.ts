import { useState } from "react";
import { uid } from "./adminData";

export type Toast = { id: string; msg: string; kind?: "warn" };
export type ToastFn = (msg: string, kind?: "warn") => void;

export function useAdminToasts(): { toasts: Toast[]; toast: ToastFn } {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast: ToastFn = (msg, kind) => {
    const id = uid("toast");
    setToasts((x) => [...x, { id, msg, kind }]);
    setTimeout(() => setToasts((x) => x.filter((t) => t.id !== id)), 2400);
  };

  return { toasts, toast };
}
