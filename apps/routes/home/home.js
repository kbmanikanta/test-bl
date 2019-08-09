var _=require("lodash")
var fs=require("fs");
var _path=require("path");
var verifiedInstalled = {};

module.exports.process=function(data, $, cb){
	data.navItems={
		"page-manager":{
			children:{
				"page-manager":{},
				"activate-tree":{},
				"publish-tree":{},
				"replicate-tree":{},
				agents:{}
			}
		},

		"media-library":{
		},


		"tagging":{
		}
	}

	var req=$.express.req;
	var appsMount=global.bl.config[req.bl.site].appsMount;

	data.column1 = [
		{
			title:"Page Manager",
			icon:"chrome_reader_mode",
			iconRotate:"180deg",
			link:"/pm"
		},		
		{
			title:"Media Library",
			icon:"perm_media",
			link: appsMount +  "blacklight/edit/media"
		},
		{
			title:"Tagging",
			icon:"local_offer",
			link: appsMount + "blacklight/edit/tagging"
		},
		{
			title:"Tools",
			icon:"apps",
			link: appsMount + "blacklight/edit/edit-tools"
		}		
	]

	data.column2 = [
		{
			title:"Documentation",
			icon:"library_books",
			link: appsMount + "blacklight/edit/docs"
		},
		// {
		// 	title:"Data Manager",
		// 	icon:"build",
		// 	link:"/blacklight/edit/data"
		// },
		{
			title:"Developer",
			icon:"code",
			link:appsMount + "blacklight/develop/cm"
		},
		{
			title:"Sling/OSGI Console",
			icon:"settings",
			link:$.sc.baseUri + "system/console"
		},

		{
			title:"Queues",
			icon:"line_weight",
			link:appsMount + "blacklight/edit/queues"
		}
	]

	if(_.get($.express,"req.authorization.userManager")){
		data.column2.push(		{
			title:"Users",
			icon:"group",
			link:$.express.req.authorization.userManager
		});
	}


	var callsToMake = 1; //just to make sure we actually get all of the initial calls
	var callsFinished = 0;
	function callFinished(){
		callsFinished++
		if(callsToMake === callsFinished){
			cb();
		}
	}

	ifModuleInstalled('blacklight.develop', null, function(){
		data.column2.splice(2,1);
	});

	ifModuleInstalled('blacklight.test', function(){
			data.column2.push({
				title: 'Test Content',
				icon: 'done_all',
				link: appsMount + 'blacklight/test/test-content'
			});
	});

	callFinished(); //marking the initial 1 call complete



	function ifModuleInstalled(moduleId, trueCase, falseCase){
		callsToMake++;
		if(verifiedInstalled[moduleId]){
			if(verifiedInstalled[moduleId] === 'yes'){
				if(trueCase){trueCase();}
			}else{
				if(falseCase){falseCase();}
			}
			callFinished();
		}else{
			var modulePath = _path.join(global.bl.appRoot,"blacklight_modules", moduleId.replace('.', '/'));
			fs.stat(modulePath,(err)=>{
				verifiedInstalled[moduleId]=(!err ? 'yes' : 'no');
				ifModuleInstalled(moduleId, trueCase, falseCase);
				callFinished();
			});
		}

	}


}