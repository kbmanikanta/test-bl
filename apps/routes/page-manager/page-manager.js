const _ = require('lodash');

module.exports.process=function(data, $, cb){
	var appsMount = global.bl.appsMount;
	data = _.assign(data, 
		{blConfig: $.blConfig, slingProxyType: $.slingProxyType, isFoss: !!$.sc.foss}
	);
	global.bl.modules.modelHelpers.blacklight.edit.setFrameScripts(data);

	if(!$.sc.foss){
		data.scripts.js.push("/etc/clientlibs/granite/jquery/granite/csrf.js");
	}

	

	data.blConfig.treeBasePath="/content";

	var viewButton = {icon:"visibility", title:"Page preview",}; 
	var editButton = {icon:"mode_edit", title:"Edit view"}; 

	if($.slingProxyPrefix){
		editButton.prefix = appsMount + "blacklight/edit/page/"; 
	}else{
		viewButton.postfix = ".html?wcmmode=preview"; 
		editButton.postfix = ".html?wcmmode=edit"; 
	}

	data.blConfig.modes={
		view:viewButton,
		edit:editButton,
		documentation : {icon : "library_books", title: "Documentation", prefix: appsMount + "blacklight/edit/documentation/"},
		list:{icon:"view_list", title:"Page list view", prefix: appsMount + "blacklight/edit/list/"},
		multilingual:{icon:"language", title:"Languages", prefix: appsMount + "blacklight/edit/ml/"},
		raw:{icon:"view_quilt", title:"Data view", postfix:".raw"},
		live:{icon:"public", title:"Live view", postfix:".live"},

		approve:{prefix: appsMount + "blacklight/edit/legacy/queues/approve/?slingPath="},
		transfer:{prefix: appsMount + "blacklight/edit/legacy/queues/transfer/?slingPath="},
		publish:{prefix: appsMount + "blacklight/edit/legacy/queues/publish/?slingPath="},
		permissions:{prefix: appsMount + "blacklight/edit/legacy/queues/permissions/?slingPath="}
	}



	data.menuItems={
		settings:{
			linkAttributes:'data-target="bl-edit-dialog" data-sling-type="blacklight/edit/page/resource-type"',
			title:"Page settings" },

		permissions:{
			linkAttributes:'',
			icon:"playlist_add_check",  // visibility_off
			title:"Permissions", divider:true, mode:true },


		add:{
			linkAttributes:'data-target="bl-add-page-dialog"',
			title:"Add page"},

		delete:{
			linkAttributes:'data-target="bl-delete-page-dialog"',
			title:"Delete page", divider:true  },

		copy:{
			title:"Copy page",  icon:"content_copy"},

		cut:{
			title:"Cut page",  icon:"content_cut"},

		paste:{
			title:"Paste page",  icon:"content_paste", divider: true, disabled: true},

		activate: {
			title: "Activate page",  icon:"thumb_up", class:"custom-action"
		},

		deactivate: {
			title: "Deactivate page",  icon:"thumb_down", class:"custom-action"
		},

		history: {
			title: "History",  icon:"history", class:"custom-action"
		},


		// approve:{
		// 	title:"Approve content",  icon:"check_circle", mode:true},

		// publish:{
		// 	title:"Publish content",  icon:"get_app", mode:true},

		transfer:{
			title:"Transfer content",  icon:"input", mode:true},



	}


	cb();
}