# Vue OrgChart

[English](README.md) · [简体中文](README.zh-cn.md) · [API](docs/api.md) · [範例](demo/README.md)

以 Vue 3、Composition API、TypeScript 與 Vite 重新實作原生 OrgChart。移除 Vue 2 與 jQuery，提供全部 46 個原版範例、單元/元件測試及桌面/行動瀏覽器回歸測試。

## 啟動

需要 Node 22.12+ 或 24+，建議 Node 24。

```sh
npm ci
npm run dev
```

開啟 Vite 顯示的網址，通常為 `http://127.0.0.1:5173`。範例使用 `/#/family-tree`、`/#/edit-chart` 等路由。

## 使用

```vue
<script setup lang="ts">
import { shallowRef } from 'vue'
import OrgChart from 'vue-organization-chart'
import 'vue-organization-chart/style.css'
const data = shallowRef({ id: '1', name: '總經理', children: [{ id: '2', name: '部門經理' }] })
</script>
<template><OrgChart v-model:data="data" pan zoom minimap draggable /></template>
```

先以 `npm run build-component` 建置此工作目錄；本次變更沒有發布 npm 版本。`datasource`、`node-click`、全域 `app.use(OrgChart)` 仍可使用。元件方法透過 `ref` 呼叫，節點參數可用 ID、資料或原生元素。

## Vue 元件介面

以下根據目前元件的 ChartOptions、OrgChartInstance、插槽與 Vue emits 說明，不是另一套函式庫的建構函式說明。設定使用響應式 props，操作透過元件模板 ref。一般變更設定不需 init，也不傳容器選擇器。

