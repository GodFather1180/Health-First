"use client";

import { useEffect } from "react";
import { applyUiPrefs, loadUiPrefs } from "@/lib/uiPrefs";

export default function UiPrefsBoot() {
  useEffect(() => {
    applyUiPrefs(loadUiPrefs());
  }, []);

  return null;
}
