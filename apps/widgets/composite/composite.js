var _=require("lodash");

exports.processConfig = function(config, $){
	// This function will enhance the config data with, for example, a "title" and "body" template for the content.hbs to reference.
	// Also, plugging in in defaults, etc.


	var titleField;

	_.each(config.fieldConfigs, function(val, idx){
		if($.registry.get(val.widget)){
			if(!titleField){titleField=val.name;}
		}
	})


	config.titleField = titleField ;	

	return config;
}

