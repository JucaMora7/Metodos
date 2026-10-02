import type { Column, CommonOptions, Fn, MethodResult, StepRow } from '../types'
import { EPS, calcError, finish, invalid, validateCommon } from './common'

export interface NewtonOptions extends CommonOptions {
  x0: number
  /** Derivada f'(x): manual, analítica o numérica. */
  df: Fn
}

export const newtonColumns: Column[] = [
  { key: 'xi', label: 'xᵢ' },
  { key: 'fxi', label: 'f(xᵢ)' },
  { key: 'dfxi', label: "f'(xᵢ)" },
  { key: 'xn', label: 'xᵢ₊₁' },
]

export function newton(o: NewtonOptions): MethodResult {
  const start = performance.now()
  const bad = validateCommon(o)
  if (bad) return invalid('newton', o, bad, start)
  if (!Number.isFinite(o.x0)) return invalid('newton', o, 'x0 debe ser un número finito.', start)

  const steps: StepRow[] = []
  let x = o.x0
  for (let i = 1; i <= o.maxIter; i++) {
    const fx = o.f(x)
    const dfx = o.df(x)
    if (!Number.isFinite(fx) || !Number.isFinite(dfx)) {
      return finish({ method: 'newton', errorType: o.errorType, status: 'numerical-error', message: `f o f' no son finitas en x = ${x}.`, steps, columns: newtonColumns, root: x, fRoot: null, start })
    }
    if (Math.abs(dfx) < EPS) {
      return finish({ method: 'newton', errorType: o.errorType, status: 'numerical-error', message: `f'(x) ≈ 0 en x = ${x} (iteración ${i}): la tangente es horizontal. Pruebe otro x0.`, steps, columns: newtonColumns, root: x, fRoot: fx, start })
    }
    const xn = x - fx / dfx
    const error = calcError(xn, x, o.errorType)
    steps.push({ i, xi: x, fxi: fx, dfxi: dfx, xn, error })
    if (!Number.isFinite(xn) || Math.abs(xn) > 1e12) {
      return finish({ method: 'newton', errorType: o.errorType, status: 'diverged', message: 'El método diverge (|x| demasiado grande).', steps, columns: newtonColumns, root: null, fRoot: null, start })
    }
    x = xn
    if (fx === 0 || error < o.tol) {
      return finish({ method: 'newton', errorType: o.errorType, status: 'converged', message: `Convergió en ${i} iteraciones.`, steps, columns: newtonColumns, root: x, fRoot: o.f(x), start })
    }
  }
  return finish({ method: 'newton', errorType: o.errorType, status: 'max-iterations', message: 'Se alcanzó el máximo de iteraciones sin cumplir la tolerancia.', steps, columns: newtonColumns, root: x, fRoot: o.f(x), start })
}
