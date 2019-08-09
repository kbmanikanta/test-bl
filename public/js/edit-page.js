"use strict";
/* globals $, window   */



var page=require("./modules/page-client.js")($, window);
var purl=require("./modules/parse-url");

window.BL.page = page;

$(function(){
	page.init();
})

