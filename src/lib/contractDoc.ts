import { addDocument } from './documents'
import { CONTRACT_ACCEPT_TEXT, CONTRACT_SECTIONS, CONTRACT_TITLE, CONTRACT_VERSION } from './contract'

// Genera el HTML del contrato firmado (con nombre, DNI y fecha) y lo guarda
// como documento del cliente para que quede siempre disponible.
export function buildSignedContractHtml(name: string, dni: string, dateISO: string): string {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
  const fecha = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(dateISO))
  const body = CONTRACT_SECTIONS.map(
    (s) => `<h2>${esc(s.h)}</h2>${s.p.map((p) => `<p>${esc(p)}</p>`).join('')}`,
  ).join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Contrato firmado · ${esc(name)}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111; max-width: 820px; margin: 0 auto; padding: 36px 32px; line-height: 1.6; }
  .brand { font-size: 12px; letter-spacing: 3px; color: #db1809; font-weight: 700; border-bottom: 3px solid #db1809; padding-bottom: 10px; margin-bottom: 20px; }
  h1 { font-size: 17px; line-height: 1.35; }
  h2 { font-size: 14px; margin: 20px 0 6px; }
  p { font-size: 12.5px; margin: 0 0 8px; color: #333; }
  .sign { margin-top: 32px; border-top: 2px solid #888; padding-top: 16px; }
  .sign table { width: 100%; font-size: 13px; border-collapse: collapse; }
  .sign td { padding: 6px 0; }
  .accept { background: #f6f6f6; border: 1px solid #e3e3e3; border-radius: 8px; padding: 12px 14px; font-size: 12.5px; margin-top: 16px; }
  .noprint { margin-top: 20px; }
  @media print { .noprint { display: none; } body { padding: 0; } }
</style></head><body>
  <div class="brand">ETHOS GYM</div>
  <h1>${esc(CONTRACT_TITLE)}</h1>
  ${body}
  <div class="accept">${esc(CONTRACT_ACCEPT_TEXT)}</div>
  <div class="sign">
    <table>
      <tr><td><b>Firmado por el Cliente:</b></td><td>${esc(name)}</td></tr>
      <tr><td><b>DNI / NIE:</b></td><td>${esc(dni)}</td></tr>
      <tr><td><b>Fecha de firma:</b></td><td>${esc(fecha)}</td></tr>
      <tr><td><b>Versión del contrato:</b></td><td>${esc(CONTRACT_VERSION)}</td></tr>
      <tr><td><b>Por Ethos GYM:</b></td><td>Luis Silva Marzal — DNI 45128243N</td></tr>
    </table>
    <p style="font-size:11px;color:#888;margin-top:12px">Documento firmado electrónicamente a través de la app de ETHOS GYM mediante aceptación expresa. Válido como consentimiento del Cliente.</p>
  </div>
  <button class="noprint" onclick="window.print()" style="background:#db1809;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:700;cursor:pointer">Descargar / imprimir</button>
</body></html>`
}

// Sube la copia del contrato firmado a Documentos (categoría 'Contrato').
export async function saveSignedContract(clientId: string, name: string, dni: string, dateISO: string): Promise<void> {
  const html = buildSignedContractHtml(name, dni, dateISO)
  const file = new File([html], 'contrato-firmado.html', { type: 'text/html' })
  await addDocument(clientId, file, 'Contrato firmado', 'Contrato')
}
