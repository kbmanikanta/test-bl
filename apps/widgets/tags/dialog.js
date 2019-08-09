
var help=require(global.bl.appRoot + "/components/blacklight/develop/widget-helper");

exports.dialog=function($){
	return help.dialog("Tags", {root: {widget: 'textfield', label: 'Namespaced root', description: 'Used to limit the tags available for selection. Should be in the format of an AEM Tag ID (namespace:tag/path)', validation: {required:true, pattern: '[^:]+:[^\/].*', patternMessage: 'Must be in the format of a namespaced AEM Tag ID.' }}});
}




