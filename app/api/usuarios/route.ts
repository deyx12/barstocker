import { NextResponse } from "next/server";
import { Role } from "@/lib/generated/prisma/client";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { userCreateSchema } from "@/lib/validations/user";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiSession([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  const users = await prisma.userProfile.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const auth = await requireApiSession([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const payload = userCreateSchema.parse(await readJson(request));
    const existingProfile = await prisma.userProfile.findUnique({
      where: { email: payload.email },
    });

    if (existingProfile) {
      return jsonError("Ya existe un usuario con ese correo.", 409);
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: { name: payload.name },
    });

    if (error || !data.user) {
      return jsonError(error?.message || "No se pudo crear el usuario en Auth.", 400);
    }

    const user = await prisma.userProfile.create({
      data: {
        authUserId: data.user.id,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        status: payload.status,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "SUPABASE_ADMIN_NOT_CONFIGURED") {
      return jsonError("Falta configurar SUPABASE_SERVICE_ROLE_KEY.", 500);
    }

    return handleRouteError(error);
  }
}
