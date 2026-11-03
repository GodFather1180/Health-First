import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromCookie } from "@/lib/server/auth";

export async function POST(req: Request) {
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const bundle = body?.bundle;

  if (!bundle || typeof bundle !== "object") {
    return NextResponse.json({ error: "Missing/invalid bundle" }, { status: 400 });
  }

  const row = await prisma.accountData.upsert({
    where: { userId },
    update: { bundle },
    create: { userId, bundle },
  });

  return NextResponse.json({ ok: true, updatedAt: row.updatedAt.toISOString() });
}
