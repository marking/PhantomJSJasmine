(function ($) {
    var materials = assemble.materials = {};

    //Backbone model for matreial
    //{ id: , transparency: , red: , green:, blue:, }
    materials.Model = Backbone.Model.extend({
        toString: function() {
            return this.get('red') + ',' + this.get('green') + ',' + this.get('blue') + ',' + this.get('transparency');
        }
    });

    materials.Collection = Backbone.Collection.extend({
        models: materials.Model,
        
        initialize: function (models, options) {            
            this.url = "/visualization/materials?modelVersionId=" + options.modelVersionId;
        }  
    });    

}(jQuery));