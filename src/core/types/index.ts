export type ErrorType = 'absolute' | 'relative'

export type MethodId = 'bisection' | 'falsePosition' | 'newton' | 'secant' | 'muller' | 'fixedPoint'

export type ConvergenceStatus =
  | 'converged'
  | 'max-iterations'
  | 'diverged'
  | 'invalid-input'
  | 'numerical-error'

export type Fn = (x: number) => number

/** Una fila de la matriz de pasos. Las claves numéricas dependen del método (ver `columns`). */
export interface StepRow {
  i: number
  /** Error calculado en la iteración (null cuando aún no hay valor previo). */
  error: number | null
  [key: string]: number | null
}

export interface Column {
  key: string
  label: string
}

export interface CommonOptions {
  f: Fn
  tol: number
  maxIter: number
  /** 'relative' devuelve el error en porcentaje (%). */
  errorType: ErrorType
}

export interface MethodResult {
  method: MethodId
  root: number | null
  fRoot: number | null
  iterations: number
  /** Último error calculado (en % si errorType = relative). */
  error: number | null
  errorType: ErrorType
  status: ConvergenceStatus
  converged: boolean
  message: string
  timeMs: number
  steps: StepRow[]
  columns: Column[]
}
