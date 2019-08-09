
// var Queue = require("file-queue").Queue;
var _=require("lodash");
var fs=require("fs");

var dropNamespaceRegex=/"(fsc|fsl|fsr):/g ;
var stashNamespaceRegex=/"(cq|rep):/g ;
var mixins=/"jcr:mixinTypes/g ;
var docx=/":docx/g ;
var jcrIndex=/\[(\d)\]\"\:/g;




// global.bl.publishQueue = new Queue("/tmp/bl-static-publish-queue", function(err, x){

// });






/************************************************************************************************/
module.exports=function(options){
	var publishTree={};
	var sc=options.slingConnectors.modes.author;  // if (when?) you re-instate publish-tree, this needs to change.



	///////////////////////////////////////////////////////////////////////////////////////////
	publishTree.replicatePaths = function(pathList, source, target, options){
		var paths = _.clone(pathList);
		function processPath(){
			if(paths.length){
				var path = paths.shift().replace(/\/$/,"") + "/jcr:content"
				var sourcePath = path + ".infinity.json";
				
				source.getSling(sourcePath, {dontParseBody:true, leaveMangledNames:true}, function(err, data){
					if(err){console.error("ERROR replicating:", sourcePath, err, data); processPath();return;}

					data = data.replace(dropNamespaceRegex,"\"");
					data = data.replace(stashNamespaceRegex,function(match,p1){return "\"_" + p1 + "_"});
					data = data.replace(mixins,"\"_jcr_mixinTypes");
					data = data.replace(docx,"\"_docx");
					data = data.replace(jcrIndex, "_$1\":");

					target.import(path,data,{}, function(err, result, resp, respBody){
						if(err){console.error("ERROR replicating to target:", err, result, data); processPath(); return;}
						options.page(null, path);
						processPath();
					})

				})

			}else{
				options.end(null, "All done")
			}
		}

		processPath();
	}




	///////////////////////////////////////////////////////////////////////////////////////////
	publishTree.queueUpPages=function(path, options){
		path = path.replace(/\/$/,"");
		var results=[];

		results.push(path);
		options.page(path);

		function recurseDownPath(pagePath, callback){
			var jsonPath = pagePath + ".1.json";
			sc.getSling(jsonPath, {timeout:30000 }, function(err, data){
				var childPaths=[]
				if(err){console.error("ERROR: queueing up: ", jsonPath, "\n\tERROR: ", err); callback("Error loading: " + jsonPath); return;}
				_.each(data, function(val, key){
					if(key[0]!=="_"){
						var childPath = pagePath + "/" + key;
						childPaths.push(childPath)
					}
				});
				function processChildPath(){
					if(childPaths.length){
						var childPath = childPaths.shift()
						// console.log(childPath);
						results.push(childPath);
						options.page(childPath);
						recurseDownPath(childPath, processChildPath);
					}else{
						callback();
					}
				}

				processChildPath();				


			});
		}

		recurseDownPath(path, function(){
			options.end(null, results);
			fs.writeFile("/tmp/all-things.json", JSON.stringify(results))
		});
	}


	return publishTree;
}





