import { describe, expect, it } from 'vitest'
import { layoutChart } from '../src/components/layout'
import { resolveOptions, visibleDepth } from '../src/components/options'
import { ChartModel } from '../src/components/tree'
import type { Direction, OrgNode } from '../src/components/types'
const data: OrgNode = { id: 'a', children: [{ id: 'b', width: 220, children: [{ id: 'd' }] }, { id: 'c', width: 100 }] }
describe('layout and option contracts', () => {
  it.each(['t2b', 'b2t', 'l2r', 'r2l'] as Direction[])('positions nodes without overlap in %s', direction => {
    const layout = layoutChart(new ChartModel(data), resolveOptions({ direction }), () => true, () => true)
    const boxes = [...layout.boxes.values()]
    for (const box of boxes) { expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0) }
    for (let first = 0; first < boxes.length; first++) for (let second = first + 1; second < boxes.length; second++) {
      const left = boxes[first]!; const right = boxes[second]!
      expect(left.x + left.width <= right.x || right.x + right.width <= left.x || left.y + left.height <= right.y || right.y + right.height <= left.y).toBe(true)
    }
    const parent = layout.boxes.get('a')!; const child = layout.boxes.get('b')!
    expect(direction === 't2b' ? child.y > parent.y : direction === 'b2t' ? child.y < parent.y : direction === 'l2r' ? child.x > parent.x : child.x < parent.x).toBe(true)
  })
  it('honors vertical precedence and compact callbacks', () => {
    const model = new ChartModel(data)
    const layout = layoutChart(model, resolveOptions({ compact: () => true, verticalLevel: 2 }), () => true, () => true)
    expect(layout.modes.get('a')).toBe('compact'); expect(layout.modes.get('b')).toBe('vertical')
    const hybrid = new ChartModel({ ...data, hybrid: true })
    expect(layoutChart(hybrid, resolveOptions({ compact: true }), () => true, () => true).modes.get('d')).toBe('vertical')
  })
  it('handles collapsed branches and empty charts', () => {
    expect(layoutChart(new ChartModel(data), resolveOptions({}), () => true, () => false).boxes.size).toBe(1)
    expect(layoutChart(new ChartModel(null), resolveOptions({}), () => true, () => true).boxes.size).toBe(0)
  })
  it('stacks children at the configured level on one spine, with nested groups indented', () => {
    const model = new ChartModel({ id: 'root', children: [
      { id: 'peer' }, { id: 'parent', children: [{ id: 'leaf' }, { id: 'branch', children: [{ id: 'nested' }] }] },
    ] })
    const layout = layoutChart(model, resolveOptions({ verticalLevel: 3 }), () => true, () => true)
    const parent = layout.boxes.get('parent')!; const peer = layout.boxes.get('peer')!
    const leaf = layout.boxes.get('leaf')!; const branch = layout.boxes.get('branch')!; const nested = layout.boxes.get('nested')!
    expect(parent.y).toBe(peer.y)
    expect(leaf.x).toBe(parent.x)
    expect(branch.x).toBe(leaf.x)
    expect(branch.y).toBeGreaterThan(leaf.y + leaf.height)
    expect(nested.x).toBeGreaterThan(branch.x)

    const linkTo = (id: string) => layout.links.find(link => link.target === id)!.points
    expect(linkTo('parent').at(-1)).toEqual([parent.x + parent.width / 2, parent.y])
    expect(linkTo('leaf').at(-2)?.[0]).toBe(linkTo('branch').at(-2)?.[0])
    for (const [id, box] of [['leaf', leaf], ['branch', branch], ['nested', nested]] as const) {
      expect(linkTo(id).at(-1)).toEqual([box.x, box.y + box.height / 2])
    }
    expect(linkTo('nested')[0]).toEqual([branch.x, branch.y + branch.height])
  })
  it('lays out family groups, measured templates and level offsets', () => {
    const model = new ChartModel([[{ id: 'a', levelOffset: 1, children: [[{ id: 'c' }]] }, { id: 'b' }]])
    const layout = layoutChart(model, resolveOptions({}), () => true, () => true, new Map([['a', { width: 250, height: 120 }]]))
    expect(layout.boxes.get('a')?.width).toBe(250); expect(layout.boxes.get('a')?.y).toBe(134)
    expect(layout.links.some(link => link.spouse)).toBe(true)
  })
  it.each(['t2b', 'b2t', 'l2r', 'r2l'] as const)('connects to the offset node edge in %s', direction => {
    const model = new ChartModel({ id: 'root', children: [{ id: 'unshifted' }, { id: 'shifted', levelOffset: 2 }] })
    const layout = layoutChart(model, resolveOptions({ direction }), () => true, () => true)
    const { x, y, width, height } = layout.boxes.get('shifted')!
    const entryPoint = {
      t2b: [x + width / 2, y], b2t: [x + width / 2, y + height],
      l2r: [x, y + height / 2], r2l: [x + width, y + height / 2],
    }[direction]
    expect(layout.links.find(link => link.target === 'shifted')?.points.at(-1)).toEqual(entryPoint)
  })
  it('supports ten thousand loaded nodes', () => {
    const model = new ChartModel({ id: 'root', children: Array.from({ length: 99 }, (_, branch) => ({ id: `b${branch}`, children: Array.from({ length: 100 }, (_, child) => ({ id: `${branch}-${child}` })) })) })
    expect(model.nodes.size).toBe(10000)
    expect(layoutChart(model, resolveOptions({ compact: true }), () => true, () => true).boxes.size).toBe(10000)
  })
  it.each([{ zoomoutLimit: 0 }, { zoominLimit: NaN }, { zoomoutLimit: 9 }, { direction: 'wrong' }, { verticalLevel: 1 }, { visibleLevel: -1 }])('rejects invalid options %j', options => expect(() => resolveOptions(options as never)).toThrow(RangeError))
  it('normalizes boolean depth', () => { expect(visibleDepth(false)).toBe(1); expect(visibleDepth(true)).toBe(999); expect(visibleDepth(0)).toBe(0) })
})