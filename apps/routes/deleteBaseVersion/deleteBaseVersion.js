var _=require("lodash");

module.exports.process = function (data, $, cb) {
	var done = false;
	$.setTimeoutPulse(() => done);
	var sqlQuery = "/content.custom-query.json?statement=SELECT * FROM [nt:base] WHERE [jcr:baseVersion] is not null AND (";	
	var req = $.express.req;
	var res = $.express.res;
	var paths = req.query.paths ? req.query.paths : 
	['/content/fshr/pages/de/properties/houston'];
	//['/content/fshr/collections','/content/fshr/pages'];
	paths = _.isString(paths) ? [paths] : paths;
	console.log(paths);
	for(var i = 0; i < paths.length; i++) {
		sqlQuery += "ISDESCENDANTNODE('" + paths[i] + "')";
		if(i != paths.length-1) {
			sqlQuery += " OR ";
		}
	}
	data.errors = [];
	data.modified = [];

	sqlQuery += ")&queryType=JCR-SQL2";
	console.log(sqlQuery);
	//req.bl.sling.timeout = 40000;
	req.bl.sling.getSling(sqlQuery,{leaveMangledNames:true}, (err, matches)=>{
		if(err){
			data.errors.push("Couldn't query Sling service",err);
		}
		else{
			_.each(matches, (result)=>{
				var path = result['jcr:path'];
				console.log(path) 
				req.bl.sling.post(path, 
				{
					"jcr:baseVersion": ""
				}, (err) => {
					if (err) {
						data.errors.push("error fixing bl ref at " + path + ". Please re-run")
					} else {
						data.modified.push(path);
					}		
					done = true;			
					cb();
				});
			});			
		}
			
	});
	
  };