/**
 * Core mod component
 * @param {Object} config Data passed to this mod 
 * @param {Array} config.mods An array of mod configurational objects 
 * @constructor
 */
app.ModControl = function (config) {
	
	/**
	 * list of mods
	 * @type {Array}
	 */
	this.mods = config.mods;
	
	/**
	 * local url of the page
	 * @type {string}
	 */
	this.location = document.location.href.replace(new RegExp(".*\/"), '').replace(/&\d\d\d\d&/, '');
	
	/**
	 * time in miliseconds
	 * @type {number}
	 */
	this.timestamp = (new Date()).getTime();
	
	/**
	 * cash property accessor
	 * @type {app.Property}
	 */
	this.cash = new app.Property('cash', 0, 999999999999, this);
	
	/**
	 * food property accessor
	 * @type {app.Property}
	 */
	this.food = new app.Property('food', 0, 2000000000, this);
	
	/**
	 * turns property accessor
	 * @type {app.Property}
	 */
	this.turns = new app.Property('turns', 0, 0, this);
	
	/**
	 * power property accessor
	 * @type {app.Property}
	 */
	this.power = new app.Property('power', 0, 1199999999, this);
	
	/**
	 * true if property nodes are visible on page
	 * @type {boolean}
	 */
	this.propertiesAreAvailable = false;
	var pmEl = $("table.smallfont td.bodybox:has(a:contains('Private Messages')), table.smallfont td:has(a > font:contains('Private Messages'))");
	if (pmEl.length) {
		this.propertiesAreAvailable = true;
		pmEl.attr('id', 'a-privatemessages');
	}
	
	var properties;
	
	if (this.propertiesAreAvailable && this.isNewest()) {
		properties = this.readProperties();
		properties = this.setServer(properties, properties.serverName);
		this.serializeProperties(properties);
		
		this.setGlobalValue('a-propertycheck-timestamp', (new Date()).getTime());
		this.setValue('a-propertycheck-timestamp', (new Date()).getTime());	
	}
	else if (this.propertiesAreAvailable && !this.isNewest()) {
		properties = this.readProperties();
		properties = this.deserializeProperties();
		properties = this.setServer(properties, properties.serverName);
	}
	else {
		properties = this.deserializeProperties();
		console.log("props are NOT there");
		properties = this.setServer(properties, properties.serverName);
	}
	
	/**
	 * name of the empire (GC login), e.g. Anfit
	 * @type {string}
	 */
	this.empireName = properties.empireName;

	/**
	 * mods' username for this empire (server + . + empire), e.g. Normal.Anfit
	 * @type {string}
	 */
	this.userName = properties.userName;

	/**
	 * name of the server, e.g. Normal
	 * @type {string}
	 */
	this.server = properties.server;

	/**
	 * Whether this is a paid or a non-paid account
	 * @type {boolean}
	 */
	this.isPaid = properties.paid;
	
	/**
	 * An antireload value (used by GC pages to determine if a page is fresh or not)
	 * @type {numeric}
	 */
	this.antiReload = properties.antiReload;
	
	/**
	 * TODO remove this check
	 */
	if (!this.empireName) {
		this.loaded = false;
		return;
	} else {
		this.loaded = true;
	}

	//default values
	this.forceDefaultSettings();
	
	//message on after update installed
	if (this.getValue('a-last-successful-update') !== app.version) {
		
		this.setValue("a-allships", '');
		
		console.log("Anfit GC Mods " + app.version + ": " + app.releaseNotes);
		var self = this;
		this.xhr({
			method: 'GET',
			url: app.modsServer + '?action=report&empire=' + this.userName + '&version=' + app.version,
			onSuccess: function (response) {
				self.setValue('a-last-successful-update', app.version);
			}
		});
	}
	
	//message on new update available
	if (!this.getValue('a-last-update-check')) {
		this.setValue('a-last-update-check', this.timestamp);
	}
	if (this.timestamp - 86400000 > this.getValue('a-last-update-check')) {
		this.xhr({
			method: 'GET',
			url: app.modsServer + '?action=get_current_version',
			onFailure: function (response) {
				console.error("[Mod control] Query to " + app.modsServer + " failed");
			},
			onSuccess: function (response) {
				var version = $.trim(response);
				if (version !== app.version) {
					if (confirm('There is an update available for Anfit\'s GC Mods (' + version + ') available.\nWould you like to go to the install page now?')) {
						GM_openInTab(app.modsServer);
					}
				}
				gc.setValue('a-last-update-check', gc.timestamp);
			}
		});
	}
};

