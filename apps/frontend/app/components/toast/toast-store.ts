"use client";

import { create } from "zustand";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const HUMAN_MESSAGES = {
  success: {
    create: "Created successfully",
    update: "Saved successfully",
    delete: "Deleted successfully",
    duplicate: "Duplicated successfully",
    send: "Sent successfully",
    copy: "Copied to clipboard",
    invite: "Invitation sent",
    login: "Welcome back!",
    logout: "Logged out successfully",
    save: "Saved successfully",
  },
  error: {
    create: "Failed to create",
    update: "Failed to save",
    delete: "Failed to delete",
    duplicate: "Failed to duplicate",
    send: "Failed to send",
    copy: "Failed to copy",
    invite: "Failed to send invitation",
    login: "Login failed",
    logout: "Logout failed",
    save: "Failed to save",
    required: "This field is required",
    invalid: "Invalid input",
    notFound: "Not found",
    unauthorized: "Please log in again",
    serverError: "Something went wrong",
  },
  warning: {
    deleteConfirm: "Are you sure you want to delete this?",
    unsavedChanges: "You have unsaved changes",
    rateLimit: "Too many requests, please wait",
    sessionExpired: "Your session has expired",
  },
  info: {
    loading: "Loading...",
    processing: "Processing...",
    enriching: "Enriching data...",
  },
};

let toastId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${++toastId}-${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, toast.duration || 4000);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: "success", title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: "error", title, message, duration: 6000 }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: "warning", title, message }),
  info: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: "info", title, message }),
  
  create: (item: string = "item") =>
    useToastStore.getState().addToast({ type: "success", title: HUMAN_MESSAGES.success.create, message: item }),
  update: (item: string = "Changes") =>
    useToastStore.getState().addToast({ type: "success", title: HUMAN_MESSAGES.success.update, message: item }),
  delete: (item: string = "Item") =>
    useToastStore.getState().addToast({ type: "success", title: HUMAN_MESSAGES.success.delete, message: item }),
  duplicate: (item: string = "Item") =>
    useToastStore.getState().addToast({ type: "success", title: HUMAN_MESSAGES.success.duplicate, message: item }),
  send: (item: string = "") =>
    useToastStore.getState().addToast({ type: "success", title: HUMAN_MESSAGES.success.send, message: item }),
  copy: () =>
    useToastStore.getState().addToast({ type: "success", title: HUMAN_MESSAGES.success.copy }),
  invite: (email: string) =>
    useToastStore.getState().addToast({ type: "success", title: HUMAN_MESSAGES.success.invite, message: email }),
  save: () =>
    useToastStore.getState().addToast({ type: "success", title: HUMAN_MESSAGES.success.save }),
  login: () =>
    useToastStore.getState().addToast({ type: "success", title: HUMAN_MESSAGES.success.login }),
  logout: () =>
    useToastStore.getState().addToast({ type: "info", title: HUMAN_MESSAGES.success.logout }),
  
  apiError: (action: string = "action") =>
    useToastStore.getState().addToast({ type: "error", title: `Failed to ${action}`, duration: 6000 }),
  required: (field: string = "field") =>
    useToastStore.getState().addToast({ type: "error", title: HUMAN_MESSAGES.error.required, message: field }),
  invalid: (field: string = "input") =>
    useToastStore.getState().addToast({ type: "error", title: HUMAN_MESSAGES.error.invalid, message: field }),
  notFound: (item: string = "Item") =>
    useToastStore.getState().addToast({ type: "error", title: HUMAN_MESSAGES.error.notFound, message: item }),
  unauthorized: () =>
    useToastStore.getState().addToast({ type: "error", title: HUMAN_MESSAGES.error.unauthorized }),
  serverError: () =>
    useToastStore.getState().addToast({ type: "error", title: HUMAN_MESSAGES.error.serverError }),
};

export function useToast() {
  return { toast };
}