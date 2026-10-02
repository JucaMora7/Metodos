import type { MethodId } from './types'

export interface FormValues {
  expr: string
  a: string
  b: string
  x0: string
  x1: string
  x2: string
  g: string
  df: string
}

export interface MethodInfo {
  id: MethodId
  name: string
  short: string
  description: string
  /** Campos de entrada contextuales que usa el método. */
  fields: Array<'interval' | 'x0' | 'x0x1' | 'x0x1x2' | 'g' | 'df'>
  examples: Array<{ label: string; values: Partial<FormValues> }>
}

const A = { expr: 'x^3 - x - 2', a: '1', b: '2' }
const B = { expr: 'x^3 - exp(x) + sin(x)', a: '1', b: '2' }

export const METHODS: MethodInfo[] = [
  {
    id: 'bisection',
    name: 'Bisección',
    short: 'Bolzano',
    description: 'Divide el intervalo [a, b] a la mitad conservando el subintervalo con cambio de signo. Convergencia lineal, siempre converge si f(a)·f(b) < 0.',
    fields: ['interval'],
    examples: [
      { label: 'x³ − x − 2', values: A },
      { label: 'x³ − eˣ + sin x', values: B },
    ],
  },
  {
    id: 'falsePosition',
    name: 'Falsa Posición',
    short: 'Regula falsi',
    description: 'Usa la intersección con el eje x de la recta secante entre (a, f(a)) y (b, f(b)). Requiere cambio de signo en [a, b].',
    fields: ['interval'],
    examples: [
      { label: 'x³ − x − 2', values: A },
      { label: 'x³ − eˣ + sin x', values: B },
    ],
  },
  {
    id: 'newton',
    name: 'Newton-Raphson',
    short: 'Tangentes',
    description: 'Itera xᵢ₊₁ = xᵢ − f(xᵢ)/f′(xᵢ). Convergencia cuadrática cerca de la raíz; falla si f′(x) ≈ 0.',
    fields: ['x0', 'df'],
    examples: [
      { label: 'x³ − x − 2', values: { expr: A.expr, x0: '1.5', df: '3*x^2 - 1' } },
      { label: 'x³ − eˣ + sin x', values: { expr: B.expr, x0: '2', df: '3*x^2 - exp(x) + cos(x)' } },
    ],
  },
  {
    id: 'secant',
    name: 'Secante',
    short: 'Sin derivada',
    description: 'Como Newton pero aproxima f′ con la recta por los dos últimos puntos. Requiere x0 y x1.',
    fields: ['x0x1'],
    examples: [
      { label: 'x³ − x − 2', values: { expr: A.expr, x0: '1', x1: '2' } },
      { label: 'cos x − x', values: { expr: 'cos(x) - x', x0: '0', x1: '1' } },
    ],
  },
  {
    id: 'muller',
    name: 'Müller',
    short: 'Parábola',
    description: 'Ajusta una parábola por los tres últimos puntos y toma su raíz más cercana. Convergencia superlineal; no necesita derivadas. Requiere x0, x1 y x2.',
    fields: ['x0x1x2'],
    examples: [
      { label: 'x³ − x − 2', values: { expr: A.expr, x0: '1', x1: '1.5', x2: '2' } },
      { label: 'x³ − eˣ + sin x', values: { expr: B.expr, x0: '1', x1: '1.5', x2: '2' } },
    ],
  },
  {
    id: 'fixedPoint',
    name: 'Punto Fijo',
    short: 'x = g(x)',
    description: 'Itera xᵢ₊₁ = g(xᵢ) con g despejada de f(x) = 0. Converge si |g′(x)| < 1 cerca de la raíz.',
    fields: ['x0', 'g'],
    examples: [
      { label: 'x³ − x − 2, g = ∛(x+2)', values: { expr: A.expr, x0: '1', g: 'cbrt(x + 2)' } },
      { label: 'cos x − x, g = cos x', values: { expr: 'cos(x) - x', x0: '1', g: 'cos(x)' } },
      { label: 'Divergente: g = x³ − 2', values: { expr: A.expr, x0: '1.5', g: 'x^3 - 2' } },
    ],
  },
]

export const DEFAULT_VALUES: FormValues = { expr: '', a: '', b: '', x0: '', x1: '', x2: '', g: '', df: '' }
