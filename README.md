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
# [Demos](https://codesandbox.io/dashboard/sandboxes/Vue%20OrgChart)

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

# Attributes
<table>
  <thead>
    <tr><th>Name</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>datasource</td><td>json</td><td>yes</td><td></td><td>datasource usded to build out structure of orgchart. It could be a json object.</td>
    </tr>
    <tr>
      <td>pan</td><td>boolean</td><td>no</td><td>false</td><td>Users could pan the orgchart by mouse drag&drop if they enable this attribute.</td>
    </tr>
    <tr>
      <td>zoom</td><td>boolean</td><td>no</td><td>false</td><td>Users could zoomin/zoomout the orgchart by mouse wheel if they enable this attribute.</td>
    </tr>
    <tr>
      <td>zoomin-limit</td><td>number</td><td>no</td><td>7</td><td>Users are allowed to set a zoom-in limit.</td>
    </tr>
    <tr>
      <td>zoomout-limit</td><td>number</td><td>no</td><td>0.5</td><td>Users are allowed to set a zoom-out limit.</td>
    </tr>
  </tbody>
</table>

# Events
<table>
  <thead>
    <tr><th>Name</th><th>Parameters</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>node-click</td><td>node data</td><td>triggers when user clicks the node.</td>
    </tr>
  </tbody>
</table>

# Scoped Slots
```html
<template slot-scope="{ nodeData }">
  <!-- feel free to customize the internal structure of node -->
</template>
```
