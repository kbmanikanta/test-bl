
module.exports=function(data, $, cb){
	var req=$.express.req;
	var parts=req.path.split("/");
	var action = parts[2];
	var method = require("./" + action + "/" + action + ".js")

	req.params.mainPath = parts.slice(3).join("/");

	console.log("QUEUES PATH:", req.params.mainPath);

	method(data,$,cb);
}



