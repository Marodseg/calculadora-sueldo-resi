# Sueldo Resi · Calculadora de nómina MIR (SAS Granada)

Web app mobile-first para calcular lo que cobras cada mes como residente en el H. Virgen de las Nieves:
sueldo base + complemento de formación, guardias (con la regla del corte a medianoche), cotizaciones a la
Seguridad Social e IRPF.

- Calendario táctil: toca un día para marcar guardia (17 h / 24 h / a medida), festivo, vacaciones o baja.
- Configuración **por mes**, guardada en `localStorage` (clave `sueldo-resi:v1`).
- Arrastre automático de las horas de guardia del último día del mes anterior.
- Historial con gráfico y acumulado; exportar/importar copia en JSON.
- Modo claro/oscuro automático.

## Desarrollo

```bash
npm install
npm run dev     # servidor local
npm test        # tests del cálculo (src/lib/calc.test.ts)
npm run build   # tsc + vite build -> dist/
```

Las tarifas y reglas están en `src/lib/rates.ts` y `src/lib/calc.ts`.
Estimación orientativa: verifica siempre con tu nómina real.