```vue
<script setup lang="ts">
import { reactive, shallowRef, useTemplateRef } from 'vue'
import OrgChart, { type ChartOptions, type OrgChartInstance, type OrgNode } from 'vue-organization-chart'
import 'vue-organization-chart/style.css'
const chart = useTemplateRef<OrgChartInstance>('chart')
const data = shallowRef<OrgNode>({ id: 'company', name: 'Company',
  children: [{ id: 'engineering', name: 'Engineering' }] })
const options = reactive<ChartOptions>({ direction: 't2b', pan: true })
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

掛載前與卸載後 ref 為 null；在事件函式、onMounted 或渲染完成後呼叫。優先用 props 管理設定；setOptions 的命令式值會覆寫同名 prop，直到其他命令式設定替換，不宜混用兩個來源。

### 資料格式

支援巢狀 JSON、無序 parent_id 單根表、HTMLUListElement、二維家庭陣列與 null。來源會複製，不會因編輯而修改原始物件。持久化使用 getHierarchy(true)、getFlatDatasource 或 v-model 快照。數字/字串 ID 匹配，零有效；非法/重複 ID、缺少父節點或循環會拒絕。

children 為子節點或家庭群組；collapsed 初始收合；className 附加樣式，子節點 slide-up 保留初始收合相容用法；hybrid 優先採垂直分支，compact 選擇緊湊分支。levelOffset 僅改視覺位置。width/height 為正數像素，插槽也會自動量測。家庭成員各自擁有後代，編輯不連帶刪除配偶。

family_id 只供 flatToFamily 轉換，parent_id 不能單獨表示配偶。無 ID 的巢狀資料可渲染，但持久化要求全部節點有 ID。自訂欄位保留且必須可結構化複製，資料中不要放函式。

### Props

模板採 kebab-case，例如 :visible-level；物件採 camelCase。空圖沒有必填 prop；未設定表示 undefined。

| Prop | 型別 | 預設 | 契約 |
| --- | --- | --- | --- |
| `data` | Datasource | null | 巢狀物件、扁平/家庭陣列、UL 或 null。 |
| `datasource` | Datasource | null | data 別名；同時非空時 data 優先，建議只綁一個。 |
| `nodeId` | string | id | ID 欄位；非空字串或有限數字。 |
| `nodeTitle` | string | name | 跳脫的標題文字欄位，也是過濾欄位。 |
| `nodeContent` | string | title | 內容欄位；空字串僅顯示標題。 |
| `direction` | Direction | t2b | t2b 上到下、b2t 下到上、l2r 左到右、r2l 右到左。 |
| `visibleLevel` | 非負整數或 boolean | 999 | true = 999、false = 第一層、0 隱藏初始全部。 |
| `verticalLevel` | 整數 >= 2 | 未設定 | 從實際層級起垂直排列，優先於 compact。 |
| `compact` | boolean 或 `(data: OrgNode) => boolean` | 未設定 | 全域或選擇分支緊湊排列；保留資料 compact，垂直/hybrid 優先。 |
| `toggleSiblingsResp` | boolean | false | 兩個兄弟按鈕分別切換各側。 |
| `pan` | boolean | false | 從背景拖動平移，不攔截節點按鈕。 |
| `zoom` | boolean | false | 滾輪與雙指錨點縮放。 |
| `minimap` | boolean | false | 小地圖指標、滾輪、鍵盤導航；其滾輪獨立於 zoom。 |
| `zoomoutLimit` | number | 0.5 | 包含邊界的最小比例，有限正數。 |
| `zoominLimit` | number | 7 | 最大比例，不得小於最小值；非法限制拋 RangeError。 |
| `draggable` | boolean | false | HTML 拖放與觸控長按，保留結構驗證。 |
| `drag` | boolean | false | 拖放別名，顯式 draggable 優先。 |
| `dropCriteria` | `(dragged, oldParent, target) => boolean` | 未設定 | 接收 DOM 元素、舊父元素或 null、目標元素；加入業務限制。 |
| `chartClass` | string | 空字串 | 內部圖表附加 class。 |
| `nodeTemplate` | `(data) => VNode / VNode[] / string` | 未設定 | 優先插槽；HTML 字串需可信或已淨化。 |
| `createNode` | `(element: HTMLElement, data: OrgNode) => void` | 未設定 | 節點掛載後的 DOM 擴充鉤子，不是 Vue 渲染函式；沒有預建控制。 |
| `initCompleted` | `(chartElement: HTMLElement) => void` | 未設定 | 掛載/init 後，不保證圖片或量測完成。 |
| `icons` | Partial Icons | Lucide 回退 | 自行載入外部 CSS 圖示樣式。 |
| `exportButton` | boolean | false | 內建匯出按鈕。 |
| `exportButtonName` | string | Export | 匯出按鈕文字。 |
| `exportFilename` | string | OrgChart | 預設檔名，不含副檔名。 |
| `exportFileextension` | png / pdf | png | 預設匯出格式。 |
| `exportScale` | number | 2 | 畫布解析度倍數，非法值使用 1；PDF 保持邏輯大小。 |

icons 欄位為 `theme`、`parentNode`、`expandToUp`、`collapseToDown`、`collapseToLeft`、`expandToRight`、`collapsed`、`expanded`；未指定回退到 Lucide。theme 是共用類別。收合箭頭向內，展開向外，邊緣隨方向變更；緊湊子節點保留加減號。

### Ref 呼叫約定

下列方法經 chart.value 呼叫，型別為 OrgChartInstance。NodeRef 為 ID、含設定 ID 的資料或 HTMLElement，建議用 ID。未知節點拋 Error。資料快照同步取得；編輯後查 DOM 先 await nextTick。除特別列出，方法回傳 void。

### chart / chartContainer

chart.value 的唯讀 DOM getter，不是其他 Vue ref。chart 是渲染元素，銷毀後 null；chartContainer 是捲動容器，未附加時可 null。僅用於量測/整合，不直接改結構。

### init(options = {})

可選 Partial ChartOptions，預設空物件；回傳 OrgChartInstance。重新初始化並重設展開/選取，未換 data 時保留編輯；可恢復已銷毀圖表。一般 props 變更不用呼叫。

### setOptions(options) / setOptions(name, value)

Partial ChartOptions 或選項名與值；回傳 OrgChartInstance。驗證後套用，普通佈局更新保留資料/導航；visibleLevel 重設展開，替換 data 或 nodeId 重建模型。命令值覆寫同名 prop。

### destroy()

無參數；回傳 OrgChartInstance。可重複清除圖表、請求、觀察器、手勢、影格工作。卸載自動執行；掛載中的 ref 仍存在但 chart getter 為 null，可用 init 恢復。

### addAncestors(data, parentId)

必填祖先 Datasource 與接收舊根的祖先 NodeId；回傳 void。parentId 必須位於新資料內，現有根群組附加到該祖先。

### addDescendants(data, parent)

必填 OrgNode[] 或 OrgNode[][]，再傳父 NodeRef；回傳 void。資料在前的 addChildren 別名，追加並展開，不取代舊子節點。

### addParent(currentRoot, data)

必填目前根 NodeRef 與有 ID 的新父 OrgNode；回傳 void。包裝根層級；非根會拒絕，普通改父級用 moveNode。

### addSiblings(node, data)

必填錨點 NodeRef 與 OrgNode[] 或 OrgNode[][]；回傳 void。追加相同父級的兄弟群組。普通樹根先加父節點，不能直接加兄弟。

### addChildren(node, data)

必填父 NodeRef 與 OrgNode[] 或 OrgNode[][]；回傳 void。追加且展開父節點，新增 ID 必須全圖唯一。

```ts
chart.value?.addChildren('engineering', [{ id: 'design', name: 'Design' }])
await nextTick()
const element = chart.value?.getNode('design')
```

### removeNodes(node)

必填 NodeRef；回傳 void。移除成員與後代、取消關聯請求並修復選取，不移除周圍配偶。移除最後/普通根會銷毀清理。

### moveNode(node, target)

必填成員與新父 NodeRef；回傳 void。移動成員及後代，保留配偶；根、自身、現父、後代或 dropCriteria 拒絕會拋錯。node-drop 在成功後通知，不可 preventDefault 取消；程式操作不要求 draggable。

### loadChildren(node, loader)

必填 NodeRef 與 `(data: OrgNode, signal: AbortSignal) => Promise<OrgNode[] | OrgNode[][]>`；回傳 `Promise<boolean>`。傳複製資料，同節點去重，成功追加並發 load。重複/取消/過期為 false；其他錯誤發 load-error 並拒絕，呼叫端仍需 catch。替換資料、移除節點或卸載會取消；不自動推測遠端關係。

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

可選 boolean 預設 false；回傳複製的 ID/children 層級，true 包含完整資料，家庭保留群組陣列。包含載入的隱藏後代。空圖或缺 ID 回傳錯誤字串，保存前先檢查 typeof。

### getFlatDatasource()

無參數；回傳深度優先的扁平副本，包含隱藏節點，重算 parent_id、根為 null，排除 children/level/內部 parentId。錯誤同 getHierarchy；家庭 family_id 為該次快照臨時識別，還原先 flatToFamily，不直接當單根表。

### getNode(node)

必填 NodeRef；回傳已註冊 HTMLElement 或 null。未知參照拋 Error；null 表示已知資料尚未註冊元素。隱藏元素仍可能存在，狀態用 getNodeState。

### getNodeState(node, relation?)

必填 NodeRef，可選 parent / children / siblings；省略查自身。回傳 `{ exist, visible }` boolean。visible 指至少一個已載入關係邏輯可見，不代表畫面交集或伺服器未知資料。

### getParent(node)

必填 NodeRef；回傳父 HTMLElement 或 null，包含已載入但隱藏的父元素，根為 null。

### getChildren(node)

必填 NodeRef；回傳直接子 HTMLElement[]，含隱藏，不遞迴。家庭查自己的孩子，不使用配偶共享控制回退。

### getSiblings(node)

必填 NodeRef；回傳相同父級除自身外成員 HTMLElement[]，含隱藏，不是每家庭只回一筆。

### getRelatedNodes(node, relation)

必填 NodeRef 和 parent / children / siblings。parent 回 HTMLElement 或 null，其他回 HTMLElement[]；顯示狀態另查 getNodeState。

### getPath(node)

必填 NodeRef；回傳從根至該成員的複製 OrgNode[]，含自身與隱藏祖先，適合路徑/麵包屑。

### hideParent(node)

必填 NodeRef；回傳 void。隱藏祖先與沿途兄弟家庭，保留目前後代路徑，不刪資料。

### showParent(node)

必填 NodeRef；回傳 void。僅恢復一層父家庭，不恢復隱藏的兄弟家庭；沿路多次呼叫可恢復更多祖先，不是全部展開。

### hideChildren(node)

必填 NodeRef；回傳 void。收合載入後代及深層分支；再次展開僅恢復直接子群組，與原版導覽一致。僅一方擁有孩子時，配偶可用共享控制。

### showChildren(node)

必填 NodeRef；回傳 void。展開直接子群組，保留深層收合，不會發出遠端請求。

### hideSiblings(node, direction?)

必填 NodeRef，可選 left / right，省略兩側；回傳 void。依邏輯順序隱藏家庭並收合其後代，保留目前配偶組；橫向排列時兩側呈上下。方法方向不依賴 toggleSiblingsResp。

### showSiblings(node, direction?)

同 hideSiblings 參數；回傳 void。恢復一側或兩側家庭，後代仍保持收合；直接父家庭若隱藏則一併恢復。不變更親子/配偶關係。

### expandAll(depth = 999)

可選非負整數，預設 999；回傳 void。清除祖先/兄弟隱藏並展開至實際深度；0 全隱藏、1 僅根。非法值拋 RangeError；不請求遠端，不清文字過濾。

### collapseAll()

無參數；回傳 void。同 expandAll(1)，僅根並重設巢狀展開狀態。

### filterNodes(keyword)

必填字串；回傳 void。去首尾空白，不區分大小寫比對 nodeTitle，顯示命中與祖先/家庭；空白關閉過濾。過濾中隱藏關係控制，不刪資料或丟失收合狀態。

### clearFilter()

無參數；回傳 void。清除過濾並還原底層導航狀態；快照始終含全部載入資料。

### setChartScale(multiplier, anchor?)

必填正數相對倍率，可選容器視口內 `{ x, y }`；回傳 void。1.2 為目前值乘 1.2，不是絕對值。非法/非正忽略，結果限制在含邊界上下限且保持錨點。Vue 呼叫不需 DOM chart。

### getViewport()

無參數；回傳複製的 `{ x, y, scale }`，不是可修改響應式狀態。即時 UI 用 pan/zoom 或 toolbar 插槽。

### centerOnNode(node)

必填 NodeRef；回傳 void。顯示祖先路徑並在下一次 Vue 更新後居中量測位置。過濾不自動清除，非匹配節點先 clearFilter。

### resetView()

無參數；回傳 void。重設平移/捲動與比例 1，比例仍受上下限，不重設資料、選取、過濾或收合。

### attachMinimap()

無參數；回傳 OrgChartInstance。命令式啟用小地圖並覆寫 prop；應用狀態優先綁 minimap。

### detachMinimap()

無參數；回傳 OrgChartInstance。命令式停用小地圖，同樣覆寫 minimap prop。

### updateMinimap(forceRefresh = false)

可選 boolean 預設 false；回傳 void。同步讀容器尺寸與捲動，預覽本身響應式，旗標不額外重建。一般 Vue 更新自動刷新。

### export(filename?, extension?)

可選檔名與 png/pdf，預設用 exportFilename/exportFileextension；回傳 Promise<HTMLCanvasElement 或 false>。空/忙碌/銷毀為 false，其他失敗發 export-error 並拒絕，兩種結果均清遮罩。擷取可見完整邏輯佈局，不含收合後代，移除控制與變換；data-export-ignore 可排除插槽元素。

### exportPNG(canvas, filename = 'OrgChart')

必填畫布，可選檔名預設 OrgChart；回傳 `Promise<void>`。下載既有畫布並回收 URL，不管理元件遮罩或事件，錯誤自行 catch。

### exportPDF(canvas, filename = 'OrgChart', exportScale = 1)

必填畫布，可選檔名與正有限倍數，預設 OrgChart / 1；回傳 `Promise<void>`。非法倍數用 1，頁面尺寸為像素除倍數，不管理元件遮罩或事件。

## 插槽與 Vue 事件

| 插槽 | 參數與行為 |
| --- | --- |
| `node`、`default` | `{ nodeData, node, selected, expanded, loading }`；node 是資料別名，狀態為 boolean。具名 node 優先，只替換內容，保留控制。 |
| `toolbar` | `{ chart, viewport }`；chart 是 OrgChartInstance，viewport 響應式，兩者不是模板 ref/DOM。 |
| `empty` | 無參數，沒有載入記錄時顯示。 |

插槽按鈕用 @click.stop，結構編輯走方法或替換來源。預設文字跳脫，HTML 模板需淨化。createNode 是掛載後 DOM 擴充，並非一般 Vue 模板替代方案。

| Vue 事件 | 載荷與時機 |
| --- | --- |
| `node-click`、`select` | 節點選取時，複製 OrgNode。 |
| `deselect` | 點擊畫布空白處或按 Escape 取消選取，無事件資料。 |
| `change`、`update:data`、`update:datasource` | 結構編輯後完整階層快照，最後根移除為 null。 |
| `init` | 掛載或 init 下一次 DOM 更新的 HTMLElement。 |
| `show`、`hide` | `{ node, relation }`，關係顯示操作，node 為資料。 |
| `node-drop` | 成功移動後 `{ draggedNode, dropZone }` 資料快照，不是 DOM。 |
| `load` | 成功插入的 `{ node, data }`。 |
| `load-error` | 非取消失敗的 `{ node, error }`，Promise 同時拒絕。 |
| `pan`、`zoom` | 視口更新 `{ x, y, scale }`。 |
| `export` | 下載成功 `{ canvas, filename, extension }`。 |
| `export-error` | 匯出失敗 `{ error }`，呼叫端仍需 catch。 |

Vue 直接傳載荷，不讀 event.detail，也不能 preventDefault 取消操作；限制拖放用 dropCriteria。v-model:data 接 update:data，v-model:datasource 是別名，僅選一個綁定。原樣回傳元件自己的快照保留導航，不同來源替換會重建模型。選取/過濾/視口不發結構更新。

## 樣式、助手與型別

先匯入套件 CSS，給元件高度。scoped 樣式用 :deep 到內部節點。變數預設：--oc-node-width 168px、--oc-row-height 72px、--oc-line-color #96ada6、--oc-hover-color #e7f4ef、--oc-control-color #136b5a、--oc-control-hover-color #d7eee5、--oc-duration 180ms。尊重系統減少動畫偏好。

`flatToTree(rows, nodeId = 'id')` 與 `ulToTree(element, nodeId = 'id')` 回 OrgNode 或 null；`flatToFamily(rows, nodeId = 'id')` 回 OrgNode[][]。直接從套件匯入，不透過 ref；不變更來源，家庭還原需要 family_id。

公開型別有 OrgChartInstance、ChartOptions、OrgNode、Datasource、NodeRef、NodeId、Direction、Relation、NodeState、Viewport、Icons、ChartEvent。使用 type import 描述應用處理函式；Datasource 包含物件、陣列、UL、null。更多完整 Vue 範例見 [英文 README](README.md#component-ref-methods)。

## 測試與建置

```sh
npm test
npm run test:coverage
npx playwright install chromium
npm run test:e2e
npm run check
```

示範程式輸出到 `demo-dist/`，元件 ESM/CJS、CSS 和型別輸出到 `dist/`。萬節點範例預設展開第二層，全部展開會顯示所有已載入節點；效能依裝置而異。詳見 [測試](docs/testing.md) 與 [遷移](docs/migration.md)。

MIT，參閱 [LICENSE](LICENSE)。原版設計及肖像來源為 dabeng/OrgChart。
