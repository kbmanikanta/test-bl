
var _ = require('lodash');
var childComponentOptions=require(global.bl.appRoot + "apps/blacklight/edit/lib/child-component-options");


exports.process = function (model, $) {

	var slingProxyType = $.express.req.headers["x-proxy-type"];
	var slingProxyPrefix = slingProxyType?"":(global.bl.appsMount + "blacklight/edit/proxy/");
	var req=$.express.req;

	model.slingProxyType = slingProxyType;
	model.publicMount = global.bl.publicMount;
	model.blConfig = {
		publicMount : global.bl.publicMount,
		appsMount: global.bl.appsMount,
		slingProxyPrefix:slingProxyPrefix,
		page:{path:$.page.trimmedPath}
	}

	model.scripts = {
		js: [
			model.blConfig.publicMount + "blacklight/edit/js/vendor/lodash.js",
			model.blConfig.publicMount + "blacklight/edit/js/vendor/sortable.js",
			model.blConfig.publicMount + "blacklight/edit/js/dist/edit-page-bundled.js",
			model.blConfig.publicMount + "blacklight/edit/js/utils.js",
			model.blConfig.publicMount + 'blacklight/edit/js/new-page.js'
		]
	}

	if(!req.bl.sling.foss){
		model.scripts.js.push("/etc/clientlibs/granite/jquery/granite/csrf.js");
	}

	var pathParts = $.page.trimmedPath.split('/');
	model.saveTarget = $.page.trimmedPath + '/jcr:content.json';
	model.newPageName = pathParts.pop();
	model.parentPath = pathParts.join('/');

	model.step1 = true;

	childComponentOptions(model.parentPath, req.bl.sling, 
		{pageMode:true, site:req.bl.site},
		(err, results)=>{
			results = lookForPageName(results, model.newPageName);
			_.assign(model, results);
			$.resolve();
		})

}


function lookForPageName(results, pageName){
	// If *any* entries match the current page name, then remove *all* other entries that don't match the current page name

	var truncatedOptions={}
	var suggested_or_allowed=["suggested","allowed"];
	_.each(suggested_or_allowed,(mode)=>{
		var categories=results[mode];		
		_.each(categories, (category)=>{
			_.each(category.options,(option)=>{
				var catName = category.category;
				if(option.name === pageName){
					truncatedOptions[catName]=truncatedOptions[catName] || [];
					delete option.unavailable;
					truncatedOptions[catName].push(option);
				}
			});		
		})
	})

	var keys=Object.keys(truncatedOptions);
	if(keys.length){
		///  REBUILD THE SUGGESTED LIST TO INCLUDE ONLY THOSE THAT MATCH THE NAME YOU'RE working with.
		var newResults={suggested:[], hideSearch:true};
		_.each(truncatedOptions, (options, category)=>{
			newResults.suggested.push({category:category, options:options})
		});
		return newResults;
	}else{
		return results;
	}
}



module.exports.async=true;