import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createApp, defineComponent, h, nextTick } from 'vue'
import { useChart } from '../src/components/useChart'
import OrgChart from '../src/components/index.js'
it('provides a typed Vue plugin and registers its component', () => {
  const app = createApp(defineComponent({ render: () => null }))
  app.use(OrgChart)
  expect(app.component('OrgChart')).toBe(OrgChart)
})
it('preserves data during option updates, clamps zoom and cleans lifecycle', async () => {
  let state!: ReturnType<typeof useChart>
  const wrapper = mount(defineComponent({ setup() { state = useChart({ data: { id: 'a', children: [{ id: 'b' }] } }, () => {}); return () => h('div') } }))
  state.api.addChildren('b', [{ id: 'c' }]); state.api.setOptions('direction', 'r2l')
  expect(state.api.getHierarchy()).toHaveProperty('children.0.children.0.id', 'c')
  state.api.hideChildren('a'); expect(state.api.getNodeState('a', 'children').visible).toBe(false)
  state.api.setChartScale(100); expect(state.api.getViewport().scale).toBe(7)
  state.api.destroy(); await nextTick(); expect(state.api.chart).toBeNull(); wrapper.unmount()
})

function relationChart() {
  let state!: ReturnType<typeof useChart>
  const wrapper = mount(defineComponent({ setup() {
    state = useChart({ data: { id: 'root', children: [
      { id: 'left', children: [{ id: 'leaf', children: [{ id: 'deep' }] }] },
      { id: 'middle' }, { id: 'right' },
    ] } }, () => {})
    return () => h('div')
  } }))
  return { state, wrapper }
}

it('matches native child expansion by reopening only the direct level', () => {
  const { state, wrapper } = relationChart()
  state.api.hideChildren('root'); state.api.showChildren('root')
  expect(state.api.getNodeState('left').visible).toBe(true)
  expect(state.api.getNodeState('leaf').visible).toBe(false)
  state.api.showChildren('left')
  expect(state.api.getNodeState('leaf').visible).toBe(true)
  expect(state.api.getNodeState('deep').visible).toBe(false)
  wrapper.unmount()
})

it('matches native parent expansion without reopening hidden siblings', () => {
  const { state, wrapper } = relationChart()
  state.api.hideParent('middle'); state.api.showParent('middle')
  expect(state.api.getNodeState('root').visible).toBe(true)
  expect(state.api.getNodeState('middle').visible).toBe(true)
  expect(state.api.getNodeState('left').visible).toBe(false)
  expect(state.api.getNodeState('right').visible).toBe(false)
  wrapper.unmount()
})

it('matches native sibling expansion with collapsed subtrees and restores the related parent', () => {
  const { state, wrapper } = relationChart()
  state.api.hideParent('middle'); state.api.showSiblings('middle', 'left')
  expect(state.api.getNodeState('root').visible).toBe(true)
  expect(state.api.getNodeState('left').visible).toBe(true)
  expect(state.api.getNodeState('leaf').visible).toBe(false)
  expect(state.api.getNodeState('right').visible).toBe(false)
  wrapper.unmount()
})