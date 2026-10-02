import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Eraser, FlaskConical, Moon, Play, Sun, XCircle } from 'lucide-react'
import { bisection, falsePosition, fixedPoint, muller, newton, secant } from '@/core/methods'
import { buildDerivative, compileExpression } from '@/core/math/parser'
import { DEFAULT_VALUES, METHODS, type FormValues } from '@/core/config'
import type { ErrorType, Fn, MethodId, MethodResult } from '@/core/types'
import { cn, fmt } from '@/lib/utils'
import { Badge, Button, Card, Input, Label, Select } from '@/components/ui/primitives'
import { MathInput } from '@/components/MathInput'
import { IterationTable } from '@/components/IterationTable'
import { ConvergencePlot, FunctionPlotter } from '@/components/Plots'

interface Outcome {
  result: MethodResult
  f: Fn
  g?: Fn
  decimals: number
  note?: string
}

const TOL_SUGGESTIONS = { absolute: ['0.001', '0.00001', '0.0000001'], relative: ['5', '1', '0.1', '0.01'] }
const TOL_DEFAULT = { absolute: '0.001', relative: '1' }

function readTheme(): boolean {
  try {
    return localStorage.getItem('theme') !== 'light'
  } catch {
    return true
  }
}

function parseNumber(label: string, s: string): number {
  const p = compileExpression(s)
  const v = p.ok ? p.fn(0) : Number.NaN
  if (!p.ok || !Number.isFinite(v)) throw new Error(`${label}: valor numérico inválido.`)
  return v
}

