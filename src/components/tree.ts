import { toRaw } from 'vue'
import type { Datasource, NodeId, NodeRef, NormalizedNode, OrgNode, Relation } from './types'

function validId(value: unknown): value is NodeId {
  return (typeof value === 'string' && value.trim() !== '') || (typeof value === 'number' && Number.isFinite(value))
}
export function cloneData<Value>(value: Value): Value { return structuredClone(toRaw(value)) }
let anonymousSequence = 0

export function flatToTree(rows: OrgNode[], nodeId = 'id'): OrgNode | null {
  if (!rows.length) return null
  const nodes = new Map<string, OrgNode>()
  for (const row of rows) {
    const id = row[nodeId]
    if (!validId(id)) throw new TypeError('Every flat record requires a valid node id')
    if (nodes.has(String(id))) throw new Error(`Duplicate node id: ${id}`)
    nodes.set(String(id), { ...cloneData(row), children: [] })
  }
  const roots: OrgNode[] = []
  for (const row of rows) {
    const node = nodes.get(String(row[nodeId]))!
    if (row.parent_id == null) roots.push(node)
    else {
      if (!validId(row.parent_id)) throw new TypeError('Invalid parent id')
      const parent = nodes.get(String(row.parent_id))
      if (!parent) throw new Error(`Missing parent: ${row.parent_id}`)
      ;(parent.children as OrgNode[]).push(node)
    }
  }
  if (roots.length !== 1) throw new Error('Flat datasource must have exactly one root')
  const visited = new Set<OrgNode>()
  const visit = (node: OrgNode) => {
    if (visited.has(node)) throw new Error('Cycle in datasource')
    visited.add(node)
    for (const child of node.children as OrgNode[]) visit(child)
  }
  visit(roots[0]!)
  if (visited.size !== nodes.size) throw new Error('Cycle in datasource')
  return roots[0]!
}
export function ulToTree(source: HTMLUListElement, nodeId = 'id'): OrgNode | null {
  const parse = (element: HTMLLIElement): OrgNode => {
    const branch = [...element.children].find(child => child.tagName === 'UL') as HTMLUListElement | undefined
    const text = [...element.childNodes].filter(child => child !== branch).map(child => child.textContent).join('').trim()
    const data: OrgNode = { name: element.dataset.name ?? text, title: element.dataset.title }
    if (element.id) data[nodeId] = element.id
    if (element.dataset.className) data.className = element.dataset.className
    if (branch) data.children = [...branch.children].filter(child => child.tagName === 'LI').map(child => parse(child as HTMLLIElement))
    return data
  }
  const roots = [...source.children].filter(child => child.tagName === 'LI')
  if (roots.length > 1) throw new Error('UL datasource must have exactly one root')
  return roots[0] ? parse(roots[0] as HTMLLIElement) : null
}
export function flatToFamily(rows: OrgNode[], nodeId = 'id'): OrgNode[][] {
  const groups = new Map<string, OrgNode[]>()
  const ids = new Map<string, OrgNode>()
  for (const row of rows) {
    const id = row[nodeId]
    if (!validId(id) || ids.has(String(id))) throw new Error('Missing or duplicate family member id')
    if (!validId(row.family_id)) throw new Error('Every family record requires family_id')
    const node = { ...cloneData(row), children: [] }
    ids.set(String(id), node)
    const key = String(row.family_id)
    const group = groups.get(key) ?? []
    group.push(node)
    groups.set(key, group)
  }
  const roots: OrgNode[][] = []
  for (const group of groups.values()) {
    const parentId = group[0]!.parent_id
    if (group.some(node => String(node.parent_id ?? '') !== String(parentId ?? ''))) throw new Error('Household members must share a parent')
    if (parentId == null) roots.push(group)
    else {
      const parent = ids.get(String(parentId))
      if (!parent) throw new Error(`Missing parent: ${parentId}`)
      ;(parent.children as OrgNode[][]).push(group)
    }
  }
  const model = new ChartModel(roots, nodeId)
  if (model.nodes.size !== rows.length) throw new Error('Cycle in family datasource')
  return roots
}

