
var help=require(global.bl.appRoot + "/components/blacklight/develop/widget-helper");

exports.dialog=function($){
	return help.dialog("Image", {
		minWidth:{widget:"numberfield", label: "Minimum Width"}, 
		minHeight:{widget:"numberfield", label: "Minimum Height", description: "Only taken into account if the Minimum Width is set."}, 
		cropping: {
			widget: "multifield", 
			label: "Croppings", 
			description: "Optional. Croppings listed here will be available as options to the content authors when cropping images. They should be entered in the format 'width'x'height'. eg: 1x1, 16x9", 
			fieldConfig: {
				widget: "textfield"
			}
		
		}	
	});
}




