# Vue OrgChart

[English](README.md) · [繁體中文](README.zh-tw.md) · [完整 API](docs/api.md) · [示例清单](demo/README.md) · [功能对照](docs/parity.md)

基于原版 OrgChart 的 Vue 3 重实现。使用 Composition API、TypeScript、Vite，不依赖 jQuery，不包装原版脚本。原版的全部 46 个演示场景在同一个可操作的示例工作台中提供。

## 开发和验证

需要 Node 22.12+ 或 24+，推荐 Node 24。运行：

```sh
npm ci
npm run dev
```

打开 Vite 输出的地址，默认 `http://127.0.0.1:5173`。家谱示例为 `/#/family-tree`，编辑示例为 `/#/edit-chart`。远程数据和头像使用仓库本地资源，可以离线演示。

```sh
npm test
npm run test:coverage
npx playwright install chromium
npm run test:e2e
npm run check
```

`npm run build` 构建示例到 `demo-dist/`；`npm run build-component` 构建 ESM、CJS、CSS 和完整类型声明到 `dist/`。本次更改没有发布 npm 包，仓库版本 2.0.0 不代表注册表已提供这个版本。

## 使用

```vue
<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import OrgChart, { type OrgNode, type OrgChartInstance } from 'vue-organization-chart'
import 'vue-organization-chart/style.css'

const chart = useTemplateRef<OrgChartInstance>('chart')
const data = shallowRef<OrgNode>({
  id: '1', name: 'Lao Lao', title: '总经理',
  children: [{ id: '2', name: 'Bo Miao', title: '部门经理' }],
})
</script>
<template>
  <OrgChart ref="chart" v-model:data="data" pan zoom minimap draggable />
</template>
```

保留 `:datasource`、`@node-click` 和 `app.use(OrgChart)`。方法通过组件 `ref` 调用，节点参数可以是 ID、节点数据或原生 HTMLElement。保存编辑结果使用 `getHierarchy(true)` 或 `getFlatDatasource()`，输入对象不会被修改。

## 数据格式

- 普通嵌套 JSON：`children` 为节点数组。
- 扁平记录：`parent_id` 指向父节点；必须只有一个根。支持乱序、数字/字符串 ID 匹配、ID 为零和自定义 `nodeId`。非法 ID、重复 ID、孤立节点和循环引用会报错。
- 嵌套 UL：传入 `HTMLUListElement`，`li.id`、`data-name`、`data-title` 会转换为节点字段。
- 家谱：二维数组表示家庭组，`children` 也是二维数组。每个成员独立拥有其后代；删除或移动成员不影响配偶。
- 扁平家谱：显式调用 `flatToFamily(rows, nodeId)`，需要 `family_id`；仅有 `parent_id` 无法表示配偶关系。

## Vue 组件接口

以下说明以当前组件的 `ChartOptions`、`OrgChartInstance`、插槽和 Vue emits 为准。配置通过响应式 props 传入；命令通过组件模板 ref 调用。无需构造函数或容器选择器。正常修改配置不需要调用 init。

```vue
<script setup lang="ts">
import { reactive, shallowRef, useTemplateRef } from 'vue'
import OrgChart, { type ChartOptions, type OrgChartInstance, type OrgNode } from 'vue-organization-chart'
import 'vue-organization-chart/style.css'
const chart = useTemplateRef<OrgChartInstance>('chart')
const data = shallowRef<OrgNode>({ id: 'company', name: 'Company',
  children: [{ id: 'engineering', name: 'Engineering' }] })
const options = reactive<ChartOptions>({ direction: 't2b', visibleLevel: 2, pan: true })
function addTeam() {
  chart.value?.addChildren('engineering', [{ id: 'platform', name: 'Platform' }])
}
</script>
<template>
  <OrgChart ref="chart" v-model:data="data" v-bind="options" />
  <button @click="options.direction = 'l2r'">Horizontal layout</button>
  <button @click="addTeam">Add team</button>
</template>
```

