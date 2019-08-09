
var _=require("lodash");

module.exports.process=function(data, $, cb){
	var queues = global.bl.queues.getAll();
	var appsMount = $.blConfig.appsMount;
	var queueLinks=[];
	var queueHomePage=appsMount + "blacklight/edit/queues/summary";

	_.each(queues,(name)=>{
		queueLinks.push({title:name, key: appsMount + "blacklight/edit/queues/q/" + name + "/status"})
	})

	if($.page.extension==="json"){
		data.queues= queueLinks;
	}else{
		data.blConfig.staticTreeContent=[ 
			{ children:	 queueLinks,    	
		    	title: "Queues",
		    	key: queueHomePage 
		 	} ]


		// This is where the main framed HTML page is loaded.
		data.blConfig = $.blConfig;
		data.blConfig.modes={
			view:{icon:"visibility"}
		}

		data.blConfig.defaultFrameURL = queueHomePage;
		// data.config.breadcrumb.push({name:"Queues", link:data.blConfig.appsMount + "blacklight/edit/queues"})
		global.bl.modules.modelHelpers.blacklight.edit.setFrameScripts(data);

	}

	cb();
}




