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