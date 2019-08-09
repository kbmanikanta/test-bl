
var _=require("lodash");
var sanitize = global.bl.sanitize;
module.exports.process=function(data, $, cb){
	var parts=$.page.action.split("/");
	var queueName = parts[0], jobId=parts[1], action=parts[2];
	var req=$.express.req, res=$.express.res, appsMount = req.bl.config.appsMount;
	var apiRoot = appsMount + "blacklight/edit/queues";
	var path=apiRoot + req.path;

	if($.page.extension!=="json"){
		data.scripts.js.pop(); // remove edit-page-bundled.js
		global.bl.processScripts.addScript($, "blacklight/edit/css/blacklight.css")
		data.scripts.js.push(req.bl.config.publicMount + "blacklight/edit/js/queue-client.js");
	}


	data.blConfig.queueName = queueName;

	var queue = global.bl.queues.get(queueName);
	if(!queue){cb(`Could not find queue named '${queueName}'`);return;}
	if(action==="status"){
		data.queue = {description:queue.description, title: global.bl.prettyName(queueName.split(".").pop())};
		queue.loadJob(jobId, (err, job)=>{
			data.job = job;
			var tasks = job.getTasks();
			if(tasks){
				data.taskPrototype = tasks.taskPrototype;
				data.tasks=tasks.tasks;
			}


			// data.eventsLink = path.replace(/\/status(\.json)?$/,"/events$1")
			// data.status={};
			// _.each(queue.status,(s, state)=>{
			// 	data.status[state]=_.map(s.jobs,(id)=>({id,link:`${apiRoot}/j/${queueName}/${id}/status${$.page.extension?"."+$.page.extension:""}`}));

			// })
			cb();
		});
	}else if(action==="events"){
		queue.loadJob(jobId, function(err,job){
			var hasEnded=false;
			var skipToIndex = req.headers["last-event-id"] || 0;
			// console.log("\n\n------------\nstarting!",skipToIndex, jobId);

			if(err){
				console.error("Error loading job: ", jobId, err);
				res.status(500).json(err); return;
			}


			if(req.headers.accept && req.headers.accept === 'text/event-stream'){


				if(parseInt(skipToIndex) === job.length){
					res.status(404).end("Finished"); return;
				}

				res.writeHead(200, {
					"Content-Type": "text/event-stream",
					"Connection": "keep-alive",
					"Cache-Control": "no-cache, no-transform",   // no-transform turns off gzip compression: necessary
					"Transfer-Encoding": "chunked"
				});


				var eventHandlers={
					onProcess:function(index, task, result){
						if(hasEnded){return;}
						if(!skipToIndex || (skipToIndex<=index)){
							// console.log("TRANSFER WRITING:", index, res.blMarker, task);
							res.write("id: " + (index+1) + "\n");
							res.write("data: " + JSON.stringify({task: task, result: result}) + "\n\n");
						}
					},
					onComplete:function(err, results){
						if(hasEnded){ return;}
						res.write("event: complete\n\n")
						res.end();
					}
				};

				res.on("finish",()=>{
					// console.log("\n\n------------\nfinished!", skipToIndex);
					res.end();
					hasEnded=true;
					eventHandlers.onProcess=null;
					eventHandlers.onComplete=null;
				})

				res.on("error",(err)=>{
					console.log("Error writing response for job:", sanitize.log(jobId), sanitize.log(err.message));
					res.end();
					eventHandlers.onProcess=null;
					eventHandlers.onComplete=null;
					hasEnded=true;
				})

				job.addMonitor(eventHandlers, skipToIndex?skipToIndex-1:null);

			}else{
				res.json(job);
			}
		});
	}

}
