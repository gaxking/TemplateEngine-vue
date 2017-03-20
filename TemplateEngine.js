var TemplateEngine = function(leftFlag, rightFlag) {

	var re = new RegExp(leftFlag + "\\s*(.+?)\\s*" + rightFlag, "g"),
		vExpIf = /<(\w+)[^((\1|\/)>)]*\s(v-if|v-else-if)=(["'])(.*?)\3.*?(\1|\/)>(<(\w+)[^((\7|\/)>)]*\s(v-else-if|v-else).*?(\7|\/)>)?/g,
		vExpShow = /<(\w+)[^((\1|\/)>)]*\s(v-show)=(["'])(.*?)\3.*?(\1|\/)>/g,
		vExpElse = /<(\w+)[^((\1|\/)>)]*\s(v-else).*?(\1|\/)>/g,
		vExpList = /<(\w+)[^((\1|\/)>)]*\s(v-for)=(["'])(.+?)\3.*?(\1|\/)>(<([a-z]+)[^((\7|\/)>)]*\s(v-else).*?(\7|\/)>)?/g,
		vExpListTag = /\s*((\w+)|\(\s*(\w+)\s*,\s*(\w+)\s*\))\s+in\s+(.+)/,
		vExpListVal = /\.|\[["']|\[(?=\d)|['"]?\]\[["']?|['"]?\]\.|['"]?\]/,
		vExpHasVariable = /\[([^\d]+)\]/g,
		vExpCheckIsPath = /[^\.\w\s\[\]]/g,
		vExpBindClass = /<(\w+)[^((\1|\/)>)]*?\s(v-bind)\s*:\s*(class)\s*=(["'])(.*?)\4.*?(\1|\/)>/g,
		vExpBindStyle = /<(\w+)[^((\1|\/)>)]*?\s(v-bind)\s*:\s*(style)\s*=(["'])(.*?)\4.*?(\1|\/)>/g,
		vExpGetClass = /\sclass\s*=\s*(["'])\s*(.*?)\s*\1/i,
		vExpGetStyles = /\sstyle\s*=\s*(["'])\s*(.*?)\s*\1/i;


	//配置对象
	var options;

	//对象格式化为字符串，用于new Function
	function obj2str(source, isFirst, str, isArray){
		str = str===undefined?'var ':str;
		isFirst = isFirst === undefined?true:false;

		for (var key in source) {
			var type = Object.prototype.toString.call(source[key]);
			switch(type) {
				case '[object Array]':
					str+= isFirst?key + " = [\n" : key + ":[\n";
					str = obj2str(source[key], false, str, true);
					str+="\n],\n";
					break;
				case '[object Object]':
					str+= isFirst? key + " = {\n" : isArray? "{\n" : key + ":{\n";
					str = obj2str(source[key], false, str);
					str+= "\n},\n";
					break;	
				case '[object String]':
					str+= isFirst? key + " = \"" : isArray? "\"" : key + ":\"";
					str+= source[key];
					str+= "\",\n";
					break;
				case '[object Boolean]':
					str+= isFirst? key + " = " : isArray? "" : key + ":";
					str+= source[key];
					str+= ",\n";
					break;
				case '[object Number]':
					str+= isFirst? key + " = " : isArray? "" : key + ":";
					str+= source[key];
					str+= ",\n";
					break;
			}
		}
		if(str.substr(-2)===",\n")str = str.substr(0,str.length-2);
		return str;
	}

	//创建具有options对象的new Function
	function creatFun(val){
		var obj;
		if(arguments.length>1) {
			var other = {};
			for(var i = 1; i < arguments.length; i++){
				for(var z in arguments[i]){
					other[z] = arguments[i][z];
				}
			}

			obj = Object.create(other);
			for(var x in options){
				obj[x] = options[x];
			}
		}else{
			obj = options;
		}

		code = obj2str(obj) + ';\n';

		try
		{
			val = new Function((code+"return "+val).replace(/[\r\t\n]/g, ''))();
		}catch(err){
			val = undefined;
		}

		return val;
	}


	//格式化html
	function formatHtml(Exp, html, options){
		while(match = Exp.exec(html)) {
			var lastIndex = Exp.lastIndex,
				realListTpl = vueTpl(match);

			html = html.slice(0, match.index) + realListTpl + html.slice(match.index + match[0].length);
			Exp.lastIndex = lastIndex - match[0].length + realListTpl.length;
		}
		return html;
	}

	//根据匹配的字符串，最终到对应的变量
	function getDepTarget(str) {
		var keys = str.split(vExpListVal);
		if(keys[keys.length-1] === "")keys.pop();

		var index = 0, target = options;

		while(index < keys.length) {
			target = target[keys[index++]];
		}

		return target;
	}

	function vueTpl(matchInfo, pathMap, listIndex){
		var ele = matchInfo[0],
			tag = matchInfo[2];

		if(matchInfo[8]){
			var hasElse = true;
			var isElse = matchInfo[8].toLowerCase() === 'v-else'?true:false;
			var isElseIf = matchInfo[8].toLowerCase() === 'v-else-if'?true:false;
		}

		var val,pathMap = pathMap || {}, indexForBind,
			eleRealTpl = ele.replace(new RegExp("\\s"+ tag +"(\s*:\s*([a-zA-Z]+)\s*)?(=([\"'])(.*?)\\4)?"), function(v){
				val = arguments[5];
				indexForBind = ele.indexOf(arguments[0]);
				return "";
			}),
			eleReal = '';

		switch(tag) {
			case 'v-for':
				eleReal = getForListHtml();
				break;
			case 'v-if':
				eleReal = getIf();
				break;
			case 'v-else-if':
				eleReal = getIf();
				break;
			case 'v-else':
				eleReal = getRealTpl(eleRealTpl);
				break;
			case 'v-show':
				eleReal = getShow();
				break;
			case 'v-bind':
				eleReal = getBind();
				break;
		}


		function getForListHtml(){
			var tmp = val.match(vExpListTag),
				item = tmp[2]?{name:tmp[2]} : {name:tmp[3], index:tmp[4]},
				items = tmp[5];

			items = getRealPath(items);


			var itemsKey = items.split(vExpListVal), key, target = options;

			while(key = itemsKey.shift()) {
				target = target[key];
			}

			for(var i = 0, index = 1, l = target.length; i<l; i++) {
				pathMap[item.name] = items + "["+i+"]";

				//创建索引变量
				if(item.index){
					listIndex = listIndex || {};
					listIndex[item.index] = i;
				}

				var eleRealItem = getInListHtml();

				var match;  //v-for 中含有v-if todu
				vExpList.lastIndex = 0;
				while(match = vExpList.exec(eleRealItem)) {
					var lastIndex = vExpList.lastIndex;
					var realListTpl = vueTpl(match, pathMap, listIndex);
					vExpList.lastIndex = lastIndex;

					eleRealItem =  eleRealItem.slice(0, match.index) + getRealTpl(realListTpl) + eleRealItem.slice(match.index + match[0].length);
				}

				eleReal += getRealTpl(eleRealItem);
			}

			return eleReal;


			//list中循环处理
			function getInListHtml(){
				var inListExpArr = [vExpIf, vExpShow, vExpBindClass, vExpBindStyle];
				var sampleTpl = eleRealTpl, match;

				for(var x = 0; x < inListExpArr.length; x++) {
					inListExpArr[x].lastIndex = 0;
					var BeginStrIndex = eleRealTpl.search(inListExpArr[x]),
						cursor = 0;

					if(BeginStrIndex>-1){
						var isMatch = false;

						//判断是否在v-for标签上有匹配 如<p v-for="x in xx" v-if="1">
						if(eleRealTpl.slice(0, BeginStrIndex).match(">")===null){
							isMatch = true;
						}else{
							//判断是否有下一级循环
							vExpList.lastIndex = 0;
							var matchCheckList = vExpList.exec(eleRealTpl);

							//检查是否有v-for标签以外的匹配
							if(!matchCheckList || BeginStrIndex < matchCheckList.index || matchCheckList.index+matchCheckList[0].length < BeginStrIndex+1){
								isMatch = true;
							}
						}

						if(isMatch){
							var _sampleTpl = '';
							while(match = inListExpArr[x].exec(sampleTpl)) {
								//获取真实字符串
								var realInList = vueTpl(match, pathMap, listIndex);

								//重新指向正确的lastIndex,特别是在v-else-if的时候帮助找到对应的val
								inListExpArr[x].lastIndex = match.index + realInList.length;

			
								sampleTpl = sampleTpl.slice(0, match.index) + realInList + sampleTpl.slice(match.index + match[0].length);
							}

							sampleTpl = _sampleTpl + sampleTpl.slice(cursor);
						}
					}
				}

				return sampleTpl;
			}
		}

		function getShow(){
			val = getDepTarget(val);
			if(!val){
				eleRealTpl = eleRealTpl.slice(0, indexForBind) + ' style="display:none;"' + eleRealTpl.slice(indexForBind);
			}

			return getRealTpl(eleRealTpl);
		}

		function getBind(){
			var key = match[3].toLowerCase() ,styleStr = ' style="',classStr = ' class="';
			if(val.match(/\{[^\}]+\}/)){
				val = creatFun(val, pathMap, listIndex);
			}else{
				val = getDepTarget(val)
			}

			if(key==='class'){
				var classNames = getClass(eleRealTpl);

				if(classNames) {
					eleRealTpl = eleRealTpl.replace(vExpGetClass, function(){
						indexForBind -= arguments[0].length;
						return '';
					});
					classStr += classNames+" ";
				}

				for(var x in val){
					if(val[x])classStr += x+" ";
				}
				classStr = classStr.slice(0, classStr.length-1) + '"';

				eleRealTpl = eleRealTpl.slice(0, indexForBind) + classStr + eleRealTpl.slice(indexForBind);
			}else if(key==='style'){
				var styleNames = getStyle(eleRealTpl);

				if(styleNames) {
					eleRealTpl = eleRealTpl.replace(vExpGetStyles, function(){
						indexForBind -= arguments[0].length;
						return '';
					});
					styleStr += styleNames;
				}

				for(var x in val){
					var _x = x.replace(/\B[A-Z]\B/, function(val){
						return "-" + val.toLowerCase();
					});

					if(val[x])styleStr += _x + ":" + val[x] + ";";
				}
				styleStr = styleStr.slice(0, styleStr.length-1) + '"';

				eleRealTpl = eleRealTpl.slice(0, indexForBind) + styleStr + eleRealTpl.slice(indexForBind);
			}

			eleReal = getRealTpl(eleRealTpl);

			return eleReal;
		}

		function getClass(str){
			var result = str.match(vExpGetClass);
			return result?result[2]:null;
		}

		function getStyle(str){
			var result = str.match(vExpGetStyles);
			return result?result[2]:null;
		}

		function getIf(){
			if(val==='true'){
				val = true;
			}else if(val==='false'){
				val = false;
			}else if(val.match(/^[-+]?\d+(\.\d+)?$/)){
				val = +val;
			}else{
				if(val.match(vExpCheckIsPath)) {
					val = creatFun(val, pathMap, listIndex);
				}else{
					val = listIndex&&listIndex[val]?listIndex[val]:getDepTarget(getRealPath(val));
				}
			}

			vExpElse.lastIndex = 0;
			var matchElse = vExpElse.exec(eleRealTpl);
			if(val){
				if(matchElse){
					eleReal = eleRealTpl.slice(0, matchElse.index);
				}else{
					eleReal = eleRealTpl;
				}
			}else if(hasElse){
				vExpIf.lastIndex = 0;

				//先搜索v-else-if 否则用 else
				matchElse = vExpIf.exec(eleRealTpl) || matchElse;

				eleReal = vueTpl(matchElse);
			}else{
				eleReal = '';
			}

			return getRealTpl(eleReal);
		}

		function getRealTpl(tpl){
			return tpl.replace(re, function(){
				var match = arguments[1].split(vExpListVal);

				//是否在存在循环路径里
				if(pathMap[match[0]]!==undefined){
					match[0] = pathMap[match[0]];
					return getDepTarget(match.join("."));
			//	}else if(item&&item.name&&match[0]==item.name){    //todu
			//		match[0] = items;
			//		return getDepTarget(match.shift() + '['+i+'].' + match.join("."));
				}else if(listIndex&&listIndex[match[0]] !== undefined){
					return listIndex[match[0]];
				}else{
					return getDepTarget(match.join("."));
				}
			});
		}

		function getRealPath(items){
			items = items.replace(/^[^.\[]+/, function(val){
				return pathMap[val]?pathMap[val]:val;
			});

			items = items.replace(vExpHasVariable, function(){
				var tmp = arguments[1].replace(/^[^.\[]+/, function(val){
					return pathMap[val]?pathMap[val]:val;
				});

				return '.'+getDepTarget(tmp);
			})

			return items;
		}

		return eleReal;
	}

	return function(html, data) {
		html = html.replace(/[\r\t\n]/g, '');
		options = data;

		var match, matchArr = [vExpList, vExpIf, vExpShow, vExpBindClass, vExpBindStyle];

		for(var i = 0, l = matchArr.length; i < l; i++) {
			html = formatHtml(matchArr[i], html, options);
		}

		while(match = re.exec(html)) {
			html = html.replace(re, function(){ return getDepTarget(arguments[1]) || creatFun(arguments[1])});
		}

		return html;
	}
}

