/* globals hljs, $ */

if(hljs){ hljs.initHighlightingOnLoad(); }

$(function(){

	$("img[data-rollover]").each(function(){
		var $image = $(this);
		var normal=$image.attr("src");		
		var parts=normal.match(/(.*?)([^\/]*)$/);
		var rollover=parts[1] + $image.data("rollover");

		$image.click(function(){console.log("CLICK");})
		$image.hover(
			function(){
				$image.attr("src", rollover);
			},
			function(){
				$image.attr("src", normal);
			}
		)
	});

	$("img[data-clearfix]").each(function(){
		var $image=$(this);
		var clearfix=$image.data("clearfix");
		if(clearfix){
			var clearme=$image.parent().nextAll().eq(clearfix-1);
			$("<br style='clear:both'>").insertBefore(clearme);
		}
	})


	////////////////////////////////////////////////////////////////
	var lastLevel, last;
	var toc=[], tocCount=0;
	var tocStack=[];

	function stackTop(){return tocStack[0] || toc}

	$("h1,h2,h3,h4").each(function(){
		var $h = $(this), levelDiff;
		var id=$h.attr("id");
		var title=$h.text();
		var level=parseInt($h.prop("tagName").replace(/^H/,""));		
		var cur={title: title, id:id, children:[]};
		if(last && lastLevel<level){
			tocStack.unshift(last.children)
		}else{
			if(lastLevel>level){
				levelDiff = lastLevel-level; 
				while(levelDiff){tocStack.shift();levelDiff--;}
				// tocStack.shift();
			}
		}
		stackTop().push(cur);

		lastLevel=level;

		var $link = $("<a href='#" + id + "' class='h-link' style='display:none;'>&#128279;</span>");
		$h.append($link);
		$h.hover(function(){
			$link.css("display","inline");
		},
		function(){
			$link.css("display","none");
		});
		last=cur;
	});

	////////////////////////////////////////////////////////////////
	var $pageToc = $(".page-toc"); 

	var updateBodyWidth = function(){
		$('body').css('max-width', $(window).width() - $pageToc.outerWidth() - 50); //to account for padding
		$pageToc.css('left', $(window).width() - $pageToc.outerWidth() - 10);
		$pageToc.css('max-height', $(window).height() - 84);
	}

	////////////////////////////////////////////////////////////////
	function addChildren($parent, children){
		var html, cur, $li;
		var $ul=$("<ul>");
		for(var i=0;i<children.length;i++){
			cur=children[i];
			$li=$("<li><a href='#" +cur.id + "'>" + cur.title + "</a></li>");
			tocCount++;
			if(cur.children.length){addChildren($li, cur.children);}
			$ul.append($li);
		}
		$parent.append($ul);
	}

	addChildren($pageToc, toc);
	if(tocCount<2){
		$pageToc.css("display", "none");
	}

	//update the body max-width. 
	updateBodyWidth(); 

	////////////////////////////////////////////////////////////////
	$(window).on('resize', updateBodyWidth); 

});
