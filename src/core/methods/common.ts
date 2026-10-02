import type { Column, CommonOptions, ConvergenceStatus, ErrorType, MethodId, MethodResult, StepRow } from '../types'

export const EPS = 1e-12

/** Error absoluto |xn - xp| o relativo porcentual |xn - xp| / |xn| * 100. */
export function calcError(xNew: number, xOld: number, type: ErrorType): number {
  const abs = Math.abs(xNew - xOld)
  if (type === 'absolute') return abs
  if (xNew === 0) return abs === 0 ? 0 : Infinity
  return (abs / Math.abs(xNew)) * 100
}

export function validateCommon(o: CommonOptions): string | null {
  if (!Number.isFinite(o.tol) || o.tol <= 0) return 'La tolerancia debe ser un número positivo.'
  if (!Number.isInteger(o.maxIter) || o.maxIter < 1) return 'El máximo de iteraciones debe ser un entero ≥ 1.'
  return null
}

export function finish(args: {
  method: MethodId
  errorType: ErrorType
  status: ConvergenceStatus
  message: string
  steps: StepRow[]
  columns: Column[]
  root: number | null
  fRoot: number | null
  start: number
}): MethodResult {
  const { steps } = args
  const lastErr = [...steps].reverse().find((s) => s.error !== null)?.error ?? null
  return {
    method: args.method,
    root: args.root,
    fRoot: args.fRoot,
    iterations: steps.length,
    error: lastErr,
    errorType: args.errorType,
    status: args.status,
    converged: args.status === 'converged',
    message: args.message,
    timeMs: performance.now() - args.start,
    steps,
    columns: args.columns,
  }
}

export function invalid(method: MethodId, o: CommonOptions, message: string, start: number): MethodResult {
  return finish({ method, errorType: o.errorType, status: 'invalid-input', message, steps: [], columns: [], root: null, fRoot: null, start })
}
