import { flextree } from 'd3-flextree'
import type { ChartModel } from './tree'
import type { ResolvedOptions } from './options'
import type { NormalizedNode, OrgNode } from './types'
export interface Box { x: number; y: number; width: number; height: number }
export interface Link { key: string; source: string; target: string; points: [number, number][]; spouse?: boolean }
interface CompactGroup extends Box { depth: number }
export interface Layout { width: number; height: number; boxes: Map<string, Box>; links: Link[]; modes: Map<string, string>; compactGroups: Map<string, CompactGroup> }
interface Block { width: number; height: number; anchorX: number; entryY: number; boxes: Map<string, Box>; links: Link[]; compactGroups: Layout['compactGroups'] }
export function layoutChart(model: ChartModel, options: ResolvedOptions, visible: (node: NormalizedNode) => boolean, expanded: (node: NormalizedNode) => boolean, sizes = new Map<string, { width: number; height: number }>()): Layout {
  const horizontal = options.direction === 'l2r' || options.direction === 'r2l'
  const modes = new Map<string, string>()
  const gap = 38
  const compactInputs = new Map<string, OrgNode>()
  function compactInput(node: NormalizedNode): OrgNode {
    const cached = compactInputs.get(node.key)
    if (cached) return cached
    const data = { ...node.data }
    if (node.children.length) data.children = model.family ? node.children.map(group => group.map(compactInput)) : model.children(node).map(compactInput)
    compactInputs.set(node.key, data)
    return data
  }
  const merge = (target: Block, source: Block, dx: number, dy: number) => {
    for (const [key, box] of source.boxes) target.boxes.set(key, { ...box, x: box.x + dx, y: box.y + dy })
    for (const [key, frame] of source.compactGroups) target.compactGroups.set(key, { ...frame, x: frame.x + dx, y: frame.y + dy })
    target.links.push(...source.links.map(link => ({ ...link, points: link.points.map(([px, py]) => [px + dx, py + dy] as [number, number]) })))
  }
  const build = (group: NormalizedNode[], inheritedVertical = false, compactDepth = 0): Block => {
    const active = group.filter(visible)
    const atVerticalDepth = (depth: number) => options.verticalLevel != null && depth >= options.verticalLevel
    const inVerticalList = inheritedVertical || group.some(node => atVerticalDepth(node.depth))
    const vertical = inVerticalList || group.some(node => node.data.hybrid)
    const stackChildren = vertical || group.some(node => atVerticalDepth(node.depth + 1))
    const compact = !vertical && (compactDepth > 0 || group.some(node => node.data.compact || (typeof options.compact === 'function' ? options.compact(compactInput(node)) : options.compact)))
    const compactGrid = compact && !stackChildren
    for (const node of group) modes.set(node.key, vertical ? 'vertical' : compact ? 'compact' : 'horizontal')
    const offset = Math.max(0, ...active.map(node => Number(node.data.levelOffset) || 0)) * 110
    const block: Block = { width: 0, height: 0, anchorX: 0, entryY: offset, boxes: new Map(), links: [], compactGroups: new Map() }
    let headerHeight = 0
    for (const node of active) {
      const size = sizes.get(node.key) ?? { width: Number(node.data.width) > 0 ? Number(node.data.width) : 168, height: Number(node.data.height) > 0 ? Number(node.data.height) : 72 }
      const width = horizontal ? size.height : size.width
      const height = horizontal ? size.width : size.height
      if (block.width) block.width += 18
      block.boxes.set(node.key, { x: block.width, y: offset, width, height })
      block.width += width; headerHeight = Math.max(headerHeight, height)
    }
    block.width = Math.max(24, block.width); block.height = offset + headerHeight; block.anchorX = block.width / 2
    const members = [...block.boxes.values()]
    for (let index = 1; index < members.length; index++) {
      const previous = members[index - 1]!; const current = members[index]!
      block.links.push({ key: `spouse-${active[index]!.key}`, source: active[index - 1]!.key, target: active[index]!.key, spouse: true, points: [[previous.x + previous.width, offset + headerHeight / 2], [current.x, offset + headerHeight / 2]] })
    }
    const descendants = group.flatMap(node => expanded(node) ? node.children : []).map(child => build(child, vertical, compactGrid ? compactDepth + 1 : 0)).filter(child => child.boxes.size)
    if (!descendants.length) return block
    if (compactGrid && active.length) {
      const padding = 10
      const cellGap = 10
      const tiles = [block, ...descendants]
      const columns = Math.floor(Math.sqrt(tiles.length))
      const columnWidths = Array<number>(columns).fill(0)
      const rowHeights = Array<number>(Math.ceil(tiles.length / columns)).fill(0)
      for (const [index, tile] of tiles.entries()) {
        const column = index % columns; const row = Math.floor(index / columns)
        columnWidths[column] = Math.max(columnWidths[column]!, tile.width)
        rowHeights[row] = Math.max(rowHeights[row]!, index === 0 ? headerHeight : tile.height)
      }
      const offsets = (tracks: number[]) => tracks.reduce<number[]>((positions, size) => [...positions, positions.at(-1)! + size + cellGap], [padding])
      const columnOffsets = offsets(columnWidths); const rowOffsets = offsets(rowHeights)
      const width = columnOffsets.at(-1)! - cellGap + padding
      const height = rowOffsets.at(-1)! - cellGap + padding
      const grid: Block = { width, height: offset + height, anchorX: width / 2, entryY: offset, boxes: new Map(), links: [], compactGroups: new Map() }
      grid.compactGroups.set(active[0]!.key, { x: 0, y: offset, width, height, depth: compactDepth })
      for (const [index, tile] of tiles.entries()) merge(grid, tile, columnOffsets[index % columns]!, index === 0 ? padding : offset + rowOffsets[Math.floor(index / columns)]!)
      return grid
    }
    const headerWidth = block.width
    const levelGap = headerHeight ? (inVerticalList ? 18 : gap) : 0
    const indent = inVerticalList ? 12 : 0
    const positions: [number, number][] = []
    if (stackChildren) {
      let cursor = block.height + levelGap
      for (const child of descendants) { positions.push([indent, cursor]); cursor += child.height + 18 }
      block.width = Math.max(headerWidth, ...descendants.map(child => child.width + indent)); block.height = cursor - 18
    } else {
      const engine = flextree<{ width: number; height: number; children?: Block[] }>({ nodeSize: node => [node.data.width, node.data.height + (node.data.height ? gap : 0)], spacing: 24 })
      const hierarchy = engine.hierarchy({ width: headerWidth, height: block.height, children: descendants })
      engine(hierarchy)
      const left = Math.min(-headerWidth / 2, ...(hierarchy.children ?? []).map(node => node.x - node.data.width / 2))
      const right = Math.max(headerWidth / 2, ...(hierarchy.children ?? []).map(node => node.x + node.data.width / 2))
      for (const node of hierarchy.children ?? []) positions.push([node.x - node.data.width / 2 - left, node.y])
      for (const box of block.boxes.values()) box.x += -left - headerWidth / 2
      for (const link of block.links) link.points = link.points.map(([px, py]) => [px - left - headerWidth / 2, py])
      block.anchorX = -left
      block.width = right - left; block.height += levelGap + Math.max(...descendants.map(child => child.height))
    }
    const originX = block.anchorX
    const originY = offset + headerHeight
    descendants.forEach((child, index) => {
      const [dx, dy] = positions[index]!
      const destinationX = dx + child.anchorX
      const [target, targetBox] = child.boxes.entries().next().value!
      const targetTop = dy + targetBox.y
      const targetLeft = dx + targetBox.x
      let points: Link['points']
      if (stackChildren) {
        const spineX = indent - 12
        const entryY = targetTop + targetBox.height / 2
        points = [[spineX, inVerticalList ? originY : originY + 16], [spineX, entryY], [targetLeft, entryY]]
        if (!inVerticalList) points.unshift([originX, originY], [originX, originY + 16])
      } else {
        points = [[originX, originY], [originX, originY + gap / 2], [destinationX, originY + gap / 2], [destinationX, dy + child.entryY]]
      }
      if (headerHeight) block.links.push({ key: JSON.stringify(['child', active[0]!.key, target]), source: active[0]!.key, target, points })
      merge(block, child, dx, dy)
    })
    return block
  }
  const rootBlocks = model.roots.map(group => build(group)).filter(block => block.boxes.size)
  const combined: Block = { width: 0, height: 0, anchorX: 0, entryY: 0, boxes: new Map(), links: [], compactGroups: new Map() }
  for (const block of rootBlocks) { merge(combined, block, combined.width, 0); combined.width += block.width + 32; combined.height = Math.max(combined.height, block.height) }
  combined.width = Math.max(168, combined.width - 32); combined.height = Math.max(72, combined.height)
  const transformPoint = ([px, py]: [number, number]): [number, number] => {
    if (options.direction === 'b2t') return [px + 24, combined.height - py + 24]
    if (options.direction === 'l2r') return [py + 24, px + 24]
    if (options.direction === 'r2l') return [combined.height - py + 24, px + 24]
    return [px + 24, py + 24]
  }
  const transformBox = <T extends Box>(box: T): T => {
    const [px, py] = transformPoint([box.x, box.y])
    return { ...box, x: px - (options.direction === 'r2l' ? box.height : 0), y: py - (options.direction === 'b2t' ? box.height : 0), width: horizontal ? box.height : box.width, height: horizontal ? box.width : box.height }
  }
  for (const [key, box] of combined.boxes) combined.boxes.set(key, transformBox(box))
  for (const [key, frame] of combined.compactGroups) combined.compactGroups.set(key, transformBox(frame))
  return { width: (horizontal ? combined.height : combined.width) + 48, height: (horizontal ? combined.width : combined.height) + 48, boxes: combined.boxes, links: combined.links.map(link => ({ ...link, points: link.points.map(transformPoint) })), modes, compactGroups: combined.compactGroups }
}