export default function App() {
  const [dark, setDark] = useState(readTheme)
  const [methodId, setMethodId] = useState<MethodId>('bisection')
  const [values, setValues] = useState<FormValues>(() => ({ ...DEFAULT_VALUES, ...METHODS[0].examples[0].values }))
  const [tolText, setTolText] = useState('1')
  const [maxIter, setMaxIter] = useState('50')
  const [errorType, setErrorType] = useState<ErrorType>('relative')
  const [decimals, setDecimals] = useState(6)
  const [exampleIdx, setExampleIdx] = useState(0)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const method = METHODS.find((m) => m.id === methodId)!
  const set = (k: keyof FormValues) => (v: string) => setValues((s) => ({ ...s, [k]: v }))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      /* ignora */
    }
  }, [dark])

  const loadExample = useCallback((id: MethodId, idx: number) => {
    const m = METHODS.find((x) => x.id === id)!
    const ex = m.examples[idx % m.examples.length]
    setValues({ ...DEFAULT_VALUES, ...ex.values })
    setExampleIdx(idx % m.examples.length)
    setOutcome(null)
    setFormError(null)
  }, [])

  const selectMethod = (id: MethodId) => {
    setMethodId(id)
    loadExample(id, 0)
  }

  const clear = () => {
    setValues(DEFAULT_VALUES)
    setOutcome(null)
    setFormError(null)
  }

  const run = () => {
    setFormError(null)
    try {
      const fp = compileExpression(values.expr)
      if (!fp.ok) throw new Error(`f(x): ${fp.error}`)
      const f = fp.fn
      const tol = parseNumber('Error objetivo', tolText)
      const iters = Number(maxIter)
      if (!Number.isInteger(iters) || iters < 1 || iters > 100000) throw new Error('Máx. iteraciones: ingrese un entero entre 1 y 100000.')
      const base = { f, tol, maxIter: iters, errorType }
      let result: MethodResult
      let g: Fn | undefined
      let note: string | undefined
      switch (methodId) {
        case 'bisection':
          result = bisection({ ...base, a: parseNumber('a', values.a), b: parseNumber('b', values.b) })
          break
        case 'falsePosition':
          result = falsePosition({ ...base, a: parseNumber('a', values.a), b: parseNumber('b', values.b) })
          break
        case 'newton': {
          let df: Fn
          if (values.df.trim()) {
            const dp = compileExpression(values.df)
            if (!dp.ok) throw new Error(`f'(x): ${dp.error}`)
            df = dp.fn
            note = "Derivada ingresada manualmente."
          } else {
            const d = buildDerivative(values.expr, f)
            df = d.fn
            note = d.source === 'analytic' ? `Derivada analítica (mathjs): f'(x) = ${d.tex}` : "Derivada numérica (diferencias centrales)."
          }
          result = newton({ ...base, x0: parseNumber('x0', values.x0), df })
          break
        }
        case 'secant':
          result = secant({ ...base, x0: parseNumber('x0', values.x0), x1: parseNumber('x1', values.x1) })
          break
        case 'muller':
          result = muller({ ...base, x0: parseNumber('x0', values.x0), x1: parseNumber('x1', values.x1), x2: parseNumber('x2', values.x2) })
          break
        case 'fixedPoint': {
          const gp = compileExpression(values.g)
          if (!gp.ok) throw new Error(`g(x): ${gp.error}`)
          g = gp.fn
          result = fixedPoint({ ...base, g, x0: parseNumber('x0', values.x0) })
          break
        }
      }
      setOutcome({ result, f, g, decimals, note })
    } catch (e) {
      setOutcome(null)
      setFormError(e instanceof Error ? e.message : 'Error desconocido.')
    }
  }

  const r = outcome?.result
  const dec = outcome?.decimals ?? decimals

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="border-b bg-card md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-base font-bold leading-tight">Métodos Numéricos</h1>
            <a href="#/" className="text-xs text-muted-foreground hover:text-foreground">← Inicio</a>
            <p className="text-xs text-muted-foreground">Ecuaciones no lineales</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setDark((d) => !d)} aria-label="Cambiar tema">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible" aria-label="Métodos">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMethod(m.id)}
              aria-current={m.id === methodId}
              className={cn('shrink-0 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted', m.id === methodId && 'bg-primary/15 font-semibold text-primary')}
            >
              {m.name}
              <span className="block text-xs font-normal text-muted-foreground">{m.short}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 space-y-4 p-4 lg:p-6">
        <div>
          <h2 className="text-xl font-bold">{method.name}</h2>
          <p className="text-sm text-muted-foreground">{method.description}</p>
        </div>

        {/* Formulario */}
        <Card className="space-y-4 p-4">
          <MathInput id="expr" label="Ecuación f(x) = 0" prefix="f(x) =" value={values.expr} onChange={set('expr')} placeholder="x^3 - exp(x) + sin(x)" />

          <div className="grid gap-4 sm:grid-cols-2">
            {method.fields.includes('interval') && (
              <>
                <NumField id="a" label="Extremo a" value={values.a} onChange={set('a')} />
                <NumField id="b" label="Extremo b" value={values.b} onChange={set('b')} />
              </>
            )}
            {(method.fields.includes('x0') || method.fields.includes('x0x1') || method.fields.includes('x0x1x2')) && <NumField id="x0" label="Punto inicial x0" value={values.x0} onChange={set('x0')} />}
            {(method.fields.includes('x0x1') || method.fields.includes('x0x1x2')) && <NumField id="x1" label="Punto inicial x1" value={values.x1} onChange={set('x1')} />}
            {method.fields.includes('x0x1x2') && <NumField id="x2" label="Punto inicial x2" value={values.x2} onChange={set('x2')} />}
          </div>

          {method.fields.includes('g') && <MathInput id="g" label="Función de iteración g(x), con x = g(x)" prefix="g(x) =" value={values.g} onChange={set('g')} placeholder="cbrt(x + 2)" />}
          {method.fields.includes('df') && (
            <MathInput id="df" label="f'(x) — opcional (vacío = cálculo automático con mathjs)" prefix="f'(x) =" value={values.df} onChange={set('df')} placeholder="3*x^2 - 1" />
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label htmlFor="tol">Parar cuando el error sea menor a{errorType === 'relative' ? ' (%)' : ''}</Label>
              <Input id="tol" list="tol-options" value={tolText} onChange={(e) => setTolText(e.target.value)} inputMode="decimal" placeholder={errorType === 'relative' ? 'p. ej. 1 (= 1 %)' : 'p. ej. 0.001'} />
              <datalist id="tol-options">{TOL_SUGGESTIONS[errorType].map((t) => <option key={t} value={t} />)}</datalist>
            </div>
            <div>
              <Label htmlFor="maxIter">Máx. iteraciones</Label>
              <Input id="maxIter" type="number" min={1} value={maxIter} onChange={(e) => setMaxIter(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="errType">Tipo de error</Label>
              <Select id="errType" value={errorType} onChange={(e) => { const t = e.target.value as ErrorType; setErrorType(t); setTolText(TOL_DEFAULT[t]) }}>
                <option value="absolute">Absoluto</option>
                <option value="relative">Relativo (%)</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="dec">Decimales</Label>
              <Select id="dec" value={decimals} onChange={(e) => setDecimals(Number(e.target.value))}>
                {[3, 4, 6, 8, 10, 12].map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </div>
          </div>
          {errorType === 'relative' && <p className="text-xs text-muted-foreground">Error relativo en porcentaje: escribir 1 significa parar cuando el error sea menor al 1 %.</p>}

          <div className="flex flex-wrap gap-2">
            <Button onClick={run}><Play className="h-4 w-4" /> Calcular</Button>
            <Button variant="secondary" onClick={() => loadExample(methodId, outcome || exampleIdx !== 0 || values.expr ? exampleIdx + 1 : 0)}>
              <FlaskConical className="h-4 w-4" /> Cargar Ejemplo Predefinido
            </Button>
            <Button variant="outline" onClick={clear}><Eraser className="h-4 w-4" /> Limpiar</Button>
          </div>
          {formError && <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"><XCircle className="mt-0.5 h-4 w-4 shrink-0" />{formError}</div>}
        </Card>

        {/* Resultados */}
        {r && outcome && (
          <>
            <StatusBanner r={r} note={outcome.note} />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Metric label="Raíz final" value={fmt(r.root, dec)} strong />
              <Metric label="f(raíz)" value={r.fRoot === null ? '—' : r.fRoot === 0 ? '0' : r.fRoot.toExponential(3)} />
              <Metric label="Iteraciones" value={String(r.iterations)} />
              <Metric label={r.errorType === 'relative' ? 'Error alcanzado (%)' : 'Error alcanzado'} value={r.error === null ? '—' : r.error.toExponential(3)} />
              <Metric label="Tiempo" value={`${r.timeMs.toFixed(3)} ms`} />
            </div>
            {r.steps.length > 0 && (
              <>
                <FunctionPlotter f={outcome.f} g={outcome.g} result={r} dark={dark} />
                <ConvergencePlot result={r} dark={dark} />
                <IterationTable result={r} decimals={dec} />
              </>
            )}
          </>
        )}
        {!r && !formError && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Configure la ecuación y presione <b>Calcular</b>. Ya hay un ejemplo cargado.</p>}
      </main>
    </div>
  )
}

function NumField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" autoComplete="off" placeholder="p. ej. 1.5 o pi/2" />
    </div>
  )
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('mt-1 truncate font-mono tabular-nums', strong ? 'text-xl font-bold text-primary' : 'text-lg font-semibold')} title={value}>{value}</div>
    </Card>
  )
}

function StatusBanner({ r, note }: { r: MethodResult; note?: string }) {
  const tone = r.status === 'converged' ? 'success' : r.status === 'max-iterations' ? 'warning' : 'destructive'
  const label = { converged: 'Convergió', 'max-iterations': 'Máx. iteraciones', diverged: 'Divergió', 'invalid-input': 'Entrada inválida', 'numerical-error': 'Error numérico' }[r.status]
  const Icon = tone === 'success' ? CheckCircle2 : AlertTriangle
  return (
    <Card className={cn('flex items-start gap-3 p-3', tone === 'success' ? 'border-success/40' : tone === 'warning' ? 'border-warning/40' : 'border-destructive/40')} role="status">
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', `text-${tone}`)} />
      <div className="min-w-0 text-sm">
        <Badge tone={tone}>{label}</Badge>
        <p className="mt-1">{r.message}</p>
        {note && <p className="mt-1 break-words font-mono text-xs text-muted-foreground">{note}</p>}
      </div>
    </Card>
  )
}
