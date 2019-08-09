
var _=require("lodash");
var blDialogRender=require("../../../widgets/mapping-widget/mapping-widget").renderDialogPage;


module.exports.process=function(data,$,cb){
	var mappingWidget = global.bl.widgetRegistry.get("mapping-widget");
	var {req, res} = $.express;
	console.log('mapping-update body', req.body);
	if(!req.body || !req.body.maps || !req.body.type){
		cb("mapping-update expects posted parameters: maps and type")
	}else{
		res.send(blDialogRender(req.body.maps, req.body.type));
		res.end();
		cb(null, false);

	}
}