ref 在挂载前与卸载后为 null，应在事件处理函数、onMounted 或渲染完成后调用方法。优先使用响应式 props；setOptions 的命令式值会覆盖对应 prop，直到下一次命令式设置替换它，不宜同时用两套来源控制同一个选项。

### Props

模板使用 kebab-case，如 `:visible-level="2"`；配置对象使用 camelCase。空图不要求任何 prop，非空图提供 data 或 datasource。未设置表示 undefined。

| Prop | 类型 | 默认值 | 含义和约束 |
| --- | --- | --- | --- |
| `data` | Datasource | null | 嵌套对象、扁平数组、家庭数组、UL 或 null；输入被复制。 |
| `datasource` | Datasource | null | data 的别名；两者同时非空时 data 优先，建议只绑定一个。 |
| `nodeId` | string | id | 唯一标识字段；持久化和 ID 编辑要求非空字符串或有限数字。 |
| `nodeTitle` | string | name | 默认节点标题字段，按文本转义；也是过滤匹配字段。 |
| `nodeContent` | string | title | 内容字段；空字符串表示只显示标题。 |
| `direction` | Direction | t2b | t2b 上到下、b2t 下到上、l2r 左到右、r2l 右到左。 |
| `visibleLevel` | 非负整数或 boolean | 999 | 初始展开深度；true = 999，false = 1，0 隐藏全部初始节点。 |
| `verticalLevel` | 整数 >= 2 | 未设置 | 从指定实际层级开始使用垂直布局；优先于 compact。 |
| `compact` | boolean 或 `(data: OrgNode) => boolean` | 未设置 | 全局或按节点选择紧凑分支；保留数据 compact，垂直/hybrid 优先。 |
| `toggleSiblingsResp` | boolean | false | 控制两个兄弟按钮是否分别切换对应一侧。 |
| `pan` | boolean | false | 从图表背景拖动平移，不拦截节点按钮点击。 |
| `zoom` | boolean | false | 滚轮及双指锚点缩放。 |
| `minimap` | boolean | false | 小地图指针、滚轮和键盘导航；其滚轮缩放独立于 zoom。 |
| `zoomoutLimit` | number | 0.5 | 包含边界的最小比例；必须是有限正数。 |
| `zoominLimit` | number | 7 | 包含边界的最大比例；不得小于最小值，否则抛 RangeError。 |
| `draggable` | boolean | false | HTML 拖放和触摸长按拖放；仍检查根、自身和后代循环。 |
| `drag` | boolean | false | 拖放别名；显式 draggable 优先。 |
| `dropCriteria` | `(dragged, oldParent, target) => boolean` | 未设置 | DOM 节点、旧父节点或 null、目标节点；在结构检查后添加业务限制。 |
| `chartClass` | string | 空字符串 | 内部图表附加 class，适合区分多个组件实例。 |
| `nodeTemplate` | `(data) => VNode / VNode[] / string` | 未设置 | 优先用节点插槽；HTML 字符串必须可信或已净化。 |
| `createNode` | `(element: HTMLElement, data: OrgNode) => void` | 未设置 | 每个节点挂载后的 DOM 扩展钩子，不是 Vue 渲染函数；此时没有预建交互按钮。 |
| `initCompleted` | `(chartElement: HTMLElement) => void` | 未设置 | 挂载/重新初始化后调用，不保证图片已加载或测量已完成。 |
| `icons` | Partial Icons | Lucide 回退 | 外部 CSS 图标类；自行加载相应样式表。 |
| `exportButton` | boolean | false | 组件内置导出按钮。 |
| `exportButtonName` | string | Export | 导出按钮文字。 |
| `exportFilename` | string | OrgChart | 默认文件名，不含扩展名。 |
| `exportFileextension` | png / pdf | png | 默认导出格式。 |
| `exportScale` | number | 2 | 画布分辨率倍数；非有限或非正值使用 1，PDF 逻辑尺寸不放大。 |

