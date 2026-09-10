import { test, expect } from "@playwright/test";
import { SECTIONS, trackConsoleErrors } from "./support.js";

test.describe("carga y navegación (modo demo)", () => {
  test("la app carga en modo demo sin pasar por login", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");
    // En modo demo, App.jsx autentica automáticamente (ALLOW_DEMO && !isSupabaseConfigured)
    // y nunca debería mostrar la pantalla de Login.
    await expect(page.getByRole("heading", { name: "Bienvenida Nairobi" })).not.toBeVisible();
    // "Buenos días, Nairobi" es el badge de bienvenida (un <span>, no un heading real).
    await expect(page.getByText("Buenos días, Nairobi")).toBeVisible();
    expect(errors).toEqual([]);
  });

  for (const section of SECTIONS) {
    test(`el rail lleva a "${section.label}" y renderiza su encabezado`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto("/");
      await page.getByRole("button", { name: section.label, exact: true }).click();
      await expect(page.getByText(section.heading, { exact: false }).first()).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("recorre las 13 secciones en una sola sesión sin acumular errores de consola", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");
    for (const section of SECTIONS) {
      await page.getByRole("button", { name: section.label, exact: true }).click();
      await expect(page.getByText(section.heading, { exact: false }).first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
});
