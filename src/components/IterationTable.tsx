import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import type { MethodResult } from '@/core/types'
import { fmt } from '@/lib/utils'
import { Button, Card, Select } from '@/components/ui/primitives'

interface Props {
  result: MethodResult
  decimals: number
}

export function IterationTable({ result, decimals }: Props) {
  const [pageSize, setPageSize] = useState(15)
  const [page, setPage] = useState(0)
  const { steps, columns } = result
  const errLabel = result.errorType === 'relative' ? 'Error (%)' : 'Error abs.'
  const pages = Math.max(1, Math.ceil(steps.length / pageSize))

  useEffect(() => setPage(0), [result, pageSize])

  const header = ['i', ...columns.map((c) => c.label), errLabel]
  const toRow = (s: (typeof steps)[number]) => [s.i, ...columns.map((c) => s[c.key] ?? null), s.error]

  const exportCsv = () => {
    const lines = [header, ...steps.map(toRow)].map((r) => r.map((v) => (v === null ? '' : String(v))).join(','))
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    download(blob, `iteraciones_${result.method}.csv`)
  }
  const exportXlsx = () => {
    const ws = XLSX.utils.aoa_to_sheet([header, ...steps.map(toRow)])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Iteraciones')
    XLSX.writeFile(wb, `iteraciones_${result.method}.xlsx`)
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <h3 className="text-sm font-semibold">Tabla de iteraciones</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!steps.length}><Download className="h-3.5 w-3.5" /> CSV</Button>
          <Button size="sm" variant="outline" onClick={exportXlsx} disabled={!steps.length}><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b bg-muted/60 text-muted-foreground">
              {header.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 text-right font-medium first:text-center">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {steps.slice(page * pageSize, (page + 1) * pageSize).map((s) => (
              <tr key={s.i} className="border-b last:border-0 hover:bg-muted/40">
                <td className="px-3 py-1.5 text-center text-muted-foreground">{s.i}</td>
                {columns.map((c) => <td key={c.key} className="px-3 py-1.5 text-right tabular-nums">{fmt(s[c.key], decimals)}</td>)}
                <td className="px-3 py-1.5 text-right tabular-nums text-primary">{s.error === null ? '—' : result.errorType === 'relative' ? fmtPct(s.error, decimals) : fmtErr(s.error)}</td>
              </tr>
            ))}
            {!steps.length && <tr><td colSpan={header.length} className="p-6 text-center text-muted-foreground">Sin iteraciones.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2 p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          Filas
          <Select className="h-8 w-20" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            {[10, 15, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span>Página {page + 1} / {pages}</span>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} aria-label="Siguiente"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </Card>
  )
}

const fmtPct = (v: number, d: number) => (Number.isFinite(v) ? v.toFixed(d) + ' %' : '∞')
const fmtErr = (v: number) => (Number.isFinite(v) ? v.toExponential(3) : '∞')

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
