import { exportAllLocal, importAllLocal } from "@/lib/localStore/backup";

async function readErr(res: Response) {
  const j = await res.json().catch(() => ({}));
  return j?.error ?? "Request failed";
}

export async function pullAccountData(): Promise<{ found: boolean; updatedAt?: string }> {
  const res = await fetch("/api/data/pull", { method: "GET" });
  if (!res.ok) throw new Error(await readErr(res));

  const json = await res.json().catch(() => ({}));
  if (!json?.found) return { found: false };

  await importAllLocal(json.bundle);
  return { found: true, updatedAt: json.updatedAt };
}

export async function pushAccountData(): Promise<{ updatedAt?: string }> {
  const bundle = await exportAllLocal();

  const res = await fetch("/api/data/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bundle }),
  });

  if (!res.ok) throw new Error(await readErr(res));
  const json = await res.json().catch(() => ({}));
  return { updatedAt: json?.updatedAt };
}
