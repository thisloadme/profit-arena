"use client";

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

export function AppKeyboard() {
  useKeyboardShortcuts();
  return null;
}