/**
 * Read empire property from dom and assign dom els to accessors
 * 
 * @private
 * @return {Object} Properties read from dom nodes on this page
 */
app.ModControl.prototype.readProperties = function () {
	
	var propertyElems = $("td.bodybox:contains('$'),td.bodybox:contains('$') ~ td.bodybox");
	
	//assign dom els to accessors
	this.cash.setEl(propertyElems.eq(0));
	this.food.setEl(propertyElems.eq(1));
	this.power.setEl(propertyElems.eq(2));
	this.turns.setEl(propertyElems.eq(3));
	
	//small fix
	propertyElems.eq(0).parent().removeAttr('onmouseover');
	propertyElems.eq(0).parent().removeAttr('onclick');
	

	
	//empty properties
	var properties = {
		cash: -1,
		food : -1,
		power : -1,
		turns : -1,
		serverName : "",
		empireName : "",
		userName : "",
		antireload: -1,
		paid: false
	};
	
	properties.cash = propertyElems.eq(0).text().replace(/\D/g, '') * 1;
	properties.food = propertyElems.eq(1).text().replace(/\D/g, '') * 1;
	properties.power = propertyElems.eq(2).text().replace(/\D/g, '') * 1;
	properties.turns = propertyElems.eq(3).text().replace(/\D/g, '') * 1;
	properties.serverName = $.trim(propertyElems.eq(4).text());
	properties.empireName = $.trim(propertyElems.eq(5).text());	
	
	properties.userName = properties.serverName + "." + properties.empireName;	
	
	properties.antiReload = $("a:contains('Private Messages')").attr('href').replace(/.*\&(\d*)\&.*/, "$1") * 1;
	
	//paid
	if ($("img[src*='logo_gc2']").length) {
		properties.paid = true;
	}
	return properties;
};

/**
 * @private
 * @return {Object} properties Properties deserialized from local storage
 */
app.ModControl.prototype.deserializeProperties = function () {
	
	//empty properties
	var properties = {
		cash: -1,
		food : -1,
		power : -1,
		turns : -1,
		serverName : "",
		empireName : "",
		userName : "",
		antiReload: -1,
		paid: false
	};
	
	properties.serverName = this.getGlobalValue('serverName');
	properties.empireName = this.getGlobalValue('empireName');	
	properties.userName = this.getGlobalValue('userName');
	
	properties.cash = this.getGlobalValue(properties.userName + "." + this.cash.id);
	properties.food = this.getGlobalValue(properties.userName + "." + this.food.id);
	properties.power = this.getGlobalValue(properties.userName + "." + this.power.id);
	properties.turns = this.getGlobalValue(properties.userName + "." + this.turns.id);
	
	properties.antiReload = this.getGlobalValue(properties.userName + ".antiReload");
	properties.paid = this.getGlobalValue(properties.userName + ".isPaid");

	return properties;
};

/**
 * @param {Object} properties Properties map as created elsewhere
 * @private
 */
app.ModControl.prototype.serializeProperties = function (properties) {
	this.setGlobalValue('serverName', properties.serverName);
	this.setGlobalValue('empireName', properties.empireName);
	this.setGlobalValue('userName', properties.userName);
	this.setValue('isPaid', properties.paid);
	this.setValue('antiReload', properties.antiReload);
	this.setValue('cash', properties.cash);
	this.setValue('food', properties.food);
	this.setValue('turns', properties.turns);
	this.setValue('power', properties.power);
};

/**
 * Use a server name provided by a properties object to add server-related data
 * 
 * @param {Object} properties Properties map as created elsewhere
 * @param {string} serverName Name for a GC server (e.g. Normal)
 * @return {Object} properties Properties map as created elsewhere
 */
app.ModControl.prototype.setServer = function (properties, serverName) {

	//devault values 
	properties.server = {
		id: -1,
		name: "",
		turnRate: -1,
		turnHold: -1
	};

	//known servers
	var servers = [{
		id: 0,
		name: 'Normal',
		turnRate: 900000,
		turnHold: 180
	}, {
		id: 1,
		name: 'Fast',
		turnRate: 300000,
		turnHold: 150
	}, {
		id: 2,
		name: 'Slow',
		turnRate: 1800000,
		turnHold: 250
	}, {
		id: 3,
		name: 'Ultra',
		turnRate: 120000,
		turnHold: 100
	}, {
		id: 4,
		name: 'RT',
		turnRate: 7800,
		turnHold: 30
	}, {
		id: 5,
		name: 'DM',
		turnRate: 3000,
		turnHold: 120
	}];
	
	//server
	for (var i = 0; i < servers.length; i = i + 1) {
		if (servers[i].name === serverName) {
			properties.server = servers[i];
			break;
		}
	}
	
	//adjust server
	if (properties.paid) {
		properties.server.turnRate = properties.server.turnRate * 0.85;
		properties.server.turnHold = properties.server.turnHold * 1.5;
	}
	
	//set turn max
	this.turns.setMax(properties.server.turnHold, true);
	
	//adapt gameServer variable
	if (properties.server.name === 'DM') {
		app.gameServer += 'dm/';
	}
	
	return properties;
};

