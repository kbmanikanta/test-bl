
module.exports={
	init: function($el){
		Sortable.create($el.find("ul.collection").get(0), {
			handle: '.drag-handle',
			animation: 150
		});	

		$el.find(".delete-button").click(function(){
			var $li = $(this).closest("li");
			if($li.siblings().length>0){
				$li.remove();
			}else{
				$li.find("input").val("");
			}
		});

		$el.find(".add-button").click(function(){
			var $ul=$(this).siblings("ul");
			var $clone = $ul.find("li").first().clone(true);
			$clone.appendTo($ul);
			$clone.find("input").val("");
		});
	}
}

