
var childComponentOptions=require("../../../lib/child-component-options");
var _=require("lodash");


module.exports.process = function(data, $, cb){

	var query = $.express.req.query || {};
	var slingConnector = $.express.req.bl.sling;
	data.query=query;
	data.url = $.express.req.originalUrl;
	data.step1=!query.step2;
	data.step2=query.step2;
	data.allowBrowsing=true;
	var externalConfig = ''; 
	if(query.config){
		try{externalConfig=JSON.parse(query.config)}catch(err){console.error("Bad ECC configuration sent as query string:", query.config)}
	}

	if(!query.parentPath){handleError("You must specify 'parentPath' as a query string parameter.");return;}
	if(query.step2 && !query.resourceType){handleError("You must specify 'resourceType' as a query string parameter.");return;}



	/************************************************************************************/
	if(data.step1){
		childComponentOptions(query.parentPath, slingConnector, {pageMode:true, site:$.express.req.bl.site, externalConfig}, (err, results)=>{
			if(err){handleError(err,cb);return;}

			_.assign(data, results);
			cb();
		});
	}else{
		// step 2
		data.parentPath = query.parentPath;
		data.resourceType = query.resourceType;

		var component = global.bl.componentRegistry.get(data.resourceType);
		data.writeComponentTemplateLocally = component?component.templateWriteRule(data.parentPath):false;

		cb();
	}



	/************************************************************************************/
	function handleError(message){
		$.express.res.status(500).json({error:message})
		cb(null, false);
	}


}