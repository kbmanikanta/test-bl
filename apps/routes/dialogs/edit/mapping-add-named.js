
var _=require("lodash");
var blMapRender=require("../../../widgets/mapping-widget/mapping-widget").renderDialogPage;
var shared=require("../../../widgets/mapping-widget/shared");
var templateContent = require("../../../lib/template-content")
var flatten=global.bl.flattenObject;

module.exports.process=function(data,$,cb){

	var {req, res} = $.express;
	if(!req.body || !req.body.resourceType || !req.body.slingPath){
		cb("mapping-add-named expects posted parameters: type and targetPath")
	}else{
		var component = global.bl.componentRegistry.get(req.body.resourceType);
		if(!component){cb("Unknown component type: " + req.body.resourceType); return;}

		// Get requested map prototype from requested component model
		var mapPrototype = _.get(component.named_maps, req.body.mapId);

		if(!mapPrototype){cb("Unknown map id '" + req.body.mapId +  "' from component type: " + req.body.resourceType); return;}

		// Masquerade the resource type of the map to look like that of the new target component
		mapPrototype["sling:resourceType"] = req.body.resourceType;

		// Remap links and references in the map prototype to conform with path of the new target component
		var adjustedFlattenedMap = templateContent.remapFlattened(flatten(mapPrototype), null, req.body.slingPath);
		var adjustedMap = {};
		_.each(adjustedFlattenedMap,(val,key)=>{
			console.log(val.name, ":", val.value);
			_.set(adjustedMap, val.name.split("/"), val.value);
		})

		var html= blMapRender(adjustedMap, req.body.slingPath)
		res.send(html);
		cb(null, false);
	}

}
