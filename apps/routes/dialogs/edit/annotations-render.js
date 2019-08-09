var _=require("lodash");
var annotationsData=require("../../annotations/annotations");

module.exports=function(slingData, slingPath){

	var result = '';

	var annotations = [];
	annotationsData.findBlAnnotations(slingData, slingPath, annotations);
	annotations = annotations.length && annotations[0].annotations ? annotations[0].annotations : [];

	var annotationsWidget = global.bl.widgetRegistry.get("annotations-widget");
	var annotationsWidgetTemplate = annotationsWidget.getCompiledTemplate("field");
	result = annotationsWidgetTemplate(annotations);


	return result;
}