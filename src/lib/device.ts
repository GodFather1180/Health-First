// src/lib/device.ts
const KEY = "healthfirst_device_key_v1";

export function getOrCreateDeviceKey(): string {
  if (typeof window === "undefined") return "server";
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;

  const fresh =
    (crypto as any).randomUUID?.() ??
    `dev_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  localStorage.setItem(KEY, fresh);
  return fresh;
}

// Backwards-compatible name used elsewhere
export function getDeviceKey(): string {
  return getOrCreateDeviceKey();
}

export async function linkDeviceToAccount() {
  // Safe no-op server-side
  if (typeof window === "undefined") return;

  const deviceKey = getDeviceKey();

  // If you already have an API route for this, it should be wired here.
  // Your uploaded route.ts looks like the "link device" endpoint.
  const tz =
    Intl.DateTimeFormat().resolvedOptions().timeZone ??
    "UTC";

  const res = await fetch("/api/device/link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceKey, timezone: tz }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to link device");
  }
}
