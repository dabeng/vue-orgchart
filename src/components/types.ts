import type { VNode } from 'vue'
export type NodeId = string | number
export type ChartEvent = 'node-click' | 'select' | 'deselect' | 'change' | 'update:data' | 'update:datasource' | 'init' | 'show' | 'hide' | 'node-drop' | 'load' | 'load-error' | 'zoom' | 'pan' | 'export' | 'export-error'
export interface OrgNode {
  id?: NodeId
  name?: string
  title?: string
  children?: OrgNode[] | OrgNode[][]
  parent_id?: NodeId | null
  collapsed?: boolean
  className?: string
  hybrid?: boolean
  compact?: boolean
  levelOffset?: number
  [field: string]: unknown
}
export type Datasource = OrgNode | OrgNode[] | OrgNode[][] | HTMLUListElement | null
export type Direction = 't2b' | 'b2t' | 'l2r' | 'r2l'
export type Relation = 'parent' | 'children' | 'siblings'
export type NodeRef = NodeId | HTMLElement | OrgNode
export interface Icons {
  theme?: string
  parentNode?: string
  expandToUp?: string
  collapseToDown?: string
  collapseToLeft?: string
  expandToRight?: string
  collapsed?: string
  expanded?: string
}
export interface ChartOptions {
  data?: Datasource
  datasource?: Datasource
  nodeId?: string
  nodeTitle?: string
  nodeContent?: string
  direction?: Direction
  visibleLevel?: number | boolean
  verticalLevel?: number
  compact?: boolean | ((node: OrgNode) => boolean)
  toggleSiblingsResp?: boolean
  pan?: boolean
  zoom?: boolean
  minimap?: boolean
  zoominLimit?: number
  zoomoutLimit?: number
  draggable?: boolean
  drag?: boolean
  chartClass?: string
  icons?: Icons
  nodeTemplate?: (data: OrgNode) => string | VNode | VNode[]
  createNode?: (node: HTMLElement, data: OrgNode) => void
  dropCriteria?: (dragged: HTMLElement, parent: HTMLElement | null, target: HTMLElement) => boolean
  initCompleted?: (chart: HTMLElement) => void
  exportButton?: boolean
  exportButtonName?: string
  exportFilename?: string
  exportFileextension?: 'png' | 'pdf'
  exportScale?: number
}
export interface NormalizedNode {
  key: string
  data: OrgNode
  parentKey: string | null
  depth: number
  children: NormalizedNode[][]
}
export interface NodeState { exist: boolean; visible: boolean }
export interface Viewport { x: number; y: number; scale: number }