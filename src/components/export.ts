import type { ResolvedOptions } from './options'
import type { Layout } from './layout'
export async function exportPNG(canvas: HTMLCanvasElement, filename = 'OrgChart') {
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Canvas could not be encoded')), 'image/png'))
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = `${filename}.png`; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
export async function exportPDF(canvas: HTMLCanvasElement, filename = 'OrgChart', exportScale = 1) {
  const { jsPDF } = await import('jspdf')
  const scale = Number.isFinite(exportScale) && exportScale > 0 ? exportScale : 1
  const width = canvas.width / scale; const height = canvas.height / scale
  const pdf = new jsPDF({ orientation: width > height ? 'landscape' : 'portrait', unit: 'px', format: [width, height], hotfixes: ['px_scaling'] })
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, height); pdf.save(`${filename}.pdf`)
}
export async function captureChart(chart: HTMLElement, options: ResolvedOptions, layout: Layout) {
  const { default: html2canvas } = await import('html2canvas')
  return html2canvas(chart, {
    backgroundColor: '#ffffff', useCORS: true, scale: Number.isFinite(options.exportScale) && options.exportScale > 0 ? options.exportScale : 1,
    width: layout.width, height: layout.height, scrollX: 0, scrollY: 0,
    onclone: (_document, cloned) => { cloned.style.transform = 'none'; cloned.querySelectorAll<HTMLElement>('.oc-controls, [data-export-ignore]').forEach(element => { element.style.display = 'none' }) },
  })
}