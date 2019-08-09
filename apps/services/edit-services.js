var _ = require("lodash");
var _path = require("path");
var appRoot = global.bl.appRoot + "/";
var hbManager=require("../lib/edit-handlebars")();
var hb=hbManager.hb;
var loadWidgetRegistry = require("../lib/widget-registry");
var loadComponentRegistry = require("../lib/edit-component");
var _path=require("path");


var methods = {};
var widgetRoots=[_path.resolve(__dirname, "../widgets")];
var localWidgetRoots=[], componentRoots=[];

_.each(_.without(_.keys(global.bl.config),"environment"),function(key){
	var conf=global.bl.config[key];
	if(conf){
		if(conf.widgetRoots){localWidgetRoots = localWidgetRoots.concat(conf.widgetRoots);}
		if(conf.componentRoots){componentRoots = componentRoots.concat(conf.componentRoots);}
	}
});

if(localWidgetRoots){
	if(!_.isArray(localWidgetRoots)){localWidgetRoots=[localWidgetRoots]}
	localWidgetRoots=_.map(localWidgetRoots, function(root){if(root[0]==="."){return _path.resolve(appRoot, root);}else{return root;} });
	widgetRoots=localWidgetRoots.concat(widgetRoots);
}

var widgetRegistry = loadWidgetRegistry({roots:widgetRoots, hb: hbManager.hb});

componentRoots = _.uniq(componentRoots.concat("./components"));

var componentRegistry=loadComponentRegistry({
	roots:global.bl.buildComponentRoots(componentRoots), 
	widgetRegistry, 
	hb: hbManager.hb
});

var singlePathActions = ["page","proxy","dialog","all-modules-client-js","preview-controls-js","docs", "queues", "page-type"];

global.bl.componentRegistry=componentRegistry;
global.bl.widgetRegistry=widgetRegistry;

hbManager.makeHelpers(widgetRegistry, componentRegistry);

