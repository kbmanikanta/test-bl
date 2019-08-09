/* globals  BL, module, require   */


module.exports=function($, window){
	"use strict";
	var pageManager=require("./page-manager-client.js")($, window);
	var home={};

	/************************************************************************************************/
	home.init = function(){
		// $('.button-collapse').sideNav({
		//      menuWidth: 210, // Default is 240
		//      menuTop:66,
		//      edge: 'left', // Choose the horizontal origin
		//      closeOnClick: false // Closes side-nav on <a> clicks, useful for Angular/Meteor
		//    }
		//  );

		var classes=$("body").attr('class').split(/\s+/);
		$.each(classes,function(key,val){
			if(val!=="home" && home.init[val]){
				home.init[val]();
			}
		});


	};


	/************************************************************************************************/
	home.init["page-manager"] = function(){
		var iframed=require("./framed-client.js")($, window);
		iframed.init();
	};



	/************************************************************************************************/
	home.init.queue = function(){
		var $status=$("#status");
		var $loadingIndicator = $("#queue-loading");
		var $loadingInner = $loadingIndicator.find("div");
		var $button = $("#queue-action");
		var pageTree;

		$status.height(function(index, height) {
		    return window.innerHeight - $(this).offset().top - 10;
		});

		var buttonLabel = $button.contents().filter(function(){return this.nodeType===3;} ).text().toLowerCase();

		$("select").material_select();
		$status.html("<div class='grey-text'><b>Reading tree:</b> &nbsp; " + BL.config.slingPath + "</div>");
		var proxyPrefix= BL.config.slingProxyPrefix || "";
		var url = proxyPrefix + BL.config.slingPath + ".list.pages.json";


		/////////////////////////////////////////////////////////////////////////
 		$.ajax({url: url, dataType:"json"})
		.done(function(data){
			$loadingIndicator.css("display", "none");
			$button.removeClass("disabled").click(runJob);
			var html=[];
			pageTree=data;
			pageTree.unshift(BL.config.slingPath);

			if(data){
				$.each(data,function(idx,val){
					html.push("<li class='qlink' id='link" + val.replace(/\//g,"-") + "'>" + val + "</li>");
				});
				$status.html("<span id='coming-soon' class='red-text text-accent-2'>Queued " + pageTree.length +  " page" + (data.length===1?"":"s")  + " &ndash; click \"" + buttonLabel + "\" to begin processing.<br></span><ul id='queue-items'>" + html.join("\n") + "</ul>");
			}else{
		  		console.error(new Error("Unexpected data from Sling page-listing service:" + url + "\n" + JSON.stringify(data)));
			}
		});


		/////////////////////////////////////////////////////////////////////////
		function runJob(){
			$loadingIndicator.css("display", "block");
			$loadingInner.removeClass("indeterminate").addClass("determinate").css("width","1px");

			var targetVal=$("#target").val();
			var targetText=$("#target option:selected").text();
			var $target=$("#target-holder");
			$target.html('<div style="margin-top:5px;margin-bottom:24px;" class="chip grey lighten-2">' + targetText + '</div>');

			// pageTree = $.map(pageTree,function(val){return {path: val, target:targetVal};});


			$button.remove();
			var start=new Date();


			/////////////////////////////////////////////////////////////////////////
			$.ajax({url: BL.config.appsMount + "blacklight/edit/legacy/queues/transfer/jobs", method:"POST", dataType:"json", data:{target: targetVal, pages: pageTree}})
			.done(function(data){

				var $topUl = $("#queue-items");

				// var evsource = new window.EventSource(BL.config.appsMount + "blacklight/edit/legacy/queues/transfer/jobs/" + data.id + "/status/");
				window.alert("This needs fixing. Queue name is hardcoded.\nSee web console for trace.");
				console.error("Hardcoded queue name: blacklight.edit.transfer")
				var evsource = new window.EventSource(BL.config.appsMount + "blacklight/edit/queues/j/blacklight.edit.transfer/" + data.id + "/events");

				$(".new-job-link").html(`<a href="${BL.config.appsMount}blacklight/edit/queues/j/blacklight.edit.transfer/${data.id}/status" target="_blank">Link to new job screen</a>`);

				evsource.onmessage = function(e) {
					var data=JSON.parse(e.data);

					var current=parseInt(e.lastEventId);
					var progress=(current/pageTree.length) * 100;
					var elapsed = (new Date() - start);
					if(elapsed/1000<10){elapsed=Math.round(elapsed/100)/10;}else{elapsed=Math.round(elapsed/1000);}
					$("#coming-soon").html("<b>" + current + "</b> of " + pageTree.length + " &nbsp;pages completed in  &nbsp;<b>" + elapsed + "</b> seconds.");

					$loadingInner.css("width", Math.round(progress) + "%");
					var query="#link" + data.task.url.replace(/\//g,"-");
					var $link=$(query);
					$link.html("<a href='" + data.result + "' target='_blank'>" + data.task.url + "</a>");
					$link.prependTo($topUl);

					if(current===pageTree.length){
						evsource.close();
					}

					//$("#content").append("<pre>" + data.body + "</pre>");
				};
			});
		}
		
	};




	return home;
};
