import { useEffect, useMemo, useState } from 'react'
import { bisection, falsePosition, newton, secant } from '@/core/methods'
import { FunctionPlotter } from '@/components/Plots'
import type { Fn, MethodResult } from '@/core/types'
import './landing.css'

const CALC = '#/calculadora'
const f: Fn = (x) => x ** 3 - x - 2
const df: Fn = (x) => 3 * x * x - 1

type DemoId = 'newton' | 'secant' | 'bisection' | 'falsePosition'
const DEMOS: Array<{ id: DemoId; label: string; param: string; min: number; max: number; init: number; note: string }> = [
  { id: 'newton', label: 'Newton-Raphson', param: 'x₀ (punto inicial)', min: -0.4, max: 3, init: 2.6, note: 'Las líneas ámbar son las tangentes. Cerca de x = ±0.577 la derivada es casi 0 y el método falla.' },
  { id: 'secant', label: 'Secante', param: 'x₀ (con x₁ = x₀ + 0.5)', min: -0.4, max: 3, init: 1, note: 'Cada recta pasa por los dos últimos puntos, sin necesitar la derivada.' },
  { id: 'bisection', label: 'Bisección', param: 'a (con b = 2)', min: 0, max: 1.5, init: 0.2, note: 'El área azul es el último intervalo [a, b] que conserva el cambio de signo.' },
  { id: 'falsePosition', label: 'Falsa Posición', param: 'a (con b = 2)', min: 0, max: 1.5, init: 0.2, note: 'La línea ámbar es la secante final entre (a, f(a)) y (b, f(b)).' },
]

function runDemo(id: DemoId, p: number): MethodResult {
  const base = { f, tol: 0.0001, maxIter: 40, errorType: 'relative' as const }
  switch (id) {
    case 'newton': return newton({ ...base, x0: p, df })
    case 'secant': return secant({ ...base, x0: p, x1: p + 0.5 })
    case 'bisection': return bisection({ ...base, a: p, b: 2 })
    case 'falsePosition': return falsePosition({ ...base, a: p, b: 2 })
  }
}

function InteractiveDemo() {
  const [id, setId] = useState<DemoId>('newton')
  const cfg = DEMOS.find((d) => d.id === id)!
  const [param, setParam] = useState(cfg.init)
  const result = useMemo(() => runDemo(id, param), [id, param])
  const status = result.converged ? 'ok' : 'bad'

  return (
    <div className="demo">
      <div className="demo-head">
        <span className="fx">f(x) = x³ − x − 2</span>
        <span className="live"><i /> Interactivo · arrastra el control</span>
      </div>
      <div className="tabs" role="group" aria-label="Método de la demostración">
        {DEMOS.map((d) => (
          <button key={d.id} className="tab" aria-pressed={d.id === id} onClick={() => { setId(d.id); setParam(d.init) }}>{d.label}</button>
        ))}
      </div>
      <div className="demo-plot"><FunctionPlotter f={f} result={result} dark /></div>
      <div className="ctrl">
        <div>
          <label htmlFor="demo-p"><span>{cfg.param}</span><b className="mono">{param.toFixed(2)}</b></label>
          <input id="demo-p" type="range" min={cfg.min} max={cfg.max} step={0.05} value={param} onChange={(e) => setParam(Number(e.target.value))} />
        </div>
        <div className="readout">
          <div><small>Raíz</small><b className={status}>{result.root === null ? '—' : result.root.toFixed(6)}</b></div>
          <div><small>Iteraciones</small><b>{result.iterations}</b></div>
          <div><small>Error (%)</small><b>{result.error === null ? '—' : result.error.toExponential(2)}</b></div>
        </div>
      </div>
      <p className="demo-note">{result.converged ? cfg.note : result.message}</p>
    </div>
  )
}

