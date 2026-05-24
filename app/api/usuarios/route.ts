import { NextResponse } from "next/server";
import { Role } from "@/lib/generated/prisma/client";
import { requireApiSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiSession([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  const users = await prisma.userProfile.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}