export class ChartModel {
  roots: NormalizedNode[][] = []
  nodes = new Map<string, NormalizedNode>()
  family = false
  constructor(source: Datasource, public nodeId = 'id') {
    if (source == null) return
    if (typeof HTMLUListElement !== 'undefined' && source instanceof HTMLUListElement) source = ulToTree(source, nodeId)
    if (source == null || (Array.isArray(source) && !source.length)) return
    this.family = Array.isArray(source) && Array.isArray(source[0])
    if (Array.isArray(source) && !this.family) source = flatToTree(source as OrgNode[], nodeId)
    if (!source) return
    const ancestors = new Set<OrgNode>()
    const build = (record: OrgNode, parentKey: string | null, depth: number): NormalizedNode => {
      if (!record || typeof record !== 'object' || Array.isArray(record)) throw new TypeError('Invalid node record')
      if (ancestors.has(record)) throw new Error('Cycle in datasource')
      ancestors.add(record)
      const id = record[nodeId]
      if (id != null && !validId(id)) throw new TypeError('Invalid node id')
      const key = id == null ? `__oc_auto_${anonymousSequence++}` : String(id)
      if (this.nodes.has(key)) throw new Error(`Duplicate node id: ${key}`)
      const { children, ...fields } = toRaw(record)
      const node: NormalizedNode = { key, data: cloneData(fields), parentKey, depth, children: [] }
      this.nodes.set(key, node)
      if (children != null && !Array.isArray(children)) throw new TypeError('children must be an array')
      const groups = children?.length ? (Array.isArray(children[0]) ? children as OrgNode[][] : (children as OrgNode[]).map(child => [child])) : []
      node.children = groups.map(group => {
        if (!group.length) throw new Error('Empty household')
        return group.map(child => build(child, key, depth + 1))
      })
      ancestors.delete(record)
      return node
    }
    const groups = this.family ? source as OrgNode[][] : [[source as OrgNode]]
    this.roots = groups.map(group => {
      if (!group.length) throw new Error('Empty household')
      return group.map(node => build(node, null, 1))
    })
  }
  resolve(reference: NodeRef): NormalizedNode {
    const id = typeof reference === 'object'
      ? (typeof HTMLElement !== 'undefined' && reference instanceof HTMLElement ? reference.dataset.nodeKey : (reference as OrgNode)[this.nodeId])
      : reference
    const node = this.nodes.get(String(id))
    if (!node) throw new Error(`Unknown node: ${id}`)
    return node
  }
  parent(node: NormalizedNode) { return node.parentKey == null ? null : this.nodes.get(node.parentKey)! }
  groups(node: NormalizedNode) { return this.parent(node)?.children ?? this.roots }
  siblings(node: NormalizedNode) { return this.groups(node).flat().filter(other => other !== node) }
  children(node: NormalizedNode) { return node.children.flat() }
  related(node: NormalizedNode, relation: Relation): NormalizedNode[] {
    if (relation === 'parent') { const parent = this.parent(node); return parent ? [parent] : [] }
    if (relation === 'children') return this.children(node)
    if (relation === 'siblings') return this.siblings(node)
    throw new TypeError(`Invalid relation: ${relation}`)
  }
  ancestors(node: NormalizedNode): NormalizedNode[] {
    const parents: NormalizedNode[] = []
    let parent = this.parent(node)
    while (parent) { parents.push(parent); parent = this.parent(parent) }
    return parents
  }
  hierarchy(includeData = false): OrgNode | OrgNode[][] | string {
    if (!this.nodes.size) return 'Error: chart has no nodes'
    if ([...this.nodes.values()].some(node => !validId(node.data[this.nodeId]))) return 'Error: nodes require ids'
    return this.snapshot(includeData)!
  }
  snapshot(includeData = true): OrgNode | OrgNode[][] | null {
    if (!this.nodes.size) return null
    const serialize = (node: NormalizedNode): OrgNode => {
      const data: OrgNode = includeData ? cloneData(node.data) : { [this.nodeId]: node.data[this.nodeId] }
      delete data.parent_id
      if (node.children.length) data.children = this.family ? node.children.map(group => group.map(serialize)) : node.children.flat().map(serialize)
      return data
    }
    return this.family ? this.roots.map(group => group.map(serialize)) : serialize(this.roots[0]![0]!)
  }
  flat(): OrgNode[] | string {
    if (typeof this.hierarchy() === 'string') return this.hierarchy() as string
    const rows: OrgNode[] = []
    let familyIndex = 0
    const walk = (groups: NormalizedNode[][]) => {
      for (const group of groups) {
        const familyId = `family-${++familyIndex}`
        for (const node of group) {
          const data = cloneData(node.data)
          delete data.level; delete data.parentId
          data.parent_id = (this.parent(node)?.data[this.nodeId] as NodeId) ?? null
          if (this.family) data.family_id = familyId
          rows.push(data); walk(node.children)
        }
      }
    }
    walk(this.roots)
    return rows
  }
  private adopt(groups: NormalizedNode[][], parentKey: string | null, depth: number) {
    for (const node of groups.flat()) {
      node.parentKey = parentKey; node.depth = depth
      this.nodes.set(node.key, node); this.adopt(node.children, node.key, depth + 1)
    }
  }
  private incoming(data: OrgNode[] | OrgNode[][]) {
    if (!Array.isArray(data)) throw new TypeError('Expected an array of nodes')
    if (!data.length) return []
    const family = Array.isArray(data[0])
    const model = new ChartModel(family ? data : [data as OrgNode[]], this.nodeId)
    for (const key of model.nodes.keys()) if (this.nodes.has(key)) throw new Error(`Duplicate node id: ${key}`)
    return family ? model.roots : model.roots[0]!.map(node => [node])
  }
  addChildren(reference: NodeRef, data: OrgNode[] | OrgNode[][]) {
    const parent = this.resolve(reference); const groups = this.incoming(data)
    this.adopt(groups, parent.key, parent.depth + 1); parent.children.push(...groups)
  }
  addSiblings(reference: NodeRef, data: OrgNode[] | OrgNode[][]) {
    const node = this.resolve(reference)
    if (!node.parentKey && !this.family) throw new Error('A tree root cannot have siblings; add a parent first')
    const groups = this.incoming(data)
    this.adopt(groups, node.parentKey, node.depth); this.groups(node).push(...groups)
  }
  addAncestors(data: Datasource, parentId: NodeId) {
    const model = new ChartModel(data, this.nodeId); const parent = model.resolve(parentId)
    for (const key of model.nodes.keys()) if (this.nodes.has(key)) throw new Error(`Duplicate node id: ${key}`)
    parent.children.push(...this.roots); this.roots = model.roots; this.family ||= model.family
    this.adopt(this.roots, null, 1)
  }
  addParent(reference: NodeRef, data: OrgNode) {
    const node = this.resolve(reference)
    if (node.parentKey) throw new Error('addParent requires a root')
    if (!validId(data[this.nodeId])) throw new Error('New parent requires an id')
    this.addAncestors(data, data[this.nodeId] as NodeId)
  }
  remove(reference: NodeRef) {
    const node = this.resolve(reference); const groups = this.groups(node)
    const group = groups.find(group => group.includes(node))!
    group.splice(group.indexOf(node), 1)
    if (!group.length) groups.splice(groups.indexOf(group), 1)
    const erase = (target: NormalizedNode) => { this.nodes.delete(target.key); target.children.flat().forEach(erase) }
    erase(node)
  }
  canMove(reference: NodeRef, targetRef: NodeRef) {
    const node = this.resolve(reference); const target = this.resolve(targetRef)
    return node !== target && !this.ancestors(target).includes(node) && (node.parentKey !== null || this.family) && node.parentKey !== target.key
  }
  move(reference: NodeRef, targetRef: NodeRef) {
    if (!this.canMove(reference, targetRef)) throw new Error('Invalid move: root, self, current parent or descendant')
    const node = this.resolve(reference); const target = this.resolve(targetRef)
    const groups = this.groups(node); const group = groups.find(group => group.includes(node))!
    group.splice(group.indexOf(node), 1)
    if (!group.length) groups.splice(groups.indexOf(group), 1)
    target.children.push([node]); this.adopt([[node]], target.key, target.depth + 1)
  }
}