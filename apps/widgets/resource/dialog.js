
var help=require(global.bl.appRoot + "/components/blacklight/develop/widget-helper");

exports.dialog=function($){
	return help.dialog("Resource", {searchType: {widget: 'selection', type: 'select', name: 'type', description: 'What kind of resource should be used?', options: [
		{
			title: 'Assets', 
			value: 'assets'
		}, 
		{
			title: 'Pages', 
			value: 'pages'
		}
	]}});
}




