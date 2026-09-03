/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        // Fraunces: serif de display para titulares/cifras grandes, del
        // rediseño aprobado por Sebastián (docs/rediseno_panel_2026-09).
        display: ["Fraunces", "ui-serif", "serif"],
      },
      colors: {
        // Paleta de marca del rediseño (blanco + azul, del logo real de
        // Nairobi Montilla) -- no reemplaza slate/blue de Tailwind, se suma
        // para el rail y las superficies de vidrio sobre foto.
        navy: {
          950: "#071A2E",
          900: "#0B2A4A",
        },
      },
    },
  },
  plugins: [],
};
