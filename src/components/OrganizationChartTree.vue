<template>
  <table>
    <tr>
     <td :colspan="datasource.children && datasource.children.length ? datasource.children.length*2 : null">
       <div class="node">
        <div class="title">
          <i class="fa fa-users symbol"></i>
          {{ datasource.name }}
        </div>
        <div class="content">{{ datasource.title }}</div>
        <i class="edge verticalEdge bottomEdge fa"></i>
        </div>
     </td>
    </tr>
    <template v-if="datasource.children && datasource.children.length">
      <tr class="lines">
        <td :colspan="datasource.children.length*2">
          <div class="downLine"></div>
        </td>
      </tr>
      <tr class="lines">
        <td class="rightLine"></td>
       <template v-for="i in (datasource.children.length-1)">
          <td class="leftLine topLine"></td>
          <td class="rightLine topLine"></td>
       </template>
        <td class="leftLine"></td>
      </tr>
      <tr class="nodes">
        <td colspan="2" v-for="child in datasource.children" :key="child.id">
          <node :datasource="child"></node>
        </td>
      </tr>
    </template>
  </table>
</template>

<script>
export default {
  name: "node",
  props: {
    datasource: Object
  }
};
</script>

<style>
</style>
