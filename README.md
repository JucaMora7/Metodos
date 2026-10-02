# Métodos Numéricos: Ecuaciones no lineales

Aplicación web para encontrar raíces de ecuaciones `f(x) = 0` con seis métodos numéricos. Muestra cada iteración en una tabla y en una gráfica interactiva, y se detiene cuando el error baja del valor que elijas (por ejemplo, menor al 1 %).

**Autor:** Juan Camilo
**Publicada en:** https://metodos-numericos-gamma.vercel.app

## Características

- **Seis métodos:** Bisección, Falsa Posición, Newton-Raphson, Secante, Müller y Punto Fijo.
- **Error a tu medida:** escribes con qué error quieres trabajar. El error relativo se calcula en porcentaje.
- **Vista previa de la ecuación** en notación matemática (KaTeX) mientras escribes.
- **Gráfica interactiva:** zoom con la rueda del mouse y arrastre para moverte. La curva se recalcula según lo que estás viendo, como GeoGebra. Marca la raíz y dibuja las guías de cada método (intervalo, tangentes, secantes, parábolas o telaraña).
- **Curva de convergencia** (error contra iteración, en escala logarítmica), que se puede colapsar.
- **Tabla de iteraciones** paginada, exportable a CSV y Excel.
- **Mensajes claros** de convergencia, divergencia o entrada inválida.
- **Modo oscuro y claro**, y una página de inicio con una demostración interactiva.

## Los métodos

| Método | Fórmula | Protección |
| --- | --- | --- |
| Bisección | `xr = (a + b) / 2` | Exige `f(a)·f(b) < 0` (Bolzano) |
| Falsa Posición | `xr = b − f(b)(a − b) / (f(a) − f(b))` | Bolzano; avisa si `f(a) − f(b) ≈ 0` |
| Newton-Raphson | `xᵢ₊₁ = xᵢ − f(xᵢ) / f′(xᵢ)` | Se detiene si `f′(x) ≈ 0` |
| Secante | `xᵢ₊₁ = xᵢ − f(xᵢ)(xᵢ − xᵢ₋₁) / (f(xᵢ) − f(xᵢ₋₁))` | Se detiene si el denominador ≈ 0 |
| Müller | Raíz de la parábola por los tres últimos puntos | Avisa si la raíz sería compleja |
| Punto Fijo | `xᵢ₊₁ = g(xᵢ)` | Detecta divergencia temprana |

> **Nota sobre Müller:** solo trabaja con números reales. Si la parábola no corta el eje x (discriminante negativo), el método se detiene y avisa, en lugar de entregar la raíz compleja.

**Error relativo:** `|x_actual − x_anterior| / |x_actual| × 100`. También está disponible el error absoluto.

## Tecnologías

React 18 · TypeScript · Vite · Tailwind CSS 3 · mathjs · KaTeX · Plotly · SheetJS (xlsx) · Vitest · Vercel

## Cómo ejecutarlo

Necesitas [Node.js](https://nodejs.org) instalado.

```bash
npm install
npm run dev
```

Abre http://localhost:5173. La página de inicio es `/` y la calculadora es `/#/calculadora`.

Otros comandos:

```bash
npm test          # pruebas unitarias
npm run build     # versión de producción
```

## Cómo se usa

1. En la página de inicio, pulsa **Iniciar Calculadora**.
2. Elige un método en la barra lateral. Ya trae un ejemplo precargado.
3. Escribe `f(x)`, por ejemplo `x^3 - exp(x) + sin(x)`.
4. Completa el intervalo o los puntos iniciales.
5. Escribe el error con el que quieres trabajar (por ejemplo, `1` para parar con error menor al 1 %).
6. Pulsa **Calcular** y revisa la raíz, la tabla, la gráfica y la curva de convergencia.

Botones útiles: **Cargar Ejemplo Predefinido** (va alternando ejemplos) y **Limpiar**.

## Cómo escribir las ecuaciones

- **Potencias:** `x^3`, o `x³`.
- **Funciones:** `sin`, `cos`, `tan`, `exp`, `log` (logaritmo natural, también `ln`), `sqrt`, `cbrt`, `abs`…
- **Constantes:** `pi` y `e`.
- **Multiplicación implícita:** `3x` equivale a `3*x`.
- Números como `pi/2` también se aceptan en los campos de intervalo y puntos iniciales.
- Solo se permite la variable `x`.

Por seguridad, lo que escribes no se ejecuta como código libre: solo se aceptan números, `x`, operadores y las funciones de una lista permitida.

## Estructura del proyecto

```text
src/
├── core/
│   ├── types/       tipos (resultado, pasos, estado)
│   ├── methods/     un archivo por método + pruebas (methods.test.ts)
│   ├── math/        parser.ts: lee las ecuaciones de forma segura (mathjs)
│   └── config.ts    métodos, campos y ejemplos precargados
├── components/      MathInput, IterationTable, Plots, componentes de UI
├── landing/         página de inicio
├── App.tsx          calculadora
└── main.tsx         punto de entrada y rutas (#/calculadora)
```

La lógica matemática está separada de la interfaz: los algoritmos son funciones puras y tipadas que no dependen de React.

## Qué devuelve cada método

- Raíz encontrada y `f(raíz)`.
- Número de iteraciones y tiempo de ejecución en milisegundos.
- Estado: convergió, máximo de iteraciones, divergió, entrada inválida o error numérico, con un mensaje descriptivo.
- Matriz completa de pasos (puntos, valores de `f` y error de cada iteración).
