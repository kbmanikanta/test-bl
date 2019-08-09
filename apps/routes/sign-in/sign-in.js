var prettyPrint = global.bl.prettyName;

module.exports.process=function(data, $, cb){
	if(!data.authorization){
		data.authorization={status: "internal error: req.authorization object not present as expected"}
	}else{
		if(data.authorization.status==="not-signed-in"){
			data.authorization.status="";
		}else{
			data.authorization.status = prettyPrint(data.authorization.status) + "."
		}
	}
	cb();
}