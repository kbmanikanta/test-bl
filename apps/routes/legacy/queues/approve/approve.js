
var config=global.bl.config;
var _=require("lodash");

module.exports.process=function(data, $, cb){
	var query = $.express.req.query;

	data.slingPath=query.slingPath;
	data.mode = query.mode || "confirm";

	var sourceUri =  $.express.req.bl.sling.baseUri;

	switch(data.mode){
		case "confirm":
			data.targets=[];

			_.each(config.environment.otherSlings, function(val, idx){
				if(val.baseUri !== sourceUri){
					data.targets.push({title: val.title || idx, name:idx});
				}
			})
		break;

		case "queue":
		
		break;

		case "report":
		break;
	}

	cb();
}


/*

	Confirm mode should immediately queue up all pages, and show them.
	Don't offer the "approve" button until that is fully loaded.
	Ideally, show the "todo list" in a div, and in such a way that each entry can be dynamically marked as "done" once done.
	

*/
