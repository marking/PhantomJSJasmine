(function ($) {

    var help = assemble.help = {};

    help.version = "1.0a";

    /*************************************
    * Model
    *************************************/
    help.Model = Backbone.Model.extend({
        initialize: function (data) {
            if (data.BaseApplicationUrl === "" || data.BaseApplicationUrl == null)
                throw new Error("BaseApplicationUrl must have a value.");

            if (data.BaseHelpUrl === "" || data.BaseHelpUrl == null)
                throw new Error("BaseHelpUrl must have a value.");

            if (data.DefaultHelpUrl === "" || data.DefaultHelpUrl == null)
                throw new Error("DefaultHelpUrl must have a value.");
        },

        itemByKey: function (key) {
            return Enumerable.From(this.get("HelpItems"))
                .Where("$.Key == " + key)
                .SingleOrDefault();
        },

        itemByPath: function (path) {

            return Enumerable.From(this.get("HelpItems"))
                .Where(function (x) {
                    var include = (new RegExp("^" + x.PathRegEx)).test(path);
                    return include;
                })
                .FirstOrDefault();
        },

        getHelpUrlFromPageUrl: function (url) {
            var path = url.replace(this.get("BaseApplicationUrl"), "");
            var item = this.itemByPath(path);

            if (item == null)
                return this.get("DefaultHelpUrl");
            else
                return this.get("BaseHelpUrl") + item.Url;
        },

        getHelpUrlFromKey: function (key) {
            var item = this.itemByKey(key);

            if (item == null)
                return this.get("DefaultHelpUrl");
            else
                return this.get("BaseHelpUrl") + item.Url;
        }

    });

    /*************************************
    * KeyView
    *************************************/
    help.KeyView = Backbone.View.extend({
        initialize: function (config) {
            this.key = config.key;
            this.setElement(config.el);
            this.$el.show();
        },
        events: {
            "click": "helpClicked"
        },

        helpClicked: function (event) {
            event.preventDefault();
            var helpUrl = (this.key == null) ?
                this.model.get("DefaultHelpUrl") :
                this.model.getHelpUrlFromKey(this.key);

            this.displayHelpTopic(helpUrl);
        },

        getCurrentUrl: function () {
            return document.location.href;
        },

        displayHelpTopic: function (url) {
            window.open(url, "_assemble_extra");
        }
    });

    /*************************************
    * NavigationView
    *************************************/
    help.NavigationView = Backbone.View.extend({
        initialize: function (config) {
            this.setElement(config.el);
            this.$el.show();
        },

        events: {
            "click": "helpClicked"
        },

        helpClicked: function (event) {
            event.preventDefault();
            var currentUrl = this.getCurrentUrl();
            var helpUrl = this.model.getHelpUrlFromPageUrl(currentUrl);
            this.displayHelpTopic(helpUrl);
        },

        getCurrentUrl: function () {
            return document.location.href;
        },

        displayHelpTopic: function (url) {
            window.open(url, "_assemble_extra");
        }
    });

    help.ModelRepository = function (url) {
        this.ajax = null;
        this.url = url;
        this.data = null;
    };

    /*************************************
    * ModelRepository
    *************************************/
    help.ModelRepository.prototype.load = function (callback) {
        var storageKey = "assemble.help.config." + help.version;
        this.deferred = $.Deferred();
        var self = this;

        if (sessionStorage.getItem(storageKey, null) == null) {
            var ajax = $.ajax({
                url: this.url,
                type: "GET",
                dataType: "json"
            });

            ajax.done(function (data) {
                sessionStorage.setItem(storageKey, JSON.stringify(data));
                self.deferred.resolve();
            });
        }
        else {
            this.deferred.resolve();
        }

        this.deferred.done(function () {
            callback(new assemble.help.Model(JSON.parse(sessionStorage.getItem(storageKey))));
        });
    };
}(jQuery));