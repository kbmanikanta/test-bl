
const flatten=global.bl.flattenObject;
const _=require("lodash");
const URL=require("url");

module.exports.process = function(data, $, cb){
	var {req, res}=$.express;
	var {path} = req.query;

	if(!path){
		cb("No 'path' parameter provided in query string.");
	}else{
		var sc = $.sc;
		var slingQuery=path + "/jcr:content.infinity.json";

		sc.getSling(slingQuery, {leaveMangledNames:true}, (err, content)=>{
			var refs={};
			var flat = flatten(content);
			_.each(flat, function(prop){
				if(/bl:ref/.test(prop.name) || /bl:autoStubbed/.test(prop.name)){
					refs[prop.value]={path:prop.value, shared:true};
				}
			})

			var paths=_.keys(refs);

			(function nextPath(){
				if(paths.length){
					var path=paths.shift();
					var cur = path + ".pages.json?start=0&limit=1&predicate=";
					sc.getSling(cur, {}, function(err, result){
						//console.log("Looked up ", cur, "and got", result);
						if(err){
							refs[path].indeterminate=true;
						}else{
							if(result && result.pages && result.pages[0]){
								if(!result.pages[0].replication || result.pages[0].replication.action !== "ACTIVATE"){
									refs[path].needsActivation=true;
								}else{
									delete refs[path];
								}
							}else{
								refs[path].indeterminate=true;
								refs[path].missing=true;
							}
						}
						nextPath();
					});
				}else{
					wrapItUp();
				}

			})();

			function wrapItUp(){
				data.shared_data=[];
				_.each(refs, (ref)=>{data.shared_data.push(ref);})
				cb();
			}

		})
	}
}

