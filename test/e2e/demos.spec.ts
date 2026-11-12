import { expect, test } from '@playwright/test'
import { demos } from '../../src/demos'
for (const demo of demos) {
  test(`demo: ${demo.id}`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
    await page.goto(`/#/${demo.id}`)
    await expect(page.getByRole('heading', { name: demo.name, exact: true })).toBeVisible()
    const source = page.getByRole('region', { name: 'Source code' })
    await expect(source.getByRole('tab', { name: `${demo.id}.vue`, exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(source.getByRole('tabpanel')).toContainText("from 'vue-organization-chart'")
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('body')).not.toContainText(/[\u3400-\u9fff]/u)
    const labels = await page.locator('[aria-label], [title], [placeholder]').evaluateAll(elements => elements.flatMap(element => ['aria-label', 'title', 'placeholder'].map(attribute => element.getAttribute(attribute) ?? '')).join('\n'))
    expect(labels).not.toMatch(/[\u3400-\u9fff]/u)
    await expect(page.locator('.node:visible').first()).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
    if (demo.kind?.startsWith('family') || demo.kind === 'portraits') {
      await expect.poll(() => page.locator('.portrait-node img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true)
      expect(await page.locator('.oc-spouse-link').count()).toBeGreaterThan(demo.kind?.startsWith('family') ? 0 : -1)
    }
    const rootInViewport = () => page.locator('.orgchart-container').evaluate(container => {
      const bounds = container.getBoundingClientRect(); const root = container.querySelector('.node')?.getBoundingClientRect()
      return !!root && root.left < bounds.right && root.right > bounds.left && root.top < bounds.bottom && root.bottom > bounds.top
    })
    await expect.poll(rootInViewport).toBe(true)
    if (demo.kind === 'large') {
      await expect(page.locator('.node')).toHaveCount(10000)
      await page.getByRole('button', { name: 'Expand all', exact: true }).click()
      await expect(page.locator('.node:visible')).toHaveCount(10000)
      await page.getByRole('button', { name: 'Collapse all', exact: true }).click()
      await expect(page.locator('.node:visible')).toHaveCount(1)
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
    expect(overflow).toBe(false)
    expect(errors).toEqual([])
  })
}

for (const [direction, parentEdge, childEdge, siblingEdge, parentArrow, childArrow, siblingArrow] of [
  ['Top to bottom', 'top', 'bottom', 'right', 'down', 'up', 'left'],
  ['Bottom to top', 'bottom', 'top', 'right', 'up', 'down', 'left'],
  ['Left to right', 'left', 'right', 'bottom', 'right', 'left', 'up'],
  ['Right to left', 'right', 'left', 'bottom', 'left', 'right', 'up'],
] as const) {
  test(`node navigation arrows: ${direction}`, async ({ page }) => {
    await page.goto('/#/local-datasource')
    await page.getByRole('button', { name: direction, exact: true }).click()
    const node = page.locator('.node[id="2"]')
    await node.focus(); await node.scrollIntoViewIfNeeded()
    const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' } as const
    for (const [selector, edge, icon, relation] of [['.topEdge', parentEdge, parentArrow, '1'], ['.bottomEdge', childEdge, childArrow, '4'], ['.rightEdge', siblingEdge, siblingArrow, '3']] as const) {
      const button = node.locator(selector)
      await expect(button.locator(`.lucide-chevron-${icon}`)).toBeVisible()
      await expect.poll(() => button.evaluate((element, side) => {
        const bounds = element.getBoundingClientRect(); const parent = element.closest('.node')!.getBoundingClientRect()
        const centerX = bounds.x + bounds.width / 2; const centerY = bounds.y + bounds.height / 2
        if (side === 'top' || side === 'bottom') return Math.abs(centerX - parent.x - parent.width / 2) < 1 && (side === 'top' ? centerY < parent.top : centerY > parent.bottom)
        return Math.abs(centerY - parent.y - parent.height / 2) < 1 && (side === 'left' ? centerX < parent.left : centerX > parent.right)
      }, edge)).toBe(true)
      await button.click()
      await expect(button.locator(`.lucide-chevron-${opposite[icon]}`)).toBeVisible()
      await expect(page.locator(`.node[id="${relation}"]`)).not.toBeVisible()
      await button.click()
      await expect(button.locator(`.lucide-chevron-${icon}`)).toBeVisible()
      await expect(page.locator(`.node[id="${relation}"]`)).toBeVisible()
    }
    await page.screenshot({ path: test.info().outputPath('node-controls.png'), fullPage: true })
  })
}

test('source code switches files and demos, supports keyboard navigation and copies the active file', async ({ page, context }, info) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/#/local-datasource')
  const source = page.getByRole('region', { name: 'Source code' })
  await page.getByRole('button', { name: 'View source', exact: true }).click()
  await expect(source.getByRole('heading', { name: 'Source code' })).toBeInViewport()
  await expect(source.getByRole('tabpanel')).toContainText('direction: "t2b"')
  await source.getByRole('tab', { name: 'data.json', exact: true }).click()
  await expect(source.getByRole('tabpanel')).toContainText('Lao Lao')
  await source.getByRole('button', { name: 'Copy source', exact: true }).click()
  await expect(source.getByRole('status')).toHaveText('Copied')
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(await source.getByRole('tabpanel').textContent())
  await source.getByRole('tab', { name: 'data.json', exact: true }).press('ArrowRight')
  await expect(source.getByRole('tab', { name: 'demo.css', exact: true })).toBeFocused()
  await expect(source.getByRole('tabpanel')).toContainText('.demo-chart')
  await expect(source.getByRole('status')).toHaveText('')
  await source.getByRole('tab', { name: 'demo.css', exact: true }).press('Home')
  await expect(source.getByRole('tab', { name: 'local-datasource.vue', exact: true })).toBeFocused()
  if (info.project.name.startsWith('mobile')) await page.getByRole('button', { name: 'Demos', exact: true }).click()
  await page.getByRole('link', { name: 'Left to right', exact: true }).click()
  await expect(source.getByRole('tab', { name: 'left2right.vue', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(source.getByRole('tabpanel')).toContainText('direction: "l2r"')
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false)
  await source.scrollIntoViewIfNeeded()
  await page.screenshot({ path: test.info().outputPath('demo-source.png'), fullPage: true })
})

test('editing, JSON validation and snapshots', async ({ page }) => {
  await page.goto('/#/edit-chart'); await page.locator('.node[id="1"]').click()
  await page.getByRole('textbox', { name: 'New node name' }).fill('Test colleague')
  await page.getByRole('button', { name: 'Add child', exact: true }).click()
  await expect(page.locator('.node[id="new-1"]')).toContainText('Test colleague')
  await page.getByRole('tab', { name: 'Flat records' }).click(); await expect(page.locator('.inspector pre')).toContainText('"parent_id": "1"')
  await page.locator('.node[id="new-1"]').click(); await page.getByRole('button', { name: 'Remove selected branch' }).click(); await expect(page.locator('.node[id="new-1"]')).toHaveCount(0)
  await page.getByRole('tab', { name: 'Datasource' }).click(); await page.getByRole('textbox', { name: 'JSON datasource' }).fill('{bad'); await page.getByRole('button', { name: 'Apply JSON' }).click(); await expect(page.getByRole('alert')).toBeVisible(); await expect(page.locator('.node[id="1"]')).toBeVisible()
})

test('filter, depth and keyboard navigation', async ({ page }) => {
  await page.goto('/#/filter-node'); await page.getByRole('textbox', { name: 'Filter nodes', exact: true }).fill('Pang Pang')
  await expect(page.locator('.node[id="6"]')).toBeVisible(); await expect(page.locator('.node[id="3"]')).not.toBeVisible()
  await page.getByRole('button', { name: 'Clear filter' }).click(); await expect(page.locator('.node[id="3"]')).toBeVisible()
  await page.getByRole('button', { name: 'Collapse all', exact: true }).click(); await expect(page.locator('.node[id="2"]')).not.toBeVisible()
  await page.locator('.node[id="1"]').focus(); await page.keyboard.press('ArrowDown'); await expect(page.locator('.node[id="2"]')).toBeVisible()
})

test('loads remote children and ancestors', async ({ page }) => {
  await page.goto('/#/ondemand-loading-data'); await page.locator('.node[id="1"]').getByRole('button', { name: 'Load children' }).click()
  await expect(page.locator('.node[id="1-a"]')).toBeVisible()
  await page.getByRole('button', { name: 'Load ancestors' }).click(); await expect(page.locator('.node[id="ancestor-1"]')).toBeVisible()
})

test('exports actual PNG and PDF files', async ({ page }) => {
  await page.goto('/#/export-chart'); await expect(page.locator('.node[id="1"]')).toBeVisible()
  const pngEvent = page.waitForEvent('download'); await page.locator('.toolbar').getByRole('button', { name: 'Export', exact: true }).click(); const png = await pngEvent; expect(png.suggestedFilename()).toBe('OrgChart.png'); await png.saveAs(test.info().outputPath('chart.png'))
  await page.getByLabel('Export format').selectOption('pdf'); const pdfEvent = page.waitForEvent('download'); await page.locator('.toolbar').getByRole('button', { name: 'Export', exact: true }).click(); const pdf = await pdfEvent; expect(pdf.suggestedFilename()).toBe('OrgChart.pdf'); await pdf.saveAs(test.info().outputPath('chart.pdf'))
  await expect(page.locator('.oc-export-mask')).toHaveCount(0); await expect(page.getByRole('alert')).toHaveCount(0)
})

test('map canvas contains rendered geographic pixels and changes selection', async ({ page }) => {
  await page.goto('/#/integrate-map'); await expect(page.locator('.office-map canvas')).toBeVisible()
  await expect.poll(() => page.locator('.office-map canvas').evaluate(canvas => { const context = (canvas as HTMLCanvasElement).getContext('2d'); if (!context) return 0; const pixels = context.getImageData(0, 0, (canvas as HTMLCanvasElement).width, (canvas as HTMLCanvasElement).height).data; let painted = 0; for (let index = 3; index < pixels.length; index += 4) if (pixels[index]! > 0) painted++; return painted })).toBeGreaterThan(1000)
  await page.locator('.node[id="2"]').click(); await expect(page.locator('.map-section header')).toContainText('London')
})

test('real HTML drag and drop respects the new hierarchy', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'HTML drag is covered on desktop; pointer gestures have dedicated tests')
  await page.goto('/#/drag-drop'); await page.locator('.node[id="4"]').dragTo(page.locator('.node[id="3"]'))
  await expect(page.locator('.node[id="4"]')).toHaveAttribute('data-parent', '3')
})

test('wheel zoom and minimap remain interactive', async ({ page }) => {
  await page.goto('/#/minimap'); await page.locator('.oc-minimap').hover(); await page.mouse.wheel(0, -120)
  await expect(page.locator('.orgchart')).toHaveAttribute('style', /scale\(1\.2\)/)
  await page.getByRole('button', { name: 'Reset view' }).click(); await expect(page.locator('.orgchart')).toHaveAttribute('style', /scale\(1\)/)
})

test('charts stay horizontally centered when narrower than the viewport', async ({ page }) => {
  await page.goto('/#/local-datasource')
  await page.getByRole('button', { name: 'Collapse all', exact: true }).click()
  await expect(page.locator('.node:visible')).toHaveCount(1)
  await expect(page.locator('.orgchart')).not.toHaveClass(/oc-relating/)
  const centeringError = () => page.locator('.orgchart-container').evaluate(container => {
    const bounds = container.getBoundingClientRect(); const chart = container.querySelector('.orgchart')!.getBoundingClientRect()
    return Math.abs(chart.x + chart.width / 2 - bounds.x - container.clientLeft - container.clientWidth / 2)
  })
  for (const direction of ['Top to bottom', 'Bottom to top', 'Left to right', 'Right to left']) {
    await page.getByRole('button', { name: direction, exact: true }).click()
    await expect.poll(centeringError).toBeLessThan(1)
  }
  await page.getByRole('button', { name: 'Top to bottom', exact: true }).click()
  const viewport = page.viewportSize()!
  await page.setViewportSize({ width: viewport.width + 180, height: viewport.height })
  await expect.poll(centeringError).toBeLessThan(1)
  await page.getByRole('checkbox', { name: 'Zoom', exact: true }).check()
  const root = page.locator('.node[id="1"]'); const before = (await root.boundingBox())!
  const anchor = { x: before.x + before.width / 4, y: before.y + before.height / 2 }
  await page.mouse.move(anchor.x, anchor.y); await page.mouse.wheel(0, -120)
  await expect(page.locator('.orgchart')).toHaveAttribute('style', /scale\(1\.2\)/)
  await expect.poll(async () => { const bounds = (await root.boundingBox())!; return Math.abs(bounds.x + bounds.width / 4 - anchor.x) }).toBeLessThan(1)
  await page.getByRole('button', { name: 'Reset view' }).click()
  await expect.poll(centeringError).toBeLessThan(1)
  await page.setViewportSize(viewport)
  await expect.poll(centeringError).toBeLessThan(1)
  await page.screenshot({ path: test.info().outputPath('centered-chart.png'), fullPage: true })
})

for (const [direction, axis, sign] of [
  ['Top to bottom', 'y', -1],
  ['Bottom to top', 'y', 1],
  ['Left to right', 'x', -1],
  ['Right to left', 'x', 1],
] as const) {
  test(`children collapse toward a stationary parent: ${direction}`, async ({ page }) => {
    await page.goto('/#/local-datasource')
    await page.getByRole('button', { name: direction, exact: true }).click()
    await page.locator('.node[id="1"]').hover()
    await expect(page.locator('.node[id="1"] .bottomEdge')).toBeVisible()
    await expect.poll(() => page.locator('.orgchart').evaluate(chart => chart.getAnimations({ subtree: true }).length)).toBe(0)
    const nodeCount = await page.locator('.node:visible').count()
    const sampleTransition = () => page.locator('.orgchart').evaluate(async chart => {
      chart.closest<HTMLElement>('.oc-shell')!.style.setProperty('--oc-duration', '800ms')
      const parent = chart.querySelector<HTMLElement>('.node[id="1"]')!
      const child = chart.querySelector<HTMLElement>('.node[id="2"]')!
      const snapshot = () => {
        const link = chart.querySelector<SVGPathElement>('.oc-connections path')
        if (child.style.display === 'none' || !link) return null
        const parentBounds = parent.getBoundingClientRect(); const childBounds = child.getBoundingClientRect()
        const linkBounds = link.getBoundingClientRect()
        return { parent: { x: parentBounds.x, y: parentBounds.y, opacity: Number(getComputedStyle(parent).opacity) }, child: { x: childBounds.x, y: childBounds.y, opacity: Number(getComputedStyle(child).opacity) }, link: { x: linkBounds.x, y: linkBounds.y, opacity: Number(getComputedStyle(link).opacity) } }
      }
      const frames = [snapshot()]
      parent.querySelector<HTMLButtonElement>('.bottomEdge')!.click()
      for (let frame = 0; frame < 12; frame++) { await new Promise(requestAnimationFrame); frames.push(snapshot()) }
      return frames.filter(frame => frame !== null)
    })
    const samples = await sampleTransition()
    const initial = samples[0]!
    for (const sample of samples) {
      expect(Math.abs(sample.parent.x - initial.parent.x)).toBeLessThan(1)
      expect(Math.abs(sample.parent.y - initial.parent.y)).toBeLessThan(1)
      expect(sample.parent.opacity).toBe(1)
      expect(Math.abs(sample.child[axis === 'x' ? 'y' : 'x'] - initial.child[axis === 'x' ? 'y' : 'x'])).toBeLessThan(1)
      expect(Math.abs(sample.link[axis === 'x' ? 'y' : 'x'] - initial.link[axis === 'x' ? 'y' : 'x'])).toBeLessThan(1)
      expect(sample.link[axis] - initial.link[axis]).toBeCloseTo(sample.child[axis] - initial.child[axis], 0)
      expect(sample.link.opacity).toBeCloseTo(sample.child.opacity, 1)
    }
    expect((samples.at(-1)!.child[axis] - initial.child[axis]) * sign).toBeGreaterThan(1)
    expect(samples.at(-1)!.child.opacity).toBeLessThan(1)
    await expect(page.locator('.node:visible')).toHaveCount(1)
    await expect(page.locator('.orgchart')).not.toHaveClass(/oc-relating/)
    const collapsedParent = (await page.locator('.node[id="1"]').boundingBox())!
    expect(collapsedParent.x).toBeCloseTo(initial.parent.x, 0); expect(collapsedParent.y).toBeCloseTo(initial.parent.y, 0)
    const expansion = await sampleTransition()
    expect(expansion.length).toBeGreaterThan(2)
    for (const sample of expansion) {
      expect(Math.abs(sample.parent.x - initial.parent.x)).toBeLessThan(1)
      expect(Math.abs(sample.parent.y - initial.parent.y)).toBeLessThan(1)
      expect(sample.parent.opacity).toBe(1)
      expect(Math.abs(sample.child[axis === 'x' ? 'y' : 'x'] - initial.child[axis === 'x' ? 'y' : 'x'])).toBeLessThan(1)
      expect(sample.link[axis] - initial.link[axis]).toBeCloseTo(sample.child[axis] - initial.child[axis], 0)
      expect(sample.link.opacity).toBeCloseTo(sample.child.opacity, 1)
    }
    expect((expansion.at(-1)!.child[axis] - expansion[0]!.child[axis]) * sign).toBeLessThan(-1)
    expect(expansion.at(-1)!.child.opacity).toBeGreaterThan(expansion[0]!.child.opacity)
    await expect(page.locator('.node:visible')).toHaveCount(nodeCount)
    await expect.poll(() => page.locator('.orgchart').evaluate(chart => chart.getAnimations({ subtree: true }).length)).toBe(0)
    const expandedParent = (await page.locator('.node[id="1"]').boundingBox())!
    expect(expandedParent.x).toBeCloseTo(initial.parent.x, 0); expect(expandedParent.y).toBeCloseTo(initial.parent.y, 0)
    await page.screenshot({ path: test.info().outputPath('expanded-chart.png'), fullPage: true })
  })
}

test('nested children and rapid reversals keep the clicked parent stationary', async ({ page }) => {
  await page.goto('/#/local-datasource')
  const parent = page.locator('.node[id="2"]'); await parent.focus()
  await expect(parent.locator('.bottomEdge')).toBeVisible()
  await parent.scrollIntoViewIfNeeded()
  await expect.poll(() => page.locator('.orgchart').evaluate(chart => chart.getAnimations({ subtree: true }).length)).toBe(0)
  const initial = (await parent.boundingBox())!
  const samples = await parent.evaluate(async node => {
    node.closest<HTMLElement>('.oc-shell')!.style.setProperty('--oc-duration', '600ms')
    const samples = []
    for (let toggle = 0; toggle < 6; toggle++) {
      node.querySelector<HTMLButtonElement>('.bottomEdge')!.click()
      for (let frame = 0; frame < 3; frame++) { await new Promise(requestAnimationFrame); const bounds = node.getBoundingClientRect(); samples.push({ x: bounds.x, y: bounds.y, opacity: Number(getComputedStyle(node).opacity) }) }
    }
    return samples
  })
  for (const sample of samples) { expect(Math.abs(sample.x - initial.x)).toBeLessThan(1); expect(Math.abs(sample.y - initial.y)).toBeLessThan(1); expect(sample.opacity).toBe(1) }
  await expect(page.locator('.node:visible')).toHaveCount(9)
  await expect(page.locator('.orgchart')).not.toHaveClass(/oc-relating/)
  await expect.poll(() => page.locator('.orgchart').evaluate(chart => chart.getAnimations({ subtree: true }).length)).toBe(0)
  await parent.getByRole('button', { name: 'Collapse children' }).click()
  await expect(page.locator('.node:visible')).toHaveCount(5)
  await expect(page.locator('.orgchart')).not.toHaveClass(/oc-relating/)
  const collapsed = (await parent.boundingBox())!
  expect(collapsed.x).toBeCloseTo(initial.x, 0); expect(collapsed.y).toBeCloseTo(initial.y, 0)
  await parent.getByRole('button', { name: 'Expand children' }).click()
  await expect(page.locator('.node:visible')).toHaveCount(9)
  await expect.poll(() => page.locator('.orgchart').evaluate(chart => chart.getAnimations({ subtree: true }).length)).toBe(0)
  const expanded = (await parent.boundingBox())!
  expect(expanded.x).toBeCloseTo(initial.x, 0); expect(expanded.y).toBeCloseTo(initial.y, 0)
})