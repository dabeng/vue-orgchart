import { expect, test, type Locator, type Page } from '@playwright/test'
import { demos } from '../../src/demo/demos'

test('demo sidebar can be toggled without resetting the chart', async ({ page, isMobile }) => {
  await page.goto('/#/data-prop-compact')
  const navigation = page.getByRole('navigation', { name: 'Demos' })
  const chart = page.locator('.orgchart-container')
  const chartWidth = () => chart.evaluate(element => element.clientWidth)
  const root = chart.locator('.node').first()
  await expect(root).toBeVisible()
  const originalWidth = await chartWidth()

  if (isMobile) {
    const menu = page.getByRole('button', { name: 'Demos', exact: true })
    await expect(menu).toHaveAttribute('aria-expanded', 'false')
    await expect(navigation).toBeHidden()
    await menu.tap()
    await expect(menu).toHaveAttribute('aria-expanded', 'true')
    await expect(navigation.getByRole('link', { name: 'Compact branches' })).toHaveAttribute('aria-current', 'page')
    await expect.poll(chartWidth).toBe(originalWidth)
    await page.getByRole('button', { name: 'Close demos' }).tap()
    await expect(menu).toHaveAttribute('aria-expanded', 'false')
    await expect(navigation).toBeHidden()
    await root.tap()
  } else {
    const collapse = page.getByRole('button', { name: 'Collapse demos' })
    await expect(collapse).toHaveAttribute('aria-expanded', 'true')
    await expect(navigation).toBeVisible()
    await page.getByRole('textbox', { name: 'Search demos' }).fill('Compact branches')
    await collapse.click()
    const expand = page.getByRole('button', { name: 'Expand demos' })
    await expect(expand).toHaveAttribute('aria-expanded', 'false')
    await expect(navigation).toBeHidden()
    await expect.poll(chartWidth).toBeGreaterThan(originalWidth + 190)
    await root.click()
    await expect(root).toHaveAttribute('aria-selected', 'true')
    await expand.press('Enter')
    await expect(collapse).toBeFocused()
    await expect(navigation.getByRole('link', { name: 'Compact branches' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('textbox', { name: 'Search demos' })).toHaveValue('Compact branches')
    await expect.poll(chartWidth).toBe(originalWidth)
  }

  await expect(root).toHaveAttribute('aria-selected', 'true')
})

function chartNodes(chart: Locator, ids: string[]) {
  return chart.locator(ids.map(id => `.node[id="${id}"]`).join(', '))
}

test('compact branches match the native grids and nested toggles', async ({ page, isMobile }) => {
  await page.goto('/#/data-prop-compact')
  const chart = page.getByRole('tree', { name: 'Organization chart' })
  const visibleNodes = chart.getByRole('treeitem')
  const frame = (id: string) => chart.locator(`[data-compact-group="${id}"]`)
  const rows = (ids: string[]) => chartNodes(chart, ids).evaluateAll(nodes => {
    const byRow = new Map<number, { left: number; label: string | null }[]>()
    for (const node of nodes as HTMLElement[]) {
      const row = byRow.get(node.offsetTop) ?? []
      row.push({ left: node.offsetLeft, label: node.getAttribute('aria-label') }); byRow.set(node.offsetTop, row)
    }
    return [...byRow].sort(([first], [second]) => first - second).map(([, row]) => row.sort((first, second) => first.left - second.left).map(node => node.label))
  })
  async function toggle(name: string, expand: boolean) {
    const node = chart.getByRole('treeitem', { name, exact: true })
    if (isMobile) await node.tap(); else await node.hover()
    const control = node.getByRole('button', { name: expand ? 'Expand compact layout' : 'Use compact layout' })
    await expect.poll(() => control.evaluate((element, expand) => {
      const bounds = element.getBoundingClientRect()
      const cardEdge = element.closest('.node')!.querySelector(expand ? '.content' : '.title')!.getBoundingClientRect()
      const triangle = getComputedStyle(element, '::before')
      const edgeOffsets = expand ? [cardEdge.right - bounds.right, cardEdge.bottom - bounds.bottom] : [bounds.left - cardEdge.left, bounds.top - cardEdge.top]
      return { edgeOffsets: edgeOffsets.map(Math.abs), size: [triangle.width, triangle.height], color: triangle.backgroundColor, opacity: triangle.opacity }
    }, expand)).toEqual({ edgeOffsets: [0, 0], size: ['20px', '20px'], color: 'rgb(198, 40, 40)', opacity: '0.5' })
    await control.evaluate(element => {
      const owner = element.closest<HTMLElement>('.node')!
      const tree = owner.closest('.orgchart')!
      const key = owner.dataset.nodeKey!
      delete owner.dataset.compactFirstFrame
      element.addEventListener('click', () => requestAnimationFrame(() => {
        const children = [...tree.querySelectorAll(`.node[data-parent="${CSS.escape(key)}"]`)]
        const shown = children.filter(child => getComputedStyle(child).display !== 'none')
        const fullyShown = shown.length === children.length && shown.every(child => getComputedStyle(child).opacity === '1')
        const hasGroup = !!tree.querySelector(`[data-compact-group="${CSS.escape(key)}"]`)
        const hasMotion = tree.getAnimations({ subtree: true }).some(animation => animation instanceof CSSTransition && ['left', 'top', 'opacity', 'transform'].includes(animation.transitionProperty))
        owner.dataset.compactFirstFrame = JSON.stringify({ fullyShown, fullyHidden: shown.length === 0, hasGroup, hasMotion })
      }), { once: true })
    })
    if (isMobile) await control.tap(); else await control.click()
    await expect(node).toHaveAttribute('data-compact-first-frame', JSON.stringify({ fullyShown: expand, fullyHidden: !expand, hasGroup: expand, hasMotion: false }))
    await expect(node).toHaveAttribute('aria-expanded', String(expand))
    await expect(chart).not.toHaveClass(/oc-relating/)
  }

  await expect(chart.locator('.node')).toHaveCount(26)
  await expect(visibleNodes).toHaveCount(7)
  await expect(chartNodes(chart, ['1']).locator('.title')).toHaveCSS('background-color', 'rgb(19, 107, 90)')
  await expect(chart.locator('path[data-target="2"]')).toHaveCSS('stroke', 'rgb(150, 173, 166)')
  await expect(chartNodes(chart, ['2'])).toHaveCSS('box-shadow', 'rgb(182, 226, 215) 0px 0px 0px 5px')
  await expect(chart.locator('.oc-compact-group')).toHaveCount(0)
  await toggle('Bo Miao', true)
  await expect(frame('2')).toHaveCSS('fill', 'rgb(182, 226, 215)')
  await expect.poll(() => rows(['2', '8', '9', '10', '11', '12'])).toEqual([['Bo Miao', 'Fei Xuan'], ['Er Xuan', 'San Xuan'], ['Si Xuan', 'Wu Xuan']])
  await toggle('Si Xuan', true)
  await expect(frame('11')).toHaveClass(/oc-compact-nested/)
  await expect(frame('11')).toHaveCSS('fill', 'rgb(255, 255, 255)')
  await expect.poll(() => rows(['11', '13', '14', '15', '16'])).toEqual([['Si Xuan', 'Feng Shou'], ['Er Shou', 'San Shou'], ['Si Shou']])

  await toggle('Bo Miao', false)
  await expect(visibleNodes).toHaveCount(7)
  await toggle('Bo Miao', true)
  await expect(chart.getByRole('treeitem', { name: 'Si Xuan' })).toHaveAttribute('aria-expanded', 'false')
  await expect(frame('11')).toHaveCount(0)
  await toggle('Bo Miao', false)
  await toggle('Hei Hei', true)
  await expect.poll(() => rows(['5', ...Array.from({ length: 10 }, (_, index) => String(17 + index))])).toEqual([
    ['Hei Hei', 'Dan Dan', 'Er Dan'], ['San Dan', 'Si Dan', 'Wu Dan'], ['Liu Dan', 'Qi Dan', 'Ba Dan'], ['Jiu Dan', 'Shi Dan'],
  ])
  await expect(visibleNodes).toHaveCount(17)
  await toggle('Hei Hei', false)
  await expect(visibleNodes).toHaveCount(7)
})

async function checkChildToggles(page: Page, anchorId: string, childIds: string[], initiallyExpanded = true, keys: (string | null)[] = [null, 'Enter', null, 'Space']) {
  const chart = page.locator('.orgchart')
  const anchor = chartNodes(chart, [anchorId])
  const children = chartNodes(chart, childIds)
  const compact = await anchor.getAttribute('data-layout') === 'compact'
  await expect(children).toHaveCount(childIds.length)
  await expect(children.filter({ visible: true })).toHaveCount(initiallyExpanded ? childIds.length : 0)

  for (const [index, key] of keys.entries()) {
    const expanded = index % 2 === 0 ? !initiallyExpanded : initiallyExpanded
    await expect(anchor).toBeVisible()
    await anchor.focus()
    const control = anchor.getByRole('button', { name: compact ? (expanded ? 'Expand compact layout' : 'Use compact layout') : (expanded ? 'Expand children' : 'Collapse children'), exact: true })
    await expect(control).toHaveAttribute('aria-expanded', String(!expanded))
    if (key) await control.press(key)
    else await control.click()

    await expect(chart).not.toHaveClass(/oc-relating/)
    await expect(anchor).toBeVisible()
    await expect(anchor).toHaveAttribute('aria-expanded', String(expanded))
    await expect(children.filter({ visible: true })).toHaveCount(expanded ? childIds.length : 0)
  }
}

async function checkRelatedToggle(chart: Locator, anchorId: string, targetIds: string[], hideLabel: string, showLabel = hideLabel) {
  await test.step(`${hideLabel} and restore from node ${anchorId}`, async () => {
    const anchor = chartNodes(chart, [anchorId])
    const targets = chartNodes(chart, targetIds).filter({ visible: true })
    await expect(targets).toHaveCount(targetIds.length)
    await anchor.focus()
    const hide = anchor.getByRole('button', { name: hideLabel, exact: true })
    await expect(hide).toBeVisible()
    await hide.click()
    await expect(chart).not.toHaveClass(/oc-relating/)
    await expect(targets).toHaveCount(0)
    await expect(anchor).toBeVisible()
    await anchor.focus()
    const show = anchor.getByRole('button', { name: showLabel, exact: true })
    await expect(show).toBeVisible()
    await show.press('Enter')
    await expect(chart).not.toHaveClass(/oc-relating/)
    await expect(targets).toHaveCount(targetIds.length)
    await expect(anchor).toBeVisible()
  })
}

const branchLayouts = new Map([
  ['data-prop-compact', 'compact'], ['options-compact-drag', 'compact'],
  ['data-prop-hybrid', 'vertical'], ['edit-hybrid-chart', 'vertical'],
  ['drag-drop-hybrid-chart', 'vertical'], ['options-hybrid-navigation', 'vertical'],
])

for (const demo of demos) {
  test(`demo: ${demo.id}`, async ({ page }) => {
    if (demo.kind === 'large') test.slow()
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
    await page.goto(`/#/${demo.id}`)
    await expect(page.getByRole('heading', { name: demo.name, exact: true })).toBeVisible()
    await expect(page.locator('.view-heading').getByText(demo.subtitle, { exact: true })).toBeVisible()
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
      await test.step('toggle a compact department without expanding the other departments', async () => {
        const chart = page.locator('.orgchart')
        await expect(chart.locator('.node:visible')).toHaveCount(100)
        await expect(chartNodes(chart, ['branch-0'])).toHaveAttribute('data-layout', 'compact')
        await checkChildToggles(page, 'branch-0', Array.from({ length: 100 }, (_, index) => `member-0-${index}`), false, [null, 'Enter'])
        await expect(chart.locator('.node:visible')).toHaveCount(100)
      })
      await page.getByRole('button', { name: 'Expand all', exact: true }).click()
      await expect(page.locator('.node:visible')).toHaveCount(10000)
      await page.getByRole('button', { name: 'Collapse all', exact: true }).click()
      await expect(page.locator('.node:visible')).toHaveCount(1)
    } else {
      const chart = page.locator('.orgchart')
      const branchLayout = branchLayouts.get(demo.id)
      const family = demo.kind?.startsWith('family')
      await test.step('toggle children with pointer, Enter and Space', async () => {
        if (demo.kind === 'loading') {
          await page.locator('.node[id="1"]').getByRole('button', { name: 'Load children', exact: true }).click()
          await checkChildToggles(page, '1', ['1-a', '1-c'])
        } else if (demo.id === 'vertical-level') {
          await checkChildToggles(page, '3', ['4', '5'])
        } else if (demo.id === 'data-prop-compact') {
          await expect(chart.locator('.node:visible')).toHaveCount(7)
          await checkChildToggles(page, '2', ['8', '9', '10', '11', '12'], false)
        } else if (family) {
          await checkChildToggles(page, '1', ['2', '3', '9', '10'])
        } else if (['default-collapsed', 'expand-to-given-depth'].includes(demo.id)) {
          await checkChildToggles(page, '2', ['4', '5'], false)
        } else if (branchLayout) {
          await expect(chartNodes(chart, ['2'])).toHaveAttribute('data-layout', branchLayout)
          await checkChildToggles(page, '2', ['4', '5'])
        } else {
          await checkChildToggles(page, '1', ['2', '3'])
        }
      })
      if (demo.kind === 'loading') {
        await checkRelatedToggle(chart, '1-c', ['1-a'], 'Toggle left siblings')
        await checkRelatedToggle(chart, '1-a', ['1-c'], 'Toggle right siblings')
        await page.getByRole('button', { name: 'Load ancestors', exact: true }).click()
        await expect(chartNodes(chart, ['ancestor-1'])).toBeVisible()
        await checkRelatedToggle(chart, '1', ['ancestor-2'], 'Hide ancestors', 'Show parent')
        await expect(chartNodes(chart, ['ancestor-1'])).not.toBeVisible()
      } else {
        await checkRelatedToggle(chart, '3', family ? ['2', '10'] : ['2'], 'Toggle left siblings')
        if (branchLayout !== 'compact') await checkRelatedToggle(chart, family ? '3' : '2', family ? ['2', '10'] : ['3'], 'Toggle right siblings')
        await checkRelatedToggle(chart, family || branchLayout === 'compact' ? '3' : '2', family ? ['1', '8'] : ['1'], 'Hide ancestors', 'Show parent')
      }
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
      await page.getByRole('button', { name: 'Expand all', exact: true }).click()
      await expect.poll(() => page.locator('.orgchart').evaluate(chart => chart.getAnimations({ subtree: true }).length)).toBe(0)
      await node.focus(); await node.scrollIntoViewIfNeeded()
      const button = node.locator(selector)
      await expect(button.locator(`.lucide-chevron-${icon}`)).toBeVisible()
      await expect.poll(() => button.evaluate((element, side) => {
        const bounds = element.getBoundingClientRect(); const parent = element.closest('.node')!.getBoundingClientRect()
        const centerX = bounds.x + bounds.width / 2; const centerY = bounds.y + bounds.height / 2
        if (side === 'top' || side === 'bottom') return Math.abs(centerX - parent.x - parent.width / 2) < 1 && (side === 'top' ? centerY < parent.top : centerY > parent.bottom)
        return Math.abs(centerY - parent.y - parent.height / 2) < 1 && (side === 'left' ? centerX < parent.left : centerX > parent.right)
      }, edge)).toBe(true)
      await button.click()
      await expect(page.locator(`.node[id="${relation}"]`)).not.toBeVisible()
      await expect(page.locator('.orgchart')).not.toHaveClass(/oc-relating/)
      await node.hover()
      await expect(button.locator(`.lucide-chevron-${opposite[icon]}`)).toBeVisible()
      await button.click()
      await expect(page.locator(`.node[id="${relation}"]`)).toBeVisible()
      await expect(page.locator('.orgchart')).not.toHaveClass(/oc-relating/)
      await node.hover()
      await expect(button.locator(`.lucide-chevron-${icon}`)).toBeVisible()
    }
    await page.screenshot({ path: test.info().outputPath('node-controls.png'), fullPage: true })
  })
}

test('node controls follow hover and blank canvas clears selection', async ({ page }, info) => {
  await page.goto('/#/local-datasource')
  const canvas = page.locator('.orgchart-container')
  const node = page.locator('.node[id="2"]')
  const editor = page.locator('.edit-section')
  const controls = node.locator('.oc-controls')
  const add = editor.getByRole('button', { name: 'Add child', exact: true })
  const blank = { x: 8, y: 8 }

  await node.click()
  await expect(controls).toBeVisible()
  await expect(node).toHaveClass(/\bfocused\b/)
  await expect(add).toBeEnabled()
  const bounds = (await canvas.boundingBox())!
  await page.mouse.move(bounds.x + blank.x, bounds.y + blank.y)
  await expect(controls).toHaveCount(0)
  await expect(node).toHaveAttribute('aria-selected', 'true')

  await page.getByRole('checkbox', { name: 'Pan', exact: true }).check()
  const panBounds = (await canvas.boundingBox())!
  await page.mouse.move(panBounds.x + blank.x, panBounds.y + blank.y)
  await page.mouse.down()
  await page.mouse.move(panBounds.x + 60, panBounds.y + blank.y, { steps: 4 })
  await page.mouse.up()
  await expect(node).toHaveAttribute('aria-selected', 'true')

  if (info.project.name.startsWith('mobile')) await canvas.tap({ position: blank })
  else await canvas.click({ position: blank })
  await expect(node).toHaveAttribute('aria-selected', 'false')
  await expect(node).not.toHaveClass(/\bfocused\b/)
  await expect(node).not.toBeFocused()
  await expect(add).toBeDisabled()
  await expect(controls).toHaveCount(0)

  await node.focus()
  await expect(controls).toBeVisible()
  await node.press('Enter')
  await expect(node).toHaveAttribute('aria-selected', 'true')
  await node.press('Escape')
  await expect(node).toHaveAttribute('aria-selected', 'false')
  await expect(add).toBeDisabled()
})

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

test('on-demand loading retries failures and prevents duplicate successful requests', async ({ page }) => {
  let childRequests = 0
  await page.route('**/data/children.json', route => ++childRequests === 1 ? route.fulfill({ status: 503 }) : route.continue())
  await page.goto('/#/ondemand-loading-data')
  const chart = page.locator('.orgchart')
  const root = chartNodes(chart, ['1'])
  const load = root.getByRole('button', { name: 'Load children', exact: true })
  await load.click()
  await expect(page.getByRole('alert')).toContainText('HTTP 503')
  await expect(load).toBeEnabled()
  await load.click()
  await expect(root.getByRole('button', { name: 'Children loaded' })).toBeDisabled()
  await expect(chartNodes(chart, ['1-a', '1-b', '1-c'])).toHaveCount(3)

  const nested = chartNodes(chart, ['1-b'])
  await nested.getByRole('button', { name: 'Load children' }).click()
  await expect(nested.getByRole('button', { name: 'Children loaded' })).toBeDisabled()
  await expect(chartNodes(chart, ['1-b-a'])).toBeVisible()
  expect(childRequests).toBe(3)

  await page.getByRole('button', { name: 'Load ancestors', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ancestors loaded', exact: true })).toBeDisabled()
  await expect(chartNodes(chart, ['ancestor-1', 'ancestor-2'])).toHaveCount(2)
  await expect(page.getByRole('alert')).toHaveCount(0)

  await page.getByRole('button', { name: 'Reload data', exact: true }).click()
  await expect(chart.locator('.node')).toHaveCount(1)
  await expect(load).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Load ancestors', exact: true })).toBeEnabled()
})

test('vertical level matches the original chart and connects siblings on a common spine', async ({ page }) => {
  await page.goto('/#/vertical-level')
  const chart = page.locator('.orgchart')
  await expect(page.getByRole('spinbutton', { name: 'Expansion depth' })).toHaveValue('4')
  await expect(chart.locator('.node')).toHaveCount(18)
  await expect(chart.locator('.node:visible .title')).toHaveText([
    'Lao Lao', 'Bo Miao', 'Su Miao', 'Tie Hua', 'Hei Hei', 'Pang Pang', 'Dan Dan',
    'Hong Miao', 'Chun Miao', 'Bing Qin', 'Yue Yue', 'San Yue', 'Si Yue', 'Er Yue',
  ])
  await expect.poll(() => chart.evaluate(surface => {
    const box = (id: string) => surface.querySelector(`.node[id="${id}"]`)!.getBoundingClientRect()
    const aligned = (ids: string[], axis: 'left' | 'top') => ids.every(id => Math.abs(box(id)[axis] - box(ids[0]!)[axis]) < 1)
    const stacked = (ids: string[]) => aligned(ids, 'left') && ids.slice(1).every((id, index) => box(id).top > box(ids[index]!).bottom)
    const connected = (source: string, targets: string[]) => {
      const spines: number[] = []
      for (const target of targets) {
        const link = surface.querySelector<SVGPathElement>(`path[data-source="${source}"][data-target="${target}"]`)
        if (!link) return false
        const length = link.getTotalLength()
        const endpoint = link.getPointAtLength(length).matrixTransform(link.getScreenCTM()!)
        const node = box(target)
        if (Math.abs(endpoint.x - node.left) > 1 || Math.abs(endpoint.y - (node.top + node.height / 2)) > 1) return false
        const segments = link.getAttribute('d')!.split(' L ')
        spines.push(Number(segments.at(-2)!.split(' ')[0]))
      }
      return spines.every(spine => spine === spines[0])
    }
    return aligned(['2', '3', '12', '13'], 'top') && stacked(['3', '4', '5']) && stacked(['13', '14', '15'])
      && stacked(['6', '7']) && stacked(['16', '17', '18']) && box('6').left > box('5').left && box('16').left > box('15').left
      && connected('3', ['4', '5']) && connected('13', ['14', '15']) && connected('5', ['6', '7']) && connected('15', ['16', '17', '18'])
  })).toBe(true)
  const expandable = chartNodes(chart, ['7'])
  await expandable.focus()
  await expandable.getByRole('button', { name: 'Expand children' }).click()
  await expect(chartNodes(chart, ['8', '9']).filter({ visible: true })).toHaveCount(2)
  await expect(chartNodes(chart, ['10', '11']).filter({ visible: true })).toHaveCount(0)
})

test('level offset matches the original rows and keeps connectors attached', async ({ page }) => {
  await page.goto('/#/level-offset')
  const chart = page.locator('.orgchart')
  await expect(chart.locator('.node .title')).toHaveText(['Lao Lao', 'Bo Miao', 'Su Miao', 'Tie Hua', 'Hei Hei', 'Dan Dan', 'Pang Pang', 'Hong Miao'])
  await expect.poll(() => chart.evaluate(surface => {
    const nodes = Array.from(surface.querySelectorAll<HTMLElement>('.node'))
    const { top } = surface.getBoundingClientRect()
    const rows = new Map<number, HTMLElement[]>()
    for (const node of nodes) {
      const row = Math.round(node.getBoundingClientRect().top - top)
      rows.set(row, [...(rows.get(row) ?? []), node])
    }
    return [...rows.entries()].sort(([first], [second]) => first - second)
      .map(([, row]) => row.sort((first, second) => first.offsetLeft - second.offsetLeft).map(node => node.id))
  })).toEqual([['1'], ['3'], ['2', '4', '5'], ['6', '7', '8']])
  for (const [source, target] of [['1', '2'], ['3', '7'], ['1', '8']]) {
    const link = chart.locator(`.oc-connections path[data-source="${source}"][data-target="${target}"]`)
    await expect.poll(() => link.evaluate((path: SVGPathElement) => {
      const box = path.closest('.orgchart')!.querySelector(`.node[id="${path.dataset.target}"]`)!.getBoundingClientRect()
      const endpoint = path.getPointAtLength(path.getTotalLength()).matrixTransform(path.getScreenCTM()!)
      return Math.max(Math.abs(endpoint.x - (box.left + box.width / 2)), Math.abs(endpoint.y - box.top))
    })).toBeLessThan(1)
  }
})

test('reporting path can be drawn on the chart and cleared', async ({ page }) => {
  await page.goto('/#/report-path')
  const chart = page.locator('.orgchart')
  const draw = page.getByRole('button', { name: 'Draw reporting path' })
  const clear = page.getByRole('button', { name: 'Clear reporting path' })
  await expect(draw).toBeInViewport()
  await expect(draw).toBeDisabled()
  await chartNodes(chart, ['6']).click()
  await draw.click()
  await expect(chart.locator('.node[data-report-path]')).toHaveCount(4)
  await expect(chartNodes(chart, ['6'])).toHaveAttribute('data-report-path', '')
  await expect(chartNodes(chart, ['3'])).not.toHaveAttribute('data-report-path')
  await expect(chart.locator('.oc-connections path[data-report-path]')).toHaveCount(3)
  const links = chart.locator('.oc-connections path[data-report-path]')
  await expect(links.first()).toHaveCSS('stroke-width', '3px')
  await page.getByRole('button', { name: 'Bottom to top', exact: true }).click()
  await expect(chart).toHaveClass(/b2t/)
  await expect(links).toHaveCount(3)
  await expect(links.first()).toHaveCSS('stroke-width', '3px')
  await expect(page.locator('.inspector pre')).toContainText('Pang Pang')
  await clear.click()
  await expect(chart.locator('[data-report-path]')).toHaveCount(0)
  await expect(chartNodes(chart, ['3'])).toBeVisible()
  await expect(clear).toBeDisabled()
})

test('related nodes are highlighted with a matching legend', async ({ page }) => {
  await page.goto('/#/get-related-nodes')
  const chart = page.locator('.orgchart')
  const legend = page.getByRole('list', { name: 'Node relationships' })
  await expect(legend).toBeInViewport()
  await expect(legend.getByRole('listitem')).toHaveText(['Parent', 'Children', 'Siblings'])
  await chartNodes(chart, ['2']).click()
  const parent = chartNodes(chart, ['1'])
  await expect(parent).toHaveAttribute('data-node-relation', 'parent')
  await expect(parent.locator('.title')).toHaveCSS('background-color', 'rgb(48, 91, 147)')
  await expect(chartNodes(chart, ['3'])).toHaveAttribute('data-node-relation', 'siblings')
  await expect(chartNodes(chart, ['4', '5']).and(chart.locator('[data-node-relation="children"]'))).toHaveCount(2)
  await chartNodes(chart, ['3']).press('Enter')
  await expect(chartNodes(chart, ['2'])).toHaveAttribute('data-node-relation', 'siblings')
  await expect(chartNodes(chart, ['4', '5']).and(chart.locator('[data-node-relation]'))).toHaveCount(0)
  await expect(chartNodes(chart, ['8', '9']).and(chart.locator('[data-node-relation="children"]'))).toHaveCount(2)
})

for (const [id, label, tab, field] of [
  ['get-hierarchy', 'Export hierarchy', 'Hierarchy', 'children'],
  ['get-flat-datasource', 'Export flat datasource', 'Flat records', 'parent_id'],
]) {
  test(`datasource output: ${id}`, async ({ page }) => {
    await page.goto(`/#/${id}`)
    const command = page.getByRole('button', { name: label, exact: true })
    await expect(command).toBeInViewport()
    await page.getByRole('tab', { name: 'Datasource', exact: true }).click()
    await command.click()
    await expect(page.getByRole('tab', { name: tab, exact: true })).toHaveAttribute('aria-selected', 'true')
    const result = page.locator('.inspector pre')
    await expect(result).toBeFocused()
    await expect(result).toBeInViewport({ ratio: 1 })
    await expect(result).toContainText(`"${field}"`)
  })
}

test('reload data switches between three charts', async ({ page }) => {
  await page.goto('/#/reload-data')
  const controls = page.getByRole('group', { name: 'Reload data' })
  const chart = page.locator('.demo-chart')
  await expect(chart.locator('.node')).toHaveCount(9)
  await page.getByRole('button', { name: 'Bottom to top', exact: true }).click()
  for (const [index, count, name] of [[2, 3, 'Su Miao'], [3, 4, 'Hei Hei'], [1, 9, 'Lao Lao']] as const) {
    const button = controls.getByRole('button', { name: `Chart ${index}`, exact: true })
    await expect(button).toBeInViewport({ ratio: 1 })
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(controls.getByRole('button', { pressed: true })).toHaveCount(1)
    await expect(chart.locator('.node')).toHaveCount(count)
    await expect(chart.locator('.node').first()).toContainText(name)
  }
  await expect(page.getByRole('button', { name: 'Bottom to top', exact: true })).toHaveClass(/active/)
})

for (const [id, command, parent] of [
  ['edit-chart', 'Add children', '2'],
  ['edit-hybrid-chart', 'Add siblings', '1'],
] as const) {
  test(`batch editing: ${id}`, async ({ page }) => {
    await page.goto(`/#/${id}`)
    await page.locator('.node[id="2"]').click()
    const editor = page.locator('.demo-chart + .edit-section')
    await expect(editor.getByRole('strong')).toHaveText('Bo Miao')
    const addRow = editor.getByRole('button', { name: 'Add node row' })
    await addRow.scrollIntoViewIfNeeded()
    await expect(addRow).toBeInViewport()
    await editor.getByRole('textbox', { name: 'New node name', exact: true }).fill('Batch Alpha')
    await addRow.click()
    await editor.getByRole('textbox', { name: 'New node name 2' }).fill('Batch Beta')
    await addRow.click()
    await editor.getByRole('button', { name: 'Remove node row 3' }).click()
    await expect(editor.getByRole('button', { name: 'Add parent' })).toBeDisabled()
    await editor.getByRole('button', { name: command, exact: true }).click()
    const added = page.locator(`.node[data-parent="${parent}"][id^="new-"]`)
    await expect(added.locator('.title')).toHaveText(['Batch Alpha', 'Batch Beta'])
    await editor.getByRole('button', { name: 'Reset node fields' }).click()
    await expect(editor.getByRole('textbox', { name: 'New node name 2' })).toHaveCount(0)
    await expect(added).toHaveCount(2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false)
  })
}

test('editing, JSON validation and snapshots', async ({ page }) => {
  await page.goto('/#/edit-chart'); await page.locator('.node[id="1"]').click()
  const editor = page.locator('.demo-chart + .edit-section')
  await editor.getByRole('textbox', { name: 'New node name' }).fill('Test colleague')
  await editor.getByRole('button', { name: 'Add child', exact: true }).click()
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
    const sampleTransition = () => page.locator('.orgchart').evaluate(async chart => {
      chart.closest<HTMLElement>('.oc-shell')!.style.setProperty('--oc-duration', '800ms')
      const parent = chart.querySelector<HTMLElement>('.node[id="1"]')!
      const child = chart.querySelector<HTMLElement>('.node[id="2"]')!
      const snapshot = () => {
        if (child.style.display === 'none') return null
        const parentBounds = parent.getBoundingClientRect(); const childBounds = child.getBoundingClientRect()
        return { parent: { x: parentBounds.x, y: parentBounds.y, opacity: Number(getComputedStyle(parent).opacity) }, child: { x: childBounds.x, y: childBounds.y, opacity: Number(getComputedStyle(child).opacity) }, links: [...chart.querySelectorAll('.oc-connections path:not(.oc-spouse-link)')].filter(link => getComputedStyle(link).display !== 'none').length }
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
    }
    expect(samples.slice(2).every(sample => sample.links === 0)).toBe(true)
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
      expect(Math.abs(sample.child[axis === 'x' ? 'y' : 'x'] - expansion[0]!.child[axis === 'x' ? 'y' : 'x'])).toBeLessThan(1)
      expect(sample.links).toBe(2)
    }
    expect((expansion.at(-1)!.child[axis] - expansion[0]!.child[axis]) * sign).toBeLessThan(-1)
    expect(expansion.at(-1)!.child.opacity).toBeGreaterThan(expansion[0]!.child.opacity)
    await expect(page.locator('.node:visible')).toHaveCount(3)
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
  await expect(page.locator('.node:visible')).toHaveCount(7)
  await expect(page.locator('.orgchart')).not.toHaveClass(/oc-relating/)
  await expect.poll(() => page.locator('.orgchart').evaluate(chart => chart.getAnimations({ subtree: true }).length)).toBe(0)
  await parent.getByRole('button', { name: 'Collapse children' }).click()
  await expect(page.locator('.node:visible')).toHaveCount(5)
  await expect(page.locator('.orgchart')).not.toHaveClass(/oc-relating/)
  const collapsed = (await parent.boundingBox())!
  expect(collapsed.x).toBeCloseTo(initial.x, 0); expect(collapsed.y).toBeCloseTo(initial.y, 0)
  await parent.getByRole('button', { name: 'Expand children' }).click()
  await expect(page.locator('.node:visible')).toHaveCount(7)
  await expect.poll(() => page.locator('.orgchart').evaluate(chart => chart.getAnimations({ subtree: true }).length)).toBe(0)
  const expanded = (await parent.boundingBox())!
  expect(expanded.x).toBeCloseTo(initial.x, 0); expect(expanded.y).toBeCloseTo(initial.y, 0)
})

for (const direction of ['t2b', 'b2t', 'l2r', 'r2l'] as const) {
  for (const [relation, anchorId, targetId, edge, outgoing] of [
    ['parent', '2', '1', '.topEdge', { '1': 'parent', '3': 'right', '8': 'right', '9': 'right' }],
    ['left', '3', '2', '.leftEdge', { '2': 'left', '4': 'left', '5': 'left', '6': 'left', '7': 'left' }],
    ['right', '2', '3', '.rightEdge', { '3': 'right', '8': 'right', '9': 'right' }],
  ] as const) {
    test(`native ${relation} collapse and expansion: ${direction}`, async ({ page }) => {
      await page.goto('/#/local-datasource')
      const directionLabels = { t2b: 'Top to bottom', b2t: 'Bottom to top', l2r: 'Left to right', r2l: 'Right to left' }
      await page.getByRole('button', { name: directionLabels[direction], exact: true }).click()
      const anchor = page.locator(`.node[id="${anchorId}"]`)
      await anchor.focus(); await anchor.scrollIntoViewIfNeeded()
      await expect.poll(() => page.locator('.orgchart').evaluate(chart => chart.getAnimations({ subtree: true }).length)).toBe(0)
      const sample = () => page.locator('.orgchart').evaluate(async (chart, { anchorId, edge }) => {
        chart.closest<HTMLElement>('.oc-shell')!.style.setProperty('--oc-duration', '700ms')
        const snapshot = () => ({
          nodes: Object.fromEntries([...chart.querySelectorAll<HTMLElement>('.node')].map(node => {
            const rect = node.getBoundingClientRect(); const css = getComputedStyle(node); const matrix = new DOMMatrix(css.transform)
            return [node.id, { x: rect.x, y: rect.y, opacity: Number(css.opacity), tx: matrix.m41, ty: matrix.m42, visible: css.display !== 'none' }]
          })),
          links: [...chart.querySelectorAll<SVGPathElement>('.oc-connections path:not(.oc-spouse-link)')].filter(link => getComputedStyle(link).display !== 'none').map(link => [link.dataset.source, link.dataset.target]),
        })
        const frames = [snapshot()]
        chart.querySelector<HTMLElement>(`.node[id="${anchorId}"]`)!.querySelector<HTMLButtonElement>(edge)!.click()
        for (let frame = 0; frame < 14; frame++) { await new Promise(requestAnimationFrame); frames.push(snapshot()) }
        return frames
      }, { anchorId, edge })
      const vector = (motion: 'parent' | 'left' | 'right') => {
        if (motion === 'parent') return direction === 't2b' ? [0, 40] : direction === 'b2t' ? [0, -40] : direction === 'l2r' ? [130, 0] : [-130, 0]
        const sign = motion === 'left' ? 1 : -1
        return direction === 'l2r' || direction === 'r2l' ? [0, sign * 40] : [sign * 130, 0]
      }
      const exit = await sample(); const initial = exit[0]!
      const moving = exit.slice(3)
      expect(moving.length).toBeGreaterThan(5)
      for (const frame of moving) {
        expect(frame.nodes[anchorId]!.x).toBeCloseTo(initial.nodes[anchorId]!.x, 0)
        expect(frame.nodes[anchorId]!.y).toBeCloseTo(initial.nodes[anchorId]!.y, 0)
        for (const [key, motion] of Object.entries(outgoing)) {
          const node = frame.nodes[key]!; const start = initial.nodes[key]!; const [dx, dy] = vector(motion)
          expect(node.visible).toBe(true)
          expect(node.tx).toBeCloseTo(dx! * (1 - node.opacity), 2)
          expect(node.ty).toBeCloseTo(dy! * (1 - node.opacity), 2)
          expect(node.x - start.x).toBeCloseTo(node.tx, 0)
          expect(node.y - start.y).toBeCloseTo(node.ty, 0)
        }
        expect(frame.links.every(endpoints => endpoints.every(key => !Object.hasOwn(outgoing, key!)))).toBe(true)
      }
      expect(moving.at(-1)!.nodes[targetId]!.opacity).toBeLessThan(.95)
      expect(moving.at(-1)!.nodes[targetId]!.opacity).toBeGreaterThan(0)
      await expect(page.locator('.orgchart')).not.toHaveClass(/oc-relating/)
      await expect(page.locator(`.node[id="${targetId}"]`)).not.toBeVisible()
      await anchor.focus(); await anchor.scrollIntoViewIfNeeded()
      const enter = await sample()
      const visible = enter.filter(frame => frame.nodes[targetId]!.visible)
      expect(visible.length).toBeGreaterThan(5)
      const [dx, dy] = vector(relation)
      for (const frame of visible) {
        const node = frame.nodes[targetId]!
        expect(node.tx).toBeCloseTo(dx! * (1 - node.opacity), 2)
        expect(node.ty).toBeCloseTo(dy! * (1 - node.opacity), 2)
      }
      expect(visible.at(-1)!.nodes[targetId]!.opacity).toBeGreaterThan(visible[0]!.nodes[targetId]!.opacity)
      await expect.poll(() => page.locator('.orgchart').evaluate(chart => chart.getAnimations({ subtree: true }).length)).toBe(0)
      await expect(page.locator(`.node[id="${targetId}"]`)).toBeVisible()
      await expect(page.locator(`.node[id="${relation === 'parent' ? '3' : relation === 'left' ? '4' : '8'}"]`)).not.toBeVisible()
      await expect(page.getByRole('alert')).toHaveCount(0)
      await page.screenshot({ path: test.info().outputPath(`native-${relation}-${direction}.png`), fullPage: true })
    })
  }
}