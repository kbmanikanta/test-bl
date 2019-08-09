
var help=require(global.bl.appRoot + "/components/blacklight/develop/widget-helper");

exports.dialog=function($){
	return help.dialog("Rich text", {
		toolbar: {
			widget: "textfield",
			description: "Defines the list of options for the Rich Text tool bar. The full list of options is here: https://www.tinymce.com/docs/advanced/editor-control-identifiers/#toolbarcontrols. Defaults to 'bold italic styleselect removeformat | table link | alignleft aligncenter alignright | bullist numlist outdent indent | undo redo | code fullscreen | pastetext'"
		},
		blockFormats: {
			widget: "textfield",
			description: "Used to override the items for the toolbar option 'formatselect'. Items are to be entered as title=block and separated by a semi-colon. See https://www.tinymce.com/docs/configure/content-formatting/#style_formats for details."
		}
	});
}




