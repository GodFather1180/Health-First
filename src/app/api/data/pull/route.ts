import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromCookie } from "@/lib/server/auth";

export async function GET() {
  const userId = await getUserIdFromCookie();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.accountData.findUnique({ where: { userId } });
  if (!row) return NextResponse.json({ found: false });

  return NextResponse.json({
    found: true,
    bundle: row.bundle,
    updatedAt: row.updatedAt.toISOString(),
  });
}
