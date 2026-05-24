import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { SuppliersTable } from "@/components/tables/suppliers-table";
import { requirePageSession } from "@/lib/auth/session";
import { Role } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const { profile } = await requirePageSession([Role.ADMIN]);
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <AppShell user={{ name: profile.name, email: profile.email, role: profile.role }}>
      <PageHeader
        title="Proveedores"
        description="Administra proveedores activos, datos de contacto y estado."
      />
      <SuppliersTable
        initialSuppliers={suppliers.map((supplier) => ({
          id: supplier.id,
          name: supplier.name,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          status: supplier.status,
        }))}
      />
    </AppShell>
  );
}
