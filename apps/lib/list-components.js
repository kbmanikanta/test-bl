var fs=require("fs");
var _=require("lodash");
var filesystemCache={};
global.bl.listComponents=module.exports;
var cacheDisable = _.get(global, "bl.config.environment.componentCacheDisable")

/*********************************************************************************************/

global.bl.componentWatch.on("change", (f)=>{
   filesystemCache={};
});


/*********************************************************************************************/
function filterComponents(components, options){
	if(!options || !options.filter){return components;}
	var results=components;
	if(options.filter){results = _.filter(results, (result)=>options.filter(result?result.type:"") );}
	return results;
}


/*********************************************************************************************/
module.exports.getModuleComponents = (unsanitizedModule, options)=>{
	options=options||{};
	var subPath = options.subPath || "content";	
	filesystemCache[subPath]=filesystemCache[subPath]||{};

	var moduleName = unsanitizedModule.replace(/\./g,"/");
	var parts=moduleName.split("/");
	if(parts.length!==2){
		throw(new Error("Bad module string sent to getModuleComponents(): " + unsanitizedModule ));
	}

	if(cacheDisable || !filesystemCache[subPath][moduleName]){
		var files;
		try{
			files=fs.readdirSync(global.bl.appRoot + "components/" + moduleName + "/" + subPath);
		}catch(err){files=[];}

		filesystemCache[subPath][moduleName] = _.map(files, (file)=>({type: moduleName + "/" + subPath + "/" + file}));
	}
	
	return filterComponents(filesystemCache[subPath][moduleName], options);
}

/*********************************************************************************************/
module.exports.getSiteComponents=(unsanitizedSite, options)=>{
	options=options||{};
	var subPath = options.subPath || "content";
	filesystemCache[subPath]=filesystemCache[subPath]||{};

	var site = unsanitizedSite.replace(/\.|\//g,""), result=[];
	if(unsanitizedSite!==site){
		throw(new Error("Bad site string sent to getSiteComponents(): " + unsanitizedSite ));
	}

	if(!filesystemCache[subPath][site]){
		var files;
		try{
			files=fs.readdirSync(global.bl.appRoot + "components/" + site);
		}catch(err){files=[];}

		_.each(files, (moduleName)=>{
			result = result.concat(module.exports.getModuleComponents(site + "/" + moduleName, options));
		})

		filesystemCache[subPath][site] = result;
	}
	
	return filterComponents(filesystemCache[subPath][site]);
}


/*********************************************************************************************/
module.exports.getAllComponents=(options)=>{
	options=options||{};
	var subPath = options.subPath || "content";
	var ALL_SITES="__ALL_SITES__", result=[];

	filesystemCache[subPath]=filesystemCache[subPath]||{};

	if(!filesystemCache[subPath][ALL_SITES]){
		var files;
		try{
			files=fs.readdirSync(global.bl.appRoot + "components/");
		}catch(err){files=[];}

		_.each(files, (site)=>{
			result = result.concat(module.exports.getSiteComponents(site, options));
		})

		filesystemCache[subPath][ALL_SITES] = result;
	}
	
	return filterComponents(filesystemCache[subPath][ALL_SITES]);
}

/*********************************************************************************************/
module.exports.makeOptions=(components,currentSiteOrModule)=>{
	var module, site;
	var grouped={one:{},two:{},three:{}}

	currentSiteOrModule=currentSiteOrModule ? currentSiteOrModule.replace(/\./,"/") : "";

	if(currentSiteOrModule.indexOf("/")>-1){
		module=currentSiteOrModule;
		site=currentSiteOrModule.split("/").shift();
	}else{
		site=currentSiteOrModule;
	}

	// group by module
	_.each(components, (component)=>{
		var rtype=component?(component.type || component):"";
		var match=rtype.match(/^(([^\/]+)\/[^\/]+)/);
		var curModule=(match?match:[])[1];
		var curSite=(match?match:[])[2];

		if(curModule === module){
			if(!grouped.one[curModule]){grouped.one[curModule]=[];}
			grouped.one[curModule].push(rtype);
		}else if(curSite === site){
			if(!grouped.two[curModule]){grouped.two[curModule]=[];}
			grouped.two[curModule].push(rtype);
		}else{
			if(!grouped.three[curModule]){grouped.three[curModule]=[];}
			grouped.three[curModule].push(rtype);
		}
	})


	var results = {};

	_.each(grouped, (group)=>{
		_.each(group, (types, moduleName)=>{
			var parts=moduleName.split("/");
			var prettyName = global.bl.prettyName(parts[0]) + " - " + global.bl.prettyName(parts[1]);
			var options = []
			results[moduleName] = {title: prettyName, options, isGroup:true};
			_.each(types, (rtype)=>{
				var title=global.bl.prettyName(rtype.split("/").pop())
				options.push({title, value:rtype});
			})
		})
	})
	
	return results;
}



