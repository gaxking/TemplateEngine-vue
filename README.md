# TemplateEngine
改进一个模版引擎，可在不用vue的情况下做一些模版渲染工作

一直想写一个轻量级的模样引擎，它能实现比如ajax回来json的时候，能够做一些模版替换工作，主要是字符串，对象，数组的替换，还有判断和循环
无意间看到这篇文章 http://web.jobbole.com/56689  这篇文章简述了做一个模版引擎的基本思路。  

```javascript
var template =  
'My skills:' +  
'<%if(this.showSkills) {%>' +  
    '<%for(var index in this.skills) {%>' +  
    '<a href="#"><%this.skills[index]%></a>' +  
    '<%}%>' +  
'<%} else {%>' +  
    '<p>none</p>' +  
'<%}%>';  
console.log(TemplateEngine(template, {  
    skills: ["js", "html", "css"],  
    showSkills: true  
}));  
```

即可达到强大的模版效果,支持if,for,else,switch等语法操作，实际上引擎会把<% %>之间的字符串当作是真正的js代码来运行  
  
相信很多人都觉得这堆模版有点难看  
1.变量前面必须加this  
2.<% %> 匹配符能不能换一换？  
2.if for else 等混在模版里面写有点难操作  
3.不像vue或者ng那样容易看，能否改进一下 比如
```javascript
<a xx-list="skill" href="#"><%skills[index]%></a>
<a xx-if="showSkills" xx-list="skill" href="#"><%skills[index]%></a>
<p xx-if="!showSkills" >none</p>
```  

针对第1点，我做了一些改造，就是加了obj2str函数，重新写入了Function运行所在的作用域需要的函数。  
之后我可以这么写，不需要加this了  
```javascript
var template =
'My skills:' +
'<% if(showSkills) {%>' +
   '<%for(var index in skills) {%>' +
   '<a href="#"><%skills[index]%></a>' +
   '<%}%>' +
'<%} else {%>' +
   '<p>none</p>' +
'<%}%>';
console.log(TemplateEngine(template, {
    skills: ["js", "html", "css"],
    showSkills: true
}));
```
针对第2点，我在外层加了一个闭包保存了左右标记  
```javascript
var TemplateEngine = new TemplateEngine("<%","%>");
```  

针对第3点，要支持循环，判断等语法，而且是轻量级的模版引擎，只能这样了，写过后端view模版的人应该不会反感。  
针对第4点，还没完善以后再探索一下
