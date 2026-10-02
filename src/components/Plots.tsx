import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Data, Layout, Shape } from 'plotly.js-dist-min'
import type { Fn, MethodResult, StepRow } from '@/core/types'
import { Card } from '@/components/ui/primitives'

type PlotlyLib = typeof import('plotly.js-dist-min')
let plotlyPromise: Promise<PlotlyLib> | null = null
const loadPlotly = () => (plotlyPromise ??= import('plotly.js-dist-min').then((m) => (m as unknown as { default: PlotlyLib }).default ?? m))

function useTheme(dark: boolean) {
  return dark
    ? { font: '#d4d4d8', grid: '#27272a', zero: '#52525b', curve: '#60a5fa', accent: '#f59e0b', root: '#f43f5e', fill: 'rgba(96,165,250,0.15)' }
    : { font: '#3f3f46', grid: '#e4e4e7', zero: '#a1a1aa', curve: '#2563eb', accent: '#d97706', root: '#e11d48', fill: 'rgba(37,99,235,0.12)' }
}

interface Curve {
  /** Índice de la traza a re-muestrear. */
  idx: number
  fn: Fn
}

/** Muestrea fn en [lo - w, hi + w] (un ancho extra a cada lado para que el arrastre no muestre huecos). */
function sample(fn: Fn, lo: number, hi: number, n = 700) {
  const w = hi - lo
  const a = lo - w
  const b = hi + w
  const xs = Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n)
  const ys = xs.map((x) => { const v = fn(x); return Number.isFinite(v) ? v : null })
  return { xs, ys }
}

function usePlot(build: (() => { data: Data[]; layout: Partial<Layout>; curves?: Curve[] }) | null, deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !build) return
    let cancelled = false
    loadPlotly().then((Plotly) => {
      if (cancelled) return
      const { data, layout, curves } = build()
      Plotly.react(el, data, layout, { responsive: true, displaylogo: false, scrollZoom: true })
      const plot = el as unknown as Plotly.PlotlyHTMLElement & { _fullLayout?: { xaxis: { range: [number, number] } } }
      plot.removeAllListeners?.('plotly_relayout')
      if (curves?.length) {
        // Estilo GeoGebra: al mover o hacer zoom, la curva se vuelve a calcular para el rango visible.
        plot.on('plotly_relayout', () => {
          const r = plot._fullLayout?.xaxis.range
          if (!r) return
          const [lo, hi] = r
          for (const c of curves) {
            const { xs, ys } = sample(c.fn, Math.min(lo, hi), Math.max(lo, hi))
            Plotly.restyle(el, { x: [xs], y: [ys] } as unknown as Partial<Data>, [c.idx])
          }
        })
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => {
    const el = ref.current
    return () => {
      if (el) loadPlotly().then((P) => P.purge(el))
    }
  }, [])
  return ref
}

const num = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v)

function xRange(result: MethodResult): [number, number] {
  const xs: number[] = []
  for (const s of result.steps) for (const c of result.columns) if (['a', 'b', 'xr', 'xi', 'xp', 'xn', 'gxi', 'xa', 'xb', 'xc'].includes(c.key) && num(s[c.key])) xs.push(s[c.key] as number)
  if (num(result.root)) xs.push(result.root)
  if (!xs.length) return [-5, 5]
  let lo = Math.min(...xs)
  let hi = Math.max(...xs)
  const w = Math.max(hi - lo, 1)
  const pad = w * 0.35
  lo -= pad
  hi += pad
  return [lo, hi]
}

/** Valores de y dentro del rango x inicial (el muestreo cubre tres veces ese ancho). */
function visible(xs: number[], ys: (number | null)[], lo: number, hi: number): number[] {
  const out: number[] = []
  xs.forEach((x, i) => { const y = ys[i]; if (x >= lo && x <= hi && y !== null) out.push(y) })
  return out
}

function yRange(ys: number[], extra: number[] = []): [number, number] {
  const finite = ys.filter(num).sort((p, q) => p - q)
  if (!finite.length) return [-1, 1]
  const lo = finite[Math.floor(finite.length * 0.03)]
  const hi = finite[Math.ceil(finite.length * 0.97) - 1]
  const all = [lo, hi, 0, ...extra.filter(num)]
  const mn = Math.min(...all)
  const mx = Math.max(...all)
  const pad = (mx - mn || 1) * 0.12
  return [mn - pad, mx + pad]
}

interface PlotterProps {
  f: Fn
  g?: Fn
  result: MethodResult
  dark: boolean
}

