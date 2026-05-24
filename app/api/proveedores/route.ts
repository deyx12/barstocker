import { NextResponse } from "next/server";
import { Role } from "@/lib/generated/prisma/client";
import { handleRouteError, jsonError, readJson } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { supplierSchema } from "@/lib/validations/supplier";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiSession([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ suppliers });
}

export async function POST(request: Request) {
  const auth = await requireApiSession([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  try {
    const payload = supplierSchema.parse(await readJson(request));
    const duplicate = await prisma.supplier.findFirst({
      where: {
        OR: [{ name: payload.name }, { email: payload.email }, { nit: payload.nit }],
      },
    });

    if (duplicate) {
      return jsonError("Ya existe un proveedor con ese nombre, correo o NIT.", 409);
    }

    const supplier = await prisma.supplier.create({
      data: payload,
    });

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
