
var _ = require("lodash");

module.exports.process=function(data, $, cb){
	var req=$.express.req;
	var res=$.express.res;
	var sc=$.sc;
	var permissionUrlFunction=_.get(req, "authorization.permissionUrl");

	if(permissionUrlFunction){
		var redirectTo = permissionUrlFunction(req.query.slingPath);
		res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
		res.header('Pragma', 'no-cache');
		res.header('Expires', '0');
		res.status("301");
		res.header("location", redirectTo);
		
		res.end("Redirect to: " + redirectTo );
		cb(null, false);
	}else{
		cb();
	}
};