export function FunctionPlotter({ f, g, result, dark }: PlotterProps) {
  const t = useTheme(dark)
  const build = useMemo(
    () => () => {
      const [x0, x1] = xRange(result)
      const { xs, ys: fy } = sample(f, x0, x1)
      const gy = g ? sample(g, x0, x1).ys : null
      const curves: Curve[] = []
      const data: Data[] = []
      const shapes: Partial<Shape>[] = []
      const steps = result.steps
      const last: StepRow | undefined = steps[steps.length - 1]
      const guide = { color: t.accent, width: 1.2, dash: 'dot' as const }

      const extraY: number[] = []
      if (result.method === 'fixedPoint' && gy) {
        // y = x, y = g(x) y telaraña
        curves.push({ idx: data.length, fn: g! })
        data.push({ x: xs, y: gy as number[], mode: 'lines', name: 'g(x)', line: { color: '#a78bfa', width: 1.8 } })
        data.push({ x: [x0, x1], y: [x0, x1], mode: 'lines', name: 'y = x', line: { color: t.zero, width: 1.2, dash: 'dash' } })
        const px: number[] = []
        const py: number[] = []
        for (const s of steps.slice(0, 40)) {
          if (!num(s.xi) || !num(s.gxi)) continue
          if (!px.length) { px.push(s.xi); py.push(0) }
          px.push(s.xi, s.gxi)
          py.push(s.gxi, s.gxi)
        }
        data.push({ x: px, y: py, mode: 'lines', name: 'Telaraña', line: guide })
        extraY.push(...py)
      }
      curves.push({ idx: data.length, fn: f })
      data.push({ x: xs, y: fy as number[], mode: 'lines', name: 'f(x)', line: { color: t.curve, width: 2.4 }, connectgaps: false })

      if (result.method === 'bisection' || result.method === 'falsePosition') {
        if (last && num(last.a) && num(last.b)) {
          shapes.push({ type: 'rect', xref: 'x', yref: 'paper', x0: last.a, x1: last.b, y0: 0, y1: 1, fillcolor: t.fill, line: { width: 0 }, layer: 'below' })
          for (const v of [last.a, last.b]) shapes.push({ type: 'line', xref: 'x', yref: 'paper', x0: v, x1: v, y0: 0, y1: 1, line: guide })
          if (result.method === 'falsePosition' && num(last.fa) && num(last.fb)) {
            data.push({ x: [last.a, last.b], y: [last.fa, last.fb], mode: 'lines+markers', name: 'Secante final', line: { color: t.accent, width: 1.5 }, marker: { size: 6 } })
          }
        }
        data.push({ x: steps.map((s) => s.xr as number), y: steps.map(() => 0), mode: 'markers', name: 'xr por iteración', marker: { color: t.accent, size: 7, symbol: 'line-ns-open', line: { width: 1.5, color: t.accent } } })
      } else if (result.method === 'newton') {
        steps.slice(0, 6).forEach((s, k) => {
          if (!num(s.xi) || !num(s.fxi) || !num(s.dfxi) || !num(s.xn)) return
          data.push({ x: [s.xi, s.xi, s.xn], y: [0, s.fxi, 0], mode: 'lines+markers', name: k === 0 ? 'Tangentes' : `Tangente ${k + 1}`, showlegend: k === 0, legendgroup: 'tan', line: { color: t.accent, width: 1.3, dash: k === 0 ? 'solid' : 'dot' }, marker: { size: 5 } })
          extraY.push(s.fxi)
        })
      } else if (result.method === 'secant') {
        steps.slice(0, 6).forEach((s, k) => {
          if (!num(s.xp) || !num(s.xi) || !num(s.fxp) || !num(s.fxi) || !num(s.xn)) return
          const xa = Math.min(s.xp, s.xi, s.xn)
          const xb = Math.max(s.xp, s.xi, s.xn)
          const slope = (s.fxi - s.fxp) / (s.xi - s.xp)
          data.push({ x: [xa, xb], y: [s.fxi + slope * (xa - s.xi), s.fxi + slope * (xb - s.xi)], mode: 'lines', name: k === 0 ? 'Secantes' : `Secante ${k + 1}`, showlegend: k === 0, legendgroup: 'sec', line: { color: t.accent, width: 1.3, dash: k === 0 ? 'solid' : 'dot' } })
          data.push({ x: [s.xp, s.xi], y: [s.fxp, s.fxi], mode: 'markers', showlegend: false, legendgroup: 'sec', marker: { color: t.accent, size: 6 } })
          extraY.push(s.fxp, s.fxi)
        })
      } else if (result.method === 'muller') {
        // Parábola de Lagrange por los tres puntos de cada iteración (las primeras 4).
        steps.slice(0, 4).forEach((s, k) => {
          if (![s.xa, s.xb, s.xc, s.fxa, s.fxb, s.fxc, s.xn].every(num)) return
          const [p0, p1, p2, q0, q1, q2] = [s.xa, s.xb, s.xc, s.fxa, s.fxb, s.fxc] as number[]
          const lagr = (x: number) =>
            (q0 * (x - p1) * (x - p2)) / ((p0 - p1) * (p0 - p2)) + (q1 * (x - p0) * (x - p2)) / ((p1 - p0) * (p1 - p2)) + (q2 * (x - p0) * (x - p1)) / ((p2 - p0) * (p2 - p1))
          const lo = Math.min(p0, p1, p2, s.xn as number)
          const hi = Math.max(p0, p1, p2, s.xn as number)
          const m = (hi - lo) * 0.25 || 0.5
          const px = Array.from({ length: 80 }, (_, i) => lo - m + ((hi - lo + 2 * m) * i) / 79)
          data.push({ x: px, y: px.map(lagr), mode: 'lines', name: k === 0 ? 'Parábolas' : `Parábola ${k + 1}`, showlegend: k === 0, legendgroup: 'par', line: { color: t.accent, width: 1.3, dash: k === 0 ? 'solid' : 'dot' } })
          data.push({ x: [p0, p1, p2], y: [q0, q1, q2], mode: 'markers', showlegend: false, legendgroup: 'par', marker: { color: t.accent, size: 6 } })
          extraY.push(q0, q1, q2)
        })
      }

      if (num(result.root)) {
        data.push({ x: [result.root], y: [0], mode: 'markers', name: `Raíz ≈ ${result.root.toPrecision(7)}`, marker: { color: t.root, size: 13, symbol: 'diamond', line: { color: '#fff', width: 1.5 } } })
      }

      const layout: Partial<Layout> = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: t.font, family: 'ui-monospace, Menlo, Consolas, monospace', size: 12 },
        margin: { l: 50, r: 20, t: 10, b: 40 },
        xaxis: { range: [x0, x1], gridcolor: t.grid, zeroline: false, title: { text: 'x' } },
        yaxis: { range: yRange([...visible(xs, fy, x0, x1), ...(result.method === 'fixedPoint' ? visible(xs, gy!, x0, x1) : [])], extraY), gridcolor: t.grid, zeroline: false, title: { text: 'y' } },
        shapes: [{ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 0, y1: 0, line: { color: t.zero, width: 1.5 } }, ...shapes] as Shape[],
        legend: { orientation: 'h', y: -0.2 },
        hovermode: 'closest',
        dragmode: 'pan',
        height: 420,
      }
      return { data, layout, curves }
    },
    [f, g, result, t],
  )
  const ref = usePlot(build, [build])
  return (
    <Card className="p-3">
      <h3 className="mb-2 px-1 text-sm font-semibold">Gráfico de f(x)</h3>
      <div ref={ref} className="w-full" style={{ minHeight: 420 }} />
    </Card>
  )
}

