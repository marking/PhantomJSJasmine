(function ($) {
    var access = assemble.access = {};

    access.Model = Backbone.Model.extend({
    });

    // need to add functionality to add/remove/change, need url
    access.Collection = Backbone.Collection.extend({
        initialize: function (config) {
            this.project = config.project;
        },

        url: function () {
            var myurl = '/api/Projects/' + this.project.id + '/UserRoles';
            return myurl;
        },

        model: access.Model
    });
} (jQuery));