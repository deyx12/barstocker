import { expect, test } from "@playwright/test";

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const email = process.env.E2E_ADMIN_EMAIL ?? "admin@barstocker.com";
const password = process.env.E2E_ADMIN_PASSWORD ?? "BarStocker123!";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Correo electronico").fill(email);
  await page.getByLabel("Contrasena").fill(password);
  await page.getByRole("button", { name: "Iniciar sesion" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("autenticacion", () => {
  test.skip(!hasSupabaseEnv, "Configura Supabase para ejecutar e2e de login.");

  test("login y navegacion al dashboard", async ({ page }) => {
    await login(page);
    await expect(page.getByText("Productos registrados")).toBeVisible();
  });
});

test.describe("productos", () => {
  test.skip(!hasSupabaseEnv, "Configura Supabase para ejecutar e2e de productos.");

  test("visualiza productos", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Productos" }).click();
    await expect(page.getByRole("heading", { name: "Productos" })).toBeVisible();
    await expect(page.getByPlaceholder("Buscar por nombre o codigo")).toBeVisible();
  });
});
