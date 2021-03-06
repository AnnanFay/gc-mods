/**
 * utils namespace
 */
app.util = {};
/**
 * @param {Object} a Compared object
 * @param {Object} a.power Compared property 
 * @param {Object} b Compared object
 * @param {Object} b.power Compared property 
 */
app.util.sortByPowerDesc = function (a, b) {
	return ((a.power > b.power) ? -1 : ((a.power < b.power) ? 1 : 0));
};
/**
 * Enables dragging within Greasemonkey (the core jQuery dragging does not work)
 * 
 * @param {Object} e Event object from mousedown
 */
app.util.startDragging = function (e) {
	var dragObj = {
		zIndex: 0
	};
	dragObj.elNode = e.target;
	if (dragObj.elNode.nodeType === 3) {
		dragObj.elNode = dragObj.elNode.parentNode;
	}
	if (dragObj.elNode.nodeName === 'INPUT' || dragObj.elNode.nodeName === 'SPAN') {
		return;
	}
	while (!dragObj.elNode.className.match('draggable')) {
		dragObj.elNode = dragObj.elNode.parentNode;
	}
	var targetId = dragObj.elNode.id;
	dragObj.cursorStartX = e.clientX + window.scrollX;
	dragObj.cursorStartY = e.clientY + window.scrollY;
	dragObj.elStartLeft = parseInt(dragObj.elNode.style.left, 10);
	dragObj.elStartTop = parseInt(dragObj.elNode.style.top, 10);
	dragObj.elStartRight = dragObj.elStartLeft + parseInt(dragObj.elNode.clientWidth, 10);
	dragObj.elStartBottom = dragObj.elStartTop + parseInt(dragObj.elNode.clientHeight, 10);
	dragObj.elNode.style.zIndex = dragObj.zIndex + 1;

	function dragGo(e) {
		var x = e.clientX + window.scrollX;
		var y = e.clientY + window.scrollY;
		var top, left, bottom, right;
		top = dragObj.elStartTop + y - dragObj.cursorStartY;
		left = dragObj.elStartLeft + x - dragObj.cursorStartX;
		bottom = dragObj.elStartBottom + y - dragObj.cursorStartY;
		right = dragObj.elStartRight + x - dragObj.cursorStartX;
		if (top > 0 && left > 0 && bottom + 5 < window.innerHeight && right + 5 < window.innerWidth) {
			dragObj.elNode.style.left = left + "px";
			dragObj.elNode.style.top = top + "px";
		}
	}

	function dragStop(e) {
		var x = e.clientX + window.scrollX;
		var y = e.clientY + window.scrollY;
		var top;
		var left;
		top = dragObj.elStartTop + y - dragObj.cursorStartY;
		left = dragObj.elStartLeft + x - dragObj.cursorStartX;		
		$(document).unbind("mousemove." + targetId, dragGo);
		$(document).unbind("mouseup." + targetId, dragStop);
		$(document).trigger('dragStop', [targetId, top, left]);
	}
	$(document).bind("mousemove." + targetId, dragGo);
	$(document).bind("mouseup." + targetId, dragStop);
};
/**
 * @param mixed
 * @param array
 */
app.util.countInArray = function (value, array) {
	var c = 0;
	for (var i = 0; i < array.length; i = i + 1) {
		if (array[i] === value) {
			c = c + 1;
		}
	}
	return c;
};
/**
 * @param number
 */
app.util.formatCurrency = function (value) {
	var string = value + '';
	for (var i = 0; i < Math.round(string.length / 3 - 0.5); i = i + 1) {
		string = string.replace(/(\d)(\d{3})($|,)/g, '$1,$2$3');
	}
	return string;
};
/**
 * @param number
 * @param number
 */
app.util.getRandomNumber = function (min, max) {
	return Math.random() * (max - min) + min;
};