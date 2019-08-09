var _path=require("path");
var config=global.bl.config;
var _=require("lodash");
var fs=require("fs");
var templateWizFactory=global.bl.templateWiz;


var ALL_DOCS_INDEX=1, SITE_INDEX=2, MODULE_INDEX=3;
var ALL_DOCS_SELECTOR_SEGMENT=0, SITE_SEGMENT=1, MODULE_SEGMENT=2;

module.exports.process=function(data, $, cb){

	///////////////////////////////////////////////////////////////////////
	var preprocessMarkdown = templateWizFactory({filters:{
		include:function(value){
			var moduleRoot=_path.join(global.bl.appRoot, "blacklight_modules", site, module), result;
			var path;
			if(value.toLowerCase()==="readme.md"){
				path=_path.join(moduleRoot,"README.md");
			}else{
				if(value[0]==="."){if(value[1]==="."){return "Bad include path:"+value;} path=_path.join(docRoot,value)}
				else{path=_path.join(moduleRoot,"docs",value);}
			}
			
			try{
				result = fs.readFileSync(path);
			}catch(err){
				return "ERROR: Couldn't read file: " + path;
			}
			return preprocessMarkdown(result.toString());
		}
	}})


	var req=$.express.req;
	var res=$.express.res;
	var sc=$.sc;
	var appsMount = global.bl.config[req.bl.site].appsMount;
	var match=req.path.match(/\/docs\/pages(.*)?/);

	if(match){
		var path=match[1];
		var parts=path.split("/"), index=0, site="", module="", tail="", last="", docsFolder="docs";
		var extension, selectors=[], remainder=[], docRoot, urlBase, pages=[], pathType=parts.length;

		while(parts.length){
			last=parts.shift();
			if(!parts.length){
				selectors=last.split(".");
				if(index!==ALL_DOCS_SELECTOR_SEGMENT){last=selectors.shift();}
			}
			switch(index){
				case ALL_DOCS_SELECTOR_SEGMENT: break;

				case SITE_SEGMENT:
					site=last;
				break;

				case MODULE_SEGMENT:
					module=last;
				break;

				default:
					remainder.push(last)

			}
			index++;
		}

		extension = selectors.pop();

		if(pathType<3){docsFolder="";}


		docRoot = _path.join(global.bl.appRoot, "docs", site, module, remainder.join("/"));
		urlBase = _path.join(global.bl.config[req.bl.site].appsMount, "blacklight/edit/docs/pages", site, module, remainder.join("/"));

		// res.json({pathType:pathType, parts: path.split("/"), urlBase: urlBase,site: site, remainder: remainder, module: module, docRoot: docRoot, selectors: selectors, extension: extension});

		cb(null,false);



		/////////////////////////////////////////////////////////////////////
		var renderMarkdown = function (markdown){
			markdown = preprocessMarkdown(markdown.toString());
			var html=$.templates["doc-page"]({body: global.bl.marked(markdown || ""), blConfig:$.blConfig});
			res.end(html);
		};


		/////////////////////////////////////////////////////////////////////
		var renderHtml = function (body, otherData){

			var data = _.assign({body: body, blConfig:$.blConfig}, otherData);
			return $.templates["doc-page"](data);
		};


		
		/////////////////////////////////////////////////////////////////////
		if(!extension || extension==="html"){
			res.setHeader('Content-Type', "text/html; charset=utf-8");
			switch(pathType){

				/////////////////////////////////////////////////////////////////////
				case ALL_DOCS_INDEX:
				
					_.each(req.bl.config.site.modules,function(site,key){
						pages.push({path:_path.join(urlBase, key), title:site.title, childPagesCount: 1})
					})
					res.send("All docs index");
				break;

				/////////////////////////////////////////////////////////////////////
				case SITE_INDEX:
					var base=req.bl.site + ".site";
					var target=_path.join(urlBase, base + "/tutorials");
					res.send(renderHtml("", {redirect: target} ));
				break;


				/////////////////////////////////////////////////////////////////////
				case MODULE_INDEX:
					var tutIndex=_path.join(docRoot,"tutorials.md");
					fs.readFile(tutIndex, function(err, markdown){
						if(!err){
							renderMarkdown(markdown);
						}else{
							var readme=_path.join(docRoot,"../README.md");
							fs.readFile(readme, function(err, markdown){
								if(err){res.status(404).end(renderHtml("Could not find file:<br><br><tt>" + readme + "</tt><br>or:<br><tt>" + tutIndex + "</tt><br><br>You may wish to create a file here.")); return;}
								renderMarkdown(markdown);
							});
						}
					});
				break;


				default:
					fs.readFile(docRoot + ".md", function(err, markdown){
						if(err){res.status(404).end(renderHtml("Could not find file:<br><br><tt>" + docRoot + ".md" + "</tt><br><br>You may wish to create a file here.")); return;}						
						renderMarkdown(markdown);
					})
			}
		}else{
			if(extension!=="json" || selectors.indexOf("list")<0){res.status(500).end("Can't handle extension and/or selectors: " + selectors.join(".") + "." + extension );return;}

			/********************************************************************************************/			
			switch(pathType){

				/////////////////////////////////////////////////////////////////////
				case ALL_DOCS_INDEX:
					// TODO: core's module-loader should list all actual, existing on-disk, modules somewhere.
					_.each(global.bl.sites,function(siteObject, site){
						pages.push({path:_path.join(urlBase, site), title:global.bl.config[site].title, childPagesCount: 1, hasChildren:true})
					})
					res.json({pageCount: pages.length, pages:pages});
				break;

				/////////////////////////////////////////////////////////////////////
				case SITE_INDEX:
					fs.readdir(docRoot,function(err,files){
						if(err){var msg="Error reading: " + docRoot; console.error(msg); res.json({pages:[{title:msg}]}); return;}
						files.sort();
						var pages=[];								
						function checkForDocs(){
							if(files.length){
								var file=files.shift();
								var curRoot=_path.join(docRoot, file);
								fs.readdir(_path.join(curRoot),function(err,files){
									var childPagesCount=files ? files.length : 0;
									pages.push({path:_path.join(urlBase, file), siteLevel:true, title: global.bl.prettyName(file.replace(/^\d+-/,"")), childPagesCount:childPagesCount, hasChildren:(childPagesCount>0)});
									checkForDocs();
								});
							}else{
								res.json({pageCount:pages.length, pages:pages})
							}
						}
						checkForDocs();
					})
				break;


				/////////////////////////////////////////////////////////////////////
				default:
					fs.readdir(docRoot, function(err, files){
						if(err){var msg="Error reading: " + docRoot; console.error(msg); res.json({pages:[{title:msg}]}); return;}
						var pages=[];
						for(var i=0;i<files.length;i++){
							var file=files[i];
							var match=file.match(/^(.*)\.md$/);
							if(match){
								var name=match[1], hasChildren=files.indexOf(name)>-1;
								pages.push({path: _path.join(urlBase, name), title: global.bl.prettyName(name.replace(/^\d+-/,"")),hasChildren:hasChildren, childPagesCount: hasChildren?1:0})
							}
						}
						res.json({pageCount:pages.length, pages:pages})
					});
						

			}
		}

	}else{

		// This is where the main framed HTML page is loaded.

		data.blConfig.modes={
			view:{icon:"visibility"},
			edit:{icon:"mode_edit", prefix: global.bl.appsMount + "blacklight/edit/page/"}
		}


		data.blConfig.treeBasePath= appsMount + "blacklight/edit/docs/pages/";
		data.blConfig.treeIgnoreProxy=true;
		data.blConfig.treeIgnoreProxy=true;
		data.blConfig.hasPageListingCapability = true;

		data.config.defaultFrameURL = data.blConfig.appsMount + "blacklight/edit/docs/pages/blacklight/edit/tutorials";
		data.config.breadcrumb.push({name:"Docs", link:data.blConfig.appsMount + "blacklight/edit/docs"})

		global.bl.modules.modelHelpers.blacklight.edit.setFrameScripts(data);
		cb();
	}


}

