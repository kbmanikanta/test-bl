var _ =require("lodash");
var _path=require("path");
var _url=require("url");
var util=require("util");

module.exports.process=function(data, $, cb){
	var req=$.express.req;
	var res=$.express.res;
	var sc=$.sc;


	var mainPath = "/" + $.page.action;

	//handle virtual paths
	if(/\/-/.test(mainPath)){
		mainPath = mainPath.substring(0, mainPath.indexOf('/-'));
	}

	var tagsMode = /^\/etc\/tags/.test(mainPath);
	var mediaMode = /^\/content\/(dam|media)\//.test(mainPath);

	if(mediaMode){
		mainPath = mainPath + "." + $.mainExtension;
	}

	var slingPath
	if(tagsMode){
		slingPath=mainPath + ".0.json";
	}else{
		slingPath=mainPath + "/jcr:content.deref.infinity.json";
	}

	data.developerMode = /\/apps\/blacklight\/develop\/components/.test(mainPath);
	data.pageClass="edit";

	if(data.developerMode){
		data.pageClass += " developer"
	}

	//default meta dialog used
	data.metaType = 'blacklight/edit/page/resource-type';

	sc.getSling(slingPath, {leaveMangledNames: true},function(err, slingData){
		try{
			if(err){  $.handleError(err + "\n" + _url.resolve(sc.baseUri, slingPath), res, req); return;}
			var rtype=slingData["sling:resourceType"];
			var ptype=slingData["jcr:primaryType"]

			if( !rtype && /^(dam:AssetContent|bl:asset)$/.test(ptype) ){
				throw new Error("Support for media edit mode coming soon")
			}

			if(rtype==="blacklight/edit/page/new"){  // For Blacklight "new" page, redirect to preview mode.
				res.cookie("wcmmode", "preview");
				res.status("301").header("location", mainPath);
				res.end("Reloading: " + mainPath);
				cb(null, false);
				return;
			}

			if(!rtype){throw new Error("No sling:resourceType found for this page ");}
			var pageComponent=$.componentRegistry.get(rtype);  //componentRegistry.get(slingData["sling:resourceType"]);
			if(!pageComponent){throw new Error("No edit configuration files (container.js) found for this page type:  " + rtype);}
			if(!pageComponent.container && !pageComponent.dialog){throw new Error("No dialog or container method (module.exports.container) found for this page at: \n" + pageComponent.path + "/container.js");}

			$.page.trimmedPath = mainPath;

			var rTypeParts = rtype.split('/');
			//is there a meta dialog defined for:
			var discoveredMetaType =
				//this page?
				_.get(pageComponent, 'container.metaType') ||
				//this module?
				_.get(global.bl.modules.modelHelpers, _.join([rTypeParts[0], rTypeParts[1], 'pageMetaType'],'.')) ||
				//this site?
				_.get(global, 'bl.sites.' +rTypeParts[0] + '.helpers.pageMetaType');

			if(discoveredMetaType){
				data.metaType = _.isFunction(discoveredMetaType) ? discoveredMetaType($) : discoveredMetaType;
			}



			// console.log("\n--------------\nSLING DATA BEFORE:", JSON.stringify(slingData.page.layout.header.sub_nav,null,"  "));
			global.bl.mappingDeref(slingData, $, {markLocals:true,leaveMangledNames:true}, completePage)

			function completePage(){
				// console.log("--------------------------------\nSLING:", util.inspect(slingData, {depth:null}))

				// global.bl.fillInComponentTemplateData(slingData, {skipIfWriteLocal:slingPath});

				
				// console.log("\n--------------\nSLING DATA AFTER:", JSON.stringify(slingData.page.layout.header.sub_nav,null,"  "));
				// delete slingData.page.layout.header;
				///TODO:  this little breadcrumb rule needs to be moved out of here an into FS-specific configuration
				// console.log("KEYS:",_.keys(slingData.page.layout.header.sub_nav));
				var parts=mainPath.replace(/^\/+/,"").split("/");
				var stack=[], breadcrumb=[{name:'<i class="material-icons dp48">home</i>', link:global.bl.appsMount + "blacklight/edit/home"}];
				if(data.developerMode){
					parts = parts.slice(5);
				}
				_.each(parts, function(val, idx){
					stack.push(val);
					if((val==="content" && idx===0)){
						return true;
					}
					breadcrumb.push({name:val, link: ($.slingProxyType?"/":(global.bl.appsMount + "blacklight/edit/page/")) + stack.join("/") + ($.slingProxyType?".html":"") });
				});


				var pageConfig = _.clone(pageComponent.container) || {};
				pageConfig.breadcrumb = breadcrumb;

				if(tagsMode){
					pageConfig.basePath = mainPath.replace(/\/$/,"");
				}else{
					pageConfig.basePath = _path.join(mainPath, "jcr:content").replace(/\/$/,"");
				}

				pageConfig.pageTitle = slingData.title?slingData.title:(slingData["jcr:title"]?slingData["jcr:title"]:"");
				pageConfig.pageName = mainPath.split("/").pop();

				var bundled=global.bl.processScripts.rev("blacklight/edit/js/dist/edit-page-bundled.js");

				var scripts={
					js:[
						"blacklight/edit/js/vendor/sortable.js",
						"blacklight/edit/js/vendor/typeahead-0.11.1.js",
						"blacklight/edit/js/vendor/lodash.js",
						"blacklight/edit/js/vendor/tinymce/tinymce.min.js",
						"blacklight/edit/js/vendor/tinymce/jquery.tinymce.min.js",
						"blacklight/edit/js/vendor/simple-mde/simplemde.min.js",
						"blacklight/edit/js/vendor/jquery/jquery-ui-1.11.4/jquery-ui.min.js",
						"blacklight/edit/js/vendor/jquery.fancytree-all.min.js",
						"blacklight/edit/js/vendor/jquery.fullscreen.js",
						"blacklight/edit/js/vendor/lazyload.transpiled.js",
						"blacklight/edit/js/vendor/cropper.js",
						bundled,
						data.appsMount +"blacklight/edit/all-modules-client-js/main.js",					
						// "blacklight/edit/js/vendor/dexie.js"
					],

					css:[
						"blacklight/edit/js/vendor/cropper.css",
						"blacklight/edit/js/vendor/simple-mde/simplemde.min.css",
						"blacklight/edit/css/vendor/ui.fancytree.min.css"
					]
						
					
				}

				if(!sc.foss){
					scripts.js.push("/etc/clientlibs/granite/jquery/granite/csrf.js");
				}

				$.blConfig.page = {
					resourceType : rtype,
					title : pageConfig.pageTitle,
					path : mainPath
				}

				data = _.assign(data, 
					{config: pageConfig, blConfig: $.blConfig, scripts: scripts, data: slingData, slingProxyType: $.slingProxyType, publicMount: data.publicMount, baseUrl: mainPath, isFoss: !!sc.foss}
				);

				cb(null);
			}

		}catch(err){
			$.handleError(err,res,req);				
		}
	});


}









	