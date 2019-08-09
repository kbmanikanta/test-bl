/* globals window, $, BL */


$(function(){
	var $body=$("body");

	if($body.hasClass("single-queue")){
		var $allItems = $(".job.collection-item");
		$allItems.click(function(){
			var $cur=$(this);
			if($cur.hasClass("active")){
				window.location.href=$cur.data("link");
			}else{
				$allItems.removeClass("active");
				$cur.addClass("active");
				var jobId = $cur.data("id");
				$(".current-job").html(`<b>Current job</b>: &nbsp; ${jobId}`)
			}
		});


	}else if($body.hasClass("single-job")){
		var $loadingIndicator = $("#queue-loading");
		var $loadingInner = $loadingIndicator.find("div");
		var $topUl = $("#queue-items");
		var jobId=$topUl.data("job-id");
		var taskCount = parseInt($topUl.data("task-count"));
		var $comingSoon=$("#coming-soon");
		var start=new Date();

		$loadingInner.removeClass("indeterminate").addClass("determinate").css("width","1px");

		var evsource = new window.EventSource(BL.config.appsMount + "blacklight/edit/queues/j/" + BL.config.queueName +  "/" + jobId + "/events");

		evsource.onmessage = function(e) {
			var data=JSON.parse(e.data);
			data = data.task || {};

			var current=parseInt(e.lastEventId);
			var progress=(current/taskCount) * 100;
			var elapsed = (new Date() - start);
			if(elapsed/1000<10){elapsed=Math.round(elapsed/100)/10;}else{elapsed=Math.round(elapsed/1000);}
			$comingSoon.html("<b>" + current + "</b> of " + taskCount + " &nbsp;tasks completed in  &nbsp;<b>" + elapsed + "</b> seconds.");

			$loadingInner.css("width", Math.round(progress) + "%");

			var $link=$("li.task[data-index='" + current + "']");
			
			$link.html("<a href='" + (data.link || $link.data("link")) + "' target='_blank'>" + current + ". " + (data.title || data.link || $link.data("title") || $link.data("link") || ("No task link or title provided") ) + "</a>");
			$link.prependTo($topUl);
			$link.data("task", data);
			$link.click(linkClick);

			// TODO: support for "error" and "finish" events.
			if(current===taskCount){
				evsource.close();
			}
		};

	}

	function linkClick(){
		var $link=$(this);
		if(!$link.attr("href")){
			var task=$link.data("task");
			window.alert("OK, no link. See web console.");
			console.log("Click task link:", task);
			return false;
		}
	}

})
