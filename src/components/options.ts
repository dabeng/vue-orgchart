import type { ChartOptions } from './types'
export const defaults = {
  nodeId: 'id', nodeTitle: 'name', nodeContent: 'title', direction: 't2b' as const,
  visibleLevel: 999 as number | boolean, verticalLevel: undefined as number | undefined,
  pan: false, zoom: false, minimap: false, zoominLimit: 7, zoomoutLimit: 0.5,
  toggleSiblingsResp: false, chartClass: '', exportButton: false,
  exportButtonName: 'Export', exportFilename: 'OrgChart', exportFileextension: 'png' as const, exportScale: 2,
}
export type ResolvedOptions = Omit<typeof defaults, 'direction' | 'exportFileextension'> & ChartOptions & { direction: NonNullable<ChartOptions['direction']>; exportFileextension: 'png' | 'pdf' }
export function resolveOptions(input: ChartOptions): ResolvedOptions {
  const options = { ...defaults, ...Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)), icons: { ...input.icons } } as ResolvedOptions
  if (!Number.isFinite(options.zoomoutLimit) || !Number.isFinite(options.zoominLimit) || options.zoomoutLimit <= 0 || options.zoominLimit < options.zoomoutLimit) throw new RangeError('Zoom limits must be finite, positive and ordered')
  if (!['t2b', 'b2t', 'l2r', 'r2l'].includes(options.direction)) throw new RangeError('Invalid direction')
  if (typeof options.visibleLevel !== 'boolean' && (!Number.isInteger(options.visibleLevel) || options.visibleLevel < 0)) throw new RangeError('visibleLevel must be a nonnegative integer or boolean')
  if (options.verticalLevel != null && (!Number.isInteger(options.verticalLevel) || options.verticalLevel < 2)) throw new RangeError('verticalLevel must be an integer >= 2')
  if (!['png', 'pdf'].includes(options.exportFileextension)) throw new RangeError('Export extension must be png or pdf')
  return options
}
export function visibleDepth(value: number | boolean) { return value === true ? 999 : value === false ? 1 : value }