export function ConvergencePlot({ result, dark }: { result: MethodResult; dark: boolean }) {
  const [open, setOpen] = useState(true)
  const t = useTheme(dark)
  const pts = result.steps.filter((s) => num(s.error) && s.error > 0)
  const build = useMemo(
    () => () => ({
      data: [{ x: pts.map((s) => s.i), y: pts.map((s) => s.error as number), mode: 'lines+markers', name: 'Error', line: { color: t.curve, width: 2 }, marker: { size: 6 } } as Data],
      layout: {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: t.font, family: 'ui-monospace, Menlo, Consolas, monospace', size: 12 },
        margin: { l: 60, r: 20, t: 10, b: 40 },
        xaxis: { title: { text: 'Iteración' }, gridcolor: t.grid, dtick: pts.length > 20 ? undefined : 1 },
        yaxis: { title: { text: result.errorType === 'relative' ? 'Error (%)' : 'Error abs.' }, type: 'log', gridcolor: t.grid, exponentformat: 'e' },
        height: 300,
      } as Partial<Layout>,
    }),
    [result, t], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const ref = usePlot(open && pts.length ? build : null, [build, open])
  return (
    <Card className="p-3">
      <button className="flex w-full items-center justify-between px-1 text-sm font-semibold" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Curva de convergencia (error vs. iteración, escala log)
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (pts.length ? <div ref={ref} className="mt-2 w-full" style={{ minHeight: 300 }} /> : <p className="p-4 text-center text-xs text-muted-foreground">No hay errores positivos que graficar.</p>)}
    </Card>
  )
}
