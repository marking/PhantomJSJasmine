(function () {
    var versions = assemble.versions = {};

    versions.VersionModel = Backbone.Model.extend({
        methodUrl: {}
    });

    // {selected: id, compared: id}
    versions.SelectedVersionsModel = Backbone.Model.extend({

    });

    versions.VersionsCollection = Backbone.Collection.extend({
        model: versions.VersionModel,

        url: function () {
            return '/Models/' + this.projectModel.id + '/ModelVersions';
        },

        comparator: function (version) {
            return -version.get('versionNumber');
        }
    });

    versions.VersionHeaderView = Backbone.View.extend({
        initialize: function (config) {
            this.setElement(config.el);
            this.collection = config.versions;
            this.selectedVersions = new versions.SelectedVersionsModel({ selected: 0, compared: null });
        },

        events: {
            'click .compare-trigger': 'showCompare',
            'click .close': 'hideCompare'
        }
    });

    _.extend(versions.VersionHeaderView.prototype, {
        compareToTemplate: _.template(
            '<div class="pull-left compare">' +
                '<a class="compare-trigger" href="#">compare to&hellip;</a>' +
                '<div class="compared-to hide">' +
                    '<a class="close">&times;</a>' +
                    '<div class="compared-to-label">compared to</div>' +
                '</div>' +
            '</div>'
        ),

        render: function () {
            // create the dropdowns
            this.selectedDropdown = new assemble.dropdowns.SelectorListView({ collection: this.collection, classes: 'dropdown-h3 pull-left mrs' });
            this.selectedDropdown.render();
            this.comparedDropdown = new assemble.dropdowns.SelectorListView({ collection: this.collection, classes: 'dropdown-h3' });
            this.comparedDropdown.render();

            // compare container
            this.compareToContainer = $(this.compareToTemplate());
            this.compareToContainer.find('.compared-to').append(this.comparedDropdown.el);

            // put everything in the page
            this.$el.empty()
                    .append(this.selectedDropdown.el)
                    .append(this.compareToContainer);

            this.comparedDropdown.bind('change', this.setCompared, this);
            this.selectedDropdown.bind('change', this.setSelected, this);

            return this;
        },

        setVersionSelection: function (selected, options) {
            options = options || {};
            if (selected) this.resetSelected(selected, options);

            // set the right version(s)
            this.selectedDropdown.select(this.getSelected().get('id'), false);

            if (this.getCompared()) {
                this.showCompare();
            } else {

                this.collection.length > 1 ? this.hideCompare() : this.hideCompareLink();
            }
        },

        showCompare: function (event) {
            var compared = this.getCompared(),
                selected = this.getSelected(),
                next;

            if (event) event.preventDefault();

            // choose the right one
            if (compared) {
                this.comparedDropdown.select(compared.get('id'), false);
            } else {
                // if there wasn't a compared version, select one previous to the selected version
                next = this.collection.models[this.collection.indexOf(selected) + 1];

                // select it in the dropdown and let the dropdown trigger that it's been changed
                //     the dropdown's change event will kick off saving the selecteVersions model
                this.comparedDropdown.select(next ? next.get('id') : selected.get('id'));
            }

            this.$('.compare-trigger').hide();
            this.$('.compared-to').fadeIn(300);
        },

        hideCompare: function (event) {
            if (event) event.preventDefault();

            this.selectedVersions.set('compared', false);

            this.$('.compared-to').hide();
            this.$('.compare-trigger').show();
        },

        hideCompareLink: function (event) {
            if (event) event.preventDefault();

            this.selectedVersions.set('compared', false);

            this.$('.compared-to').hide();
            this.$('.compare-trigger').hide();
        },

        getSelected: function () {
            return this.collection.get(this.selectedVersions.get('selected'));
        },

        getCompared: function () {
            return this.collection.get(this.selectedVersions.get('compared'));
        },

        setSelected: function (version) {
            this.selectedVersions.set('selected', version.get('id'));
        },

        setCompared: function (version) {
            this.selectedVersions.set('compared', version.get('id'));
        },

        resetSelected: function (selected, options) {
            options = options || {};
            this.selectedVersions.set(selected, options);
        },

        unload: function () {
            this.selectedDropdown.unload();
            this.comparedDropdown.unload();
            this.selectedVersions.set({selected: 0, compared: null}, {silent: true});
            this.$el.empty();
        }
    });

    versions.View = Backbone.View.extend({
        initialize: function (config) {
            this.model = config.model;
            this.template = Handlebars.templates.views.box;
            this.logicSwitch = new assemble.logicSwitch(function () {
                this.model.on("change:name change:comments", this.render, this);
            }, function () {
                this.model.off("change:name change:comments", this.render, this);
            }, this);
        },

        events: {
            'click .version-name': 'show',
            "click .version-delete-button": "verifyDelete",
            "click .version-edit-button": "edit"
        },

        verifyDelete: function (event) {
            event.preventDefault();
            event.stopPropagation();
            var deleteModal = new versions.DeleteVersionModalView({ view: this });
            deleteModal.render();
        },

        edit: function (event) {
            event.preventDefault();
            event.stopPropagation();
            var modal = new versions.EditVersionModalView({ view: this });
            modal.show();
        },

        render: function () {
            this.logicSwitch.on();
            var $oldEl = this.$el;
            var $newEl = $(this.template(this.model.toJSON()));
            this.setElement($newEl);

            if ($oldEl !== null && $oldEl.length == 1) {
                $oldEl.replaceWith(this.$el);
            }

            return this;
        },

        hide: function (event) {
            this.logicSwitch.off();
            this.$el.hide();
        },

        show: function (event) {
            event.preventDefault();
            this.logicSwitch.on();
            this.trigger('show', this.model);
        }
    });


    versions.DeleteVersionModalView = Backbone.View.extend({

        config: null,

        initialize: function (config) {
            this.config = config;
        },

        template: _.template(
            '<div id="delete_version_modal" class="modal" style="display: none;">' +
                '<div class="modal-header">' +
                    '<a class="close" data-dismiss="modal">×</a>' +
                    '<h3>Delete <%= Name %> <a href="#" class="mls help-link" target="_assemble_extra"><i class="icon-help-blue"></i></a></h3>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<p>Are you sure you want to delete this version and all data?</p>' +
                '</div>' +
                '<div class="modal-footer">' +
                    '<a href="#" class="btn btn-danger confirm-delete-version">Yes, Delete</a>' +
                    '<a href="#" class="btn" data-dismiss="modal">Cancel</a>' +
                '</div>' +
            '</div>'
        ),

        events: {
            'click .confirm-delete-version': 'deleteVersion'
        },

        render: function () {
            var $dom = $(this.template({ Name: this.config.view.model.get('name') })),
                self = this;
            this.setElement($dom[0]);
            assemble.help.mainrepository.load(function (helpConfig) {
                self.helpLink = new assemble.help.KeyView({ model: helpConfig, el: $dom.find(".help-link")[0], key: "13007" });
            });
            this.$el.modal();
        },

        deleteVersion: function (event) {
            event.preventDefault();
            this.config.view.model.destroy({
                wait: true,
                success: function () {
                    assemble.status.update("The version was deleted.");
                },
                error: function (state, response) {
                    assemble.status.updateFromResponseError(response);
                }
            });
            this.$el.modal('hide');
        }
    });

    versions.EditVersionModalView = Backbone.View.extend({

        initialize: function (config) {
            this.config = config;
        },

        render: function () {
            var url = assemble.mvcRoutes.modelVersionEditModal({ id: this.config.view.model.id });
            var $dom = null;
            var self = this;
            $.ajax({
                url: url,
                success: function (data) {
                    $dom = $(data);
                    assemble.help.mainrepository.load(function (helpConfig) {
                        self.helpLink = new assemble.help.KeyView({ model: helpConfig, el: $dom.find(".help-link")[0], key: "13002" });
                    });
                    self.setElement($dom);
                    self.$el = $dom;
                    self.$form = $dom.find("form");
                    self.$el.modal();
                }
            });
        },

        show: function () {
            this.render();
        },

        events: {
            "click .edit-model-save-button": "save",
            "click .edit-model-cancel-button": "cancel"
        },

        save: function (evt) {
            evt.preventDefault();
            var self = this;

            if (this.$form.validate().form()) {
                var formData = this.$form.toObject();
                _.defaults(formData, { Comments: "" });
                var saveData = {};
                _.each(formData, function (value, key, obj) { //HACK!!! this is for backbone (client) lower case versus ViewModel on server upper case
                    saveData[key.toLowerCase()] = value;
                });
                this.config.view.model.save(saveData, {
                    wait: true,
                    success: function () {
                        self.$el.modal('hide');
                        assemble.status.update("The version was saved.");
                    },
                    error: function (state, response) {
                        assemble.status.updateFromResponseError(response);
                    }
                });
            }
        },

        cancel: function (evt) {
            evt.preventDefault();
            this.$el.modal('hide');
        }
    });
} ());