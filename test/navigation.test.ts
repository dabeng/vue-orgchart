import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import OrgChart from '../src/components/ChartContainer.vue'
import { useChart } from '../src/components/useChart'
import type { ChartOptions, OrgNode } from '../src/components/types'
const data = { id: 'a', name: 'A', children: [{ id: 'b', name: 'B', children: [{ id: 'd', name: 'D' }] }, { id: 'c', name: 'C' }] }
const cleanups: (() => void)[] = []
function setup(options: ChartOptions = {}) {
  let context!: ReturnType<typeof useChart>
  const wrapper = mount(defineComponent({ setup() { context = useChart({ data, ...options }, () => {}); return () => h('div') } }))
  const host = document.createElement('div'); Object.defineProperties(host, { clientWidth: { value: 800 }, clientHeight: { value: 500 } })
  host.setPointerCapture = vi.fn(); host.hasPointerCapture = vi.fn(() => true); host.releasePointerCapture = vi.fn(); context.host.value = host
  for (const node of context.allNodes.value) { const element = document.createElement('div'); element.className = 'node'; element.dataset.nodeKey = node.key; context.register(node.key, element) }
  context.updateMinimap(); cleanups.push(() => wrapper.unmount()); return context
}
function pointer(type: string, id: number, x: number, y: number, pointerType = 'mouse') { const event = new Event(type, { cancelable: true }); Object.defineProperties(event, { pointerId: { value: id }, clientX: { value: x }, clientY: { value: y }, button: { value: 0 }, pointerType: { value: pointerType }, target: { value: document.createElement('div') } }); return event as PointerEvent }
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
describe('viewport and interaction', () => {
  it.each(['t2b', 'b2t', 'l2r', 'r2l'] as const)('retains the outgoing layout until the last descendant finishes in %s', async direction => {
    const context = setup({ direction }); const host = context.host.value!
    document.body.appendChild(host); cleanups.push(() => host.remove())
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
    host.scrollLeft = 120; host.scrollTop = 40; context.updateMinimap()
    const point = () => { const box = context.layout.value.boxes.get('a')!; return { x: Math.max(0, (800 - context.layout.value.width * context.viewport.scale) / 2) + context.viewport.x + box.x * context.viewport.scale - host.scrollLeft, y: context.viewport.y + box.y * context.viewport.scale - host.scrollTop } }
    const initial = point(); const width = context.layout.value.width; const height = context.layout.value.height
    context.api.hideChildren('a')
    expect(context.layout.value.boxes.size).toBe(1)
    expect(context.layout.value.links).toHaveLength(0)
    expect(context.layout.value.width).toBe(width); expect(context.layout.value.height).toBe(height)
    expect(point()).toEqual(initial)
    context.relationTransitionEnd('b'); context.relationTransitionEnd('c')
    expect(context.layout.value.height).toBe(height)
    context.relationTransitionEnd('d'); await nextTick(); await nextTick()
    expect(context.layout.value.width).toBeLessThanOrEqual(width)
    expect(context.layout.value.height).toBeLessThanOrEqual(height)
    expect(point()).toEqual(initial)
    expect(context.dimensions.scrollLeft).toBe(120)
    expect(context.dimensions.scrollTop).toBe(40)
    expect(context.relating.value).toBe(false)
    context.api.showChildren('a'); await nextTick(); await nextTick()
    expect(context.layout.value.boxes.size).toBe(3)
    expect(point()).toEqual(initial)
  })
  it('cancels outgoing layout state when data is replaced or the chart is destroyed', async () => {
    const context = setup(); const host = context.host.value!
    document.body.appendChild(host); cleanups.push(() => host.remove())
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
    context.api.hideChildren('a'); context.api.setOptions({ data: { id: 'new' } })
    for (const key of ['b', 'c', 'd']) context.relationTransitionEnd(key)
    await nextTick()
    expect([...context.layout.value.boxes.keys()]).toEqual(['new'])
    context.api.destroy(); context.relationTransitionEnd('new'); context.api.expandAll()
    await nextTick(); expect(context.layout.value.boxes.size).toBe(0)
  })
  it('retains the correct connector and motion when siblings leave', () => {
    const context = setup(); const host = context.host.value!
    document.body.appendChild(host); cleanups.push(() => host.remove())
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
    const initial = context.layout.value
    const connector = initial.links.find(link => link.target === 'c')!
    context.api.hideSiblings('c')
    expect(context.layout.value.width).toBe(initial.width)
    expect(context.layout.value.links).toEqual([connector])
    expect(context.relationMotions.value.get('b')).toBe('left')
    expect(context.relationMotions.value.get('d')).toBe('left')
    context.relationTransitionEnd('b')
    expect(context.relating.value).toBe(true)
    context.relationTransitionEnd('d')
    expect(context.layout.value.links[0]!.key).toBe(connector.key)
  })
  it('keeps connector identities distinct for hyphenated node IDs', () => {
    const context = setup({ data: { id: 'a', children: [{ id: 'b-c' }, { id: 'a-b', children: [{ id: 'c' }] }] } })
    expect(new Set(context.layout.value.links.map(link => link.key)).size).toBe(3)
  })
  it('removes hidden ancestor rows only after their exit finishes', async () => {
    const context = setup(); const host = context.host.value!
    document.body.appendChild(host); cleanups.push(() => host.remove())
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
    const initial = context.layout.value
    context.api.hideParent('b')
    expect(context.relationMotions.value.get('a')).toBe('parent')
    expect(context.relationMotions.value.get('c')).toBe('right')
    expect(context.layout.value.boxes.get('b')).toEqual(initial.boxes.get('b'))
    context.relationTransitionEnd('a'); context.relationTransitionEnd('c'); await nextTick()
    expect(context.layout.value.boxes.get('b')!.y).toBe(initial.boxes.get('a')!.y)
  })
  it('centers fitting charts without changing the user pan or vertical origin', () => {
    const context = setup(); const offset = (800 - context.layout.value.width) / 2
    expect(offset).toBeGreaterThan(0)
    expect(context.transform.value).toBe(`translate(${offset}px, 0px) scale(1)`)
    expect(context.api.getViewport()).toEqual({ x: 0, y: 0, scale: 1 })
    context.api.collapseAll()
    expect(context.transform.value).toBe(`translate(${(800 - context.layout.value.width) / 2}px, 0px) scale(1)`)
  })
  it.each([0.5, 1.2, 3])('keeps the zoom anchor fixed across horizontal centering at scale %s', multiplier => {
    const context = setup({ zoom: true, pan: true }); const anchor = { x: 120, y: 80 }
    context.pointerDown(pointer('pointerdown', 1, 0, 0)); context.pointerMove(pointer('pointermove', 1, 40, 20)); context.pointerUp(pointer('pointerup', 1, 40, 20))
    const before = context.api.getViewport(); const offset = Math.max(0, (800 - context.layout.value.width * before.scale) / 2)
    const chartPoint = { x: (anchor.x - offset - before.x) / before.scale, y: (anchor.y - before.y) / before.scale }
    context.api.setChartScale(multiplier, anchor)
    const after = context.api.getViewport(); const nextOffset = Math.max(0, (800 - context.layout.value.width * after.scale) / 2)
    expect(nextOffset + after.x + chartPoint.x * after.scale).toBeCloseTo(anchor.x)
    expect(after.y + chartPoint.y * after.scale).toBeCloseTo(anchor.y)
  })
  it('maps a centered minimap click without applying centering twice', () => {
    const context = setup({ minimap: true, data: { id: 'a', name: 'A' } }); const map = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    vi.spyOn(map, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, width: 200, height: 100, left: 0, top: 0, right: 200, bottom: 100, toJSON() {} })
    const event = pointer('pointerdown', 1, 100, 50); Object.defineProperty(event, 'currentTarget', { value: map })
    context.minimapDown(event)
    expect(context.api.getViewport().x).toBeCloseTo(0)
    expect(context.minimapViewport.value.x).toBe(0)
    expect(context.minimapViewport.value.width).toBe(context.layout.value.width)
    context.minimapUp(event)
  })
  it('pans with pointer capture and releases cleanly', () => { const context = setup({ pan: true }); context.pointerDown(pointer('pointerdown', 1, 10, 10)); context.pointerMove(pointer('pointermove', 1, 70, 40)); expect(context.api.getViewport()).toEqual({ x: 60, y: 30, scale: 1 }); context.pointerUp(pointer('pointerup', 1, 70, 40)); expect(context.panning.value).toBe(false); expect(context.host.value?.releasePointerCapture).toHaveBeenCalledWith(1) })
  it('does not pan nodes or when pan is disabled', () => { const context = setup(); context.pointerDown(pointer('pointerdown', 1, 10, 10)); context.pointerMove(pointer('pointermove', 1, 70, 40)); expect(context.api.getViewport().x).toBe(0) })
  it('zooms around the midpoint of a two finger pinch', () => { const context = setup({ zoom: true }); context.pointerDown(pointer('pointerdown', 1, 100, 100, 'touch')); context.pointerDown(pointer('pointerdown', 2, 200, 100, 'touch')); context.pointerMove(pointer('pointermove', 2, 300, 100, 'touch')); expect(context.api.getViewport().scale).toBe(2); context.pointerUp(pointer('pointerup', 2, 300, 100, 'touch')) })
  it('ignores invalid scale multipliers and clamps configured limits', () => { const context = setup({ zoomoutLimit: 2, zoominLimit: 3 }); context.api.setChartScale(NaN); expect(context.api.getViewport().scale).toBe(2); context.api.resetView(); expect(context.api.getViewport().scale).toBe(2); context.api.setOptions('zoominLimit', 2); expect(context.api.getViewport().scale).toBe(2) })
  it('maps minimap viewport dragging to chart coordinates', () => {
    const context = setup({ minimap: true }); const map = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    vi.spyOn(map, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, width: 200, height: 100, left: 0, top: 0, right: 200, bottom: 100, toJSON() {} })
    const event = pointer('pointerdown', 1, 100, 50); Object.defineProperty(event, 'currentTarget', { value: map })
    context.minimapDown(event); const before = context.api.getViewport(); context.minimapMove(pointer('pointermove', 1, 110, 60)); expect(context.api.getViewport().x).toBeLessThan(before.x); context.minimapUp(event)
    expect(context.minimapViewport.value.width).toBeLessThanOrEqual(context.layout.value.width)
  })
  it('centers a hidden node after revealing its path', async () => { const context = setup({ visibleLevel: 1 }); context.api.centerOnNode('d'); await nextTick(); expect(context.api.getNodeState('d').visible).toBe(true); expect(context.api.getViewport().x).not.toBe(0) })
  it('supports drag alias, ignores root dragging and moves a valid branch', () => { const context = setup({ drag: true }); const event = new Event('dragstart', { cancelable: true }) as DragEvent; context.dragStart(context.model.value.resolve('a'), event); expect(event.defaultPrevented).toBe(true); context.dragStart(context.model.value.resolve('b'), new Event('dragstart') as DragEvent); context.dragOver(context.model.value.resolve('c'), new Event('dragover', { cancelable: true }) as DragEvent); expect(context.dropTarget.value).toBe('c'); context.drop(context.model.value.resolve('c')); expect(context.model.value.resolve('b').parentKey).toBe('c'); expect(context.dragging.value).toBeNull() })
  it('lets draggable take precedence over drag', () => { const context = setup({ drag: true, draggable: false }); context.dragStart(context.model.value.resolve('b'), new Event('dragstart', { cancelable: true }) as DragEvent); expect(context.dragging.value).toBeNull() })
  it('starts touch drag after a hold and cancels on unmount', () => { vi.useFakeTimers(); const context = setup({ draggable: true }); context.touchStart(context.model.value.resolve('b'), pointer('pointerdown', 1, 100, 100, 'touch')); vi.advanceTimersByTime(350); expect(context.dragging.value).toBe('b'); context.api.destroy(); expect(context.dragging.value).toBeNull(); expect(vi.getTimerCount()).toBe(0) })
  it('returns full ancestors and descendants through aliases', () => { const context = setup(); context.api.addAncestors({ id: 'board', children: [{ id: 'chair' }] }, 'chair'); context.api.addDescendants([{ id: 'new' }], 'c'); expect(context.api.getPath('new').map(node => node.id)).toEqual(['board', 'chair', 'a', 'c', 'new']) })
  it('keeps expansion and selection on v-model echoes', async () => {
    const input = shallowRef<OrgNode | OrgNode[][] | null>(data)
    const parent = mount(defineComponent({ setup() { return () => h(OrgChart, { data: input.value, visibleLevel: 1, 'onUpdate:data': (value: OrgNode | OrgNode[][] | null) => { input.value = value } }) } }))
    cleanups.push(() => parent.unmount())
    const component = parent.findComponent(OrgChart); const api = component.vm as unknown as ReturnType<typeof useChart>['api']
    api.showChildren('a'); api.addChildren('c', [{ id: 'new' }]); await nextTick(); expect(api.getNodeState('a', 'children').visible).toBe(true); expect(api.getHierarchy()).toHaveProperty('children.1.children.0.id', 'new')
  })
})