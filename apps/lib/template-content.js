var flatten=global.bl.flattenObject;
var collections = global.bl.collections;
var _=require("lodash");

/*************************************************************************************************************/
module.exports = function templateContent(options){
	var {resourceType, targetPath, prefix} = options;
	prefix=prefix||"";

	var prefixWithSlash = prefix ? prefix + "/" : "";

	var component = global.bl.componentRegistry.get(resourceType);

	if(!resourceType){return new Error("No resourceType specified in query");}
	if(!component){return new Error("No component found at: " + resourceType);}


	var result={"sling:resourceType":resourceType};
	var template = null;
	if(options.forceChildMap){
		template = { "bl:map": options.forceChildMap }; 
	}else{
		var blMap = component.getComponentInheritSettings();

		if(!blMap){
			return;
		}
	
		result["bl:map"]={ci:blMap};
	}
	

	// global.bl.fillInComponentTemplateData(template, {noMarking:true});

	// TODO: Maybe don't pass around "write locally" setting in the dialog.  Instead, just send the path here and decide.
	// TODO: plug the right bl:map setting into the "template" data above, then send to global.bl.dataMapper() (instead of fillInComponentTemplateData)
	// TODO: You need some kind of component-level function to get bl:inherit-component node for a given component. pre-poulated with "excludes" fields
	
	var flattenedResult=flatten(result, {prefix});

	// console.log("\n\nTEMPLATE CONTENT:", component.template);


	var pathRegex = [];
	if (blMap) {
		_.each(blMap.exclude, (path)=>{
			var parts=path.split("/");
			parts.pop();
			while(parts.length){
				pathRegex.push( `^${prefixWithSlash}${parts.join("/")}/sling:resourceType` )
				parts.pop();
			}
			pathRegex.push(`^${prefixWithSlash}${path}($|/)`);
		});
	}

	pathRegex = pathRegex.join("|") + (pathRegex.length?"|":"") + "(^|/)bl:map/";

	pathRegex = new RegExp(pathRegex);

	var flattenedTemplate = flatten(component.template, {prefix});
	if (template) {
		Object.assign(flattenedTemplate, flatten(template, {prefix}));
	}

	// TODO: How to get the parsys bl:dont-merge setting written to the REPO?
	//	answer:  the correct moment to write the parsys meta-setting to the repo is at "child component add" time.


	return module.exports.remapFlattened(flattenedTemplate, pathRegex, options.targetPath, flattenedResult);

}



/*************************************************************************************************************/
module.exports.remapFlattened = function remapFlattened(flattenedInput, mappablePathRegex, targetPath, initialResult){
	var flattenedResult = initialResult || [];

	flattenedInput.forEach((item)=>{
		if(!mappablePathRegex || mappablePathRegex.test(item.name)){
			if(/\/(bl:ref|bl:query|bl:link)$/.test(item.name)){  /// REMAP bl:ref/bl:query paths to match local page, if possible.
				var newPath = collections.mapPath(targetPath ,item.value);
				if(newPath.error){
					item.mapError=newPath;
				}else{
					//note: this is maybe a little hacky. Not sure if we want to allow this behavior
					if(newPath.indexOf('/-') > 0){
						var newParts = newPath.split('/');
						var providedParts = item.value.split('/');

						_.each(newParts, function(segment, idx){
							if(segment[0] === '-' && providedParts.length > idx){
								newParts[idx] = providedParts[idx];
							}
						});

						newPath = newParts.join('/');
					}

					item.oldPath=item.value; item.value=newPath;
				}

				if(_.endsWith(item.name, 'bl:query')){
					//add in the bl:processing node
					flattenedResult.push({name: item.name.replace("bl:query", 'bl:processing'), value: "true"});
				}
			}
			flattenedResult.push(item);
		}
	});

	return flattenedResult;

}




