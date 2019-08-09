var _=require("lodash");
var log=global.bl.logger.get("bl-edit.migrations");
var migrations = require("../../lib/migrations")

/**
	This route provides an end point for the sling "migrations" service	
**/

exports.process=function(model, $, cb){
	var {req, res}=$.express;
	var SC=req.bl.sling;
	var collections = global.bl.collections;
	var resourceType = req.query.resourceType;

	migrations.analyzeResourceType(resourceType,(err, job)=>{
		res.json({result: "ok, added this job: " + resourceType, job})
	});

	cb(null, false);
};

exports.async=false;

