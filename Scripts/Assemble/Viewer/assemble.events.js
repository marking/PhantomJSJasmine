
(function (assemble, $) {

    function ViewerEvents() {
        this.events = {};
    }

    ViewerEvents.prototype.on = function (event, callback) {
        this.add(event);
        this.events[event].push(callback);
    };

    ViewerEvents.prototype.trigger = function (event) {
        if (this.events[event] === undefined)
            return;

        var listeners = this.events[event];

        for (var i = 0; i < listeners.length; i++)
            listeners[i]();
    };

    ViewerEvents.prototype.add = function (event) {
        if (this.events[event] === undefined) {
            this.events[event] = [];
        }
    };

    ViewerEvents.prototype.clear = function (event) {
        if (event === undefined)
            this.events = {};
        else
            this.events[event].length = 0;
    };

    assemble.ViewerEvents = ViewerEvents;

}(window.assemble, jQuery));