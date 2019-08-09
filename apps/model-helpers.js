var _=require("lodash");

/********************************************************************************************/
module.exports.getBlConfigClient = function(req, viewModes){
		var slingProxyType = req.headers["x-proxy-type"];
		var slingProxyPrefix = slingProxyType?"":(global.bl.appsMount + "blacklight/edit/proxy/");

		var siteConfig=global.bl.config[req.bl.site];
		var allowedLanguages = _.get(siteConfig, ["language","allowedPaths"],[]).join("|");
		var sc=req.bl.sling;

		var modes = viewModes ? _.mapValues(viewModes, (mode)=>_.pick(mode,["prefix","postfix"])) : null;

		var blConfig = {
			publicMount: siteConfig.publicMount, 
			appsMount: siteConfig.appsMount,
			hasPageListingCapability: sc.hasPageListingCapability, 
			slingIsFoss: sc.foss,
			slingProxyPrefix:slingProxyPrefix, 
			slingProxyType: slingProxyType,
			defaultModule : global.bl.defaultSite + "." + "site",
			modes: modes,
			allowedLanguages
		};


		return blConfig;
}


/********************************************************************************************/
module.exports.getPageData = function(req, blConfig, viewModes){

	var siteConfig= req.bl.config;
	if(!blConfig){
		blConfig = module.exports.getBlConfigClient(req, viewModes);
	}

	var bundled=global.bl.processScripts.rev("blacklight/edit/js/dist/edit-page-bundled.js");

	var data ={
		publicMount: siteConfig.publicMount,
		appsMount: siteConfig.appsMount,
		blConfig: blConfig,
		config: {pageTitle: "Blacklight Home", breadcrumb:[{name:"<i class='material-icons dp48'>home</i>", link: siteConfig.appsMount + "blacklight/edit/home"}]},
		scripts: {js: ["blacklight/edit/js/vendor/sortable.js", "blacklight/edit/js/vendor/typeahead-0.11.1.js", bundled], css:[]},
		authorization: req.authorization
	}

	if(!blConfig.slingIsFoss){
		data.scripts.js.push("/etc/clientlibs/granite/jquery/granite/csrf.js");
	}

	return data;
}


/********************************************************************************************/
module.exports.setFrameScripts = function(data){

	data.blConfig = data.blConfig || {};
	data.blConfig.noDialogHash=true;

	data.scripts.js.unshift("blacklight/edit/js/vendor/jquery.fancytree-all.min.js");
	data.scripts.js.unshift("blacklight/edit/js/vendor/jquery/jquery-ui-1.11.4/jquery-ui.min.js");
	data.scripts.js.unshift("blacklight/edit/js/vendor/lodash.js");

	data.scripts.css.unshift("blacklight/edit/css/vendor/ui.fancytree.min.css");	
}



/********************************************************************************************/
module.exports.processScripts = function(data, publicMount){
	if(!data || !data.scripts){return;}
	publicMount = publicMount || global.bl.publicMount;
	_.each(data.scripts.js, function(val, idx){
		if(!val.match(/^https?:|^\//)){
			data.scripts.js[idx]=publicMount + val;
		}
	});
}










