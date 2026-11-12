import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import OrgChart from '../src/components/ChartContainer.vue'
import type { OrgChartInstance } from '../src/components/useChart'
import type { ChartOptions, OrgNode } from '../src/components/types'
const data = (): OrgNode => ({ id: 'a', name: 'Alice', title: 'CEO', children: [{ id: 'b', name: 'Bob', children: [{ id: 'd', name: 'Dan' }] }, { id: 'c', name: 'Claire' }] })
const wrappers: ReturnType<typeof mount>[] = []
function render(props: ChartOptions = {}, slots = {}) { const wrapper = mount(OrgChart, { props: { data: data(), ...props }, slots, attachTo: document.body }); wrappers.push(wrapper); return { wrapper, api: wrapper.vm as unknown as OrgChartInstance } }
afterEach(() => { wrappers.forEach(wrapper => wrapper.unmount()); wrappers.length = 0; vi.restoreAllMocks() })
describe('Vue chart', () => {
  it('renders text safely and emits selection', async () => { const { wrapper } = render({ data: { id: 'a', name: '<img src=x>' } }); expect(wrapper.find('img').exists()).toBe(false); await wrapper.find('.node').trigger('click'); expect(wrapper.emitted('node-click')?.[0]?.[0]).toMatchObject({ id: 'a' }) })
  it.each(['t2b', 'b2t', 'l2r', 'r2l'])('applies %s direction', direction => { const { wrapper } = render({ direction: direction as never }); expect(wrapper.find('.orgchart').classes()).toContain(direction) })
  it.each([false, true, 0, 1, 2])('applies initial visibleLevel %s', async visibleLevel => { const { wrapper, api } = render({ visibleLevel }); expect(wrapper.findAll('.node').filter(node => node.isVisible())).toHaveLength(visibleLevel === true ? 4 : visibleLevel === false || visibleLevel === 1 ? 1 : visibleLevel === 0 ? 0 : 3); api.expandAll(); await nextTick(); expect(wrapper.findAll('.node').filter(node => node.isVisible())).toHaveLength(4) })
  it('offers focus controls and keyboard selection', async () => {
    const { wrapper } = render(); expect(wrapper.find('.bottomEdge').exists()).toBe(false)
    await wrapper.find('#a').trigger('focusin'); await wrapper.find('#a').trigger('keydown', { key: 'Enter' }); expect(wrapper.emitted('select')).toHaveLength(1)
    await wrapper.find('.bottomEdge').trigger('click'); expect(wrapper.find('#b').isVisible()).toBe(false)
    await wrapper.find('#a').trigger('keydown', { key: 'ArrowDown' }); expect(wrapper.find('#b').isVisible()).toBe(true)
  })
  it.each([
    ['t2b', 'top', 'bottom', 'left', 'right', 'down', 'up', 'right', 'left'],
    ['b2t', 'bottom', 'top', 'left', 'right', 'up', 'down', 'right', 'left'],
    ['l2r', 'left', 'right', 'top', 'bottom', 'right', 'left', 'down', 'up'],
    ['r2l', 'right', 'left', 'top', 'bottom', 'left', 'right', 'down', 'up'],
  ] as const)('points controls inward to collapse and outward to expand in %s', async (direction, parentEdge, childEdge, leftEdge, rightEdge, parentArrow, childArrow, leftArrow, rightArrow) => {
    const { wrapper, api } = render({ direction, toggleSiblingsResp: true, data: { id: 'a', children: [{ id: 'left' }, { id: 'b', children: [{ id: 'd' }] }, { id: 'right' }] } })
    await wrapper.find('#b').trigger('focusin')
    const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' } as const
    for (const [selector, edge, icon, relation] of [['.topEdge', parentEdge, parentArrow, 'a'], ['.bottomEdge', childEdge, childArrow, 'd'], ['.leftEdge', leftEdge, leftArrow, 'left'], ['.rightEdge', rightEdge, rightArrow, 'right']] as const) {
      api.expandAll(); await nextTick()
      const button = wrapper.find(`#b ${selector}`)
      expect(button.classes()).toContain(`oc-edge-${edge}`)
      expect(button.find(`.lucide-chevron-${icon}`).exists()).toBe(true)
      await button.trigger('click')
      expect(button.find(`.lucide-chevron-${opposite[icon]}`).exists()).toBe(true)
      expect(wrapper.find(`#${relation}`).isVisible()).toBe(false)
      await button.trigger('click')
      expect(button.find(`.lucide-chevron-${icon}`).exists()).toBe(true)
      expect(wrapper.find(`#${relation}`).isVisible()).toBe(true)
    }
  })
  it('updates both sibling arrows when siblings toggle together', async () => {
    const { wrapper, api } = render({ data: { id: 'a', children: [{ id: 'left' }, { id: 'b' }, { id: 'right' }] } })
    await wrapper.find('#b').trigger('focusin')
    api.hideSiblings('b', 'left'); await nextTick()
    expect(wrapper.find('#b .leftEdge .lucide-chevron-right').exists()).toBe(true)
    await wrapper.find('#b .leftEdge').trigger('click')
    expect(wrapper.find('#left').isVisible()).toBe(false); expect(wrapper.find('#right').isVisible()).toBe(false)
    expect(wrapper.find('#b .leftEdge .lucide-chevron-left').exists()).toBe(true)
    expect(wrapper.find('#b .rightEdge .lucide-chevron-right').exists()).toBe(true)
    await wrapper.find('#b .rightEdge').trigger('click')
    expect(wrapper.find('#left').isVisible()).toBe(true); expect(wrapper.find('#right').isVisible()).toBe(true)
    expect(wrapper.find('#b .leftEdge .lucide-chevron-right').exists()).toBe(true)
    expect(wrapper.find('#b .rightEdge .lucide-chevron-left').exists()).toBe(true)
  })
  it('switches custom directional icons with relation visibility', async () => {
    const { wrapper, api } = render({ icons: { theme: 'custom-icons', expandToUp: 'custom-up', collapseToDown: 'custom-down', collapseToLeft: 'custom-left', expandToRight: 'custom-right' } })
    await wrapper.find('#b').trigger('focusin')
    for (const [selector, collapsed, expanded] of [['.topEdge', 'custom-down', 'custom-up'], ['.bottomEdge', 'custom-up', 'custom-down'], ['.rightEdge', 'custom-left', 'custom-right']]) {
      api.expandAll(); await nextTick()
      const button = wrapper.find(`#b ${selector}`)
      expect(button.find(`i.${collapsed}`).classes()).toContain('custom-icons')
      await button.trigger('click'); expect(button.find(`i.${expanded}`).exists()).toBe(true)
      await button.trigger('click'); expect(button.find(`i.${collapsed}`).exists()).toBe(true)
    }
  })
  it('retains minus and plus controls in compact layouts and custom icons', async () => {
    for (const props of [{ compact: true }, { icons: { collapsed: 'custom-plus', expanded: 'custom-minus' } }]) {
      const { wrapper } = render(props)
      await wrapper.find('#a').trigger('focusin')
      const button = wrapper.find('#a .bottomEdge')
      expect(button.find('.lucide-minus, .custom-minus').exists()).toBe(true)
      await button.trigger('click'); expect(button.find('.lucide-plus, .custom-plus').exists()).toBe(true)
      await button.trigger('click'); expect(button.find('.lucide-minus, .custom-minus').exists()).toBe(true)
    }
  })
  it('queries loaded hidden relations', async () => { const { api } = render(); api.hideChildren('a'); await nextTick(); expect(api.getChildren('a').map(node => node.id)).toEqual(['b', 'c']); expect(api.getParent('b')?.id).toBe('a'); expect(api.getRelatedNodes('b', 'siblings')).toHaveLength(1); expect(api.getNodeState('a', 'children')).toEqual({ exist: true, visible: false }); api.showChildren('a'); expect(api.getNodeState('a', 'children').visible).toBe(true) })
  it('hides ancestors and restores one level without siblings', async () => { const { wrapper, api } = render(); api.hideParent('d'); await nextTick(); expect(wrapper.find('#d').isVisible()).toBe(true); expect(wrapper.find('#a').isVisible()).toBe(false); expect(wrapper.find('#c').isVisible()).toBe(false); api.showParent('d'); await nextTick(); expect(wrapper.find('#b').isVisible()).toBe(true); expect(wrapper.find('#a').isVisible()).toBe(false); api.showParent('b'); await nextTick(); expect(wrapper.find('#a').isVisible()).toBe(true); expect(wrapper.find('#c').isVisible()).toBe(false) })
  it('toggles sibling sides independently', async () => { const { wrapper, api } = render({ data: { id: 'a', children: [{ id: 'b' }, { id: 'c' }, { id: 'd' }] }, toggleSiblingsResp: true }); api.hideSiblings('c', 'left'); await nextTick(); expect(wrapper.find('#b').isVisible()).toBe(false); expect(wrapper.find('#d').isVisible()).toBe(true); api.showSiblings('c', 'left'); api.hideSiblings('c', 'right'); await nextTick(); expect(wrapper.find('#b').isVisible()).toBe(true); expect(wrapper.find('#d').isVisible()).toBe(false) })
  it('supports slots, VNodes and callbacks', async () => { const callback = vi.fn(); const { wrapper } = render({ createNode: callback }, { default: ({ nodeData }: { nodeData: OrgNode }) => h('strong', {}, nodeData.name) }); expect(wrapper.find('strong').text()).toBe('Alice'); expect(callback).toHaveBeenCalledTimes(4); const second = render({ nodeTemplate: node => h('em', {}, String(node.name)) }); expect(second.wrapper.find('em').text()).toBe('Alice'); await second.wrapper.setProps({ nodeTemplate: node => `<b>${node.name}</b>` }); expect(second.wrapper.find('b').text()).toBe('Alice') })
  it('edits immutable input and retains edits during option updates', async () => { const input = data(); const { wrapper, api } = render({ data: input }); api.addChildren('c', [{ id: 'e' }]); api.addSiblings('b', [{ id: 'f' }]); api.addParent('a', { id: 'root' }); await nextTick(); api.setOptions('direction', 'l2r'); api.init(); await nextTick(); expect(api.getHierarchy(true)).toHaveProperty('children.0.children.1.children.0.id', 'e'); expect(input).toEqual(data()); expect(wrapper.emitted('change')).toHaveLength(3); api.removeNodes('b'); await nextTick(); expect(wrapper.find('#d').exists()).toBe(false) })
  it('validates before replacing data', () => { const { api } = render(); const old = api.getHierarchy(true); expect(() => api.setOptions({ data: { id: 'new' }, zoominLimit: 0 })).toThrow(RangeError); expect(api.getHierarchy(true)).toEqual(old) })
  it('updates datasource and accepts the old prop', async () => { const { wrapper, api } = render(); await wrapper.setProps({ data: { id: 'new' } }); expect(api.getHierarchy()).toEqual({ id: 'new' }); expect(render({ data: undefined, datasource: data() }).wrapper.find('#a').exists()).toBe(true) })
  it('clamps zoom inclusively and preserves anchors', () => { const { api } = render({ zoomoutLimit: .5, zoominLimit: 2 }); api.setChartScale(100, { x: 100, y: 50 }); expect(api.getViewport()).toEqual({ x: -100, y: -50, scale: 2 }); api.setChartScale(api.chart, .001); expect(api.getViewport().scale).toBe(.5); api.setChartScale(-1); expect(api.getViewport().scale).toBe(.5); api.resetView(); expect(api.getViewport().scale).toBe(1) })
  it('enables minimap wheel independently of zoom', async () => { const { wrapper, api } = render({ minimap: true }); await wrapper.find('.oc-minimap').trigger('wheel', { deltaY: -1 }); expect(api.getViewport().scale).toBe(1.2); api.detachMinimap(); await nextTick(); expect(wrapper.find('.oc-minimap').exists()).toBe(false); api.attachMinimap(); await nextTick(); expect(wrapper.find('.oc-minimap').exists()).toBe(true) })
  it('checks drop criteria and cycles', async () => { const { api } = render({ draggable: true, dropCriteria: () => false }); expect(() => api.moveNode('b', 'd')).toThrow('Drop rejected'); expect(() => api.moveNode('b', 'c')).toThrow('Drop rejected'); api.setOptions('dropCriteria', () => true); api.moveNode('b', 'c'); await nextTick(); expect(api.getParent('b')?.id).toBe('c'); expect(api.getPath('d').map(node => node.id)).toEqual(['a', 'c', 'b', 'd']) })
  it('filters paths and restores visibility', async () => { const { wrapper, api } = render(); api.filterNodes('Dan'); await nextTick(); expect(wrapper.find('#c').isVisible()).toBe(false); expect(wrapper.find('#d').isVisible()).toBe(true); api.clearFilter(); await nextTick(); expect(wrapper.find('#c').isVisible()).toBe(true) })
  it('deduplicates loading and emits failures', async () => { const { wrapper, api } = render(); let resolve!: (value: OrgNode[]) => void; const loader = vi.fn(() => new Promise<OrgNode[]>(done => { resolve = done })); const first = api.loadChildren('c', loader); expect(await api.loadChildren('c', loader)).toBe(false); resolve([{ id: 'e' }]); expect(await first).toBe(true); expect(api.getHierarchy(true)).toHaveProperty('children.1.children.0.id', 'e'); expect(loader).toHaveBeenCalledTimes(1); await expect(api.loadChildren('c', () => Promise.reject(new Error('offline')))).rejects.toThrow('offline'); expect(wrapper.emitted('load-error')).toHaveLength(1) })
  it('aborts loading and destroys idempotently', async () => { const { wrapper, api } = render(); let signal!: AbortSignal; let resolve!: (value: OrgNode[]) => void; const pending = api.loadChildren('c', (_data, value) => { signal = value; return new Promise(done => { resolve = done }) }); api.destroy(); api.destroy(); resolve([{ id: 'late' }]); expect(signal.aborted).toBe(true); expect(await pending).toBe(false); await nextTick(); expect(api.chart).toBeNull(); api.init({ data: data() }); await nextTick(); expect(wrapper.find('#a').exists()).toBe(true) })
  it('shares household controls without hiding spouses', async () => { const { wrapper, api } = render({ data: [[{ id: 'mom', children: [[{ id: 'child' }, { id: 'partner' }]] }, { id: 'dad' }]] }); await wrapper.find('#dad').trigger('focusin'); await wrapper.find('#dad .bottomEdge').trigger('click'); expect(wrapper.find('#child').isVisible()).toBe(false); expect(wrapper.find('#mom').isVisible()).toBe(true); api.showChildren('dad'); await nextTick(); expect(wrapper.find('#partner').isVisible()).toBe(true); expect(Array.isArray(api.getHierarchy())).toBe(true) })
})