icons 字段为 `theme`、`parentNode`、`expandToUp`、`collapseToDown`、`collapseToLeft`、`expandToRight`、`collapsed`、`expanded`。未指定字段回退到 Lucide。theme 是公共 CSS 类；其余是各图标类。关系可见时箭头向内收起，隐藏时向外展开，紧凑子节点使用加减号。

数据可使用 children、parent_id、family_id、collapsed、className、hybrid、compact、levelOffset、width、height 和自定义可序列化字段。family_id 只供 flatToFamily 转换；parent_id 本身不能表示配偶。levelOffset 仅改变视觉位置，不改变层级。width/height 为正数像素，插槽内容也会被测量。无 ID 的嵌套数据可渲染，但保存快照要求所有节点有 ID。数据中不要放函数。

### Ref 调用约定

下列方法均通过 chart.value 调用，类型为 OrgChartInstance。`NodeRef` 接受 ID、含配置 ID 字段的数据记录或节点 HTMLElement；推荐 ID。无效节点引用抛 Error。数据查询同步可用；编辑后查询 DOM 需要 await nextTick。未特别说明的方法返回 void。

### chart / chartContainer

chart.value 上的只读 DOM getter，不是额外的 Vue ref。chart 为内部图表元素，销毁后是 null；chartContainer 为滚动容器，未附加时可为 null。仅用于测量或集成，不应用 DOM 修改数据结构。

### init(options = {})

可选参数 Partial ChartOptions，默认空对象；返回 OrgChartInstance。显式重新初始化，重置展开/选择；未替换 data 时保留编辑，可以恢复已销毁图表。正常响应式配置不需要此方法。

### setOptions(options) / setOptions(name, value)

传 Partial ChartOptions，或选项名与值；返回 OrgChartInstance。先验证再应用；普通布局变更保留数据、选择、视口及折叠状态。visibleLevel 变更重置展开；替换 data 或 nodeId 重建模型。命令式值覆盖同名 prop，优先使用 props 管理应用状态。

### destroy()

无参数；返回 OrgChartInstance。可重复调用，移除图表，取消请求、手势、观察器与帧任务。Vue 卸载自动执行；挂载中的模板 ref 仍存在，内部 chart 变成 null。可用 init({ data }) 恢复。

### addAncestors(data, parentId)

必填祖先 Datasource 和其中接收旧根的 NodeId；返回 void。向祖先数据中 parentId 对应记录追加现有根组。parentId 必须存在于新祖先层级中。

### addDescendants(data, parent)

必填 OrgNode[] 或 OrgNode[][]，再传父 NodeRef；返回 void。data 在前的 addChildren 别名，追加而非替换，展开接收父节点。

### addParent(currentRoot, data)

必填当前根 NodeRef 和带 ID 的新父 OrgNode；返回 void。包装根层级，非根参数被拒绝。普通节点改父级使用 moveNode。

### addSiblings(node, data)

必填锚点 NodeRef 和新兄弟 OrgNode[] 或 OrgNode[][]；返回 void。在相同父节点下追加分组；普通树根不能直接追加兄弟，需先增加父节点。

### addChildren(node, data)

必填父 NodeRef 和子 OrgNode[] 或 OrgNode[][]；返回 void。追加并展开父节点，所有新增 ID 必须在整张图中唯一。

```ts
chart.value?.addChildren('engineering', [{ id: 'design', name: 'Design' }])
await nextTick()
const element = chart.value?.getNode('design')
```

### removeNodes(node)

必填 NodeRef；返回 void。删除该成员及其后代、取消相关请求并修复选择；不因同家庭而删除配偶。删除最后一个/普通树根节点会触发销毁清理。

### moveNode(node, target)

两个必填 NodeRef：待移动成员和新父节点；返回 void。移动成员及其后代，保留周围配偶；根、自身、现父级、后代和 dropCriteria 拒绝都会抛错。成功后发出 node-drop 通知，不能用该事件取消移动。程序调用不要求 draggable 为 true。

### loadChildren(node, loader)

