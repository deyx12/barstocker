import { NextResponse } from "next/server";
import { Role, Status } from "@/lib/generated/prisma/client";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { userPatchSchema } from "@/lib/validations/user";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiSession([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;
    const payload = userPatchSchema.parse(await readJson(request));

    if (id === auth.profile.id && payload.status === Status.INACTIVE) {
      return jsonError("No puedes inactivar tu propio usuario.", 422);
    }

    const current = await prisma.userProfile.findUnique({ where: { id } });
    if (!current) {
      return jsonError("El usuario no existe.", 404);
    }

    if (payload.email && payload.email !== current.email) {
      const duplicate = await prisma.userProfile.findUnique({
        where: { email: payload.email },
      });

      if (duplicate) {
        return jsonError("Ya existe un usuario con ese correo.", 409);
      }
    }

    if (payload.name || payload.email) {
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase.auth.admin.updateUserById(current.authUserId, {
        email: payload.email ?? current.email,
        user_metadata: { name: payload.name ?? current.name },
      });

      if (error) {
        return jsonError(error.message, 400);
      }
    }

    const user = await prisma.userProfile.update({
      where: { id },
      data: payload,
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === "SUPABASE_ADMIN_NOT_CONFIGURED") {
      return jsonError("Falta configurar SUPABASE_SERVICE_ROLE_KEY.", 500);
    }

    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiSession([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;

    if (id === auth.profile.id) {
      return jsonError("No puedes eliminar tu propio usuario.", 422);
    }

    const user = await prisma.userProfile.update({
      where: { id },
      data: { status: Status.INACTIVE },
    });

    return NextResponse.json({
      user,
      message: "El usuario fue eliminado correctamente.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
