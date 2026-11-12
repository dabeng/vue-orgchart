import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { ChartModel, flatToFamily, flatToTree, ulToTree } from '../src/components/tree'
import type { OrgNode } from '../src/components/types'
const tree = (): OrgNode => ({ id: 'a', name: 'A', children: [{ id: 'b', children: [{ id: 'd' }] }, { id: 'c' }] })
describe('datasource normalization', () => {
	it('copies reactive records and child arrays', () => {
		const input = reactive(tree()); const model = new ChartModel(input)
		model.resolve('a').data.name = 'edited'; model.addChildren('a', [{ id: 'e' }])
		expect(input).toEqual(tree()); expect(model.resolve('d').depth).toBe(3)
	})
	it('accepts unordered flat rows, zero and custom ids', () => {
		const rows = [{ uid: 2, parent_id: '0' }, { uid: 0 }, { uid: 1, parent_id: 0 }]
		expect(flatToTree(rows, 'uid')).toEqual({ uid: 0, children: [{ uid: 2, parent_id: '0', children: [] }, { uid: 1, parent_id: 0, children: [] }] })
		expect(rows[0]).not.toHaveProperty('children')
	})
	it.each([
		[{ id: 1 }, { id: '1' }], [{ name: 'missing' }], [{ id: '' }], [{ id: NaN }],
		[{ id: 1 }, { id: 2 }], [{ id: 1, parent_id: 9 }],
		[{ id: 1 }, { id: 2, parent_id: 3 }, { id: 3, parent_id: 2 }], [{ id: 1, parent_id: 1 }],
	])('rejects invalid flat input %#', (...rows) => expect(() => flatToTree(rows as OrgNode[])).toThrow())
	it('handles empty sources and optional nested ids', () => {
		expect(new ChartModel([]).nodes.size).toBe(0); expect(new ChartModel(null).hierarchy()).toContain('Error')
		expect(new ChartModel({ name: 'anonymous' }).hierarchy()).toContain('ids')
	})
	it('rejects nested duplicates and cycles', () => {
		expect(() => new ChartModel({ id: 1, children: [{ id: '1' }] })).toThrow('Duplicate')
		const cyclic: OrgNode = { id: 'a' }; cyclic.children = [cyclic]
		expect(() => new ChartModel(cyclic)).toThrow('Cycle')
	})
	it('reads nested UL without changing the element', () => {
		const element = document.createElement('ul'); element.innerHTML = '<li id="a">A<ul><li id="b" data-title="Manager">B</li></ul></li>'
		expect(ulToTree(element)?.children).toEqual([{ id: 'b', name: 'B', title: 'Manager' }])
		expect(new ChartModel(element).nodes.size).toBe(2); expect(element.querySelectorAll('li')).toHaveLength(2)
	})
})
describe('editing and queries', () => {
	it('adds children, siblings and ancestors, preserving full data', () => {
		const model = new ChartModel(tree()); model.addChildren('c', [{ id: 'e', title: 'E' }]); model.addSiblings('c', [{ id: 'f' }]); model.addParent('a', { id: 'root' })
		expect(model.resolve('d').depth).toBe(4); expect(model.parent(model.resolve('a'))?.key).toBe('root')
		expect(model.hierarchy(true)).toHaveProperty('children.0.name', 'A')
		expect(model.siblings(model.resolve('b')).map(node => node.key)).toEqual(['c', 'f'])
		expect(model.related(model.resolve('a'), 'children')).toHaveLength(3)
	})
	it('moves subtrees and rejects cycles', () => {
		const model = new ChartModel(tree()); expect(model.canMove('b', 'd')).toBe(false); expect(() => model.move('a', 'c')).toThrow()
		model.move('b', 'c'); expect(model.resolve('d').depth).toBe(4); expect(model.parent(model.resolve('b'))?.key).toBe('c')
		expect(model.flat()).toEqual([{ id: 'a', name: 'A', parent_id: null }, { id: 'c', parent_id: 'a' }, { id: 'b', parent_id: 'c' }, { id: 'd', parent_id: 'b' }])
	})
	it('validates edits atomically and removes descendants', () => {
		const model = new ChartModel(tree()); const snapshot = model.hierarchy(true)
		expect(() => model.addChildren('b', [{ id: 'new' }, { id: 'c' }])).toThrow(); expect(model.hierarchy(true)).toEqual(snapshot)
		model.remove('b'); expect(model.nodes.has('d')).toBe(false); expect(() => model.resolve('d')).toThrow('Unknown')
		model.remove('a'); expect(model.nodes.size).toBe(0)
	})
	it('exports snapshots that roundtrip', () => {
		const model = new ChartModel(tree()); expect(new ChartModel(model.flat() as OrgNode[]).hierarchy(true)).toEqual(model.hierarchy(true))
		const snapshot = model.hierarchy(true) as OrgNode; snapshot.name = 'changed'; expect(model.resolve('a').data.name).toBe('A')
	})
})
describe('family tree', () => {
	const family = () => [[{ id: 'mom', children: [[{ id: 'child', children: [[{ id: 'baby' }]] }, { id: 'partner', outsider: true }]] }, { id: 'dad' }]]
	it('uses one-based depths and retains households in exports', () => {
		const model = new ChartModel(family()); expect(model.resolve('baby').depth).toBe(3); expect(model.hierarchy(true)).toEqual(family())
		expect(model.siblings(model.resolve('child')).map(node => node.key)).toEqual(['partner'])
		const flat = model.flat() as OrgNode[]; expect(flat.find(node => node.id === 'mom')?.family_id).toBe(flat.find(node => node.id === 'dad')?.family_id)
		expect(new ChartModel(flatToFamily(flat)).hierarchy(false)).toEqual(model.hierarchy(false))
	})
	it('moves and removes a member without moving its spouse', () => {
		const model = new ChartModel(family()); model.move('child', 'dad')
		expect(model.resolve('baby').parentKey).toBe('child'); expect(model.resolve('partner').parentKey).toBe('mom')
		model.remove('child'); expect(model.nodes.has('partner')).toBe(true); expect(model.nodes.has('baby')).toBe(false)
	})
})