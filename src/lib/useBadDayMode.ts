"use client";

import { useEffect, useState } from "react";
import { getBadDayMode, setBadDayMode } from "./badDayMode";

export function useBadDayMode() {
  const [badDay, setBadDay] = useState(false);

  useEffect(() => {
    // initial
    setBadDay(getBadDayMode());

    const onChange = () => setBadDay(getBadDayMode());
    window.addEventListener("storage", onChange);
    window.addEventListener("healthfirst_bad_day_mode", onChange);

    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("healthfirst_bad_day_mode", onChange);
    };
  }, []);

  return {
    badDay,
    setBadDay: (v: boolean) => setBadDayMode(v),
    toggle: () => setBadDayMode(!getBadDayMode()),
  };
}
