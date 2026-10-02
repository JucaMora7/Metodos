import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { compileExpression } from '@/core/math/parser'
import { Input, Label } from '@/components/ui/primitives'

interface Props {
  id: string
  label: string
  /** Prefijo LaTeX del preview, p. ej. "f(x) =". */
  prefix: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export function MathInput({ id, label, prefix, value, onChange, placeholder }: Props) {
  const { html, error } = useMemo(() => {
    if (!value.trim()) return { html: '', error: null as string | null }
    const p = compileExpression(value)
    if (!p.ok) return { html: '', error: p.error }
    try {
      return { html: katex.renderToString(`${prefix} ${p.tex}`, { throwOnError: false, displayMode: false }), error: null }
    } catch {
      return { html: '', error: 'No se pudo renderizar la vista previa.' }
    }
  }, [value, prefix])

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} spellCheck={false} autoComplete="off" aria-invalid={!!error} className={error ? 'border-destructive' : ''} />
      <div className="mt-1.5 flex min-h-9 items-center overflow-x-auto rounded-md bg-muted px-3 py-1 text-sm">
        {error ? <span className="text-xs text-destructive">{error}</span> : html ? <span dangerouslySetInnerHTML={{ __html: html }} /> : <span className="text-xs text-muted-foreground">Vista previa LaTeX</span>}
      </div>
    </div>
  )
}
