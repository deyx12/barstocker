import { Badge } from "@/components/ui/badge";

const labels = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  AVAILABLE: "Disponible",
  LOW_STOCK: "Bajo stock",
  OUT_OF_STOCK: "Agotado",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  IN: "Ingreso",
  OUT: "Salida",
  SALE_ADJUSTMENT: "Venta",
} as const;

export function StatusBadge({ status }: { status: keyof typeof labels | string }) {
  const variant =
    status === "ACTIVE" || status === "AVAILABLE" || status === "COMPLETED"
      ? "success"
      : status === "LOW_STOCK"
        ? "warning"
        : status === "OUT_OF_STOCK" || status === "INACTIVE" || status === "CANCELLED"
          ? "destructive"
          : "secondary";

  return <Badge variant={variant}>{labels[status as keyof typeof labels] ?? status}</Badge>;
}
