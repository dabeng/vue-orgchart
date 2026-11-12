# Migration To Vue 3

Version 2 is a major rewrite. Vue 2 and Vue CLI are removed. Vue 3.5+ is a peer dependency; Node 22.12+/24+ builds with Vite. ESM, CJS, CSS and declarations replace the old UMD-only library output. Build this checkout before consuming it; this task does not publish an npm release.

## From The Old Vue Component

Keep `import OrgChart from 'vue-organization-chart'`, local component registration, `:datasource` and `@node-click`. Change stylesheet import to `vue-organization-chart/style.css`. Replace Vue 2 `slot-scope` with `#default="{ nodeData }"` or `#node`. Use `createApp` and `app.use`, not `new Vue`/`Vue.use`. `OrganizationChartContainer.vue` remains an internal compatibility entry, but package exports are the supported import surface.

Use `data` or `v-model:data` for new code. The model clones inputs; editing will not mutate the object you supplied. Save `getHierarchy(true)`/`getFlatDatasource()`. Both `v-model:data` and `v-model:datasource` emit after structural mutations.

## From Native OrgChart

Replace `new OrgChart({chartContainer, data, ...options})` with `<OrgChart ref="chart" :data="data" v-bind="options" />`. Vue creates and destroys the host; no selector, constructor call or manually installed document events are needed. Every listed native public method remains exposed through the ref. Native DOM arguments still work, but IDs are less fragile across Vue updates.

Default `nodeContent` is `title` to preserve old Vue behavior; native OrgChart uses no content by default. Set `node-content=""` to match that. `nodeTemplate` accepts VNodes in addition to trusted HTML. Prefer slots over imperatively inserting markup. `createNode` receives an element only after mounting, without eager navigation controls; it should be idempotent if the callback changes. Custom rendering changes are reactive instead of rebuilding an entire DOM tree.

Options are props; imperative `setOptions` is retained as an override. Validation happens before replacing a valid chart. Layout changes retain data/selection/viewport/expansion; replacing source data resets structure/loads. Call `await nextTick()` before DOM queries after insertion. Query methods include loaded hidden descendants, and data exports preserve them.

Family shared controls use the member owning descendants; related-node queries still refer to the selected member. Editing/dragging a member never moves its surrounding spouse group. Flat family conversion is explicit via `flatToFamily`, rather than interpreting all rows containing `family_id` as families.

The original DOM-mutating implementation and the Vue component do not share private methods or DOM nesting. Public behavior is ported; private hierarchy selectors/table markup must be replaced with the exposed queries or `data-node-key`, `data-parent` and `data-level` attributes. DOM events remain available for visibility, drop and export errors, but use Vue events where possible.

## Dependency Compatibility

Dependencies were resolved from npm's latest stable tags and pinned by the lockfile. TypeScript 7 cannot satisfy typescript-eslint's supported `<6.1` peer range, so the latest compatible TypeScript 6.0 line is used. `@lucide/vue` replaces deprecated `lucide-vue-next`. `d3-flextree` performs variable-size sibling packing; OpenLayers is a demo-only development dependency. Export libraries are runtime dynamic imports. No jQuery, Font Awesome or polyfill script is required.

## Operational Limits

The demo uses hash routing and repository-local images/fixtures. Serve `demo-dist/index.html` with a static HTTP server; URLs are `/#/example-name`. Historical `/demo/example-name.html` URLs are understood by the dev app when the server provides SPA fallback, but production hash URLs are canonical. Use a modern browser with ResizeObserver, Pointer Events, structuredClone and inert support. IE and Vue 2 are not supported.

10,000 data nodes are supported; the demo starts at depth 2 and expand-all renders everything. There is no device-independent 500ms promise. Image export of huge layouts is limited by canvas memory and PDF maximum sizes. The geographic layer is a schematic local dataset, not authoritative geographic information.
