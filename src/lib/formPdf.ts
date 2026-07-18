import type { FormSubmission } from './forms'

// Exporta un formulario rellenado por el cliente como PDF (para adjuntarlo a
// Claude o guardarlo). Descarga el archivo directamente en el navegador.
export async function downloadFormPdf(f: FormSubmission, clientName?: string | null): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 48
  const maxW = W - M * 2
  let y = M

  const fecha = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(f.created_at))

  const ensure = (needed: number) => {
    if (y + needed > H - M) {
      doc.addPage()
      y = M
    }
  }
  const write = (text: string, size: number, bold: boolean, gap = 4, color = 40) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(color)
    const lines = doc.splitTextToSize(text, maxW) as string[]
    for (const ln of lines) {
      ensure(size + 2)
      doc.text(ln, M, y)
      y += size + 2
    }
    y += gap
  }

  // Cabecera de marca.
  doc.setFillColor(219, 24, 9)
  doc.rect(0, 0, W, 6, 'F')
  y = M
  write('ETHOS GYM', 10, true, 2, 150)
  write(f.form_title, 14, true, 4, 20)
  const sub = [clientName ? `Cliente: ${clientName}` : null, `Fecha: ${fecha}`].filter(Boolean).join('   ·   ')
  write(sub, 9.5, false, 12, 120)

  for (const qa of f.answers) {
    write(qa.q, 10.5, true, 3, 20)
    write(qa.a && qa.a.trim() ? qa.a : '—', 10, false, 12, 60)
  }

  const safe = (clientName || 'cliente').replace(/[^\w]+/g, '-').toLowerCase()
  doc.save(`${f.form_type}-${safe}-${f.created_at.slice(0, 10)}.pdf`)
}
