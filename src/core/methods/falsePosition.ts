import type { Column, CommonOptions, MethodResult, StepRow } from '../types'
import { EPS, calcError, finish, invalid, validateCommon } from './common'

export interface FalsePositionOptions extends CommonOptions {
  a: number
  b: number
}

export const falsePositionColumns: Column[] = [
  { key: 'a', label: 'a' },
  { key: 'b', label: 'b' },
  { key: 'xr', label: 'xr' },
  { key: 'fa', label: 'f(a)' },
  { key: 'fb', label: 'f(b)' },
  { key: 'fxr', label: 'f(xr)' },
]

export function falsePosition(o: FalsePositionOptions): MethodResult {
  const start = performance.now()
  const bad = validateCommon(o)
  if (bad) return invalid('falsePosition', o, bad, start)
  let { a, b } = o
  if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) return invalid('falsePosition', o, 'El intervalo debe cumplir a < b.', start)
  let fa = o.f(a)
  let fb = o.f(b)
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return invalid('falsePosition', o, 'f(x) no está definida en algún extremo del intervalo.', start)
  if (fa * fb >= 0) {
    return invalid('falsePosition', o, `No se cumple el Teorema de Bolzano: f(a)·f(b) = ${(fa * fb).toExponential(3)} ≥ 0. Elija un intervalo con cambio de signo.`, start)
  }

  const steps: StepRow[] = []
  let prev: number | null = null
  for (let i = 1; i <= o.maxIter; i++) {
    if (Math.abs(fa - fb) < EPS) {
      return finish({ method: 'falsePosition', errorType: o.errorType, status: 'numerical-error', message: 'f(a) − f(b) ≈ 0: división por cero en la fórmula de xr.', steps, columns: falsePositionColumns, root: prev, fRoot: null, start })
    }
    const xr = b - (fb * (a - b)) / (fa - fb)
    const fxr = o.f(xr)
    if (!Number.isFinite(fxr)) {
      return finish({ method: 'falsePosition', errorType: o.errorType, status: 'numerical-error', message: `f(x) no es finita en x = ${xr}.`, steps, columns: falsePositionColumns, root: xr, fRoot: null, start })
    }
    const error = prev === null ? null : calcError(xr, prev, o.errorType)
    steps.push({ i, a, b, xr, fa, fb, fxr, error })
    if (fxr === 0 || (error !== null && error < o.tol)) {
      return finish({ method: 'falsePosition', errorType: o.errorType, status: 'converged', message: `Convergió en ${i} iteraciones.`, steps, columns: falsePositionColumns, root: xr, fRoot: fxr, start })
    }
    if (fa * fxr < 0) {
      b = xr
      fb = fxr
    } else {
      a = xr
      fa = fxr
    }
    prev = xr
  }
  const last = steps[steps.length - 1]
  return finish({ method: 'falsePosition', errorType: o.errorType, status: 'max-iterations', message: 'Se alcanzó el máximo de iteraciones sin cumplir la tolerancia.', steps, columns: falsePositionColumns, root: last.xr as number, fRoot: last.fxr as number, start })
}
