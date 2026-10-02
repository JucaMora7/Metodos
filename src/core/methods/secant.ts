import type { Column, CommonOptions, MethodResult, StepRow } from '../types'
import { EPS, calcError, finish, invalid, validateCommon } from './common'

export interface SecantOptions extends CommonOptions {
  x0: number
  x1: number
}

export const secantColumns: Column[] = [
  { key: 'xp', label: 'xᵢ₋₁' },
  { key: 'xi', label: 'xᵢ' },
  { key: 'fxp', label: 'f(xᵢ₋₁)' },
  { key: 'fxi', label: 'f(xᵢ)' },
  { key: 'xn', label: 'xᵢ₊₁' },
]

export function secant(o: SecantOptions): MethodResult {
  const start = performance.now()
  const bad = validateCommon(o)
  if (bad) return invalid('secant', o, bad, start)
  if (!Number.isFinite(o.x0) || !Number.isFinite(o.x1)) return invalid('secant', o, 'x0 y x1 deben ser números finitos.', start)
  if (o.x0 === o.x1) return invalid('secant', o, 'x0 y x1 deben ser distintos.', start)

  const steps: StepRow[] = []
  let xp = o.x0
  let x = o.x1
  let fxp = o.f(xp)
  let fx = o.f(x)
  for (let i = 1; i <= o.maxIter; i++) {
    if (!Number.isFinite(fxp) || !Number.isFinite(fx)) {
      return finish({ method: 'secant', errorType: o.errorType, status: 'numerical-error', message: 'f(x) no es finita en los puntos actuales.', steps, columns: secantColumns, root: x, fRoot: null, start })
    }
    if (Math.abs(fx - fxp) < EPS) {
      return finish({ method: 'secant', errorType: o.errorType, status: 'numerical-error', message: `f(xᵢ) − f(xᵢ₋₁) ≈ 0 (iteración ${i}): la secante es horizontal.`, steps, columns: secantColumns, root: x, fRoot: fx, start })
    }
    const xn = x - (fx * (x - xp)) / (fx - fxp)
    const error = calcError(xn, x, o.errorType)
    steps.push({ i, xp, xi: x, fxp, fxi: fx, xn, error })
    if (!Number.isFinite(xn) || Math.abs(xn) > 1e12) {
      return finish({ method: 'secant', errorType: o.errorType, status: 'diverged', message: 'El método diverge (|x| demasiado grande).', steps, columns: secantColumns, root: null, fRoot: null, start })
    }
    xp = x
    fxp = fx
    x = xn
    fx = o.f(x)
    if (fx === 0 || error < o.tol) {
      return finish({ method: 'secant', errorType: o.errorType, status: 'converged', message: `Convergió en ${i} iteraciones.`, steps, columns: secantColumns, root: x, fRoot: fx, start })
    }
  }
  return finish({ method: 'secant', errorType: o.errorType, status: 'max-iterations', message: 'Se alcanzó el máximo de iteraciones sin cumplir la tolerancia.', steps, columns: secantColumns, root: x, fRoot: fx, start })
}
