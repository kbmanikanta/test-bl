
var mkdirp=require("mkdirp");
var _=require("lodash");
var _path=require("path");
var fs=require("fs");
var sequential=0;

function getJob(options, cb){
	if(typeof jobRoot === "function"){cb=jobRoot; jobRoot=""}

	var job={};
	var jobRoot = options.jobRoot || "/usr/local/var/blacklight/jobs";
	var tasks=[], monitors=[];
	var currentTask=null;
	var tasksFile, indexFile, sentErrorAlready=false;


	

	function init(){

		if(options.id){
			job.id = options.id;
			job.status="complete";
		}else{
			var d=new Date();
			sequential++;
			job.id = d.toISOString().slice(0,19).replace(/\-|\:/g,"").replace("T","-") + "-" + sequential.toString();
			job.status="processing";
			job.startTime = d;
		}


		if(options.tasks){
			tasksFile = getPath("tasks");
			indexFile = getPath("index");
			job.index=-1;
			job.length=options.tasks.length;
			if(options.id){throw new Error("Can't send both `tasks` and an `id` as options to getJob()");}
			if(!_.isArray(options.tasks)){console.error("options.tasks is not an array:",options.tasks); throw new Error("options.tasks (as sent to getJob()) is not an array");}
			tasks=options.tasks;

			mkdirp(getPath(""), function(err){
				if(err){cb(err);return;}
				fs.writeFile(indexFile, job.index, function(err){if(err){console.error("ERROR: writing to queue/job indexFile:", indexFile)}});
				fs.writeFile(tasksFile,  JSON.stringify(options.tasks,null, "  "), function(err){
					cb(err, job);
				});
			});
		}else{
			if(!options.id){throw new Error("If you don't provide `tasks` you must provide an `id` as an option to getJob()");}
			tasksFile=getPath("tasks");
			indexFile = getPath("index");

			var done=_.after(2, function(err){
				fs.readFile(tasksFile, function(err,data){
					if(err){cb(err);return;}
					try{
						tasks=JSON.parse(data);
					}catch(err){
						cb(new Error("Problem parsing JSON in job file: ", tasksFile)); return;
					}

					job.index=tasks.length;
					job.length=tasks.length;
					cb(null, job);

				});
			
			});

			// stat tasksFile to get startTime, and indexFile to get endTime

			fs.stat(tasksFile,function(err,stats){
				if(err){if(!sentErrorAlready){sentErrorAlready=true; cb(err)};return;}
				job.startTime = stats.mtime;  done();			
			});

			fs.stat(indexFile,function(err,stats){
				if(err){if(!sentErrorAlready){sentErrorAlready=true; cb(err)};return;}
				job.endTime = stats.mtime;  done();			
			});

		}
	
	}



	//////////////////////////////////////////////////////////////////////
	function nextTask(){
		if(job.index  < tasks.length){
			job.index++;
			currentTask=tasks[job.index];
		}else{
			currentTask=null;
		}
		return currentTask;
	}


	//////////////////////////////////////////////////////////////////////
	function markCurrentTaskDone(cb){

		fs.writeFile(indexFile, job.index, function(err){
			if(err){console.error("ERROR: writing to queue/job indexFile:", indexFile);}  
			if(cb){cb(err);}
		});
	}


	//////////////////////////////////////////////////////////////////////
	job.iterate=function(on){
		// events.process,  events.error,  events.complete
		if(!on.process){throw new Error("Must specify 'process' option when calling job.iterate");}
		if(!on.complete){throw new Error("Must specify 'complete' option when calling job.iterate");}

		function processNext(){
			nextTask();

			if(currentTask){
				on.process(currentTask, function(err, result){
					if(err){
						job.status="failed";
						on.complete(err, currentTask, tasks);
						monitors.forEach(function(monitor){monitor.onComplete(err, tasks);});
					}else{
						markCurrentTaskDone();
						monitors.forEach(function(monitor){monitor.onProcess(job.index, currentTask, result);});
						processNext();
					}
				});		
			}else{
				job.status="complete";
				on.complete(null, tasks);
				job.endTime = new Date();
				monitors.forEach(function(monitor){monitor.onComplete(null, currentTask, tasks);});
			}
		}
	
		processNext();
	}	


	//////////////////////////////////////////////////////////////////////
	job.addMonitor=function(events){
		if(typeof events.onProcess !== "function"){throw new Error("addMonitor() onProcess must be a function");}
		if(typeof events.onComplete !== "function"){throw new Error("addMonitor() onComplete must be a function");}
		

		/// TODO: Add "result" to in-memory (and on-disk?) data 

		var cur=0;
		for(cur=0; cur<job.index; cur++){
			events.onProcess(cur, tasks[cur]);
		}
		if(job.status==="complete"){
			events.onComplete(null,tasks);
		}else{
			monitors.push({onProcess: events.onProcess, onComplete: events.onComplete});			
		}
	}


	//////////////////////////////////////////////////////////////////////
	function getPath(file){
		return _path.join(jobRoot, job.status,  job.id, file || "");
	}	

	init();

	return null;
}


module.exports=getJob;


/*********************************************************/
if (require.main === module) {

	getJob({tasks:["item-one","item-two","item-three","item-four"]},function(err,job){
		if(err){console.error(err); return;}
		job.iterate({
			process:function(item, cb){
				setTimeout(function(){
					console.log("Processed:", item);
					cb();
				}, 1000)
			},
			complete:function(err, items){
				if(err){console.error("There was some problem iterating on queue:", err); return;}
				console.log("ALL DONE WITH ALL ITEMS!")
			}
		})
	});

}


