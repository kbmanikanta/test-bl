
var helper=require(global.bl.appRoot + "/components/blacklight/develop/widget-helper");

exports.dialog=function($){
	var dialog=helper.dialog("Selection",{
		type:{widget:"selection", options:["checkbox","radio","select","combobox"]},
		defaultValue:{widget: 'textfield', label: 'Default Value'}
	});
	return dialog;
}