必填 NodeRef 和 `(copiedData: OrgNode, signal: AbortSignal) => Promise<OrgNode[] | OrgNode[][]>`；返回 `Promise<boolean>`。同节点请求去重，成功追加并发出 load。重复、过期或取消返回 false；其他失败发出 load-error 并拒绝 Promise，调用方仍需 catch。删除节点、替换数据或卸载取消关联请求；组件不会自动请求未知子节点。

```ts
async function loadTeam() {
  try {
    await chart.value?.loadChildren('engineering', async (node, signal) => {
      const response = await fetch(`/api/children/${node.id}`, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    })
  } catch (error) { console.error(error) }
}
```

### getHierarchy(includeNodeData = false)

可选 boolean，默认 false。返回复制的 ID/children 层级；true 返回完整记录；家庭保持分组数组。包含已加载的隐藏/折叠后代。空图或缺少必要 ID 时返回错误字符串，持久化前检查 typeof，不会自动提交服务器。

### getFlatDatasource()

无参数。返回深度优先的完整扁平记录副本，包含隐藏节点；重新计算 parent_id，根为 null，排除 children、level、内部 parentId。错误字符串同 getHierarchy。家庭导出 family_id 是本次快照的临时分组 ID；恢复家庭时先 flatToFamily，不能当普通单根扁平记录直接传入。

### getNode(node)

必填 NodeRef；返回已注册 HTMLElement 或 null。未知节点抛 Error；null 表示已知记录的元素尚未注册。隐藏元素也可能返回，逻辑可见性用 getNodeState。

### getNodeState(node, relation?)

必填 NodeRef；可选 parent / children / siblings，不传时查询节点自身。返回 `{ exist: boolean, visible: boolean }`。visible 表示至少一个已加载关系节点逻辑可见，不代表出现在屏幕内或服务器存在未知数据。

### getParent(node)

必填 NodeRef；返回父 HTMLElement 或 null。包含已加载但隐藏的父节点，根返回 null。

### getChildren(node)

必填 NodeRef；返回直接子 HTMLElement[]，包含已加载的隐藏节点，不递归。家庭中返回该成员拥有的孩子，不采用共享控制按钮的配偶回退。

### getSiblings(node)

必填 NodeRef；返回相同图表父节点下除自身外的成员 HTMLElement[]，包含隐藏成员，不等同于每家庭一个元素。

### getRelatedNodes(node, relation)

必填 NodeRef 及 parent / children / siblings。parent 返回 HTMLElement 或 null，其他返回 HTMLElement[]。是否可见另用 getNodeState 判断。

### getPath(node)

必填 NodeRef；返回从根到该成员的复制 OrgNode[]，包含本节点和已隐藏祖先。用于汇报路径或面包屑。

### hideParent(node)

必填 NodeRef；返回 void。隐藏祖先卡片和沿途兄弟家庭，保留当前后代路径；不删除数据。

### showParent(node)

必填 NodeRef；返回 void。仅恢复一层父家庭，不恢复隐藏的兄弟家庭。恢复所有祖先需沿路径多次调用，并非全部展开。

### hideChildren(node)

必填 NodeRef；返回 void。折叠已加载的后代及其深层分支；再次展开只恢复直接子组，与原版导航一致。仅一方拥有孩子时配偶可操作共享控制。

### showChildren(node)

必填 NodeRef；返回 void。展开直接子组，保留更深层折叠，不会请求远程孩子。

### hideSiblings(node, direction?)

必填 NodeRef；可选 left / right，不传则两侧；返回 void。按逻辑兄弟顺序隐藏家庭组并折叠其后代，保留当前配偶组；横向布局时两侧会显示为上下。方法的方向参数不依赖 toggleSiblingsResp。

### showSiblings(node, direction?)

与 hideSiblings 参数相同；返回 void。恢复指定一侧或两侧家庭，其后代保持折叠；直接父家庭若隐藏则一并恢复。不改变父子与配偶关系。

### expandAll(depth = 999)

