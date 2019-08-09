var _=require("lodash");
var _path=require("path");

//**********************************************************************************************/
module.exports.process = function(data, $, cb){

 	var helpers = global.bl.modules.modelHelpers;
 	var {req,res}=$.express;
 	var path=req.query.path;
 	var sling=req.bl.sling;
 	var config = req.bl.config;

 	sling.getSling(path + ".infinity.json", {}, (err, content)=>{
 		if(err){cb(err); return;}

 		var rtype=content._sling_resourceType;
		data.info=[
			{title:"Path", content: `<a href="${sling.baseUri}${path}.infinity.json" target="_blank">${path}</a> <!-- a href="${path}.raw">[raw]</a -->`},
			{title:"Type", content: `<a href="${config.appsMount}blacklight/develop/cm#!${config.appsMount}blacklight/develop/components/${rtype}.edit" target="_blank">${rtype}</a>`}
		]		
	 	cb();
 	})



}