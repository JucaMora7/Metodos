import { describe, expect, it } from 'vitest'
import { bisection, falsePosition, fixedPoint, newton, secant, muller } from './index'
import { buildDerivative, compileExpression } from '../math/parser'

const f = (x: number) => x ** 3 - x - 2
const ROOT = 1.5213797068045676
const base = { f, tol: 1e-8, maxIter: 100, errorType: 'absolute' as const }

describe('métodos numéricos: x³ − x − 2 = 0', () => {
  it('bisección', () => {
    const r = bisection({ ...base, a: 1, b: 2 })
    expect(r.converged).toBe(true)
    expect(r.root).toBeCloseTo(ROOT, 6)
    expect(r.steps.length).toBe(r.iterations)
  })
  it('bisección rechaza intervalo sin cambio de signo (Bolzano)', () => {
    const r = bisection({ ...base, a: 2, b: 3 })
    expect(r.status).toBe('invalid-input')
    expect(r.message).toMatch(/Bolzano/)
  })
  it('falsa posición', () => {
    const r = falsePosition({ ...base, a: 1, b: 2 })
    expect(r.converged).toBe(true)
    expect(r.root).toBeCloseTo(ROOT, 6)
  })
  it('newton-raphson con derivada manual', () => {
    const r = newton({ ...base, x0: 1.5, df: (x) => 3 * x * x - 1 })
    expect(r.converged).toBe(true)
    expect(r.root).toBeCloseTo(ROOT, 8)
    expect(r.iterations).toBeLessThan(8)
  })
  it('newton-raphson protege contra f\'(x) ≈ 0', () => {
    const r = newton({ ...base, f: (x) => x * x - 1, x0: 0, df: (x) => 2 * x })
    expect(r.status).toBe('numerical-error')
    expect(r.message).toMatch(/f'\(x\)/)
  })
  it('secante', () => {
    const r = secant({ ...base, x0: 1, x1: 2 })
    expect(r.converged).toBe(true)
    expect(r.root).toBeCloseTo(ROOT, 8)
  })
  it('secante protege contra f(x1) − f(x0) ≈ 0', () => {
    const r = secant({ ...base, f: (x) => x * x, x0: -1, x1: 1 })
    expect(r.status).toBe('numerical-error')
  })
  it('punto fijo converge con g = cbrt(x+2)', () => {
    const r = fixedPoint({ ...base, g: (x) => Math.cbrt(x + 2), x0: 1 })
    expect(r.converged).toBe(true)
    expect(r.root).toBeCloseTo(ROOT, 6)
  })
  it('punto fijo detecta divergencia con g = x³ − 2', () => {
    const r = fixedPoint({ ...base, g: (x) => x ** 3 - 2, x0: 1.5 })
    expect(r.status).toBe('diverged')
  })
  it('error relativo en %', () => {
    const r = bisection({ ...base, errorType: 'relative', tol: 1e-5, a: 1, b: 2 })
    expect(r.converged).toBe(true)
    expect(r.error!).toBeLessThan(1e-5)
  })
  it('máximo de iteraciones', () => {
    const r = bisection({ ...base, maxIter: 3, a: 1, b: 2 })
    expect(r.status).toBe('max-iterations')
    expect(r.iterations).toBe(3)
  })
})

describe('motor matemático', () => {
  it('compila y evalúa', () => {
    const p = compileExpression('x^3 - exp(x) + sin(x)')
    expect(p.ok).toBe(true)
    if (p.ok) expect(p.fn(0)).toBeCloseTo(-1, 12)
  })
  it('rechaza expresiones inseguras o inválidas', () => {
    expect(compileExpression('import("x")').ok).toBe(false)
    expect(compileExpression('y + 1').ok).toBe(false)
    expect(compileExpression('x +').ok).toBe(false)
    expect(compileExpression('[1,2,3]').ok).toBe(false)
  })
  it('derivada analítica', () => {
    const f2 = compileExpression('x^3 - x - 2')
    if (!f2.ok) throw new Error()
    const d = buildDerivative('x^3 - x - 2', f2.fn)
    expect(d.source).toBe('analytic')
    expect(d.fn(2)).toBeCloseTo(11, 10)
  })
})

describe('notación flexible', () => {
  it('acepta LaTeX, ln y superíndices', () => {
    const cases: Array<[string, number, number]> = [
      ['e^{3x} - 4', 0, -3],
      ['\\frac{x}{2} + 1', 2, 2],
      ['ln(x) + x²', 2, Math.log(2) + 4],
      ['3x^2', 2, 12],
    ]
    for (const [expr, x, y] of cases) {
      const p = compileExpression(expr)
      expect(p.ok, expr).toBe(true)
      if (p.ok) expect(p.fn(x)).toBeCloseTo(y, 10)
    }
  })
})

describe('método de Müller', () => {
  it('converge a la raíz de x³ − x − 2', () => {
    const r = muller({ ...base, x0: 1, x1: 1.5, x2: 2 })
    expect(r.converged).toBe(true)
    expect(r.root).toBeCloseTo(ROOT, 8)
    expect(r.iterations).toBeLessThan(8)
  })
  it('avisa cuando la raíz sería compleja (discriminante < 0)', () => {
    const r = muller({ ...base, f: (x) => x * x + 1, x0: 0, x1: 1, x2: 2 })
    expect(r.status).toBe('numerical-error')
    expect(r.message).toMatch(/complej/)
  })
  it('rechaza puntos repetidos', () => {
    expect(muller({ ...base, x0: 1, x1: 1, x2: 2 }).status).toBe('invalid-input')
  })
})
