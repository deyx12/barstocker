import { NextResponse } from "next/server";
import { Role, Status } from "@/lib/generated/prisma/client";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
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

    const user = await prisma.userProfile.update({
      where: { id },
      data: payload,
    });

    return NextResponse.json({ user });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiSession([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;

    if (id === auth.profile.id) {
      return jsonError("No puedes inactivar tu propio usuario.", 422);
    }

    const user = await prisma.userProfile.update({
      where: { id },
      data: { status: Status.INACTIVE },
    });

    return NextResponse.json({
      user,
      message: "El usuario fue inactivado correctamente.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
