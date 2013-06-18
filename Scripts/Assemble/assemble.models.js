(function ($) {
    var models = assemble.models = {};

    models.Model = Backbone.Model.extend({
        methodUrl: {}
    });

    models.Collection = Backbone.Collection.extend({
        model: models.Model,
        url: '/Models',
        comparator: function (model) {
            return model.get("Name").toLowerCase();
        }
    });

    models.View = Backbone.View.extend({

        initialize: function () {
            this.template = Handlebars.templates.models.listItem;
        },

        watchingNameChange: false,

        events: {
            "click .project-model": "select",
            "click .project-model .delete-button": "verifyDelete"
        },

        render: function () {
            this.setElement($(this.template(this.model.toJSON())));
            return this;
        },

        select: function (event) {
            event.preventDefault();
            this.trigger('select', this.model);
        },

        verifyDelete: function (event) {
            event.preventDefault();
            event.stopPropagation();
            var deleteModal = new models.DeleteModelModalView({ view: this });
            deleteModal.render();
        },

        deleteMe: function () {
            this.model.destroy();
        }
    });

    models.ListView = Backbone.View.extend({
        initialize: function (config) {
            var self = this;

            this.sidebarSection = this.$(".sidebar-section-list");

            this.collection.bind('remove', function () { self.remove(); });
            this.collection.bind('reset', function () { self.render(); });
        },

        events: {
            "click .show-edit": "showEdit",
            "click .hide-edit": "hideEdit"
        },

        render: function () {
            this.sidebarSection.empty();
            this.addAll();
            return this;
        },

        addOne: function (modelView) {
            var view = new models.View({ model: modelView });
            view.on('select', this.select, this);
            this.sidebarSection.append(view.render().el);
        },

        addAll: function () {
            var self = this;
            this.collection.each(function (item) {
                self.addOne.call(self, item);
            });
        },

        select: function (model) {
            this.trigger('select', model);
        },

        showEdit: function (event) {
            event.preventDefault();
            this.$el.addClass('edit-mode');
        },

        hideEdit: function (event) {
            event.preventDefault();
            this.$el.removeClass('edit-mode');
        },

        remove: function (event) {
            this.render();
            // take care of none case
        }
    });

    models.MainView = Backbone.View.extend({
        initialize: function (config) {
            // happens once on explorer initialize

            this.project = config.project;

            // views sidebar section setup
            // TODO: create this from scratch, not part in page, and do it entirely new each time
            this.modelSidebar = $('#model_nav');

            // setup model-level components
            this.versions = new assemble.versions.VersionsCollection([]);
            this.viewsList = new assemble.views.ListView({ el: $("#model_views_list") });
            this.viewsList.on('select', this.selectView, this);

            // setup views
            this.modelDashboard = new models.DashboardView({ el: $("#model_dashboard") });
            this.currentView = new assemble.views.CurrentView({ el: $("#model_viewer"), versionsCollection: this.versions, viewsList: this.viewsList, project: this.project });
        },

        selectView: function (view) {
            this.showView(view);
            assemble.router.navigate("Models/" + this.model.get('id') + '/Views/' + view.get('Id'));
            assemble.explorer.view.updateState('model:view');
        },

        hide: function () {
            this.$el.hide();
            this.showModelSidebar(false);
            this.currentView.hide();
            this.modelDashboard.hide();
            this.unload();
        },

        unload: function () {
            this.viewsList.unload();
        },

        updateModel: function (model) {
            // TODO: this is what we should do, get data for:
            //   * dashboard, like activity (description and other metadata needs to be stored in the assemble.model.Model object
            //   * views, to show in list
            //   * versions, to load into the dashboard and dropdowns for version chooser and version compare
            // this is what we're doing for now
            var self = this;
            this.model = this.versions.projectModel = this.modelDashboard.model = this.currentView.projectModel = model;
            this.model.set('versions', this.versions);
            this.versions.on("destroy", function (destroyedVersion) {
                if (self.versions.length <= 0) { //deleted last version, hide views
                    self.viewsList.removeAll();
                }
            });

            // returning the xhr objects so we can do some deferred action on them
            return [this.viewsList.updateModel(model), this.versions.fetch()];
        },

        navigateModelDashboard: function (model) {
            $.when.apply(this, this.updateModel(model))
                .then(_.bind(this.showModelDashboard, this));
        },

        navigateView: function (model, viewName) {
            var self = this;
            $.when.apply(this, this.updateModel(model))
                .then(function () { self.showView(viewName); });
        },

        navigateVersion: function (model, versionName) {
            var self = this;
            $.when.apply(this, this.updateModel(model))
                .then(function () { self.showVersion(versionName); });
        },

        showModelDashboard: function () {
            this.currentView.hide();
            this.modelDashboard.render().show();
            this.$el.show();
            this.showModelSidebar();
        },

        showView: function (view) {
            view = $.isNumeric(view) || (typeof view == 'string') ? this.viewsList.collection.get(+view) : view;
            if (!view) {
                assemble.router.navigate("/Models/" + this.model.get('id'), { trigger: true });
                assemble.status.update("Cannot find that view");
                return;
            }

            this.modelDashboard.hide();
            this.viewsList.markSelected(view.get('Id'));
            this.currentView.show(view);
            this.$el.show();
            this.showModelSidebar();
        },

        showVersion: function (version) {
            version = $.isNumeric(version) || (typeof version == 'string') ? this.versions.where({ versionNumber: +version })[0] : version;
            if (!version) {
                assemble.router.navigate("/Models/" + this.model.get('id'), { trigger: true });
                assemble.status.update("Cannot find that version");
                return;
            }

            this.modelDashboard.hide();
            this.viewsList.markSelected(0);
            this.currentView.show(this.viewsList.collection.get(0), version);
            this.$el.show();
            this.showModelSidebar();
        },

        showModelSidebar: function (show) {
            show = show || show === undefined ? true : false;
            if (show) {
                this.modelSidebar.css({ 'left': 0, 'visibility': 'visible' });
            } else {
                this.modelSidebar.css({ 'left': 326, 'visibility': 'hidden' });
            }
        },

        navigateModel: function (model) {
            this.trigger('navigate:model', model);
        }
    });

    models.DashboardView = Backbone.View.extend({

        initialize: function (config) {
            this.template = Handlebars.templates.models.dashboard;
            this.logicSwitch = new assemble.logicSwitch(function () {
                this.model.bind("change:Name change:Description", this.render, this);
                var versionsCollection = this.model.get("versions");
                versionsCollection.on("remove", this.renderVersions, this);
            }, function () {
                this.model.unbind("change:Name change:Description", this.render, this);
                var versionsCollection = this.model.get("versions");
                versionsCollection.off("remove", this.renderVersions, this);
            }, this);
        },

        events: {
            "click .edit-model-link": "editModel"
        },

        render: function () {
            this.logicSwitch.on();
            this.$el.html(this.template(this.model.toJSON()));
            this.renderVersions();
            return this;
        },

        renderVersions: function () {
            var self = this;
            this.versionsList = this.$('.versions-list').empty();
            var versionsCollection = this.model.get('versions');
            var noVersionsLabel = $(".no-versions-label");

            if (versionsCollection.length > 0) {
                versionsCollection.each(function (version) {
                    var view = new assemble.versions.View({ model: version });
                    self.versionsList.append(view.render().el);
                    view.on('show', self.showVersion, self);
                });
                noVersionsLabel.hide();
            }
            else {
                noVersionsLabel.show();
            }
        },

        setModel: function (model) {
            this.model = model;

        },

        show: function () {
            this.$el.show();
            this.logicSwitch.on();
        },

        showVersion: function (version) {
            assemble.router.navigate("Models/" + this.model.get('id') + "/Versions/" + version.get('versionNumber'), { trigger: true });
        },

        hide: function () {
            this.$el.hide().empty();
            this.logicSwitch.off();
        },

        editModel: function (evt) {
            //show modal here
            evt.preventDefault();
            var modal = new models.EditModelModalView({ view: this });
            modal.show();
        }
    });

    models.DeleteModelModalView = Backbone.View.extend({
        initialize: function (config) {
            this.view = config.view;
        },

        template: _.template(
            '<div id="delete_model_modal" class="modal" style="display: none;">' +
                '<div class="modal-header">' +
                    '<a class="close" data-dismiss="modal">×</a>' +
                    '<h3>Delete <%= Name %> </span></h3>' +
                '</div>' +
                '<div class="modal-body">' +
                    '<p>Are you sure you want to delete this model and all data and versions associated with it?</p>' +
                '</div>' +
                '<div class="modal-footer">' +
                    '<a href="" class="btn btn-danger confirm-delete-model">Yes, Delete</a>' +
                    '<a href="#" class="btn" data-dismiss="modal">Cancel</a>' +
                '</div>' +
            '</div>'
        ),

        events: {
            'click .confirm-delete-model': 'deleteModel'
        },

        render: function () {
            this.setElement($(this.template({ Name: this.view.model.get('Name') })));
            this.$el.modal();
        },

        deleteModel: function (event) {
            event.preventDefault();
            this.view.deleteMe();
            this.$el.modal('hide');
            this.remove(event);
        }
    });

    models.EditModelModalView = Backbone.View.extend({

        initialize: function (config) {
            this.config = config;
        },

        render: function () {
            var url = assemble.mvcRoutes.modelEditModal({ id: this.config.view.model.id });
            var $dom = null;
            var self = this;
            $.ajax({
                url: url,
                success: function (data) {
                    $dom = $(data);
                    self.setElement($dom[0]);
                    assemble.help.mainrepository.load(function (helpConfig) {
                        self.helpLink = new assemble.help.KeyView({ model: helpConfig, el: $dom.find(".help-link")[0], key: "13001" });
                    });
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
                var formObject = this.$form.toObject();
                _.defaults(formObject, { Description: "" });
                this.config.view.model.save(formObject, {
                    wait: true,
                    success: function () {
                        self.$el.modal('hide');
                        assemble.status.update("The model was saved.");
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

} (jQuery));