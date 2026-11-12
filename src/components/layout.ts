import { flextree } from 'd3-flextree'
import type { ChartModel } from './tree'
import type { ResolvedOptions } from './options'
import type { NormalizedNode } from './types'
export interface Box { x: number; y: number; width: number; height: number }
export interface Link { key: string; source: string; target: string; points: [number, number][]; spouse?: boolean }
export interface Layout { width: number; height: number; boxes: Map<string, Box>; links: Link[]; modes: Map<string, string> }
interface Block { width: number; height: number; boxes: Map<string, Box>; links: Link[] }
export function layoutChart(model: ChartModel, options: ResolvedOptions, visible: (node: NormalizedNode) => boolean, expanded: (node: NormalizedNode) => boolean, sizes = new Map<string, { width: number; height: number }>()): Layout {
  const horizontal = options.direction === 'l2r' || options.direction === 'r2l'
  const modes = new Map<string, string>()
  const gap = 38
  const merge = (target: Block, source: Block, dx: number, dy: number) => {
    for (const [key, box] of source.boxes) target.boxes.set(key, { ...box, x: box.x + dx, y: box.y + dy })
    target.links.push(...source.links.map(link => ({ ...link, points: link.points.map(([px, py]) => [px + dx, py + dy] as [number, number]) })))
  }
  const build = (group: NormalizedNode[], inheritedVertical = false, inheritedCompact = false): Block => {
    const active = group.filter(visible)
    const vertical = inheritedVertical || group.some(node => node.data.hybrid || (options.verticalLevel != null && node.depth >= options.verticalLevel))
    const compact = !vertical && (inheritedCompact || group.some(node => node.data.compact || (typeof options.compact === 'function' ? options.compact(node.data) : options.compact)))
    for (const node of group) modes.set(node.key, vertical ? 'vertical' : compact ? 'compact' : 'horizontal')
    const block: Block = { width: 0, height: 0, boxes: new Map(), links: [] }
    const offset = Math.max(0, ...active.map(node => Number(node.data.levelOffset) || 0)) * 110
    let headerHeight = 0
    for (const node of active) {
      const size = sizes.get(node.key) ?? { width: Number(node.data.width) > 0 ? Number(node.data.width) : 168, height: Number(node.data.height) > 0 ? Number(node.data.height) : 72 }
      const width = horizontal ? size.height : size.width
      const height = horizontal ? size.width : size.height
      if (block.width) block.width += 18
      block.boxes.set(node.key, { x: block.width, y: offset, width, height })
      block.width += width; headerHeight = Math.max(headerHeight, height)
    }
    block.width = Math.max(24, block.width); block.height = offset + headerHeight
    const members = [...block.boxes.values()]
    for (let index = 1; index < members.length; index++) {
      const previous = members[index - 1]!; const current = members[index]!
      block.links.push({ key: `spouse-${active[index]!.key}`, source: active[index - 1]!.key, target: active[index]!.key, spouse: true, points: [[previous.x + previous.width, offset + headerHeight / 2], [current.x, offset + headerHeight / 2]] })
    }
    const descendants = group.flatMap(node => expanded(node) ? node.children : []).map(child => build(child, vertical || group.some(node => node.data.hybrid), compact)).filter(child => child.boxes.size)
    if (!descendants.length) return block
    const headerWidth = block.width
    const levelGap = headerHeight ? gap : 0
    const positions: [number, number][] = []
    if (vertical) {
      let cursor = block.height + levelGap
      for (const child of descendants) { positions.push([24, cursor]); cursor += child.height + 18 }
      block.width = Math.max(headerWidth, ...descendants.map(child => child.width + 24)); block.height = cursor - 18
    } else if (compact) {
      const columns = Math.min(3, Math.ceil(Math.sqrt(descendants.length)))
      const columnWidths = Array.from({ length: columns }, (_, column) => Math.max(...descendants.filter((_, index) => index % columns === column).map(child => child.width)))
      const rowHeights = Array.from({ length: Math.ceil(descendants.length / columns) }, (_, row) => Math.max(...descendants.slice(row * columns, (row + 1) * columns).map(child => child.height)))
      descendants.forEach((_, index) => positions.push([columnWidths.slice(0, index % columns).reduce((sum, width) => sum + width + 24, 0), block.height + levelGap + rowHeights.slice(0, Math.floor(index / columns)).reduce((sum, height) => sum + height + 24, 0)]))
      block.width = Math.max(headerWidth, columnWidths.reduce((sum, width) => sum + width, 0) + (columns - 1) * 24)
      block.height += levelGap + rowHeights.reduce((sum, height) => sum + height, 0) + (rowHeights.length - 1) * 24
    } else {
      const engine = flextree<{ width: number; height: number; children?: Block[] }>({ nodeSize: node => [node.data.width, node.data.height + (node.data.height ? gap : 0)], spacing: 24 })
      const hierarchy = engine.hierarchy({ width: headerWidth, height: block.height, children: descendants })
      engine(hierarchy)
      const left = Math.min(-headerWidth / 2, ...(hierarchy.children ?? []).map(node => node.x - node.data.width / 2))
      const right = Math.max(headerWidth / 2, ...(hierarchy.children ?? []).map(node => node.x + node.data.width / 2))
      for (const node of hierarchy.children ?? []) positions.push([node.x - node.data.width / 2 - left, node.y])
      for (const box of block.boxes.values()) box.x += -left - headerWidth / 2
      for (const link of block.links) link.points = link.points.map(([px, py]) => [px - left - headerWidth / 2, py])
      block.width = right - left; block.height += levelGap + Math.max(...descendants.map(child => child.height))
    }
    if (compact || vertical) {
      const shift = (block.width - headerWidth) / 2
      for (const box of block.boxes.values()) box.x += shift
      for (const link of block.links) link.points = link.points.map(([px, py]) => [px + shift, py])
    }
    const originX = block.width / 2
    const originY = offset + headerHeight
    descendants.forEach((child, index) => {
      const [dx, dy] = positions[index]!
      const destinationX = dx + child.width / 2
      const target = child.boxes.keys().next().value!
      if (headerHeight) block.links.push({ key: JSON.stringify(['child', active[0]!.key, target]), source: active[0]!.key, target, points: vertical || compact ? [[originX, originY], [originX, originY + 16], [dx - 12, originY + 16], [dx - 12, dy + 12], [dx, dy + 12]] : [[originX, originY], [originX, originY + gap / 2], [destinationX, originY + gap / 2], [destinationX, dy]] })
      merge(block, child, dx, dy)
    })
    return block
  }
  const rootBlocks = model.roots.map(group => build(group)).filter(block => block.boxes.size)
  const combined: Block = { width: 0, height: 0, boxes: new Map(), links: [] }
  for (const block of rootBlocks) { merge(combined, block, combined.width, 0); combined.width += block.width + 32; combined.height = Math.max(combined.height, block.height) }
  combined.width = Math.max(168, combined.width - 32); combined.height = Math.max(72, combined.height)
  const transformPoint = ([px, py]: [number, number]): [number, number] => {
    if (options.direction === 'b2t') return [px + 24, combined.height - py + 24]
    if (options.direction === 'l2r') return [py + 24, px + 24]
    if (options.direction === 'r2l') return [combined.height - py + 24, px + 24]
    return [px + 24, py + 24]
  }
  for (const [key, box] of combined.boxes) {
    const [px, py] = transformPoint([box.x, box.y])
    combined.boxes.set(key, { x: px - (options.direction === 'r2l' ? box.height : 0), y: py - (options.direction === 'b2t' ? box.height : 0), width: horizontal ? box.height : box.width, height: horizontal ? box.width : box.height })
  }
  return { width: (horizontal ? combined.height : combined.width) + 48, height: (horizontal ? combined.width : combined.height) + 48, boxes: combined.boxes, links: combined.links.map(link => ({ ...link, points: link.points.map(transformPoint) })), modes }
}