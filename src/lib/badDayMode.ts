"use client";

const KEY = "healthfirst_bad_day_mode";

export function getBadDayMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function setBadDayMode(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, on ? "1" : "0");
  // notify other components/pages
  window.dispatchEvent(new Event("healthfirst_bad_day_mode"));
}

export function toggleBadDayMode() {
  setBadDayMode(!getBadDayMode());
}