/**
 * Get value from local storage. Detects booleans and numbers cast into strings as their respective types
 * 
 * <ul>
 * <li>false ==> false</li>
 * <li>"false" ==> false</li>
 * <li>true ==> true</li>
 * <li>"true" ==> true</li>
 * <li>undefined ==> undefined</li>
 * <li>string ==> string</li>
 * <li>number ==> number</li>
 * <li>"number" ==> number</li>
 * </ul>
 *  
 * @param {string} key Key under which a value was stored in localStorage
 * @return {string|number|boolean|undefined} Value retrieved from local storage
 */
app.ModControl.prototype.getGlobalValue = function (key) {
	var value = GM_getValue(key);
	if (value === "false") {
		return false;
	}
	if (value === false) {
		return false;
	}
	if (value === "true") {
		return true;
	}
	if (value === true) {
		return true;
	}
	if (value * 1 * 0 === 0) {
		return value * 1;
	}
	return value;
};

/**
 * Set value to local storage. Casts large numbers to String
 * 
 * @param {string} key Key under which a value was stored in localStorage
 * @param {string|number|boolean|undefined} value Value retrieved from local storage
 */
app.ModControl.prototype.setGlobalValue = function (key, value) {
	if (typeof (value) === "number" && value > 100000) {
		GM_setValue(key, value.toString());
	} else {
		GM_setValue(key, value);
	}
};

/**
 * Gets value from local storage. Takes userName for namespace
 * 
 * <ul>
 * <li>false ==> false</li>
 * <li>"false" ==> false</li>
 * <li>true ==> true</li>
 * <li>"true" ==> true</li>
 * <li>undefined ==> undefined</li>
 * <li>string ==> string</li>
 * <li>number ==> number</li>
 * <li>"number" ==> number</li>
 * </ul>
 * 
 * @param {string} key Key under which a value was stored in localStorage
 * @return {string|number|boolean|undefined} Value retrieved from local storage
 */
app.ModControl.prototype.getValue = function (key) {
	return this.getGlobalValue(this.userName + '.' + key);
};

/**
 * Sets value to local storage. Takes userName for namespace. Casts large numbers to String.
 * 
 * @param {string} key Key under which a value was stored in localStorage
 * @param {string|number|boolean|undefined} value Value retrieved from local storage
 */
app.ModControl.prototype.setValue = function (key, value) {
	this.setGlobalValue(this.userName + '.' + key, value);
};

/**
 * Checks if any other page in this http session was more recent then this one
 * @return {boolen} True if this page is fresh and most recent among all tabs 
 */
app.ModControl.prototype.isNewest = function () {
	if (this.getGlobalValue('a-propertycheck-timestamp')) {
		return this.timestamp - this.getGlobalValue('a-propertycheck-timestamp') > 0;
	}
	return true;
};

/**
 * Goes through all the mods and set default setting properties in local storage if they are missing
 */
app.ModControl.prototype.forceDefaultSettings = function () {
	
	var gc = this;
	//default settings
	$.each(this.mods, function (index, mod) {
		if (mod.defaultValue !== undefined && gc.getValue(mod.id) === undefined) {
			gc.setValue(mod.id, mod.defaultValue);
		}
		
		if (!mod.items) {
			return;
		}
		
		$.each(mod.items, function (index, item) {
			
			//no id, no value
			if (item.id) {
				//default setting
				if (item.defaultValue !== undefined && gc.getValue(item.id) === undefined) {
					gc.setValue(item.id, item.defaultValue);
				}
				//set value
				item.value = gc.getValue(item.id);
			}
		});		
	});
};

/**
 * Shows a message box on top of the gc pages
 * 
 * @param {string} title Title of the message box
 * @param {string} message Message shown in the message box
 * @param {string=} id Optional id value assigned to a message box, if user may remove a message permanently
 */
