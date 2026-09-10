import { test, expect } from "@playwright/test";
import { trackConsoleErrors } from "./support.js";

// "Cotización rápida" es la feature de R040 (ver RISKS.md) — crea una cotización sin depender de
// un contacto de WhatsApp existente. Esta suite SOLO abre/cierra el modal y verifica sus campos;
// nunca hace click en "Cotizar" (ver tests/README.md — regla de nunca apuntar a producción).
test.describe("Cotización rápida (modal, sin submit)", () => {
  test("abre desde Cotizaciones, muestra sus campos, y cierra sin enviar nada", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Cotizaciones", exact: true }).click();

    await page.getByRole("button", { name: "Cotización rápida", exact: true }).click();

    const modal = page.locator("div.fixed.inset-0.z-50");
    await expect(modal.getByRole("heading", { name: "Cotización rápida" })).toBeVisible();
    await expect(modal.getByPlaceholder("584121234567")).toBeVisible();
    await expect(modal.getByPlaceholder("584121234567")).toHaveValue("");

    // En modo demo no hay Supabase, así que `products` nunca se carga y el botón
    // "Cotizar" queda deshabilitado — confirma que este test no podría disparar
    // un submit real aunque quisiera.
    await expect(modal.getByRole("button", { name: "Cotizar" })).toBeDisabled();

    // Cierra con el botón X (primer botón del modal, antes del selector de producto
    // y del botón "Cotizar" — no tiene aria-label propio en el componente actual).
    await modal.locator("button").first().click();
    await expect(modal).not.toBeVisible();

    expect(errors).toEqual([]);
  });
});
