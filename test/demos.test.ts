import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { compileScript, compileTemplate, parse } from 'vue/compiler-sfc'
import { buildDemo, demos } from '../src/demos'
import { demoSource } from '../src/demo-source'
import { ChartModel, flatToFamily } from '../src/components/tree'
import { resolveOptions } from '../src/components/options'
describe('demo catalogue', () => {
  it('contains every original demo exactly once', () => {
    const expected = ['10000-nodes','ajax-datasource','bottom2top','center-on-selected-node','color-coded','custom-icons','custom-template','data-prop-compact','data-prop-hybrid','default-collapsed','drag-drop-hybrid-chart','drag-drop','edit-chart','edit-hybrid-chart','expand-to-given-depth','export-chart-pdf','export-chart-with-pictures','export-chart','family-tree-with-flat-datasource','family-tree','familytree-custom-properties','filter-node','flat-datasource','get-flat-datasource','get-hierarchy','get-related-nodes','integrate-map','left2right','level-offset','local-datasource','minimap','nodes-of-different-widths','ondemand-loading-data','option-createNode','options-compact-drag','options-export-navigation','options-horizontal-template','options-hybrid-navigation','pan-zoom','reload-data','report-path','responsive-design','right2left','toggle-sibs-resp','ul-datasource','vertical-level']
    expect(demos.map(demo => demo.id).sort()).toEqual(expected.sort())
  })
  it.each(demos)('$id has a valid datasource and options', demo => { const config = buildDemo(demo.id); expect(() => resolveOptions(config.options)).not.toThrow(); const model = new ChartModel(config.data); expect(model.nodes.size).toBe(demo.kind === 'remote' ? 0 : demo.kind === 'large' ? 10000 : model.nodes.size); if (model.nodes.size) expect(typeof model.hierarchy()).not.toBe('string') })
  it.each(demos)('$id has compilable, demo-specific Vue source', demo => {
    const files = demoSource(demo.id)
    expect(files[0]!.name).toBe(`${demo.id}.vue`)
    for (const file of files.filter(file => file.language === 'vue')) {
      const { descriptor, errors } = parse(file.code, { filename: file.name })
      expect(errors).toEqual([])
      const script = compileScript(descriptor, { id: demo.id })
      expect(compileTemplate({ source: descriptor.template!.content, filename: file.name, id: demo.id, compilerOptions: { bindingMetadata: script.bindings, expressionPlugins: ['typescript'] } }).errors).toEqual([])
    }
    const config = buildDemo(demo.id)
    const dataFile = files.find(file => file.name === 'data.json')
    if (dataFile) expect(demo.id === 'family-tree-with-flat-datasource' ? flatToFamily(JSON.parse(dataFile.code)) : JSON.parse(dataFile.code)).toEqual(config.data)
    for (const [key, value] of Object.entries(config.options)) {
      expect(files[0]!.code).toContain(`${key}: `)
      if (typeof value !== 'function') expect(files[0]!.code).toContain(`${key}: ${JSON.stringify(value)}`)
      else expect(files[0]!.code).not.toContain(`${key}: undefined`)
    }
    expect(files[0]!.code).toContain("from 'vue-organization-chart'")
    expect(files[0]!.code).not.toContain('buildDemo(')
    if (demo.kind === 'large') expect(files.map(file => file.code).join('').length).toBeLessThan(4000)
  })
  it.each([
    ['filter-node', 'filterNodes(query)'], ['edit-chart', 'addChildren('],
    ['ondemand-loading-data', 'loadChildren('], ['report-path', 'getPath('],
    ['get-related-nodes', 'getNodeState('], ['export-chart-pdf', "export('OrgChart', 'pdf')"],
    ['center-on-selected-node', 'centerOnNode('], ['ajax-datasource', "fetch('/data/company.json')"],
    ['ul-datasource', "document.createElement('ul')"], ['reload-data', 'structuredClone(initialData)'],
    ['family-tree-with-flat-datasource', 'flatToFamily(initialData)'],
  ])('%s includes its core interaction', (id, expected) => { expect(demoSource(id!)[0]!.code).toContain(expected) })
})

describe('Vue developer documentation', () => {
  const resource = (path: string) => resolve(dirname(fileURLToPath(import.meta.url)), '..', path)
  const source = (path: string) => readFileSync(resource(path), 'utf8')
  const types = ts.createSourceFile('types.ts', source('src/components/types.ts'), ts.ScriptTarget.Latest, true)
  const options = types.statements.find((node): node is ts.InterfaceDeclaration => ts.isInterfaceDeclaration(node) && node.name.text === 'ChartOptions')
  const controller = ts.createSourceFile('useChart.ts', source('src/components/useChart.ts'), ts.ScriptTarget.Latest, true)
  const methods: string[] = []
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'api' && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      for (const member of node.initializer.properties) if (member.kind !== ts.SyntaxKind.GetAccessor && member.name) methods.push(member.name.getText(controller))
    }
    ts.forEachChild(node, visit)
  }
  visit(controller)
  const component = source('src/components/ChartContainer.vue')
  const script = ts.createSourceFile('ChartContainer.ts', component.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)![1]!, ts.ScriptTarget.Latest, true)
  const events: string[] = []
  function emitted(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'defineEmits') {
      const argument = node.arguments[0]
      if (argument && ts.isArrayLiteralExpression(argument)) for (const item of argument.elements) if (ts.isStringLiteral(item)) events.push(item.text)
    }
    ts.forEachChild(node, emitted)
  }
  emitted(script)

  it.each(['README.md', 'README.zh-cn.md', 'README.zh-tw.md'])('%s covers actual Vue props, exposed methods and emits', file => {
    const text = source(file)
    expect(options).toBeDefined(); expect(methods.length).toBeGreaterThan(0); expect(events.length).toBeGreaterThan(0)
    for (const prop of options!.members) expect(text, `Missing prop ${prop.name?.getText(types)}`).toContain(`\`${prop.name!.getText(types)}\``)
    for (const method of methods) expect(text, `Missing method ${method}`).toMatch(new RegExp(`^### ${method}\\(`, 'm'))
    for (const event of events) expect(text, `Missing Vue emit ${event}`).toContain(`\`${event}\``)
    expect(text).toContain('useTemplateRef<OrgChartInstance>')
    expect(text).not.toContain('all 29 public methods')
  })

  it.each(['README.md', 'README.zh-cn.md', 'README.zh-tw.md'])('%s contains compilable Vue examples and valid local links', file => {
    const text = source(file)
    for (const [index, match] of [...text.matchAll(/```vue\s*\n([\s\S]*?)```/g)].entries()) {
      const example = match[1]!
      const component = /^\s*<(?:script|template)(?:\s|>)/.test(example) ? example : `<template>${example}</template>`
      const { descriptor, errors } = parse(component, { filename: `example-${index}.vue` })
      expect(errors, `${file} Vue example ${index}`).toEqual([])
      const bindings = descriptor.scriptSetup ? compileScript(descriptor, { id: `example-${index}` }).bindings : undefined
      if (descriptor.template) expect(compileTemplate({ source: descriptor.template.content, filename: `example-${index}.vue`, id: `example-${index}`, compilerOptions: { bindingMetadata: bindings, expressionPlugins: ['typescript'] } }).errors).toEqual([])
    }
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1]!
      if (!target.startsWith('#') && !/^[a-z]+:/i.test(target)) expect(existsSync(resolve(dirname(resource(file)), decodeURIComponent(target.split('#')[0]!))), `Broken local link ${target}`).toBe(true)
    }
  })
})