可选非负整数，默认 999；返回 void。清除兄弟/祖先隐藏并展开到实际深度，0 全隐藏、1 仅根；非法值抛 RangeError。不请求远程节点，也不清除文本过滤。

### collapseAll()

无参数；返回 void。等同 expandAll(1)，只显示根，并重置嵌套展开状态。

### filterNodes(keyword)

必填字符串；返回 void。去除首尾空白后，不区分大小写匹配 nodeTitle 字段，显示命中及祖先路径/家庭成员；空白字符串关闭过滤。过滤时隐藏关系控制，不删除数据或丢失原折叠状态。

### clearFilter()

无参数；返回 void。清空过滤词，恢复底层导航状态。过滤不影响快照内容。

### setChartScale(multiplier, anchor?)

必填正数相对倍率；可选滚动容器视口内 `{ x, y }`；返回 void。1.2 表示当前比例乘 1.2，并非绝对比例。无效/非正倍率忽略；结果限制在包含边界的上下限，锚点固定。Vue 调用不需要 DOM chart 参数。

### getViewport()

无参数；返回复制的 Viewport `{ x, y, scale }`，不是可直接修改的响应式状态。实时展示使用 pan/zoom 事件或 toolbar 插槽。

### centerOnNode(node)

必填 NodeRef；返回 void。展开祖先路径，在下一次 Vue 更新后居中已测量节点；不会清空过滤，非匹配节点先 clearFilter。

### resetView()

无参数；返回 void。重置平移、滚动及比例 1，比例仍受上下限约束；不重置数据、折叠、过滤或选择。

### attachMinimap()

无参数；返回 OrgChartInstance。命令式启用小地图并覆盖同名 prop。正常应用状态优先使用绑定 minimap。

### detachMinimap()

无参数；返回 OrgChartInstance。命令式关闭小地图，同样覆盖 minimap prop。

### updateMinimap(forceRefresh = false)

可选 boolean，默认 false；返回 void。同步读取容器尺寸和滚动位置。预览几何本身是响应式的，该参数不额外重建节点；正常 Vue 更新和滚动自动刷新。

### export(filename?, extension?)

可选文件名及 png/pdf，默认使用 exportFilename/exportFileextension；返回 Promise<HTMLCanvasElement 或 false>。空图、忙碌、销毁返回 false；失败发出 export-error 并拒绝，成功/失败都清遮罩。捕获当前可见的完整逻辑布局，移除视口变换/控制按钮，不包含折叠后代。需要 catch；标记 data-export-ignore 可跳过插槽内元素。

### exportPNG(canvas, filename = 'OrgChart')

必填 HTMLCanvasElement，可选文件名默认 OrgChart；返回 `Promise<void>`。直接下载已有画布并回收 URL；不管理组件遮罩或发出组件导出事件，编码失败需自行捕获。

### exportPDF(canvas, filename = 'OrgChart', exportScale = 1)

必填画布，可选文件名和正有限倍数；返回 `Promise<void>`。无效倍数使用 1，PDF 尺寸为画布像素除以倍数。直接操作已有画布，不管理组件遮罩/事件。

## 插槽和事件

```vue
<OrgChart :data="data">
  <template #node="{ nodeData, selected, expanded, loading }">
    <strong>{{ nodeData.name }}</strong>
    <small>{{ nodeData.title }}</small>
  </template>
</OrgChart>
```

| 插槽 | 参数与行为 |
| --- | --- |
| `node`、`default` | `{ nodeData, node, selected, expanded, loading }`；node 为数据别名，其余三个状态为 boolean。同时提供时 node 优先；替换内容，不移除周围控制。 |
| `toolbar` | `{ chart, viewport }`；chart 是 OrgChartInstance，不是 ref 或 DOM 元素；viewport 为响应式状态。 |
| `empty` | 无作用域参数，未加载记录时显示。 |

交互按钮用 @click.stop 避免选择节点。插槽中不要直接改结构数据，使用方法或替换绑定源。默认文本转义；HTML 模板自行净化；createNode 只用于明确的 DOM 扩展。

