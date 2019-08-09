
module.exports.process=function(data, $, cb){	
	global.bl.modules.modelHelpers.blacklight.edit.processScripts(data, $.express.req.bl.config.publicMount);
	cb();
}