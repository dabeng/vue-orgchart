# Testing And Release Gates

```sh
npm ci
npx playwright install chromium
npm run check
```

On Linux CI, install the browser's system dependencies with `npx playwright install --with-deps chromium`. The CI workflow uses Node 24 and uploads coverage/browser reports even after a failure. Playwright starts its own Vite server on port 5180; no manually started server is needed. The normal workbench server uses Vite's default port.

## Focused Checks

| Suite | Responsibilities |
| --- | --- |
| `test/tree.test.ts` | Copying reactive data, flat/UL/family normalization, invalid IDs/parents/cycles, atomic edits, move/remove and snapshot roundtrips |
| `test/layout.test.ts` | Four orientations, nonoverlap, measured sizes, family links, hybrid precedence, compact callbacks, offsets and 10,000 nodes |
| `test/useChart.test.ts` | Owned data, configuration, visibility, scale and lifecycle |
| `test/component.test.ts` | Escaped templates, slots/VNodes/callbacks, default props, loaded relations, keyboard controls, editing, navigation and shared family controls |
| `test/navigation.test.ts` | Pointer capture, pan, pinch, drag alias/criteria, touch-hold cleanup, minimap, centering and v-model echoes |
| `test/export.test.ts` | PNG encoding/object URL cleanup, PDF logical dimensions, capture clone, asynchronous busy/error/disposal behavior |
| `test/demos.test.ts` | Exact original 46-demo catalogue and valid data/options for every scenario |
| `test/e2e/demos.spec.ts` | Every demo at desktop/mobile, image rendering, no runtime errors/page overflow, JSON editing, actual drag/drop, remote loads, real PNG/PDF downloads and nonblank map canvas |
| `test/e2e/family.spec.ts` | Both spouses' shared controls, all directions and family variants, household restoration, repeated nested operations, focus, removal and reduced-motion cleanup |

Examples:

```sh
npm test -- test/tree.test.ts
npm test -- test/component.test.ts test/export.test.ts
npm run test:e2e -- --project=desktop-chromium --grep family
npm run test:e2e -- --project=mobile-chromium
npm run test:coverage
```

Unit tests use jsdom and mocked export adapters. Browser tests use actual layout, ResizeObserver, canvas rendering, image decoding and downloads. No fixed sleeps are used for browser expansion tests. Desktop HTML drag is skipped for the mobile project; pointer/touch behavior has separate tests. The screenshot/trace from a failing E2E test appears in `test-results/`; HTML report is in `playwright-report/`.

## Build Verification

`npm run build` outputs the demo application to `demo-dist/`. `npm run build-component` outputs `dist/vue-orgchart.js`, `dist/vue-orgchart.cjs`, `dist/vue-orgchart.css` and declarations. Vue stays external, export libraries stay as dynamic imports, and demo-only OpenLayers code is not included in the library. `npm pack --dry-run` should list only distribution and package documentation/license files.

The gate runs lint, typecheck, unit coverage, both builds and all browser tests. Run `npm audit --omit=dev` to check published runtime dependencies separately from build/test tooling. Coverage reports describe observed coverage, not a claim that every browser/version or all private native OrgChart internals are identical. Cross-browser Firefox/WebKit and device-specific performance are not currently release gates.
