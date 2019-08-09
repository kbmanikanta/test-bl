var _ = require("lodash");
var fs= require("fs");
var log=global.bl.logger.get("blacklight.edit.widgets")


/// You want to load all of them up always

module.exports=function widgetRegistry(options){

	var wregistry={widgets:[]};
	if(!options.hb){throw new Error("Must include handlebars object in options to widgetRegistry");}
	if(!options.roots){throw new Error("Must include root(s) array in options to widgetRegistry");}

	var loadWidget = require("./widget")({registry:wregistry, hb:options.hb});

	////////////////////////////////////////////////
	wregistry.get = function(name){
		if(name)
			return wregistry.widgets[name];
	}


	////////////////////////////////////////////////
	function loadAllWidgets(){
		_.each(options.roots, function(widgetRoot){
			try{
				var files = fs.readdirSync(widgetRoot);
				for(var i=0; i< files.length; i++ ){
					var name=files[i];

					if(!wregistry.widgets[name] && !name.match(/\./)){
						wregistry.widgets[name] = loadWidget(widgetRoot, name)
					}
				}
			}
			catch(err){
				if (err.code === 'ENOENT') {
					log.warning("Specified widget root does not exist:", widgetRoot);
				} else {
					throw err;
				}
			}

		});
	}

	loadAllWidgets();
	return wregistry;
}


