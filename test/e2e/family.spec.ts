import { expect, test } from '@playwright/test'
test.beforeEach(async ({ page }) => { await page.goto('/#/family-tree'); await expect(page.locator('.node[id="1"]')).toBeVisible() })
for (const spouse of ['1', '8', '3', '9', '12', '5']) {
  test(`shared children controls from spouse ${spouse}`, async ({ page }) => {
    const descendants = spouse === '1' || spouse === '8' ? ['2', '3', '9', '10'] : spouse === '3' || spouse === '9' ? ['12', '5'] : ['6', '7']
    const node = page.locator(`.node[id="${spouse}"]`); await node.focus(); await node.getByRole('button', { name: 'Collapse children' }).click()
    for (const id of descendants) await expect(page.locator(`.node[id="${id}"]`)).not.toBeVisible()
    await node.getByRole('button', { name: 'Expand children' }).click()
    for (const id of descendants) await expect(page.locator(`.node[id="${id}"]`)).toBeVisible()
  })
}
for (const scenario of ['family-tree', 'family-tree-with-flat-datasource', 'familytree-custom-properties']) {
  for (const direction of ['Top to bottom', 'Bottom to top', 'Left to right', 'Right to left']) {
    test(`${scenario}: ${direction} retains all members`, async ({ page }) => {
      await page.goto(`/#/${scenario}`); await page.getByRole('button', { name: direction, exact: true }).click()
      await expect(page.locator('.node:visible')).toHaveCount(10); await expect(page.locator('.oc-spouse-link')).toHaveCount(3)
    })
  }
}
test('restores whole sibling households after left and right hiding', async ({ page }) => {
  const node = page.locator('.node[id="3"]'); await page.getByRole('checkbox', { name: 'Pan' }).uncheck(); await node.focus()
  await node.getByRole('button', { name: 'Toggle left siblings' }).click(); await expect(page.locator('.node[id="2"]')).not.toBeVisible(); await expect(page.locator('.node[id="9"]')).toBeVisible()
  await node.getByRole('button', { name: 'Toggle left siblings' }).click(); await expect(page.locator('.node[id="2"]')).toBeVisible(); await expect(page.locator('.node[id="10"]')).toBeVisible()
})
test('repeated nested expansion preserves descendants and keyboard focus', async ({ page }) => {
  const root = page.locator('.node[id="8"]'); await root.focus()
  for (let iteration = 0; iteration < 5; iteration++) {
    await root.getByRole('button', { name: 'Collapse children' }).click(); await expect(page.locator('.node[id="7"]')).not.toBeVisible()
    await root.getByRole('button', { name: 'Expand children' }).click(); await expect(page.locator('.node[id="7"]')).toBeVisible()
  }
  await root.focus(); await page.keyboard.press('Enter'); await expect(root).toHaveAttribute('aria-selected', 'true')
})
test('removing a member preserves the other spouse', async ({ page }) => {
  await page.locator('.node[id="12"]').click(); await page.getByRole('button', { name: 'Remove selected branch' }).click()
  await expect(page.locator('.node[id="12"]')).toHaveCount(0); await expect(page.locator('.node[id="5"]')).toBeVisible(); await expect(page.locator('.node[id="7"]')).toHaveCount(0)
})
test('reduced motion still completes collapse cleanup', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); const root = page.locator('.node[id="1"]'); await root.focus(); await root.getByRole('button', { name: 'Collapse children' }).click(); await expect(page.locator('.node[id="3"]')).not.toBeVisible(); await root.getByRole('button', { name: 'Expand children' }).click(); await expect(page.locator('.node[id="3"]')).toBeVisible()
})