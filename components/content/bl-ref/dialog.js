exports.dialog=function($){
	var dialog={
	  title: "Data Reference",
	  items: {
		 "source":{widget:"textfield"},
		 "target": {widget: "textfield"}, 
		 "templateId": {widget: "textfield"}
	  }
	};
	return dialog;
  };
  