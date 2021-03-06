﻿var page = require('webpage').create();
var system = require('system');

var address = system.args[1];
page.onConsoleMessage = function(message) { console.log(message); };

console.log("Executing ...");

page.open(address, function (status) {
    if (status !== 'success') {
        console.log("Unable to load the address ...");
        phantom.exit();
    } else {
		console.log("Doing some stuff ...");
        window.setTimeout(function() {
            page.render('jasmine.png');
            phantom.exit();
        }, 3000);
    }
});