const METHODS = [
  { icon: 'B', tag: 'Intervalo', t: 'Bisección', d: 'Divide [a, b] a la mitad conservando el cambio de signo. Siempre converge si f(a)·f(b) < 0.', f: 'xr = (a + b) / 2' },
  { icon: 'F', tag: 'Intervalo', t: 'Falsa Posición', d: 'Usa la intersección de la recta secante con el eje x. Suele ser más rápida que la bisección.', f: 'xr = b − f(b)(a − b) / (f(a) − f(b))' },
  { icon: 'N', tag: 'Derivada', t: 'Newton-Raphson', d: 'Convergencia cuadrática con la tangente. Ingresa f′(x) o deja que mathjs la calcule.', f: 'xᵢ₊₁ = xᵢ − f(xᵢ) / f′(xᵢ)' },
  { icon: 'S', tag: 'Sin derivada', t: 'Secante', d: 'Aproxima la pendiente con los dos últimos puntos. Requiere x₀ y x₁.', f: 'xᵢ₊₁ = xᵢ − f(xᵢ)(xᵢ − xᵢ₋₁) / (f(xᵢ) − f(xᵢ₋₁))' },
  { icon: 'M', tag: 'Parábola', t: 'Müller', d: 'Ajusta una parábola por tres puntos y toma su raíz más cercana. Rápido y sin derivadas.', f: 'xᵢ₊₁ = xᵢ − 2c / (b ± √(b² − 4ac))' },
  { icon: 'P', tag: 'Iterativo', t: 'Punto Fijo', d: 'Despeja x = g(x) e itera. Detecta divergencia y dibuja la telaraña.', f: 'xᵢ₊₁ = g(xᵢ)' },
  { icon: '%', tag: 'Control', t: 'Tú eliges el error', d: 'Define hasta qué error trabajar (por ejemplo, menor al 1 %) y la calculadora se detiene ahí.', f: '|xᵢ − xᵢ₋₁| / |xᵢ| × 100 < 1' },
]

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

export default function Landing() {
  // La landing siempre usa el tema oscuro (mismo que la calculadora por defecto).
  useEffect(() => document.documentElement.classList.add('dark'), [])

  return (
    <div className="landing">
      <div className="hero-bg">
        <div className="wrap">
          <nav className="top" aria-label="Principal">
            <a className="logo" href="#/"><span className="logo-mark">f(x)</span> Métodos Numéricos</a>
            <div className="links">
              <a className="lnk" href="#metodos" onClick={scrollTo('metodos')}>Métodos</a>
              <a className="lnk" href="#demo" onClick={scrollTo('demo')}>Demo</a>
              <a className="btn btn-primary" href={CALC}>Calculadora</a>
            </div>
          </nav>

          <header className="hero" id="demo">
            <div>
              <span className="pill"><i /> 6 métodos · gráficos en vivo</span>
              <h1>Encuentra raíces de ecuaciones <em>no lineales</em>, paso a paso.</h1>
              <p className="sub">Escribe f(x), elige hasta qué error quieres trabajar y mira cada iteración en una tabla y en la gráfica.</p>
              <div className="actions">
                <a className="btn btn-primary btn-lg" href={CALC}>Iniciar Calculadora</a>
                <a className="btn btn-outline btn-lg" href="#metodos" onClick={scrollTo('metodos')}>Ver métodos</a>
              </div>
              <div className="meta"><span>Error en %</span><span>Exporta a CSV y Excel</span></div>
            </div>
            <InteractiveDemo />
          </header>
        </div>
      </div>

      <div className="wrap">
        <div className="stats">
          <div className="stat"><b>6</b><span>Métodos numéricos</span></div>
          <div className="stat"><b>%</b><span>Error relativo</span></div>
          <div className="stat"><b>CSV · XLSX</b><span>Exportación</span></div>
          <div className="stat"><b>LaTeX</b><span>Vista previa de f(x)</span></div>
        </div>

        <section id="metodos">
          <span className="eyebrow">Métodos</span>
          <h2 className="title">Todo lo que necesitas para resolver f(x) = 0</h2>
          <p className="sec-sub">Todos comparten la misma entrada, la misma tabla de iteraciones y el mismo criterio de parada.</p>
          <div className="grid">
            {METHODS.map((m) => (
              <article className="card" key={m.t}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="icon">{m.icon}</span><span className="tag">{m.tag}</span>
                </div>
                <h3>{m.t}</h3>
                <p>{m.d}</p>
                <code>{m.f}</code>
              </article>
            ))}
          </div>
        </section>

        <div className="final">
          <div>
            <h2>Prueba con x³ − x − 2 = 0 y llega a la raíz en segundos.</h2>
            <p>Ya viene un ejemplo precargado en cada método.</p>
          </div>
          <a className="btn btn-primary btn-lg" href={CALC}>Iniciar Calculadora</a>
        </div>

        <footer>
          <span>© 2026 Métodos Numéricos</span>
          <ul>
            <li><a href="#metodos" onClick={scrollTo('metodos')}>Métodos</a></li>
            <li><a href={CALC}>Calculadora</a></li>
          </ul>
        </footer>
      </div>
    </div>
  )
}