app.ModControl.prototype.showMessage = function (title, message, id) {
	if (id) {
		id = id.replace(/\W/g, '');
	}
	var gc = this;
	
	if (!id || this.getValue(id) !== false) {
		var messageBox = $("body").prepend(
			'<div class="a-info-wrap">' +
				'<div class="a-info-title" id="' + id + '">' + title + '</div>' +
				'<div class="a-info" >' + message + '</div>' +
			'</div>');
		$(".a-info-title", messageBox).click(function (e) {
			var target = $(e.target), id = target.attr('id'), offset = target.offset(),
	        imgLeft = e.pageX - offset.left,
	        imgTop = e.pageY - offset.top;
			//a very rough approximation
			if (target.hasClass("a-info-title") && 770 < imgLeft && imgLeft < 796 && 0 < imgTop && imgTop < 16) {
				target.parent().fadeOut("slow", function () { 
					$(this).remove(); 
					if (id) {
						gc.setValue(id, false);
					}
				});
			}
		});	
	}
};

/**
 * Run all mods
 */
app.ModControl.prototype.runMods = function () {
	var modMarkup = '<li class="a-mod" id="${id}"><div class="a-mod-line" ><ul><li class="a-mod-submit"><input type=checkbox id="${id}-checkbox" /></li><li class="a-mod-name"><a name=${id}></a><b>${title}</b><br /></li></div></ul><div class="a-mod-line" ><i>${description}</i></div><div><ul class="a-mod-item" /></div></li>';
	var listMarkup = '<li class="a-mod-item-list"><ul class="a-mod-item-parts"><li class="a-mod-item-parts-body">${description}<br /><textarea id="${id}" cols="70">${value}</textarea></li></ul></li>';
	var inputMarkup = '<li class="a-mod-item-input"><ul class="a-mod-item-parts"><li class="a-mod-item-parts-body"><span class="a-mod-item-input-desc">${description}</span><span class="a-mod-item-input-submit"><input id="${id}" value="${value}" /></span></li></ul></li>';
	var infoMarkup = '<li class="a-mod-item-info">${text}</li>';
	var checkBoxMarkup = '<li class="a-mod-item-checkbox"><ul class="a-mod-item-parts"><li class="a-mod-item-parts-submit"><input id="${id}" type="checkbox" /></li><li class="a-mod-item-parts-body">${description}</li></ul></li>';
	
	if (gc.location.match(/i.cfm.f.option($|#.*)/)) {
		$("table.bodybox[width='550'] > tbody > tr > td").attr('id', 'a-options-wrap').append('<div id="a-about"><div><b>Welcome, ' + gc.empireName + '!</b></div><div class="a-separator"/><div>Thank you for trying Anfit\'s Mods for Spacefed GC v.' + app.version + '. All mods are listed below with short explanations. Also, some of the mods require additional configuration they can be switched on.<div class="a-separator"/><div>My mods cannot affect gameplay, they are just UI (User Interface) tweaks, to make this game slightly more playable.</div><div class="a-separator"/><div>To enable more advanced tweaks which interact with other players please enter your gc.mmanir.net authentication token.</div><div class="a-separator"/><div><i>What? Authentication token? What is it? Why?</i></div><div class="a-separator"/><div>Some more advanced mods share data between players. You always know when and how. The best example of this are status tags: you set your status text, all other users of Anfit\'s Mods can see it in the ranking lists, you can see theirs.</div><div>This is possible only through another server located at gc.mmanir.net (one I\'m hosting). To authenticate with this server you have to: </div><div><ol><li>Create an account and login at <a href="http://gc.mmanir.net" target="blank">gc.mmanir.net</a>.</li><li>Retrieve an authentication token (it\'s provided just after login page).</li><li>Copy the authentication token here.</li></ol></div><div><b>Enter your authentication token here</b>: <input id="a-authentication-token" type="text" size="32" /></div><div class="a-separator"/><div>If you have problems, questions or ideas while using Anfit\'s GC Mods contact me (<a href="http://gc.mmanir.net/">Anfit</a>) at <a href="mailto:jan.chimiak@gmail.com?subject=[GC Mods]">jan.chimiak@gmail.com</a> or send me a <a href="javascript:cmsgu(\'i.cfm?popup=msguser&uid=213512\');">private message</a> at GC/normal.</div><div>');
		var token = gc.getValue('a-authentication-token');
		if (!token) {
			token = '';
		}
		$("#a-authentication-token").val(token);
		if (!token) {
			$("#a-authentication-token").parent().css("background-color", "ff0000");
			$("#a-authentication-token").parent().children().filter("b").css("color", "00ffff");
		}
		$("#a-authentication-token").change(function () {
			gc.setValue('a-authentication-token', $(this).val());
			//TODO
			//validity check
		});
	}
	$.each(this.mods, function (index, mod) {
		//create an options entry
		if (mod && gc.location.match(/i.cfm.f.option($|#.*)/)) {
			//add
			$.tmpl(modMarkup, mod).appendTo("#a-options-wrap");

			//set value
			$('#' + mod.id + '-checkbox').prop("checked", gc.getValue(mod.id));
			var itemsWrapper = $("#" + mod.id + " ul.a-mod-item");
			//iterate through subitems, if they exist
			mod.items && $.each(mod.items, function (index, item) {
				//no id, no value
				if (item.id) {
					//set value
					item.value = gc.getValue(item.id);
				}
				switch (item.type) {
					case 'list': {
						//add
						$.tmpl(listMarkup, item).appendTo(itemsWrapper);
						//hitch events
						$('#' + item.id).change(function () {
							gc.setValue(item.id, $('#' + item.id).val());
						});
						break;
					}
					case 'info': {
						//add
						$.tmpl(infoMarkup, item).appendTo(itemsWrapper);
						break;
					}
					case 'input': {
						//add
						$.tmpl(inputMarkup, item).appendTo(itemsWrapper);
						//hitch events
						$('#' + item.id).change(function () {
							gc.setValue(item.id, $('#' + item.id).val());
						});
						break;
					}
					case 'checkbox':
					{
						//add
						$.tmpl(checkBoxMarkup, item).appendTo(itemsWrapper);
						//set value
						$('#' + item.id).prop("checked", item.value);
						//hitch events;
						$('#' + item.id).click(function () {
							gc.setValue(item.id, $('#' + item.id).prop('checked'));
						});
						break;
					}
					default:
					{
						console.error('[Options] Unrecognized option type');
					}
				}
			});
			//add event handlers
			//submit
			$('#' + mod.id + '-checkbox').click(function () {
				gc.setValue($(this).attr('id').replace('-checkbox', ''), $(this).prop('checked'));
			});
			if (mod.onAfterRender) {
				mod.onAfterRender.call(this);
			}
		}
		//execute mod
		if (mod.filter.call()) {
			mod.plugin.call();
		}
	});
};

/**
 * A wrapper for GM_xmlhttpRequest, with most options predefined.
 * 
 * @param {Object} config Arguments map 
 * @param {string} config.url Href of a receiver servelet
 * @param {function} onFailure Function called if request failed
 * @param {function} onSuccess Function called if request succeded 
 * @param {string} successCondition String used as an xpath selector 
 * by jquery to find a dom node in request result. If that's non-empty,
 *  the whole request was a success
 * @param {string} data Passed to server in a POST request
 * @param {string} method Request type: POST or GET
 * @param {string} extra Additional value to be visible in scope of the callback functions
 */
app.ModControl.prototype.xhr = function (config) {
	if (!config || !config.url) {
		console.error("[Ajax] empty xhr request");
		return;
	}
	var settings = {
		method: "POST",
		url: config.url,
		headers: {
			"Accept": "application/atom+xml,application/xml,text/xml",
			"Content-type": "application/x-www-form-urlencoded"
		},
		onload: function (responseDetails) {
			var antireloadDom = $("td.bodybox a:contains('Private Messages')");
			var antireload;
			if (antireloadDom.length) {
				var href = antireloadDom.first().attr("href");
				if (href) {
					antireload = href.replace(/\D/g, '');
				}
				if (antireload) {
					gc.setValue('antiReload', antireload);
				}
			}
			if (responseDetails.status != 200) {
				if (config.onFailure) {
					config.onFailure.call(this, responseDetails.responseText);
				}
				return;
			}
			if (config.successCondition && $(config.successCondition, responseDetails.responseText).length) {
				config.onSuccess.call(this, responseDetails.responseText);
			} else if (config.successCondition) {
				config.onFailure.call(this, responseDetails.responseText);
			} else {
				config.onSuccess.call(this, responseDetails.responseText);
			}
		},
		onerror: function (response) {
			console.error('XHR error', config, response);
			config.onFailure.call(this, response);
		}
	};
	if (config.data) {
		settings.data = config.data;
	}
	if (config.method) {
		settings.method = config.method;
	}
	if (config.extra) {
		settings.extra = config.extra;
	}
	GM_xmlhttpRequest(settings);
};