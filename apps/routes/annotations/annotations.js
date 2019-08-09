var _=require("lodash");


module.exports.process=function(data,$,cb){
	"use strict";
	var req = $.express.req;
	var res = $.express.res;

	if(req.method === "GET"){
		var pagePath = req.query.path;

		var jsonData = req.originalUrl.indexOf('/annotations.js') > -1; 

		if(pagePath){
			var slingPath = pagePath.indexOf('jcr:content') > -1 ? pagePath : pagePath + '/jcr:content';
			$.sc.getSling(slingPath + '.infinity.json',{leaveMangledNames: true},function(err, slingData){
				if(!err && slingData){
					var aggregate = [];
					module.exports.findBlAnnotations(slingData, slingPath, aggregate);

					if(jsonData){
						res.json(aggregate);
						cb(null, false);
					}else{
						data.annotations = aggregate;
						cb();
					}
					
				}else{
					res.status(500).send('Error getting pagePath data: ' + err);
					cb(null, false);
				}
			});
		}else{
			res.status(500).send("pagePath is required for GET annotations");
			cb(null, false);
		}
	}
};

//////////////////
module.exports.findBlAnnotations = function(obj, pathPrefix, aggregate){
	_.each(obj, function(entry, key){
		if(key === 'bl:annotations'){
			delete entry['jcr:primaryType'];
			delete entry['jcr:mixinTypes'];

			if(_.size(_.keys(entry))){
				aggregate.push({
					componentPath: pathPrefix,
					annotations: entry
				});
			}
		}else if(_.isPlainObject(entry)){
			module.exports.findBlAnnotations(entry, pathPrefix + '/' + key, aggregate);
		}
	});
}