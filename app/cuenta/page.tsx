import { AccountForm } from "@/components/forms/account-form";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { requirePageSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { profile } = await requirePageSession();

  return (
    <AppShell user={{ name: profile.name, email: profile.email, role: profile.role }}>
      <PageHeader
        title="Mi cuenta"
        description="Actualiza tus datos personales y tu contrasena de acceso."
      />
      <AccountForm user={{ name: profile.name, email: profile.email }} />
    </AppShell>
  );
}
