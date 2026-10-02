import type { Column, CommonOptions, Fn, MethodResult, StepRow } from '../types'
import { calcError, finish, invalid, validateCommon } from './common'

export interface FixedPointOptions extends CommonOptions {
  /** g(x) despejada tal que x = g(x). */
  g: Fn
  x0: number
}

export const fixedPointColumns: Column[] = [
  { key: 'xi', label: 'xᵢ' },
  { key: 'gxi', label: 'g(xᵢ)' },
  { key: 'fxn', label: 'f(g(xᵢ))' },
]

const DIVERGENCE_STREAK = 6

export function fixedPoint(o: FixedPointOptions): MethodResult {
  const start = performance.now()
  const bad = validateCommon(o)
  if (bad) return invalid('fixedPoint', o, bad, start)
  if (!Number.isFinite(o.x0)) return invalid('fixedPoint', o, 'x0 debe ser un número finito.', start)

  const steps: StepRow[] = []
  let x = o.x0
  let prevErr = -Infinity
  let streak = 0
  for (let i = 1; i <= o.maxIter; i++) {
    const gx = o.g(x)
    if (!Number.isFinite(gx) || Math.abs(gx) > 1e12) {
      return finish({ method: 'fixedPoint', errorType: o.errorType, status: 'diverged', message: `g(x) diverge o no está definida en x = ${x} (iteración ${i}).`, steps, columns: fixedPointColumns, root: null, fRoot: null, start })
    }
    const fxn = o.f(gx)
    const error = calcError(gx, x, o.errorType)
    steps.push({ i, xi: x, gxi: gx, fxn: Number.isFinite(fxn) ? fxn : null, error })
    x = gx
    if (error < o.tol) {
      return finish({ method: 'fixedPoint', errorType: o.errorType, status: 'converged', message: `Convergió en ${i} iteraciones.`, steps, columns: fixedPointColumns, root: x, fRoot: Number.isFinite(fxn) ? fxn : null, start })
    }
    streak = error > prevErr && i > 1 ? streak + 1 : 0
    prevErr = error
    if (streak >= DIVERGENCE_STREAK) {
      return finish({ method: 'fixedPoint', errorType: o.errorType, status: 'diverged', message: `Divergencia temprana: el error creció durante ${DIVERGENCE_STREAK} iteraciones consecutivas (probablemente |g'(x)| ≥ 1). Pruebe otro despeje g(x).`, steps, columns: fixedPointColumns, root: null, fRoot: null, start })
    }
  }
  const fr = o.f(x)
  return finish({ method: 'fixedPoint', errorType: o.errorType, status: 'max-iterations', message: 'Se alcanzó el máximo de iteraciones sin cumplir la tolerancia.', steps, columns: fixedPointColumns, root: x, fRoot: Number.isFinite(fr) ? fr : null, start })
}
