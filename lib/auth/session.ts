import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { Role, Status, type UserProfile } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CurrentSession = {
  profile: UserProfile;
};

async function resolveProfile(authUserId: string, email: string, fallbackName?: string) {
  const byAuthId = await prisma.userProfile.findUnique({
    where: { authUserId },
  });

  if (byAuthId) {
    return byAuthId;
  }

  const byEmail = await prisma.userProfile.findUnique({
    where: { email },
  });

  if (byEmail) {
    return prisma.userProfile.update({
      where: { id: byEmail.id },
      data: { authUserId },
    });
  }

  return prisma.userProfile.create({
    data: {
      authUserId,
      email,
      name: fallbackName || email.split("@")[0] || "Usuario",
      role: Role.VENDEDOR,
      status: Status.ACTIVE,
    },
  });
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const profile = await resolveProfile(
    user.id,
    user.email,
    user.user_metadata?.name || user.user_metadata?.full_name,
  );

  return { profile };
}

export async function requirePageSession(roles?: Role[]) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (session.profile.status !== Status.ACTIVE) {
    redirect("/login?error=inactive");
  }

  if (roles?.length && !roles.includes(session.profile.role)) {
    redirect("/dashboard");
  }

  return session;
}

export async function requireApiSession(roles?: Role[]) {
  const session = await getCurrentSession();

  if (!session) {
    return {
      error: NextResponse.json(
        { message: "Debes iniciar sesion para continuar." },
        { status: 401 },
      ),
    };
  }

  if (session.profile.status !== Status.ACTIVE) {
    return {
      error: NextResponse.json(
        { message: "Tu usuario esta inactivo. Contacta al administrador." },
        { status: 403 },
      ),
    };
  }

  if (roles?.length && !roles.includes(session.profile.role)) {
    return {
      error: NextResponse.json(
        { message: "No tienes permisos para realizar esta accion." },
        { status: 403 },
      ),
    };
  }

  return { profile: session.profile };
}
