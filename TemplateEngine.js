var TemplateEngine = function(leftFlag, rightFlag) {

	var re = new RegExp(leftFlag + "\\s*(.+?)\\s*" + rightFlag, "g"),
		vExpIf = /<([a-z]+)[^((\1|\/)>)]*\s(v-if|v-else-if)=(["'])(.*?)\3.*?(\1|\/)>(<([a-z]+)[^((\7|\/)>)]*\s(v-else-if|v-else).*?(\7|\/)>)?/g,
		vExpElse = /<([a-z]+)[^((\1|\/)>)]*\s(v-else).*?(\1|\/)>/g,
	   	vExpList = /<([a-z]+)[^((\1|\/)>)]*\s(v-for)=(["'])(.+?)\3.*(\1|\/)>(<([a-z]+)[^((\7|\/)>)]*\s(v-else).*?(\7|\/)>)?/g,
		vExpListTag = /\s*((\w+)|\(\s*(\w+)\s*,\s*(\w+)\s*\))\s+in\s+(.+)/,
		vExpListVal = /\.|\[["']|\[(?=\d)|['"]?\]\[["']?|['"]?\]\.|['"]?\]/,
		vExpHasVariable = /\[([^\d]+)\]/g;
		vExpCheckIsPath = /[^\.\w\s\[\]]/g;
		vExpBindClass = /<([a-z]+)[^((\1|\/)>)]*?\s(v-bind)\s*:\s*(class)\s*=(["'])(.*?)\4.*?(\1|\/)>/g;
		vExpBindStyle = /<([a-z]+)[^((\1|\/)>)]*?\s(v-bind)\s*:\s*(style)\s*=(["'])(.*?)\4.*?(\1|\/)>/g;
		vExpGetClass = /\sclass\s*=\s*(["'])\s*(.*?)\s*\1/i;
		vExpGetStyles = /\sstyle\s*=\s*(["'])\s*(.*?)\s*\1/i;

	return function(html, options) {
		html = html.replace(/[\r\t\n]/g, '');

		var cursor = 0, match, lastIndex, realListTpl,code = obj2str(options);
		code += ';\n';

		while(match = vExpList.exec(html)) {
			lastIndex = vExpList.lastIndex,
			realListTpl = vueTpl(match);
		
			html = html.slice(cursor, match.index) + realListTpl + html.slice(match.index + match[0].length);
			vExpList.lastIndex = lastIndex - match[0].length + realListTpl.length;
		}

		while(match = vExpIf.exec(html)) {
			lastIndex = vExpIf.lastIndex,
			realListTpl = vueTpl(match);
		
			html = html.slice(cursor, match.index) + realListTpl + html.slice(html.indexOf(match[0]) + match[0].length);
			vExpIf.lastIndex = lastIndex - match[0].length + realListTpl.length;
		}

		while(match = vExpBindClass.exec(html)) {
			lastIndex = vExpBindClass.lastIndex,
			realListTpl = vueTpl(match);
			
			html = html.slice(cursor, match.index) + realListTpl + html.slice(match.index + match[0].length);
			vExpBindClass.lastIndex = lastIndex - match[0].length + realListTpl.length;
		}

		while(match = vExpBindStyle.exec(html)) {
			lastIndex = vExpBindStyle.lastIndex,
			realListTpl = vueTpl(match);
			
			html = html.slice(cursor, match.index) + realListTpl + html.slice(match.index + match[0].length);
			vExpBindStyle.lastIndex = lastIndex - match[0].length + realListTpl.length;
		}

		while(match = re.exec(html)) {
			html = html.replace(re, function(){ return getDepTarget(arguments[1])||new Function((code+"return "+arguments[1]).replace(/[\r\t\n]/g, ''))();});
		}

		function vueTpl(matchInfo, pathMap){
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
						pathMap[item.index+":index"] = i;

						var sampleArr = []

						vExpIf.lastIndex = 0;
						var matchif, matchList, eleRealIf = '', eleRealTplTmp = eleRealTpl, cursor = 0;

						var IfBeginStrIndex = eleRealTpl.search(vExpIf);
						if(IfBeginStrIndex>-1){
							var isIf = false;
							if(eleRealTpl.slice(0, IfBeginStrIndex).match(">")===null){
								isIf = true;
							}else{
								vExpList.lastIndex = 0;
								var matchCheckList = vExpList.exec(eleRealTplTmp);
								if(!matchCheckList || IfBeginStrIndex < matchCheckList.index || matchCheckList.index+matchCheckList[0].length < matchif.index){
									isIf = true;
								}
							}

							if(isIf){
								while(matchif = vExpIf.exec(eleRealTpl)) {
									hasIf = true;
									var realListTplIf = vueTpl(matchif, pathMap),
										matchElse = vExpElse.exec(eleRealTpl);

									if(matchif.index>cursor){
										sampleArr.push({str:eleRealTpl.slice(cursor, matchif.index)});
									}
									sampleArr.push({str:realListTplIf,flag:"if"});

									cursor = matchif.index + matchif[0].length;
									cursor += matchElse?matchElse[0].length:0;
								}
							}
						}

						sampleArr.push({str:eleRealTpl.slice(cursor)});
						for(var s = 0; s < sampleArr.length; s++) {
							var sample = sampleArr[s];
							if(sample.flag == "if"){
								eleReal += sample.str;
							}else if(!sample.flag){
								var ListBeginStrIndex = sample.str.search(vExpList);
								if(ListBeginStrIndex>-1){
									cursor = 0;
									vExpList.lastIndex = 0;
									while(matchList = vExpList.exec(sample.str)) {
										var lastIndex = vExpList.lastIndex;
										var realListTpl = vueTpl(matchList, pathMap);

										eleReal += getRealTpl(sample.str.slice(cursor, matchList.index));
										eleReal += realListTpl;
										cursor = matchList.index + matchList[0].length;
										vExpList.lastIndex = lastIndex;
									}

									eleReal += sample.str.slice(cursor);
								}else{
									eleReal += getRealTpl(sample.str);
								}
							}
						}
					}
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
				case 'v-bind':
					var key = match[3].toLowerCase() ,styleStr = ' style="',classStr = ' class="';
					if(val.match(/\{[^\}]+\}/)){
						val = creatFun(val);
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
							if(val[x])styleStr += x + ":" + val[x] + ";";
						}
						styleStr = styleStr.slice(0, styleStr.length-1) + '"';

						eleRealTpl = eleRealTpl.slice(0, indexForBind) + styleStr + eleRealTpl.slice(indexForBind);
					}


					eleReal = getRealTpl(eleRealTpl);
					break;
			}

			function getClass(str){
				var result = str.match(vExpGetClass);
				return result?result[2]:null;
			}

			function getStyle(str){
				var result = str.match(vExpGetStyles);
				return result?result[2]:null;
			}

			function creatFun(val){
				try
				{
					val = new Function((code+"return "+val).replace(/[\r\t\n]/g, ''))();
				}catch(err){
					val = undefined;
				}
		
				return val;
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
						val = creatFun(val);
					}else{
						val = getDepTarget(getRealPath(val));
					}
				}

				if(val){
					vExpElse.lastIndex = 0;
					var matchElse = vExpElse.exec(eleRealTpl);

					if(matchElse){
						eleReal = eleRealTpl.slice(0, matchElse.index);
					}else{
						eleReal = eleRealTpl;
					}
				}else if(hasElse){
					var matchStr = match.input.slice(match[0].length - match[6].length);
					vExpIf.lastIndex = 0;
					match = vExpIf.exec(matchStr);
					eleReal = vueTpl(match);
				}else{
					eleReal = '';
				}

				return eleReal;
			}

			function getRealTpl(tpl){
				return tpl.replace(re, function(){
					var match = arguments[1].split(vExpListVal);

					if(pathMap[match[0]]!==undefined){
						match[0] = pathMap[match[0]];
						//return leftFlag + match.join(".") + rightFlag;
						return getDepTarget(match.join("."));
					}else if(match[0]==item.name){
						match[0] = items;
						//return leftFlag + match.shift() + '['+i+'].' + match.join(".") + rightFlag;
						return getDepTarget(match.shift() + '['+i+'].' + match.join("."));
					}else if(pathMap[match[0]+":index"]!==undefined){
						return pathMap[match[0]+":index"];
					}else{
						//return leftFlag + match.join(".") + rightFlag;
						return match.join(".");
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

		function getDepTarget(str) {
			var keys = str.split(vExpListVal), index = 0, target = options;

			while(index < keys.length) {
				target = target[keys[index++]];
			}

			return target;
		}
		
		return html;
	}
}

