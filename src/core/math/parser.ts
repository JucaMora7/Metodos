import { derivative, parse, type MathNode } from 'mathjs'
import type { Fn } from '../types'

/** Funciones y constantes permitidas: cualquier otra cosa se rechaza (evaluación segura). */
const ALLOWED_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
  'exp', 'log', 'log10', 'log2', 'sqrt', 'cbrt', 'abs', 'sign', 'floor', 'ceil', 'round',
  'pow', 'min', 'max', 'sec', 'csc', 'cot', 'atan2',
])
const ALLOWED_CONSTANTS = new Set(['pi', 'e', 'PI', 'E'])

const SUPERSCRIPTS: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' }
const BS = String.fromCharCode(92) // barra invertida

/** Acepta notación cómoda: LaTeX básico (e^{3x}, \frac{a}{b}, \sin), ln, ×, ·, ² y ³. */
export function normalizeExpression(input: string): string {
  let t = input.trim()
  const re = (src: string, flags = 'g') => new RegExp(src.split('BS').join(BS + BS), flags)
  t = t.replace(re('BS(?:left|right)'), '').replace(re('BScdot|BStimes|[×·]'), '*')
  for (let i = 0; i < 5; i++) t = t.replace(re('BSfrac\\s*\\{([^{}]*)\\}\\s*\\{([^{}]*)\\}'), '(($1)/($2))')
  t = t.replace(re('BSsqrt\\s*\\{([^{}]*)\\}'), 'sqrt($1)')
  t = t.replace(re('BS(sin|cos|tan|exp|log|ln|sqrt|asin|acos|atan|sinh|cosh|tanh|pi)\\b'), '$1')
  t = t.replace(/\{/g, '(').replace(/\}/g, ')')
  t = t.replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (m) => '^' + [...m].map((c) => SUPERSCRIPTS[c]).join(''))
  t = t.replace(/\bln\s*\(/g, 'log(').replace(/π/g, 'pi')
  return t
}

export type ParseOk = { ok: true; node: MathNode; fn: Fn; tex: string }
export type ParseFail = { ok: false; error: string }

function assertSafe(node: MathNode): void {
  node.traverse((n: MathNode, _path: string, parent: MathNode | null) => {
    switch (n.type) {
      case 'ConstantNode':
        if (typeof (n as unknown as { value: unknown }).value !== 'number') throw new Error('Solo se permiten constantes numéricas.')
        break
      case 'SymbolNode': {
        const name = (n as unknown as { name: string }).name
        const isCallee = parent?.type === 'FunctionNode' && (parent as unknown as { fn: MathNode }).fn === n
        if (isCallee) {
          if (!ALLOWED_FUNCTIONS.has(name)) throw new Error(`Función no permitida: ${name}`)
        } else if (name !== 'x' && !ALLOWED_CONSTANTS.has(name)) {
          throw new Error(`Símbolo desconocido: "${name}". Use solo la variable x.`)
        }
        break
      }
      case 'FunctionNode':
      case 'OperatorNode':
      case 'ParenthesisNode':
        break
      default:
        throw new Error('Expresión no soportada (solo se permiten operaciones y funciones de x).')
    }
  })
}

/** Compila una expresión en x a una función numérica pura; valida la sintaxis y rechaza nodos peligrosos. */
export function compileExpression(expr: string): ParseOk | ParseFail {
  const text = normalizeExpression(expr)
  if (!text) return { ok: false, error: 'Ingrese una expresión.' }
  try {
    const node = parse(text)
    assertSafe(node)
    const code = node.compile()
    const fn: Fn = (x) => {
      try {
        const v = code.evaluate({ x })
        return typeof v === 'number' ? v : Number.NaN
      } catch {
        return Number.NaN
      }
    }
    let tex = text
    try {
      tex = node.toTex({ parenthesis: 'keep' })
    } catch {
      /* ignora */
    }
    // Prueba de humo: la evaluación no debe lanzar excepciones no controladas.
    fn(1)
    return { ok: true, node, fn, tex }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Expresión inválida.' }
  }
}

export interface DerivativeResult {
  fn: Fn
  /** Cómo se obtuvo: derivada simbólica de mathjs o diferencias centrales. */
  source: 'analytic' | 'numeric'
  tex?: string
}

/** Derivada analítica con mathjs; si falla, diferencias centrales. */
export function buildDerivative(expr: string, f: Fn): DerivativeResult {
  try {
    const d = derivative(normalizeExpression(expr), 'x')
    const code = d.compile()
    return {
      fn: (x) => {
        try {
          const v = code.evaluate({ x })
          return typeof v === 'number' ? v : Number.NaN
        } catch {
          return Number.NaN
        }
      },
      source: 'analytic',
      tex: d.toTex(),
    }
  } catch {
    return { fn: numericDerivative(f), source: 'numeric' }
  }
}

export function numericDerivative(f: Fn, h0 = 1e-6): Fn {
  return (x) => {
    const h = h0 * Math.max(1, Math.abs(x))
    return (f(x + h) - f(x - h)) / (2 * h)
  }
}
