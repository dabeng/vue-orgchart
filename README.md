![OrgChart](http://dabeng.github.io/OrgChart/img/orgchart-heading.png)

# [jQuery Version](https://github.com/dabeng/OrgChart)
# [Native JavaScript(ES6) Version](http://github.com/dabeng/OrgChart.js)
# [Web Components Version](http://github.com/dabeng/OrgChart-Webcomponents)

## Foreword
- First of all, thanks a lot for [wesnolte](https://github.com/wesnolte)'s great work:blush: -- [jOrgChart](https://github.com/wesnolte/jOrgChart). The thought that using nested tables to build out the tree-like orgonization chart is amazing. This idea is more simple and direct than its counterparts based on svg
- Unfortunately, it's long time not to see the update of jOrgChart. on the other hand, I got some interesting ideas to add, so I choose to create a new repo.

## Features
- For now, just static organization chart

# Installation
```
npm install vue-organization-chart -S
```
# [Demos on codesandbox.io](https://codesandbox.io/s/r5kx493mrp)

# Usage
```html
<template>
  <div>
    <organization-chart :datasource="ds"></organization-chart>
  </div>
</template>

<script>
  import Vue from 'vue'
  import OrganizationChart from 'vue-organization-chart'
  import 'vue-organization-chart/dist/orgchart.css'

  export default {
    components: {
      OrganizationChart
    },
    data () {
      return {
        ds: {
          'id': '1',
          'name': 'Lao Lao',
          'title': 'general manager',
          'children': [
            { 'id': '2', 'name': 'Bo Miao', 'title': 'department manager' },
            { 'id': '3', 'name': 'Su Miao', 'title': 'department manager',
              'children': [
                { 'id': '4', 'name': 'Tie Hua', 'title': 'senior engineer' },
                { 'id': '5', 'name': 'Hei Hei', 'title': 'senior engineer',
                  'children': [
                    { 'id': '6', 'name': 'Pang Pang', 'title': 'engineer' },
                    { 'id': '7', 'name': 'Xiang Xiang', 'title': 'UE engineer' }
                  ]
                 }
               ]
             },
            { 'id': '8', 'name': 'Hong Miao', 'title': 'department manager' },
            { 'id': '9', 'name': 'Chun Miao', 'title': 'department manager' }
          ]
        }
      }
    }
  }
</script>
```
