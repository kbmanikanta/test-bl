
// Server-side UI rendering logic for mapping widget.  This file is not invoked like normal widget server side stuff; it is included directly by routes/dialogs/edit/edit.js

var _=require("lodash");
var typeKeys=/^bl:(ref|inherit-cascade|list-ancestors|list-subtree|link|query)$/;
var metaRegex = /(^|\/)(\w{1,6}):|(^|\/)\_/;
var util=require("util");
var templates={};
var JSON5 = require("json5");
var shared = require("./shared.js");
var customTypes = /^bl:map|^bl:query/;
var uniqueIdCounter = 0;

const mappingTypes=shared.mappingTypes;

/********************************************************************************************/
module.exports.renderDialogPage = function(blMaps, resourceType){ 
	"use strict";
	var allMapsWidgets = []; 

	var component = resourceType?global.bl.componentRegistry.get(resourceType):null;
	var namedMaps = _.get(component,"named_maps");

	//add in a top level bl:map, if one not already present
	if(!blMaps['bl:map']){
		blMaps['bl:map'] = {
			ci: {
				'bl:inherit-component' : resourceType
			}
		}
	}

	_.each(blMaps, (map, mapPath)=>{
		var result={directives:[]}
		var mappingWidgets=[];
		var mappingWidget = global.bl.widgetRegistry.get("mapping-widget");
		var mappingWidgetTemplate = mappingWidget.getCompiledTemplate("field")
		var itemCount=0;
		
		
		var mapMenuId = "mapping_menu_" + uniqueIdCounter++;
		var mapMenu=[];

		//console.log('map', map);
		
		_.each(map, (mapItem, key)=>{
			if(key==="ci"){
				result.componentMap=mapItem;
			}else if(_.isPlainObject(mapItem) && key !== 'bl:templated'){
				let type, typeVal, params={};
				_.each(mapItem,(val,key)=>{
					if(typeKeys.test(key)){
						type=key; 
						typeVal = val;
					}else{
						if(!metaRegex.test(key)){
							params[key] = val;
						}
					}
				});
				let item = {type, typeVal, params, key};
				result.directives.push(item);
			}
		});

		if(result.componentMap){
			var inheritedType = result.componentMap["bl:inherit-component"];
			delete result.componentMap["bl:inherit-component"];
			var componentInheritTemplate = mappingWidget.getCompiledTemplate("bl-inherit-component");
			mappingWidgets.push(componentInheritTemplate({resourceType : inheritedType, "json5": JSON5.stringify(result.componentMap)}));
		}

		//console.log('result.directives', result.directives);

		//we're only going to include a map if it already has directive setup
		if(_.size(result.directives) || mapPath === 'bl:map'){
			_.each(result.directives, (directive)=>{
				// console.log("----\ndirective:", id,"\n", directive.typeVal, "\n", JSON.stringify(directive.params, null, "  "))

				function dropMeta(obj){
					if(!obj){return;}
					var keys=Object.keys(obj);
					// console.log("keys:", keys);
					for(var i=0; i<keys.length; i++){
						if(keys[i].indexOf(":")>-1){
							delete obj[keys[i]];
						}
						if(_.isPlainObject(obj[keys[i]])){
							dropMeta(obj[keys[i]]);
						}
					}
				}
				dropMeta(directive.params);

				var template = customTypes.test(directive.type) ? "mapping-widget." + directive.type.replace(/:/,"-") : "";

				var data={
					map_id:directive.key,
					type: directive.type,
					template: template,
					type_title: mappingTypes[directive.type],
					type_value: directive.typeVal,
					params_json5: JSON5.stringify(directive.params, null, "\t"),
					params: directive.params,
					mappingTypes
				}

				itemCount++;
				mappingWidgets.push(mappingWidgetTemplate(data))
			});

			if(mappingWidgets.length===0){
				mappingWidgets.push(`<div class="row map-message z-depth-2">No data maps defined for this content component. Click the "plus" button to add a data map.</div>`)
			}

			// commenting this out for now...not really sure how namedMaps will play into multiple maps on a component
			// if(namedMaps){
			// 	mapMenu.push(`<ul id='${mapMenuId}' class='dropdown-content named-maps-menu' data-resource-type="${resourceType}" data-sling-path="${slingPath}">`);
			// 	_.each(namedMaps,(map,key)=>{
			// 		mapMenu.push(`<li><a href="javascript:;" class="map-link" data-map-link="${key}">${map.title}</a></li>`)
			// 	});
			// 	mapMenu.push("</ul>")
			// }

			allMapsWidgets.push(`
			<div class="row map-entry" data-name="${mapPath}">
				<div class="eccTitle z-depth-1" style="left: -.8rem;color:#824f4f;font-weight: 400;">
					Data Mapping 
					<i class="material-icons named-mappings-menu-button"  data-activates="${mapMenuId}" style="top:4px; left:4px; color:#777; font-size:1.2rem;">more_vert</i><br/>${mapPath}
				</div>
				${mapMenu.join("")}
				${mappingWidgets.join("")}
				<a class="bl-add-mapping btn-floating semi-ghosty enabled right" style="margin-right:-.1rem;top:-2.4rem;"><i class="material-icons green">add</i></a>
			</div>
				`);
		}
	});

	return allMapsWidgets.join('');

}	


/********************************************************************************************/
module.exports.makePartials=true;






