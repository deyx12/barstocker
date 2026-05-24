import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { UsersTable } from "@/components/tables/users-table";
import { requirePageSession } from "@/lib/auth/session";
import { Role } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const { profile } = await requirePageSession([Role.ADMIN]);
  const users = await prisma.userProfile.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell user={{ name: profile.name, email: profile.email, role: profile.role }}>
      <PageHeader
        title="Usuarios"
        description="Administra perfiles, roles y estados de acceso."
      />
      <UsersTable
        initialUsers={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
        }))}
      />
    </AppShell>
  );
}
