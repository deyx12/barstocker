"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  UserCircle,
  Search,
  Loader2,
  ShoppingCart,
  Truck,
  Users,
  Wine,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AppUser = {
  name: string;
  email: string;
  role: "ADMIN" | "VENDEDOR";
};

type AppShellProps = {
  user: AppUser;
  children: React.ReactNode;
};

type SearchResult = {
  id: string;
  type: string;
  title: string;
  description: string;
  href: string;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "VENDEDOR"] },
  { href: "/cuenta", label: "Mi cuenta", icon: UserCircle, roles: ["ADMIN", "VENDEDOR"] },
  { href: "/productos", label: "Productos", icon: Package, roles: ["ADMIN", "VENDEDOR"] },
  { href: "/inventario", label: "Inventario", icon: Boxes, roles: ["ADMIN", "VENDEDOR"] },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart, roles: ["ADMIN", "VENDEDOR"] },
  { href: "/historial", label: "Historial", icon: ClipboardList, roles: ["ADMIN", "VENDEDOR"] },
  { href: "/proveedores", label: "Proveedores", icon: Truck, roles: ["ADMIN"] },
  { href: "/reportes", label: "Reportes", icon: BarChart3, roles: ["ADMIN"] },
  { href: "/usuarios", label: "Usuarios", icon: Users, roles: ["ADMIN"] },
] satisfies Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: AppUser["role"][];
}>;

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const searchBoxRef = useRef<HTMLFormElement>(null);
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const visibleNav = navItems.filter((item) => item.roles.includes(user.role));
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sesion cerrada correctamente.");
    router.replace("/login");
    router.refresh();
  }

  useEffect(() => {
    const trimmed = globalQuery.trim();
    if (trimmed.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/busqueda?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        setSearchResults(data.results ?? []);
        setSearchOpen(true);
      } catch {
        if (!controller.signal.aborted) {
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [globalQuery]);

  useEffect(() => {
    function closeOnClickOutside(event: MouseEvent) {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnClickOutside);
    return () => document.removeEventListener("mousedown", closeOnClickOutside);
  }, []);

  function submitGlobalSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstResult = searchResults[0];

    if (firstResult) {
      setSearchOpen(false);
      router.push(firstResult.href);
      return;
    }

    if (globalQuery.trim()) {
      router.push(`/productos?buscar=${encodeURIComponent(globalQuery.trim())}`);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-white md:flex md:flex-col">
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wine className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-bold leading-none">BarStocker</p>
            <p className="text-xs text-muted-foreground">Web</p>
          </div>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 p-3" aria-label="Navegacion principal">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-accent hover:text-accent-foreground",
                  active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4">
          <p className="text-xs uppercase text-muted-foreground">Rol activo</p>
          <p className="text-sm font-semibold">
            {user.role === "ADMIN" ? "Administrador" : "Vendedor"}
          </p>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div className="flex items-center justify-between gap-3 md:hidden">
              <Link href="/dashboard" className="flex items-center gap-2 font-bold">
                <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Wine className="size-4" aria-hidden="true" />
                </span>
                BarStocker Web
              </Link>
            </div>

            <form
              ref={searchBoxRef}
              className="relative w-full max-w-xl"
              onSubmit={submitGlobalSearch}
            >
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label="Buscar en BarStocker"
                placeholder="Buscar productos, ventas o proveedores"
                className="pl-9 pr-9"
                value={globalQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  const value = event.target.value;
                  setGlobalQuery(value);
                  if (value.trim().length < 2) {
                    setSearchResults([]);
                    setIsSearching(false);
                  }
                }}
              />
              {isSearching ? (
                <Loader2
                  className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              ) : null}
              {searchOpen && globalQuery.trim().length >= 2 ? (
                <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-lg border bg-white shadow-lg">
                  {searchResults.length ? (
                    <div className="max-h-96 overflow-y-auto p-2">
                      {searchResults.map((result) => (
                        <Link
                          key={`${result.type}-${result.id}`}
                          href={result.href}
                          className="block rounded-md px-3 py-2 hover:bg-accent"
                          onClick={() => setSearchOpen(false)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold">
                              {result.title}
                            </p>
                            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                              {result.type}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {result.description}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      {isSearching ? "Buscando..." : "No se encontraron resultados."}
                    </div>
                  )}
                </div>
              ) : null}
            </form>

            <div className="flex items-center justify-between gap-3">
              <nav
                className="flex gap-2 overflow-x-auto md:hidden"
                aria-label="Navegacion movil"
              >
                {visibleNav.map((item) => (
                  <Button
                    key={item.href}
                    asChild
                    variant={pathname === item.href ? "default" : "outline"}
                    size="sm"
                  >
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                ))}
              </nav>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-11 justify-start gap-3 px-2"
                    aria-label="Abrir menu de usuario"
                  >
                    <Avatar className="size-9">
                      <AvatarFallback>{initials || "U"}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-left sm:block">
                      <span className="block text-sm font-semibold leading-tight">
                        {user.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    {user.role === "ADMIN" ? "Administrador" : "Vendedor"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/cuenta">
                      <UserCircle className="size-4" aria-hidden="true" />
                      Mi cuenta
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="size-4" aria-hidden="true" />
                    Cerrar sesion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] px-4 py-6 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
