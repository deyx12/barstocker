import { NextResponse } from "next/server";
import { Role, Status } from "@/lib/generated/prisma/client";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validations/supplier";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiSession([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;
    const payload = supplierSchema.parse(await readJson(request));
    const duplicate = await prisma.supplier.findFirst({
      where: {
        id: { not: id },
        OR: [{ name: payload.name }, { email: payload.email }, { nit: payload.nit }],
      },
    });

    if (duplicate) {
      return jsonError("Ya existe un proveedor con ese nombre, correo o NIT.", 409);
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: payload,
    });

    return NextResponse.json({ supplier });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiSession([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const { id } = await context.params;
    const productCount = await prisma.product.count({ where: { supplierId: id } });

    if (productCount > 0) {
      const supplier = await prisma.supplier.update({
        where: { id },
        data: { status: Status.INACTIVE },
      });

      return NextResponse.json({
        supplier,
        message:
          "El proveedor tiene productos asociados y fue marcado como inactivo.",
      });
    }

    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ message: "Proveedor eliminado correctamente." });
  } catch (error) {
    return handleRouteError(error);
  }
}
