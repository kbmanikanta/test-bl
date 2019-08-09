
var _ =require("lodash");
var log = global.bl.logger.get("blacklight.edit");

//**********************************************************************************************/
module.exports.process = function(data, $, cb){

	// var x={
	// 		express:{req:req, res:res, next:next}, sc: sc,  hb: hb, log:log,
	// 		componentRegistry: componentRegistry, widgetRegistry: widgetRegistry,
	// 		handleError: handleError, blConfig: blConfig,
	// 		action:action, mainPath: req.params.mainPath, mainExtension: req.params.mainExtension,
	// 		templates:routerSettings.templates.blacklight.edit
	// 	}

	if($.sling.mode !== "author"){
		$.express.res.status(404).end("Page not available");
		cb(null, false);
		return;
	}

	
	var blConfig = global.bl.modules.modelHelpers.blacklight.edit.getBlConfigClient($.express.req);

	$.sc=$.sling;
	$.hb = global.bl.hb;
	$.log = log;
	$.componentRegistry = global.bl.componentRegistry;
	$.widgetRegistry = global.bl.widgetRegistry;
	$.slingProxyType = blConfig.slingProxyType;
	$.slingProxyPrefix = blConfig.slingProxyPrefix;
	$.templates = $.templates.blacklight.edit;
	$.mainPath = $.page.path;
	$.action = $.page.action;
	$.mainExtension = $.page.extension;
	$.blConfig = blConfig;
	$.handleError = handleError;


		// 	var $={
		// 	page: processor.page,
		// 	express: {req,res,next},
		// 	sling: req.bl.sling,
		// 	templates: routerSettings.templates,
		// 	logger
		// };

	// data.publicMount = blConfig.publicMount;
	if($.page.extension!=="json" && $.template){
		_.assign(data,global.bl.modules.modelHelpers.blacklight.edit.getPageData($.express.req, $.blConfig));
	}
	cb();
}


//**********************************************************************************************/
//**********************************************************************************************/
function handleError(err, res, req){
	log.error("while generating edit page",{err:err, stack:err?err.stack:null});
	res.status(500);

	if(!res.finished){
		if(req && /\.json$/.test(req.path)){
			res.json({err})
		}else{
			res.write("<h1 style='font-family:sans-serif; color:#911'>Error generating edit page</h1> <pre>" + (err.message || err.toString()) + "</pre>");
			if(err.templateText){
				res.write("<pre>" + _.escape(err.templateText) + "</pre>");
			}
			res.end();
		}
	}
}
