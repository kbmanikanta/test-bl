
var config=global.bl.config;
var _=require("lodash");
// var queue=require("../queue.js")({queueType:"transfer", queueRoot: config.queueRoot})
var SC = require("sling-connector");

var dropNamespaceRegex=/"(fsc|fsl|fsr):/g ;
var stashNamespaceRegex=/"(cq|rep):/g ;
var mixins=/"jcr:mixinTypes/g ;
var docx=/":docx/g ;
var jcrIndex=/\[(\d)\]\"\:/g;
var slingConnectors={};
var sanitize = global.bl.sanitize;


module.exports.process=function(data, $, cb){
	var req=$.express.req;
	var parts=req.query.slingPath ? req.query.slingPath.split("/") : $.page.action.split("/");
	var action=parts[0] || "confirm";
	var sourceSC=req.bl.sling;
	var queue = global.bl.queues.get("blacklight.edit.transfer");

	switch(action){
		case "confirm":
			var query = req.query;
			var sourceUri = sourceSC.baseUri;
			data.slingPath=query.slingPath;
			data.blConfig.slingPath = query.slingPath;
			data.mode = query.mode || "confirm";
			data.targets=[];
			data.queueType = "Transfer";

			_.each(config.environment.slings, function(val, idx){
				if(val.baseUri !== sourceUri){
					data.targets.push({title: val.title || idx, name:idx});
				}
			})
			cb();
		break;

		case "jobs":
			jobs(data, $, cb, parts);
		break;

		default:
			cb(new Error("Unrecognized option: " + action));
		break;

	}


	/////////////////////////////////////////////////////////////////////
	function jobs(data, $, cb, parts){
		var req = $.express.req;
		var res = $.express.res;
		var startTime = Date.now();
		var target, pages;

		if(req.method === "POST"){
			target=$.express.req.body.target;
			pages=$.express.req.body.pages;


			var tasks={
				prototype:{
					target:target,
					sourceSite: req.bl.site,
					sourceMode: req.bl.sling.mode
				},
				tasks:_.map(pages,(page)=>({url:page}))
			}


			queue.makeJob(tasks, (err, job)=>{
				if(err){res.status(500).json({error:"Couldn't create job.", details:err});}
				else{
					console.log("bl.edit.tranfer.js:  CREATED JOB:",job.id);
					res.json({success:"Created job", id:job.id})
				}
			})

		}else{
			var jobId = parts[1];

			queue.loadJob(jobId, function(err,job){
				var hasEnded=false;
				var skipToIndex = req.headers["last-event-id"] || 0;
				console.log("\n\n------------\nstarting!",skipToIndex, jobId);

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
								res.write("data: " + sanitize.escapeXSSAttack(JSON.stringify({task: task, result: result})) + "\n\n");
							}
						},
						onComplete:function(err, results){
							if(hasEnded){ return;}
							res.write("event: complete\n\n")
							res.end();
						}
					};

					res.on("finish",()=>{
						console.log("\n\n------------\nfinished!", startTime, skipToIndex);
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

					job.addMonitor(eventHandlers, skipToIndex);

				}else{
					res.json(job);
				}
			});
		}

		cb(null, false);
	}

}







/*

	Confirm mode should immediately queue up all pages, and show them.
	Don't offer the "approve" button until that is fully loaded.
	Ideally, show the "todo list" in a div, and in such a way that each entry can be dynamically marked as "done" once done.

	How to deal with state when node instances are separated by process and/or by machine??
		a simple mechanism to route a request over to the correct node instance?
		https://github.com/indutny/sticky-session

		Or, forget about process-specific routing, and just get it to the right EC2 instance.
		Then use maildir / lockfile to coordinate who is going to be owning it.

		manage all state in the browser ... bad because, no API then.
		turn on session affinity for certain requests




	API:

		/edit/transfer/job [POST]
			return: 201
			send: full-on list of all pages (retrieve with sling / list-pages)
			response: job-id; plus the "activate stickiness" cookie

		internally:
			get unique ID for the job  =  datestamp + sequential int
			create maildir queue -- or simply a flat text file? -- using jobid as the name
			add a lockfile for "I'm processing it"
				every 60 secs, each process can try to grab an existing lockfile.
				if locked, just move on. if not, start processing.


			on disk:
				/var/local/blacklight/queues/transfer/20160412-071020-5/
					all
					processed
					status / done



		/edit/transfer/job/20160412-071020-5
			return:
				status code: 200 (if done already)  202 (if in process)
				.txt list of all pages finished so far - then stream those that are incoming.

				how to indicate "all done?"
					status code if done at request time.
					"STATUS:DONE" line if streaming?  Or can you just close the connection and call it done?

				http://tagsoup.github.io/blog/2012/02/22/polling-is-for-chumps/






*/
