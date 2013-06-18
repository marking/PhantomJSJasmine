(function (assemble, $, undefined) {
    var explorer = assemble.explorer = {};

    explorer.View = Backbone.View.extend({
        initialize: function (config) {
            var self = this;
            this.setElement($(document.body));
            var projectData = _.extend(config.project, { models: new assemble.models.Collection(config.models) });
            this.project = new assemble.projects.Model(projectData);

            this.explorerBody = $('.explorer-body');
            this.mainContent = $('.main-content');
            this.sidebar = $('#left_sidebar');
            this.toggler = $('#toggle_sidebar').find('i');

            // breadcrumbs
            this.breadcrumbs = new explorer.BreadcrumbView({ el: $('#nav_breadcrumbs') });

            this.projectSettings = (new assemble.projectSettings.View({ model: this.project, activeUsers: config.activeUsers, inactiveUsers: config.inactiveUsers, assemblyCodesInfo: config.assemblyCodesInfo })).render();

            // projectDashboard
            this.projectDashboard = new assemble.projects.DashboardView({
                project: this.project,
                projectSettings: this.projectSettings,
                models: config.models,
                el: $('#project_dashboard')
            }).render();

            // modelDashboard
            this.modelView = new assemble.models.MainView({ el: $("#model_main_view"), project: this.project });

            // handle tour displaying
            assemble.app.on('tour.start', this.showSidebar, this);

            // sizing
            $(window).bind('resize', function () { self.resizeBody(); });
            assemble.app.on('details:toggled', this.resizeBody, this);

            this.showSidebar(true);
            this.resizeBody();
        },

        events: {
            "click #toggle_sidebar": "toggleSidebar"
        },

        showProjectDashboard: function () {
            this.breadcrumbs.hideModelBreadcrumb();
            this.modelView.hide();
            this.projectSettings.hide();
            this.projectDashboard.show();
            this.updateState('project:dashboard');
        },

        showProjectSettings: function (page) {
            this.breadcrumbs.hideModelBreadcrumb();
            this.modelView.hide();
            this.projectDashboard.hide();
            this.projectSettings.show(page);
            this.updateState('project:settings');
        },

        showModelDashboard: function (model) {
            this.breadcrumbs.updateModel(model);
            this.projectDashboard.hide();
            this.projectSettings.hide();
            this.modelView.navigateModelDashboard(model);
            this.updateState('model:dashboard');
        },

        showView: function (model, viewId) {
            this.breadcrumbs.updateModel(model);
            this.projectDashboard.hide();
            this.projectSettings.hide();
            this.modelView.navigateView(model, viewId);
            this.updateState('model:view');
        },

        showVersion: function (model, versionId) {
            this.breadcrumbs.updateModel(model);
            this.projectDashboard.hide();
            this.projectSettings.hide();
            this.modelView.navigateVersion(model, versionId);
            this.updateState('model:view');
        },

        updateState: function (state) {
            this.state = state;
        },

        sidebarShrunkenByUser: false,

        sidebarExpanded: true,

        sizes: {
            windowShrinkAt: 1024,
            sidebarWidth: 325,
            shrunkenSidebarWidth: 30,
            detailsWidthPercent: 0.35,
            maxDetailsSize: 450
        },

        windowTooSmall: function () {
            return $(window).width() <= this.sizes.windowShrinkAt;
        },

        showSidebar: function (show, resize) {
            resize = resize || resize === undefined ? true : false;
            show = show || show === undefined ? true : false;

            if (show && this.windowTooSmall() && this.modelView.currentView.detailsPane.shown) {
                this.modelView.currentView.toggleDetails({noBubble: true});
            }

            this.explorerBody.toggleClass('show-sidebar', show);
            this.mainContent.css('left', (show ? this.sizes.sidebarWidth : this.sizes.shrunkenSidebarWidth));

            this.sidebarExpanded = show;

            if (resize) this.resizeBody();

            if (show) {
                this.toggler
                    .addClass('icon-chevron-left')
                    .removeClass('icon-chevron-right');
            } else {
                this.toggler
                    .addClass('icon-chevron-right')
                    .removeClass('icon-chevron-left');
            }
        },

        toggleSidebar: function () {
            this.sidebarShrunkenByUser = this.sidebarExpanded;
            this.showSidebar(!this.explorerBody.hasClass('show-sidebar'));
        },

        resizeBody: function (options) {
            options = options || {};
            var mainLeftPosition,
                theRestWidth,
                mainWidth;

            if (this.modelView.currentView.detailsPane.shown) {
                if (this.windowTooSmall()) {
                    this.showSidebar(false, false);
                } else if (!this.sidebarShrunkenByUser && !this.sidebarExpanded) {
                    this.showSidebar(true, false);
                }
            } else if (!this.sidebarShrunkenByUser && !this.sidebarExpanded) {
                this.showSidebar(true, false);
            }

            mainLeftPosition = this.sidebarExpanded ? this.sizes.sidebarWidth : this.sizes.shrunkenSidebarWidth;
            mainWidth = theRestWidth = this.explorerBody.width() - mainLeftPosition;
            
            this.mainContent.css({ width: mainWidth, left: mainLeftPosition });
            
            assemble.app.trigger("explorer:mainContentResized", { width: mainWidth });
        }

    });

    explorer.BreadcrumbView = Backbone.View.extend({

        shown: false,
        currentModel: null,

        initialize: function () {
            this.modelBreadcrumb = this.$('#model_breadcrumb');
        },

        subscribe: function () {
            if (!this.shown) {
                this.currentModel.bind("change:Name", this.render, this);
                this.shown = true;
            }
        },

        unsubscribe: function () {
            if (this.shown) {
                this.currentModel.unbind("change:Name", this.render, this);
                this.shown = false;
            }
        },

        events: {
            'click #project_home': 'navigateProject',
            'click .project-model': 'navigateModel'
        },

        navigateProject: function (event) {
            event.preventDefault();
            assemble.router.navigate("", { trigger: true });
        },

        navigateModel: function (event) {
            event.preventDefault();
            assemble.router.navigate(encodeURI("Models/" + $(event.currentTarget).attr('data-id')), { trigger: true });
        },

        updateModel: function (model) {
            this.currentModel = model;
            this.render();
            //this.unsubscribe();
            this.subscribe();
        },

        render: function () {
            var link = $(Handlebars.templates.models.breadcrumb(_.extend(this.currentModel.toJSON(), { labelTemplate: 'models.datasourceLabel.' + this.currentModel.get('Datasource') })));

            this.modelBreadcrumb
                .html(link)
                .show();
        },

        hideModelBreadcrumb: function () {
            this.modelBreadcrumb.hide();
            this.unsubscribe();
        },

        selectSettings: function (select) {
            this.$('#project_settings_breadcrumb').toggleClass('selected', select);
        }

    });

    // create the routes we want to load dynamically and bookmark for the project explorer
    var Router = Backbone.Router.extend({
        routes: {
            "": "projectDashboard",
            "Settings/:page": "projectSettings",
            "Settings": "projectSettings",
            "Settings/": "projectSettings",
            "Models/:id": "modelDashboard",
            "Models/:id/Views/:viewId": "modelView",
            "Models/:id/Versions/:versionId": "modelVersion"
        },

        projectDashboard: function () {
            assemble.explorer.view.showProjectDashboard();
        },

        projectSettings: function (page) {
            if (assemble.accounts.currentUser.IsProjectAdministrator(assemble.explorer.view.project.get('id'))) {
                assemble.explorer.view.showProjectSettings(page);
            } else {
                assemble.status.update("You must be a project administrator for this project to get to Project Settings", "error");
                this.projectDashboard();
            }
            
        },

        modelDashboard: function (modelId) {
            var model = this.getModelById(modelId);

            if (model) {
                assemble.explorer.view.showModelDashboard(model);
            } else {
                this.projectDashboard();
                assemble.status.update("That model does not exist in this project");
            }
        },

        modelView: function (modelId, viewId) {
            var model = this.getModelById(modelId);

            if (model) {
                assemble.explorer.view.showView(model, viewId);
            } else {
                this.projectDashboard();
                assemble.status.update("That model does not exist in this project");
            }
        },

        modelVersion: function (modelId, versionId) {
            var model = this.getModelById(modelId);
            if (model) {
                assemble.explorer.view.showVersion(model, versionId);
            } else {
                this.projectDashboard();
                assemble.status.update("That model does not exist in this project");
            }
        },

        getModelById: function (modelId) {
            return assemble.explorer.view.project.get('models').get(modelId);
        }
    });
    assemble.router = new Router();

} (window.assemble, jQuery));