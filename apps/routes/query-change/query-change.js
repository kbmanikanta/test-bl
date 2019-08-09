var _=require("lodash");

var removeBlQuery = /(.*\/bl:q)(\/.*)/;
var log=global.bl.logger.get("bl-edit.query-change");
var _path=require("path");

/**
	This route provides an end point for the sling "bl:q" observer, watching for changes and additions of bl:query annotations
	Adds a single query-mapping task to remap the children of the "bl:q" target which has changed
	The posted observer message contains "updates"  and  "deletes" for given property paths
**/

exports.process=function(model, $, cb){
	var req=$.express.req, res=$.express.res;
	var SC=req.bl.sling;
	var message=$.express.req.body;
	var relevantPaths=[];
	var queue = global.bl.queues.get("blacklight.edit.mapped-stubs");
	log.info("query-change message", message);

	_.each(message.updates, (update)=>{
		let match=update.path.match(removeBlQuery);
		if(match){
			let path=match[1];
			if(!relevantPaths.includes(path)){relevantPaths.push(path);}
		}
	});


	if(relevantPaths.length){
		log.info("-----------\nQuery change observed:", relevantPaths);
		let tasks={prototype:{}, tasks:[]};
		
		_.each(relevantPaths, (match)=>{
			tasks.tasks.push({
				path: _path.join(match, "bl:query")
			})
		});

		queue.makeJob(tasks,(err,job)=>{
			if(err){log.error("Couldn't add job to 'mapped-stubs' queue", err);}
			else{
				log.info("Success adding job to 'mapped-stubs' queue:", job.id);
			}
		});

	}


	res.json({result: "ok"});
	cb(null, false);

}