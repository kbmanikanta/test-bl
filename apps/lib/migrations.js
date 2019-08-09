

var log=global.bl.logger.get("bl-edit.query-mapping");
var queue;


/***********************************************************************************************/
module.exports.performMigration = function performMigration(params, cb){
	console.log("OK DOING MIGRATION TASK:", params);
	cb(null);
}


/***********************************************************************************************/
module.exports.analyzeResourceType = function(resourceType, cb){
	let tasks={prototype:{}, title: resourceType, tasks:[]};
	tasks.tasks.push({resourceType, title: "Queuing up: " + resourceType});
	getQueue();

	queue.makeJob(tasks,(err,job)=>{
		if(err){let msg="Couldn't add job to 'migrations' queue"; log.error(msg, err); cb(msg);}
		else{
			console.log("Success adding job to 'migrations' queue:", job.id);
			cb(null, job);
		}
	});
}



/***********************************************************************************************/
function getQueue(){
	if(!queue){
		queue = global.bl.queues.get("blacklight.edit.migrations");
	}
	return queue;
}