const _ = require('lodash');
const fs = require('fs');
var _path=require("path");

module.exports.process=function(data, $, cb){
	var sc=$.sc;
	var res=$.express.res;

	var mainPath = "/" + $.page.action;

	//handle virtual paths
	if(/\/-/.test(mainPath)){
		mainPath = mainPath.substring(0, mainPath.indexOf('/-'));
	}


	let tagsMode = /^\/etc\/tags/.test(mainPath);
	let mediaMode = /^\/content\/(dam|media)\//.test(mainPath);
	let routesMode = /^\/alt\/apps\//.test(mainPath);


	let sendError = (errorMessage)=>{
		res.end(errorMessage)
		cb(null,false); 
	}

	let sendSuccess = (html) => {
		res.setHeader('Content-Type', "text/html; charset=utf-8");
		res.end(html);
		cb(null,false);
	};

	let loadDocumentationPath = (documentationPath, pageMode, success, fail) => {
		fs.access(documentationPath, (accessError)=>{
			if(accessError){
				fail({exists: false}); 
			}else{
				//read in the file
				fs.readFile(documentationPath, 'utf-8', (err, mdFile)=>{
					if(err){
						fail({exists: true});
					}else{
						var html=$.templates["doc-page"]({body : global.bl.marked(mdFile), blConfig:$.blConfig, includePreviewControls: pageMode, path : mainPath});
						success(html);
					}

				});
			}
		});
	};

	if(sc.mode === 'author'){
		if(tagsMode || mediaMode){
			sendError("Documentation not supported here."); 
		}else{

			if(routesMode){
				const appsRoot =_path.join(global.bl.appRoot, "apps");
				let documentationPath = appsRoot + mainPath.replace('/alt/apps/', '/').replace('/tools/', '/routes/tools/') + '/' + _.last(mainPath.split('/')) + '.md'; 
				
				loadDocumentationPath(documentationPath, false, sendSuccess, (fail)=>{
					if(fail.exists){
						sendError(`Route '${mainPath}' : Error reading documentation file.`);
					}else{
						sendError(`Route '${mainPath}' has no documentation.`);
					}
				} ); 
			}else{
				let pageMode = mainPath.indexOf('jcr:content') < 0; 
				let slingPath = (pageMode ? mainPath + "/jcr:content" : mainPath) + ".1.json";


				sc.getSling(slingPath, {leaveMangledNames: true},function(err, slingData){
					if(err){  
						sendError("No page found. Documentation not supported here.")
					}else{
						let rtype=slingData["sling:resourceType"];

						if(!rtype){
							sendError("No resource type found. Documentation not supported here.");
						}else{
							let comp =$.componentRegistry.get(rtype);  

							if(!comp){
								sendError(`Invalid resource type found: ${rtype} Documentation not supported here.`);
							}else{
								//does this type have an md file
								let documentationPath = comp.path + '/' + _.last(comp.path.split('/')) + '.md';
								loadDocumentationPath(documentationPath, pageMode, sendSuccess, (fail)=>{
									if(fail.exists){
										sendError(`Component '${comp.title ? comp.title :''} (${rtype})' : Error reading documentation file.`);
									}else{
										sendError(`Component '${comp.title ? comp.title : ''} (${rtype})' has no documentation.`);
									}
								} ); 
							}
						}
					}
				}); 
			}
		}
	}else{
		res.status(404).send('Unavailable');
		cb(null,false);
	}
}