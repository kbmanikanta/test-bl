/* globals $, window */

$(function(){
	$('.search-card').hide(); 

	$(".collection-item").click(function(){
		var $el = $(this);
		var componentTemplateUrl =  window.BL.config.appsMount + "blacklight/edit/component/template-content";
		var pageTypePath = window.BL.config.page.path;
		var proxyPrefix = window.BL.config.slingProxyPrefix || "";
		var resourceType = $el.data("type");

		var fd=new window.FormData();
		fd.append("jcr:content/sling:resourceType", resourceType);
		$.ajax({url:componentTemplateUrl,data:{
			resourceType: resourceType,
			path: pageTypePath,
			prefix: "jcr:content"

		}}).then(function(data){
			if(data.template){
				$.each(data.template, function(idx, item){
					if(!fd.has(item.name)){
						if(_.isArray(item.value)){
							fd.append(item.name + "@TypeHint", "String[]")
							_.each(item.value,function(val){
								fd.append(item.name, val);
							})
						}else{
							fd.append(item.name, item.value);
						}
					}
				})
			}
			
			var request = new window.XMLHttpRequest();

			request.open("POST", proxyPrefix + pageTypePath);
			request.send(fd);
			request.onload = function(event){
				if(request.status >= 200 && request.status<300){
					/// Success.  Reload.
					if(!window.BL.slingProxyPrefix){
						window.BL.utils.setCookie("wcmmode", "edit", 7);
					}
					window.location.reload(true);
				}else{
					if(console){console.error("Error " + request.status + " occurred when trying to write ECC type.");}
					window.alert("There was an error writing your content to the server.\nYour changes may not be saved.");
				}
			}
		});




		// $.ajax({url:proxyPrefix + pageTypePath, data:{"sling:resourceType":resourcetype}, method:"POST"})
		// .done(function(data){
		// 	window.location.reload(true);
		// })


	});
	$("i.explain").click(function(e){
		var reasons = $('.reasons.row'); 
		if(reasons.is(':visible')){
			reasons.hide(); 
		}else{
			reasons.show().css({overflow: 'scroll'});
		}
	});

});