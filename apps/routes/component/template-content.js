
var templateContent = require("../../lib/template-content");

module.exports.process = function(data, $, cb){
	var req=$.express.req;
	var query=req.query;
	var resourceType=query.resourceType;
	var targetPath = query.path;
	var prefix=query.prefix || "";

	var flattenedResult = templateContent({resourceType, targetPath, prefix})

	data.template=flattenedResult;
	cb();
}

