import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ message, details }, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError("Los datos enviados no son validos.", 422, error.flatten());
  }

  if (error instanceof Error && error.message === "JSON_INVALID") {
    return jsonError("El cuerpo de la solicitud debe ser JSON valido.", 400);
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return jsonError("Ya existe un registro con esos datos.", 409);
  }

  console.error(error);
  return jsonError("Ocurrio un error inesperado.", 500);
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new Error("JSON_INVALID");
  }
}

export function getDateRange(searchParams: URLSearchParams) {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const startDate = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
  const endDate = to ? new Date(`${to}T23:59:59.999Z`) : undefined;

  return { startDate, endDate };
}
