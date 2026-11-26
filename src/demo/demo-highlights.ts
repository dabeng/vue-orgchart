export const relationLegend = [['parent', 'Parent'], ['children', 'Children'], ['siblings', 'Siblings']] as const

export function markReportingPath(nodes: (HTMLElement | null)[]) {
  const surface = nodes.find(Boolean)?.closest('.orgchart')
  if (!surface) return () => {}

  const parents = new Map(nodes.slice(1).map((node, index) => [node?.dataset.nodeKey, nodes[index]?.dataset.nodeKey]))
  const links = Array.from(surface.querySelectorAll<SVGPathElement>('.oc-connections path:not(.oc-spouse-link)'))
  const marked = [...nodes, ...links.filter(link => link.dataset.source != null && parents.get(link.dataset.target) === link.dataset.source)]
  for (const element of marked) element?.setAttribute('data-report-path', '')
  return () => { for (const element of marked) element?.removeAttribute('data-report-path') }
}

export function markRelatedNodes(groups: (readonly [string, HTMLElement | HTMLElement[] | null])[]) {
  const marked: HTMLElement[] = []
  for (const [relation, result] of groups) {
    for (const element of Array.isArray(result) ? result : result ? [result] : []) {
      element.dataset.nodeRelation = relation
      marked.push(element)
    }
  }
  return () => { for (const element of marked) delete element.dataset.nodeRelation }
}