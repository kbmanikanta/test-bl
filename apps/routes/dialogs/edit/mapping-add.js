
var _=require("lodash");
var shared=require("../../../widgets/mapping-widget/shared");


module.exports.process=function(data,$,cb){
	var mappingWidget = global.bl.widgetRegistry.get("mapping-widget");
	var {req, res} = $.express;
	if(!req.body || !req.body.type || !req.body.key){
		cb("mapping-add expects posted parameters: type and key")
	}else{
		cb(null, false);
		var mappingWidgetTemplate;
		if(req.body.type==="bl:component-inherit"){
			mappingWidgetTemplate = mappingWidget.getCompiledTemplate("bl-inherit-component");
			res.send(mappingWidgetTemplate({json5:"{}", resourceType: req.body.resourceType}))
		}else{
			mappingWidgetTemplate = mappingWidget.getCompiledTemplate("field");
			var key = req.body.type==="bl:query"?"bl:q":req.body.key;
			res.send(mappingWidgetTemplate({json5:"{}", template: "mapping-widget.bl-ref", map_id: key, type_title: shared.mappingTypes[req.body.type] || "Unknown type",  type: req.body.type}))
		}

	}
}

