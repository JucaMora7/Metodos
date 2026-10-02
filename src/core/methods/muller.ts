import type { Column, CommonOptions, MethodResult, StepRow } from '../types'
import { EPS, calcError, finish, invalid, validateCommon } from './common'

export interface MullerOptions extends CommonOptions {
  x0: number
  x1: number
  x2: number
}

export const mullerColumns: Column[] = [
  { key: 'xa', label: 'xᵢ₋₂' },
  { key: 'xb', label: 'xᵢ₋₁' },
  { key: 'xc', label: 'xᵢ' },
  { key: 'fxc', label: 'f(xᵢ)' },
  { key: 'xn', label: 'xᵢ₊₁' },
  { key: 'fxn', label: 'f(xᵢ₊₁)' },
]

/**
 * Método de Müller: ajusta una parábola por los tres últimos puntos y toma su raíz más cercana a xᵢ.
 * Trabaja solo con números reales: si el discriminante es negativo, la parábola no corta el eje x
 * (la raíz sería compleja) y el método se detiene con un mensaje.
 */
export function muller(o: MullerOptions): MethodResult {
  const start = performance.now()
  const bad = validateCommon(o)
  if (bad) return invalid('muller', o, bad, start)
  const pts = [o.x0, o.x1, o.x2]
  if (pts.some((p) => !Number.isFinite(p))) return invalid('muller', o, 'x0, x1 y x2 deben ser números finitos.', start)
  if (new Set(pts).size < 3) return invalid('muller', o, 'x0, x1 y x2 deben ser tres puntos distintos.', start)

  const steps: StepRow[] = []
  let [xa, xb, xc] = pts
  let fxa = o.f(xa)
  let fxb = o.f(xb)
  let fxc = o.f(xc)
  const fail = (status: 'numerical-error' | 'diverged', message: string, root: number | null, fRoot: number | null) =>
    finish({ method: 'muller', errorType: o.errorType, status, message, steps, columns: mullerColumns, root, fRoot, start })

  for (let i = 1; i <= o.maxIter; i++) {
    if (![fxa, fxb, fxc].every(Number.isFinite)) return fail('numerical-error', 'f(x) no es finita en los puntos actuales.', xc, null)
    const h0 = xb - xa
    const h1 = xc - xb
    if (Math.abs(h0) < EPS || Math.abs(h1) < EPS) return fail('numerical-error', `Dos puntos coinciden (iteración ${i}): no se puede ajustar la parábola.`, xc, fxc)
    const d0 = (fxb - fxa) / h0
    const d1 = (fxc - fxb) / h1
    const a = (d1 - d0) / (h1 + h0)
    const b = a * h1 + d1
    const c = fxc
    const disc = b * b - 4 * a * c
    if (disc < 0) {
      return fail('numerical-error', `Discriminante negativo (${disc.toExponential(3)}) en la iteración ${i}: la parábola no corta el eje x, la raíz sería compleja. Pruebe otros puntos iniciales.`, xc, fxc)
    }
    // Se elige el signo que maximiza |denominador| (raíz más cercana a xᵢ, más estable).
    const sq = Math.sqrt(disc)
    const den = b >= 0 ? b + sq : b - sq
    if (Math.abs(den) < EPS) {
      // a ≈ 0 y b ≈ 0 con c ≠ 0 no tiene raíz; con c = 0 ya estamos en la raíz.
      if (c === 0) return fail('numerical-error', 'Ya se está en la raíz.', xc, fxc)
      return fail('numerical-error', `Denominador ≈ 0 en la iteración ${i}: la parábola es horizontal.`, xc, fxc)
    }
    const xn = xc - (2 * c) / den
    const fxn = o.f(xn)
    const error = calcError(xn, xc, o.errorType)
    steps.push({ i, xa, xb, xc, fxa, fxb, fxc, xn, fxn: Number.isFinite(fxn) ? fxn : null, error })
    if (!Number.isFinite(xn) || Math.abs(xn) > 1e12) return fail('diverged', 'El método diverge (|x| demasiado grande).', null, null)
    if (!Number.isFinite(fxn)) return fail('numerical-error', `f(x) no es finita en x = ${xn}.`, xn, null)
    if (fxn === 0 || error < o.tol) {
      return finish({ method: 'muller', errorType: o.errorType, status: 'converged', message: `Convergió en ${i} iteraciones.`, steps, columns: mullerColumns, root: xn, fRoot: fxn, start })
    }
    xa = xb; fxa = fxb
    xb = xc; fxb = fxc
    xc = xn; fxc = fxn
  }
  return finish({ method: 'muller', errorType: o.errorType, status: 'max-iterations', message: 'Se alcanzó el máximo de iteraciones sin cumplir la tolerancia.', steps, columns: mullerColumns, root: xc, fRoot: fxc, start })
}
