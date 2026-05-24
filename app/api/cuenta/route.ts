import { NextResponse } from "next/server";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { accountUpdateSchema } from "@/lib/validations/user";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  return NextResponse.json({ user: auth.profile });
}

export async function PATCH(request: Request) {
  const auth = await requireApiSession();
  if ("error" in auth) return auth.error;

  try {
    const payload = accountUpdateSchema.parse(await readJson(request));

    if (payload.email !== auth.profile.email) {
      const duplicate = await prisma.userProfile.findUnique({
        where: { email: payload.email },
      });

      if (duplicate) {
        return jsonError("Ya existe un usuario con ese correo.", 409);
      }
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(
      auth.profile.authUserId,
      {
        email: payload.email,
        password: payload.password || undefined,
        user_metadata: { name: payload.name },
      },
    );

    if (error) {
      return jsonError(error.message, 400);
    }

    const user = await prisma.userProfile.update({
      where: { id: auth.profile.id },
      data: {
        name: payload.name,
        email: payload.email,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === "SUPABASE_ADMIN_NOT_CONFIGURED") {
      return jsonError("Falta configurar SUPABASE_SERVICE_ROLE_KEY.", 500);
    }

    return handleRouteError(error);
  }
}
