

var _=require("lodash");
var _path=require("path");
var fs=require("fs");
var getJob=require("./job.js");


//Queue
	// addJob
	// getJob
	// loadAllJobs
	// monitor -  looks at all jobs, accepts callbacks: processed, done 


/// Jobs
	// create
	// monitor - looks at just one job;




function makeQueue(options){
	if(!options.queueType){throw new Error("Must specify 'queueType' in options to queue.js");}

	var queue={}, jobs={};
	var queueRoot = options.queueRoot || "/usr/local/var/blacklight/queues";

	var jobRoot=_path.join(queueRoot, options.queueType);

	//////////////////////////////////////////////////////////////////////
	queue.addJob=function(tasks, cb){
		getJob({tasks: tasks, jobRoot: jobRoot}, function(err, job){
			if(!err){jobs[job.id]=job;}
			cb(err,job);
		});
	}	

	//////////////////////////////////////////////////////////////////////
	queue.getJob=function(id, cb){
		if(jobs[id]){
			cb(null, jobs[id]);
		}else{
			getJob({id: id, jobRoot: jobRoot}, function(err, job){
				if(err){cb(err);return;}
				jobs[id]=job;
				cb(null,job);
			});
		}
	}	


	//////////////////////////////////////////////////////////////////////
	queue.loadExistingJobs=function(id, cb){
		/// list all jobs in processing
		getJob({id: id, jobRoot: jobRoot}, function(err, job){
			
		});
	}	

	return queue;

}


module.exports=makeQueue;

/*********************************************************/
if (require.main === module) {

	var q = makeQueue({queueType:"transfers"});
	q.addJob(["something/wicked/this/way/comes","bingo/baby/yeah/yeah", "some/other/path"], function(err){
		if(err){console.error(err); return;}
		console.log(q.getPath())
		q.iterate({
			process:function(item, cb){
				setTimeout(function(){
					console.log("Processed:", item);
					cb();
				}, 5000)
			},
			complete:function(err, items){
				if(err){console.error("There was some problem iterating on queue:", err); return;}
				console.log("ALL DONE WITH ALL ITEMS!")
			}
		})
	});

}



