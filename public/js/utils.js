/* globals window, $ */
window.BL = window.BL || {};
window.BL.utils = window.BL.utils || {};

//////////////////////////////////////////////////////////////////////////////////////////////////////////
window.BL.utils.setCookie = function (cname, cvalue, exdays) {
		var d = new Date();
		d.setTime(d.getTime() + (exdays*24*60*60*1000));
		var expires = "expires="+d.toUTCString();
		document.cookie = cname + "=" + cvalue + "; " + expires +  "; path=/";
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////
window.BL.utils.getCookie = function (cname) {
	var value = "; " + document.cookie;
	var parts = value.split("; " + cname + "=");
	return  parts.length == 2 ?  parts.pop().split(";").shift() : '';
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////
window.BL.utils.deleteCookie = function (cname) {window.BL.utils.setCookie(cname, '', -1);};


