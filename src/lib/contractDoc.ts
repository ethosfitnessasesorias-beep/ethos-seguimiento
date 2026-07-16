import { addDocument } from './documents'
import { CONTRACT_ACCEPT_TEXT, CONTRACT_SECTIONS, CONTRACT_TITLE, CONTRACT_VERSION } from './contract'

// Genera el contrato firmado como PDF real (con nombre, DNI y fecha) y lo guarda
// en Documentos, para que el cliente pueda verlo/descargarlo en cualquier móvil.
async function buildSignedContractPdf(name: string, dni: string, dateISO: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 48 // margen
  const maxW = W - M * 2
  let y = M

  const fecha = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(dateISO))

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
  write(CONTRACT_TITLE, 13, true, 8, 20)

  for (const s of CONTRACT_SECTIONS) {
    write(s.h, 11, true, 3, 20)
    for (const p of s.p) write(p, 9.5, false, 5, 60)
  }

  // Aceptación + firma.
  ensure(120)
  y += 6
  doc.setDrawColor(180)
  doc.line(M, y, W - M, y)
  y += 16
  write(CONTRACT_ACCEPT_TEXT, 9.5, false, 10, 40)
  write('FIRMA DEL CLIENTE', 9, true, 6, 20)
  write(`Nombre y apellidos: ${name}`, 10, false, 3, 40)
  write(`DNI / NIE: ${dni}`, 10, false, 3, 40)
  write(`Fecha de firma: ${fecha}`, 10, false, 3, 40)
  write(`Versión del contrato: ${CONTRACT_VERSION}`, 10, false, 3, 40)
  write('Por Ethos GYM: Luis Silva Marzal — DNI 45128243N', 10, false, 8, 40)
  write('Documento firmado electrónicamente a través de la app de ETHOS GYM mediante aceptación expresa.', 8, false, 0, 120)

  return doc.output('blob')
}

// Sube la copia del contrato firmado (PDF) a Documentos (categoría 'Contrato').
export async function saveSignedContract(clientId: string, name: string, dni: string, dateISO: string): Promise<void> {
  const blob = await buildSignedContractPdf(name, dni, dateISO)
  const file = new File([blob], 'contrato-firmado.pdf', { type: 'application/pdf' })
  await addDocument(clientId, file, 'Contrato firmado', 'Contrato')
}
