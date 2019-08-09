
var childComponentOptions=require("../../../lib/child-component-options");
var _=require("lodash");

module.exports.process = function(data, $, cb){

	var query = $.express.req.query || {};
	var slingConnector = $.express.req.bl.sling, externalConfig="";
	data.query=query;
	data.url = $.express.req.originalUrl;
	data.step1=true;
	data.allowBrowsing=true;

	if(!query.parentPath){handleError("You must specify 'parentPath' as a query string parameter.");return;}

	if(query.config){
		try{externalConfig=JSON.parse(query.config)}catch(err){console.error("Bad ECC configuration sent as query string:", query.config)}
	}



	/************************************************************************************/
	childComponentOptions(query.slingPath, slingConnector, {componentMode:true, externalConfig, parentType: query.parentType, site:$.express.req.bl.site}, (err, results)=>{
		if(err){handleError(err,cb);return;}		

		_.assign(data, results);
		cb();
	});



	/************************************************************************************/
	function handleError(message){
		$.express.res.status(500).json({error:message})
		cb(null, false);
	}


}