| Vue 事件 | 载荷 | 触发时机 |
| --- | --- | --- |
| `node-click`、`select` | 复制的 OrgNode | 节点激活/选择。 |
| `deselect` | 无 | 点击画布空白处或按 Escape 取消选择。 |
| `change`、`update:data`、`update:datasource` | 完整层级副本或 null | 结构编辑，最后根删除时 null。 |
| `init` | HTMLElement | 组件挂载或 init 的下一次 DOM 更新后。 |
| `show`、`hide` | `{ node, relation }` | 父/子/兄弟可见性操作；node 为数据。 |
| `node-drop` | `{ draggedNode, dropZone }` | 移动成功后，二者为数据快照，不是 DOM。 |
| `load` | `{ node, data }` | 子请求成功插入。 |
| `load-error` | `{ node, error }` | 非取消的请求失败，Promise 同时拒绝。 |
| `pan`、`zoom` | `{ x, y, scale }` | 视口变化。 |
| `export` | `{ canvas, filename, extension }` | 捕获及下载成功。 |
| `export-error` | `{ error }` | 导出失败，Promise 仍需 catch。 |

这些是 Vue emits，直接接收载荷，不读 event.detail，也不能 preventDefault 取消结构操作。v-model:data 对应 update:data，别名 v-model:datasource 对应 update:datasource；只绑定一个。组件发出自身快照后父级原样回传会保留导航状态；不同来源对象替换会重建模型。选择、过滤和视口变化不发结构更新。

## 样式、数据助手和类型

组件设置高度，scoped 样式使用 :deep 访问内部节点。CSS 变量及默认值：--oc-node-width 168px、--oc-row-height 72px、--oc-line-color #96ada6、--oc-hover-color #e7f4ef、--oc-control-color #136b5a、--oc-control-hover-color #d7eee5、--oc-duration 180ms。根据系统减少动画偏好关闭过渡。

`flatToTree(rows, nodeId = 'id')` 返回 OrgNode 或 null；`ulToTree(element, nodeId = 'id')` 返回 OrgNode 或 null；`flatToFamily(rows, nodeId = 'id')` 返回 OrgNode[][]。从包直接导入，而非通过 ref 调用。转换不修改输入；普通扁平表是单根，家庭表需要 family_id。

公开类型包括 OrgChartInstance、ChartOptions、OrgNode、Datasource、NodeRef、NodeId、Direction、Relation、NodeState、Viewport、Icons、ChartEvent。Datasource 可为对象、普通/家庭数组、UL 或 null。使用 type import 给应用函数声明类型。完整英文参考见 [README](README.md#component-ref-methods)。

## 导出、性能和兼容说明

`await chart.value.export('组织架构', 'pdf')` 按需加载 html2canvas/jsPDF。导出当前可见图表，不含折叠后代。头像应使用 `crossorigin="anonymous"`，外部图片服务器必须允许 CORS。忙碌、空图或已销毁时返回 `false`；失败会抛错并清除遮罩。

万节点示例包含 10,000 个真实加载节点，初始展开到第二层。可点击全部展开；显示实测时间，不承诺所有设备 500ms。地图演示使用 OpenLayers 和本地示意大陆数据，不是精确地图服务。

键盘支持聚焦节点、Enter/Space 选择或激活按钮、方向键导航及 Escape 清除选择。隐藏节点使用 `inert`，支持系统减少动画偏好。桌面原生拖放和触摸长按拖放都有实现。

依赖采用 npm 查询的最新稳定兼容组合。TypeScript 7 尚不满足 typescript-eslint 的 peer 范围，所以使用兼容的 6.0 系列；未使用 `--force` 或 `--legacy-peer-deps`。详见 [迁移说明](docs/migration.md) 和 [测试说明](docs/testing.md)。

MIT，详见 [LICENSE](LICENSE)。原版结构设计与头像资源来自 dabeng/OrgChart。
