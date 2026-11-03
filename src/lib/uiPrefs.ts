export type UiPrefs = {
  darkMode: boolean;
  largeText: boolean;
  badDayMode?: boolean;
};

const KEY = "healthfirst_ui_prefs_v1";

export function loadUiPrefs(): UiPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { darkMode: false, largeText: false, badDayMode: false };
    const p = JSON.parse(raw);
    return {
      darkMode: !!p.darkMode,
      largeText: !!p.largeText,
      badDayMode: !!p.badDayMode,
    };
  } catch {
    return { darkMode: false, largeText: false, badDayMode: false };
  }
}

export function saveUiPrefs(prefs: UiPrefs) {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

export function applyUiPrefs(prefs: UiPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // dataset (your CSS already uses this)
  root.dataset.theme = prefs.darkMode ? "dark" : "light";
  root.dataset.text = prefs.largeText ? "large" : "normal";

  // ALSO class (so either selector works)
  root.classList.toggle("dark", !!prefs.darkMode);
  root.classList.toggle("largeText", !!prefs.largeText);

  // optional nice browser UI
  (root.style as any).colorScheme = prefs.darkMode ? "dark" : "light";
}
