// Genera una imagen (PNG) de la comparativa antes/después para descargar o enviar.
export interface CmpPhoto {
  url: string | null
  date: string
  weight: number | null
}

function fmt(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${Number(d)}/${Number(m)}/${y}`
}

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // necesario para poder exportar el canvas
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = url
  })
}

export async function buildComparisonBlob(before: CmpPhoto, after: CmpPhoto): Promise<Blob> {
  if (!before.url || !after.url) throw new Error('Faltan imágenes')
  const imgs = await Promise.all([loadImg(before.url), loadImg(after.url)])
  const H = 1000
  const gap = 24
  const padTop = 96
  const padBottom = before.weight != null && after.weight != null ? 96 : 40
  const padSide = 24
  const dims = imgs.map((im) => ({ w: Math.round((im.width / im.height) * H), h: H }))
  const W = dims[0].w + dims[1].w + gap + padSide * 2
  const canvasH = padTop + H + padBottom

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el lienzo')

  ctx.fillStyle = '#080808'
  ctx.fillRect(0, 0, W, canvasH)
  ctx.fillStyle = '#db1809'
  ctx.fillRect(0, 0, W, 8)

  ctx.fillStyle = '#fff'
  ctx.font = 'bold 34px -apple-system, Segoe UI, Roboto, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('ETHOS · Comparativa', padSide, 58)

  const labels = ['ANTES', 'DESPUÉS']
  const metas = [before, after]
  let x = padSide
  imgs.forEach((im, i) => {
    const w = dims[i].w
    ctx.drawImage(im, x, padTop, w, H)
    // etiqueta antes/después
    ctx.fillStyle = 'rgba(219,24,9,0.92)'
    ctx.fillRect(x + 10, padTop + 10, ctx.measureText(labels[i]).width + 30, 34)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 20px -apple-system, Segoe UI, Roboto, sans-serif'
    ctx.fillText(labels[i], x + 22, padTop + 34)
    // meta inferior (fecha + peso)
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(x, padTop + H - 54, w, 54)
    ctx.fillStyle = '#fff'
    ctx.font = '600 24px -apple-system, Segoe UI, Roboto, sans-serif'
    const m = metas[i]
    ctx.fillText(`${fmt(m.date)}${m.weight != null ? '   ·   ' + m.weight + ' kg' : ''}`, x + 14, padTop + H - 18)
    x += w + gap
  })

  if (before.weight != null && after.weight != null) {
    const d = +(after.weight - before.weight).toFixed(1)
    ctx.fillStyle = d <= 0 ? '#4ade80' : '#f5a623'
    ctx.font = 'bold 30px -apple-system, Segoe UI, Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`Diferencia: ${d > 0 ? '+' : ''}${d} kg`, W / 2, canvasH - 34)
  }

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen'))), 'image/png'),
  )
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
