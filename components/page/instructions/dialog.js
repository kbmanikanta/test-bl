

exports.dialog=function($){
	var dialog={
			title: "How to set page type",
			items: {
				fields: {
					widget:"panel",
					items:{
						title: {name:"x-instructions", widget:"textfield", label:"Choose 'Page settings' from top menu to set page type.", description:"Please close this dialog and use the 'Page settings' menu item to set page type."},
					}
				}
			}
	}

	return dialog;
}


