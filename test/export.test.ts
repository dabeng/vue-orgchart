import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import OrgChart from '../src/components/ChartContainer.vue'
import { captureChart, exportPDF, exportPNG } from '../src/components/export'
import { resolveOptions } from '../src/components/options'
import type { OrgChartInstance } from '../src/components/useChart'
const mocks = vi.hoisted(() => ({ capture: vi.fn(), pdf: vi.fn(), addImage: vi.fn(), save: vi.fn() }))
vi.mock('html2canvas', () => ({ default: mocks.capture }))
vi.mock('jspdf', () => ({ jsPDF: class { constructor(options: unknown) { mocks.pdf(options) } addImage = mocks.addImage; save = mocks.save } }))
const wrappers: ReturnType<typeof mount>[] = []
function render() { const wrapper = mount(OrgChart, { props: { data: { id: '1', name: 'Org' }, exportButton: true } }); wrappers.push(wrapper); return { wrapper, api: wrapper.vm as unknown as OrgChartInstance } }
function canvas() { const value = document.createElement('canvas'); value.width = 800; value.height = 400; value.toBlob = callback => callback(new Blob(['png'])); value.toDataURL = () => 'data:image/png;base64,AAAA'; return value }
beforeEach(() => { mocks.capture.mockReset(); mocks.pdf.mockClear(); mocks.addImage.mockClear(); mocks.save.mockClear(); vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:chart'), revokeObjectURL: vi.fn() }); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {}) })
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers() })
describe('export', () => {
  it('downloads PNG and revokes its URL', async () => { vi.useFakeTimers(); await exportPNG(canvas(), 'team'); expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled(); vi.runAllTimers(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:chart') })
  it('rejects failed canvas encoding', async () => { const value = canvas(); value.toBlob = callback => callback(null); await expect(exportPNG(value)).rejects.toThrow('encoded') })
  it('keeps logical PDF dimensions independent of export resolution', async () => { await exportPDF(canvas(), 'team', 2); expect(mocks.pdf).toHaveBeenCalledWith(expect.objectContaining({ format: [400, 200], orientation: 'landscape' })); expect(mocks.addImage).toHaveBeenCalledWith(expect.any(String), 'PNG', 0, 0, 400, 200); expect(mocks.save).toHaveBeenCalledWith('team.pdf') })
  it('normalizes invalid PDF scale and portrait orientation', async () => { const value = canvas(); value.width = 100; value.height = 200; await exportPDF(value, 'portrait', 0); expect(mocks.pdf).toHaveBeenCalledWith(expect.objectContaining({ format: [100, 200], orientation: 'portrait' })) })
  it('captures full geometry without navigation transforms or controls', async () => {
    mocks.capture.mockResolvedValue(canvas()); const chart = document.createElement('div'); chart.innerHTML = '<button class="oc-controls"></button>'
    await captureChart(chart, resolveOptions({ exportScale: 0 }), { width: 600, height: 300, boxes: new Map(), modes: new Map(), links: [], compactGroups: new Map() })
    const options = mocks.capture.mock.calls[0]![1]; expect(options).toMatchObject({ scale: 1, useCORS: true, width: 600, height: 300 }); options.onclone(document, chart); expect(chart.style.transform).toBe('none'); expect((chart.firstElementChild as HTMLElement).style.display).toBe('none')
  })
  it('returns captured canvas and clears busy state on success', async () => { const value = canvas(); mocks.capture.mockResolvedValue(value); const { wrapper, api } = render(); expect(await api.export('team')).toBe(value); await nextTick(); expect(wrapper.find('.oc-export-mask').exists()).toBe(false); expect(wrapper.emitted('export')).toHaveLength(1) })
  it('deduplicates export and clears mask on failure', async () => { let reject!: (error: Error) => void; mocks.capture.mockImplementation(() => new Promise((_resolve, failed) => { reject = failed })); const { wrapper, api } = render(); const pending = api.export(); await nextTick(); expect(await api.export()).toBe(false); await vi.waitFor(() => expect(reject).toBeTypeOf('function')); reject(new Error('tainted')); await expect(pending).rejects.toThrow('tainted'); await nextTick(); expect(wrapper.emitted('export-error')).toHaveLength(1); expect(wrapper.find('.oc-export-mask').exists()).toBe(false) })
  it('exports PDFs through the chart API', async () => { mocks.capture.mockResolvedValue(canvas()); const { api } = render(); await api.export('team', 'pdf'); expect(mocks.save).toHaveBeenCalledWith('team.pdf') })
  it('does not download after destroy', async () => { let finish!: (value: HTMLCanvasElement) => void; mocks.capture.mockImplementation(() => new Promise(resolve => { finish = resolve })); const { api } = render(); const pending = api.export(); await vi.waitFor(() => expect(finish).toBeTypeOf('function')); api.destroy(); finish(canvas()); expect(await pending).toBe(false); expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled(); expect(await api.export()).toBe(false) })
})