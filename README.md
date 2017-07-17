# TemplateEngine
由于vue的语法确实简单，而且用的人越来越多，
按照vue的语法，写把原先的模版升级了一下，结果机会等于全部重写。  

注意，这只是一个仿vue语法的模版引擎，把对象格式化成html之后，它的使命就完了，不会参入事件，动画之类的功能。 

功能点1: Class 与 Style 绑定  
```html
<div class="static" v-bind:class="{ active: isActive, 'text-danger': hasError }"></div>

<div v-bind:class="{ active: isActive }">active</div>

<div v-bind:style="styleObject"></div>
```
```javascript
var tpl = TemplateEngine(document.getElementById("tpl").innerHTML, {
	isActive:true, 
	hasError: false,  
	styleObject: {
		color: 'red',
		fontSize: '13px'   //不能用font-size,否则new Function编译报错
  }
});
```

功能点2: 条件判断  
v-if/v-else-if/v-else/v-show

```html
<script id="tpl" type="text/mytpl">
<p v-if="ok" >{{data}}</p>
<p v-else>no data</p>

<p v-if="data" >{{data}}</p>
<p v-else>no data</p>

<div v-if="type === 'A'">
  A
</div>
<div v-else-if="type === 'B'">
  B
</div>
<div v-else-if="type === 'C'">
  C
</div>
<div v-else>
  Not A/B/C
</div>

<h1 v-show="0">{{data}}</h1>
</script>
```
```javascript
var tpl = TemplateEngine(document.getElementById("tpl").innerHTML, {data:"hello world",type:"C"});
```

功能点3:无限嵌套循环  
item in items,  
同时支撑索引  (item, index) in items 
```html
<ul>
	<li v-for="(shop, index1) in bookshop">
		<p>{{index1}}:{{shop.name}}</p>
		<dd v-for="(category, index2) in shop.categories">
			{{index1}}:{{shop.name}} - {{index2}}:{{category.name}}
			<dl v-for="(book, index3) in category.books">
				{{index1}}:{{shop.name}} - {{index2}}:{{category.name}} - {{index3}}:{{book.name}}
			</dl>
		</dd>
	</li>
</ul>
```

```javascript
var tpl = TemplateEngine(document.getElementById("tpl").innerHTML, {
	bookshop:[
		{
			name:"新华书店", 
			categories:[
				{
					name:"九年义务教育",
					books:[
						{
							name:"语文书",
							pages:800
						},
						{
							name:"数学书",
							pages:300,
							author:"教育局"
						},
						{
							name:"英语书",
							pages:300,
							wordCount:"10万"
						}
					]
				},
				{
					name:"高中",
					books:[
						{
							name:"五年高考",
							pages:500
						},
						{
							name:"三年模拟",
							pages:300
						}
					]
				}
			]
		},
		{
			name:"诚品书店", 
			categories:[
				{
					name:"web编程",
					books:[
						{
							name:"html入门到精通",
							pages:800
						},
						{
							name:"javascript权威指南",
							pages:300,
							author:"淘宝前端团队"
						},
						{
							name:"css禅意花园",
							pages:300,
						}
					]
				},
				{
					name:"中国历史",
					books:[
						{
							name:"近代史",
							pages:500
						},
						{
							name:"石器时代",
							pages:300
						}
					]
				}
			]
		}
	]
});
 
```
