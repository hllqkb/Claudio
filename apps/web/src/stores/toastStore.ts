import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message: string, type: ToastType = "info", duration = 3000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({
      toasts: [...s.toasts, { id, message, type, duration }],
    }));
    setTimeout(() => {
      set((s) => ({
        toasts: s.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  removeToast: (id: string) => {
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    }));
  },
}));
