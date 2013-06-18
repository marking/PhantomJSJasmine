(function () {
    var views = assemble.views = {};

    // Backbone Model for ModelViews, e.g. for use in sidebar list
    // e.g. {id: 1, name: "Quantity Takeoff"}
    views.Model = Backbone.Model.extend({
        defaults: {
            active: false
        },

        idAttribute: 'Id',

        methodUrl: {
            'create': '/Takeoffs/Create',
            'delete': '/Takeoffs/:id'
        },

        sync: function (method, model, options) {
            if (model.methodUrl && model.methodUrl[method.toLowerCase()]) {
                options = options || {};
                options.url = model.methodUrl[method.toLowerCase()];
                if (options.url.indexOf(':id')) {
                    options.url = options.url.replace(':id', this.id);
                }
            }
            Backbone.sync(method, model, options);
        }
    });

    // backbone collection for housing View models
    views.Collection = Backbone.Collection.extend({
        model: views.Model,

        comparator: function (modelView) {
            return modelView.get("Name").toLowerCase();
        }
    });

    assemble.views.View = Backbone.View.extend({
        initialize: function () {
            this.template = Handlebars.templates.views.listItem;
            this.model.on('change', function () {
                this.render();
                assemble.status.update('Changes saved.', 'success');
            }, this);
            this.setElement($('<li></li>'));
        },

        events: {
            "click [data-action=edit]": "edit",
            "click [data-action=delete]": "verifyDelete",
            "click [data-action=update]": "update",
            "click .slide-menu": "nothing",
            "click .model-view": "select",
            "click .btn-primary": "saveEdit",
            "click .btn-cancel": "reset",
            "click .model-view .delete-button": "verifyDelete"
        }
    });

    _.extend(assemble.views.View.prototype, {
        render: function () {
            var el = $(this.template(this.model.toJSON())),
                wasActive = this.$el.hasClass("active"),
                toolbarWasOpen = this.$('.slide-menu').hasClass('active');

            this.$el.replaceWith(el);
            this.setElement(el);
            if (wasActive) this.markSelected();

            this.menu = this.$(".slide-menu");
            if (toolbarWasOpen) this.menu.addClass('active');
            this.menu.slideMenu();

            this.showGridMenu(assemble.explorer.view.state == 'model:view');

            $.validator.unobtrusive.parse(this.$el);

            return this;
        },

        select: function (event) {
            if (event) event.preventDefault();
            this.markSelected();
            this.trigger('select', this.model);
        },

        markSelected: function () {
            this.$el.radioClass('active');
        },

        deselect: function () {
            this.$el.removeClass('active');
        },

        edit: function (event) {
            this.$el.attr("data-mode", "edit");
            this.$('input').focus();
        },

        saveEdit: function (event) {
            event.preventDefault();
            var form = this.$("form");
            if (!form.valid()) return;
            this.model.save(form.serializeObject());
        },

        update: function (event) {
            var state = assemble.explorer.view.modelView.currentView.getSaveState();
            this.model.save(state);
        },

        reset: function (event) {
            event.preventDefault();
            this.$('input').val(this.model.get('Name'));
            this.$('form').valid();
            this.$el.attr("data-mode", "normal");
        },

        showGridMenu: function (toggle) {
            this.menu
                    .toggleClass('showing-grid', toggle)
                    .slideMenu('resetPosition');
        },

        verifyDelete: function (event) {
            event.preventDefault();
            event.stopPropagation();
            var deleteModal = new assemble.views.DeleteModalView({ view: this });
            deleteModal.render();
        },

        deleteMe: function () {
            this.model.destroy();
            this.$el.remove();
            this.unload();
        },

        nothing: function (event) {
            event.preventDefault();
            event.stopPropagation();
        },

        unload: function () {
            this.off();
            this.$el.off().remove();
        }
    });

    assemble.views.ListView = Backbone.View.extend({
        views: {},

        initialize: function (config) {
            this.sidebarSection = this.$(".sidebar-section-list");
            this.saveView = this.$("#save_current_view");

            this.collection = new assemble.views.Collection();
            this.collection.bind('add reset', this.render, this);
            this.collection.bind('remove', this.remove, this);
        },

        events: {
            "click .show-copy": "showCopy",
            "click .show-save-form": "showSave",
            "click .hide-save": "hideSave",
            "click #save_current_view .btn-primary": "createView"
        }
    });

    _.extend(assemble.views.ListView.prototype, {
        render: function () {
            this.sidebarSection.empty();
            this.addAll();
            if (this.selected) {
                this.markSelected(this.selected.get('Id'));
            }

            return this;
        },

        updateModel: function (model) {
            this.projectModel = model;

            // update the collection, which calls render
            this.collection.url = '/Models/' + model.id + '/Takeoffs';
            return this.collection.fetch();
        },

        removeAll: function () {
            this.collection.reset();
            this.render();
        },

        addOne: function (modelView) {
            var view = new assemble.views.View({ model: modelView });
            view.on('select', this.itemSelected, this);

            this.views[modelView.get('Id')] = view;
            this.sidebarSection.append(view.render().el);
        },

        addAll: function () {
            var self = this;
            this.collection.each(function (item) {
                self.addOne.call(self, item);
            });
        },

        markSelected: function (viewId) {
            this.views[viewId].markSelected();
            this.selected = this.collection.get(viewId);
        },

        itemSelected: function (view) {
            this.trigger('select', view);
        },

        showEdit: function (event) {
            event.preventDefault();
            this.$el.addClass('edit-mode');
        },

        hideEdit: function (event) {
            event.preventDefault();
            this.$el.removeClass('edit-mode');
        },

        showSave: function (event) {
            if (event) event.preventDefault();
            if (this.saveView.hasClass('disabled')) return;
            this.saveView.find('.save-form').slideDown('fast');
            this.saveView.find('input').focus();
        },

        hideSave: function (event) {
            if (event) event.preventDefault();
            this.saveView.find('.save-form').slideUp('fast');
            this.saveView.find('form [name=name]').val('');
        },

        enableSave: function (toggle) {
            if (!toggle) this.hideSave();
            this.saveView.toggleClass('disabled', !toggle);
        },

        createView: function (event) {
            event.preventDefault();
            var name = this.saveView.find('form [name=name]').val(),
                self = this;

            this.hideSave();
            var viewState = _.extend(assemble.explorer.view.modelView.currentView.getSaveState(), { name: name });

            this.collection.create(viewState, {
                wait: true,
                silent: true,
                success: function (view) {
                    assemble.grid.setNewlyCreatedView(view);
                    assemble.explorer.view.modelView.currentView.setView(view);

                    self.selected = view;
                    self.updateUrl();
                    self.collection.trigger('add', view);
                }
            });
        },

        showCopy: function (e) {
            e.preventDefault();
            var copyModal = new assemble.views.CopyModalView({ projectModel: this.projectModel });
            copyModal
                .render()
                .on('save', this.createFromExisting, this);
        },

        createFromExisting: function (views) {
            this.collection.add(views)//console.log(views);
        },

        updateUrl: function () {
            assemble.router.navigate("Models/" + this.projectModel.get('id') + "/Views/" + this.selected.get('Id'));
            assemble.explorer.view.updateState("model:view");
        },

        remove: function (removedView) {
            if (this.selected == removedView) {
                var toSelect = this.views[0] || this.collection.first();
                toSelect.select();
            }
        },

        showingGrid: function (showing) {
            _.each(this.views, function (view) {
                view.showGridMenu(showing);
                if (!showing) view.deselect();
            });
        },

        unload: function () {
            _.each(this.views, function (view) {
                view.unload();
            });
            this.selected = null;
        }
    });

    assemble.views.DeleteModalView = Backbone.View.extend({
        initialize: function (params) {
            this.view = params.view;
        },

        template: _.template(
            '<div id="delete_view_modal" class="modal" style="display: none;">' +
            '<div class="modal-header">' +
            '<a class="close" data-dismiss="modal">×</a>' +
            '<h3>Delete <%= Name %> </span></h3>' +
            '</div>' +
            '<div class="modal-body">' +
            '<p>Are you sure you want to delete this view?</p>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<a href="" class="btn btn-danger confirm-delete-view">Yes, Delete</a>' +
            '<a href="#" class="btn" data-dismiss="modal">Cancel</a>' +
            '</div>' +
            '</div>'
            ),

        events: {
            'click .confirm-delete-view': 'deleteView'
        },

        render: function () {
            this.setElement($(this.template({ Name: this.view.model.get('Name') })));
            this.$el.modal();

            return this;
        },

        deleteView: function (event) {
            event.preventDefault();
            this.view.deleteMe();
            this.$el.modal('hide');
            this.remove(event);
        }
    });

    views.CopyModalView = Backbone.View.extend({
        initialize: function (config) {
            this.projectModel = config.projectModel;
        },

        warnedOnce: false,

        events: {
            'click .btn-primary': 'save'
        },

        render: function () {
            var self = this;
            this.setElement(assemble.modal.create({ id: "copy_views_modal", title: "Import Views", primaryButtonText: "Import" }));
            this.$(".modal-body").append(Handlebars.templates.views.copyViewsForm(), Handlebars.templates.details.loadMask({}));

            this.xhr = $.ajax('/copies', {
                success: function (response) {
                    self.renderTree(response);
                    self.$('.load-mask').hide();
                }
            });

            // eventually ajax to load items
            this.$el
                    .modal()
                    .on('hidden', function () { self.unload(); })
                    .modal('show');

            return this;
        },

        renderTree: function (projects) {
            var treeData = _.map(projects, jstreeifyProject),
                self = this;

            this.tree = this.$("#select_views_tree").jstree({
                json_data: { data: treeData },
                themes: {
                    theme: 'assemble',
                    dots: false,
                    icons: false
                },
                core: { html_titles: true, animation: 0 },
                plugins: ["themes", "json_data", "checkbox"]
            });

            this.tree
                .on('change_state.jstree', function () { self.selectionChanged(); })
                .on('click', function (e) { e.preventDefault(); });

            return this.tree;

            // functions used to format data for use in jstree

            function jstreeifyProject(project) {
                var noneLabel = project.Models.length ? '' : ' <span class="meta">(no models)</span>';

                return {
                    data: project.Name + noneLabel,
                    metadata: { id: project.Id },
                    attr: { "data-selectable": false, "data-type": 'header', "data-name": project.Name },
                    children: _.map(project.Models, jstreeifyModel)
                };
            }

            function jstreeifyModel(model) {
                var label = Handlebars.templates.models.datasourceLabel[model.DataSource]({ dampen: true }),
                    noneLabel = model.Views.length ? '' : ' <span class="meta">(no views)</span>';

                return {
                    data: model.Name + ' ' + label + noneLabel,
                    metadata: { id: model.Id },
                    attr: { "data-selectable": false, "data-source": model.DataSource, "data-name": model.Name },
                    children: _.map(model.Views, jstreeifyView)
                };
            }

            function jstreeifyView(view) {
                return {
                    data: view.Name,
                    metadata: { id: view.Id },
                    attr: {
                        "data-selectable": true,
                        "data-type": "item",
                        "data-name": view.Name
                    }
                };
            }
        },

        selectionChanged: function () {
            this.validate();
        },

        getSelected: function () {
            return $.makeArray(this.tree.jstree('get_checked', null, true)
                                    .filter('[data-type=item]')
                                    .map(function () { return $(this).data("id"); }));
        },

        save: function (event) {
            event.preventDefault();
            var self = this,
                viewsToCopy = this.getSelected();

            if (!this.validate({ force: true })) return;

            this.$('.load-mask-message').html('Saving&hellip;');
            this.$('.load-mask').show();
            $.ajax('/copies/duplicate', {
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    modelId: this.projectModel.get('id'),
                    views: viewsToCopy
                }),
                success: function (copiedViews) {
                    self.trigger('save', copiedViews);
                    assemble.status.update('Views copied and added successfully.', 'success');
                    self.$el.modal('hide');
                },
                error: function () {
                    self.$el.model('hide');
                }
            });
        },

        validate: function (options) {
            options = options || {};
            var valid = this.getSelected().length;

            if (!valid && (options.force || this.warnedOnce)) {
                this.$(".control-group").addClass('error').show();
                this.warnedOnce = true;
            } else if (valid) {
                this.$(".control-group").removeClass('error').hide();
            }

            return valid;
        },

        nothing: function (e) {
            e.preventDefault();
            e.stopPropagation();
        },

        unload: function () {
            if (this.xhr) this.xhr.abort();
            this.off();
        }
    });

    views.CurrentView = Backbone.View.extend({
        rendering: false,
        showViewer: false,

        initialize: function (config) {
            var self = this;
            this.project = config.project;

            this.detailsPane = new assemble.details.View({ el: $("#details_pane"), project: this.project });
            this.detailsPane
                .on('show', this.showDetails, this)
                .on('hide', this.hideDetails, this);
            this.gridPane = this.$("#grid_pane");
            this.gridAndViewer = this.$("#grid_and_viewer");

            this.statusBar = (new views.StatusBar()).render();
            this.viewsList = config.viewsList;

            // selected versions
            this.versions = new assemble.versions.VersionHeaderView({
                el: $("#view_version"),
                versions: config.versionsCollection
            });

            // on changes, runAdHoc, only run adhoc if we are not comparing
            this.versions.selectedVersions.on('change', function (changed) {
                //ignore this if it happened during being set during rendering
                if (!self.rendering) self.runAdHoc();
                
                if (self.viewer) {
                    self.viewer.makeInvalid();
                    self.updateViewerVarianceMessage();
                    self.viewer.clearCurrentSelections();
                }
                
                self.currentModelVersion = _.find(self.versions.collection.models, function (v) { return v.id == self.versions.selectedVersions.get("selected"); });
                var $showEstimateWindow = self.$('#show_estimate_window');

                if (!self.currentModelVersion.get("canEstimate") || self.versions.selectedVersions.get("compared")) {
                    
                    $showEstimateWindow.addClass("disabled");
                    $showEstimateWindow.prop("disabled", true);
                }
                else {
                    $showEstimateWindow.removeClass("disabled");
                    $showEstimateWindow.removeProp("disabled");
                }
            }, this);

            this.versions.render();

            // filters
            this.filtersSidebar = new assemble.filters.FilterListView({ el: $("#view_filters") });
            this.filtersSidebar.on('change:varianceFilters', function () {
                if (!self.rendering) {
                    self.grid.$grid.setGridParam({ postData: { parentId: null } });
                    self.updateGrid({ clearSelection: true, dataFiltered: true });
                }
            });
            this.filters = this.filtersSidebar.collection;
            // TODO: change filters.reset and filtersSidebar.set* to not trigger the filters.changed event so we don't have to use self.rendering
            this.filters.on("filters.changed", function () {
                if (!self.rendering) {
                    self.grid.$grid.setGridParam({ postData: { parentId: null } });
                    self.updateGrid({ clearSelection: true, dataFiltered: true, clearSelectionCache: true });
                }
            });

            // groupby
            // TODO: this is way too much code in the intialize, need to move it out into its own function
            this.groupBys = new assemble.groupBy.chooserView({ element: "#group_by_chooser" }); // assemble.groupBy.initialize();
            this.groupBys.on("groupBy.changed",
                function (data) {
                    if (!self.rendering) {
                        //Validate this group by , if its valid continue, if its not valid then show message
                        //non-async get 
                        var groupingValidation = { valid: false };
                        $.ajax({
                            url: assemble.mvcRoutes.versionValidGrouping(),
                            data: { groupingId: data.groupBy, modelVersionId: self.versions.getSelected().get('id') },
                            async: false,
                            success: function (result) {
                                groupingValidation = result;
                            }
                        });

                        if (!groupingValidation.valid) {
                            assemble.status.update(groupingValidation.message);
                            this.changeChoice(self.selectedGrouping, { silent: true });
                        }
                        else {
                            self.setGrouping(data.groupBy);

                            //changing the group by resets the expandlevel
                            // TODO: this is ugh, but one day we'll backbone the group by stuff
                            var groupByData = _.find(self.groupBys.groupBys, function (groupBy) { return groupBy.Id == self.selectedGrouping; });
                            var maxLevel = groupByData ? groupByData.Properties.split('@_FieldSeparator_@').length : 0;
                            self.setExpandCollapse(0, maxLevel);

                            self.updateGrid({ clearSelection: true, clearSelectionCache: true });
                        }
                    }
                });

            // columns
            this.columns = new assemble.columns.ColumnsCollection({ versions: this.versions.selectedVersions });
            this.columns.on('columns.changed', this.runAdHoc, this);

            // expand/collapse
            this.expandLevelButton = this.$('#expand_level');
            this.collapseLevelButton = this.$('#collapse_level');
            this.on("grid:beforeLoad", this.disableLevelButtons);
            this.on("grid:loadComplete", this.setExpandButtonState);

            // export
            this.exportSidebar = new views.ExportToolsList({ el: $('#export_tools'), currentView: this });
            this.exportSidebar.render();
            this.exportSidebar.on('select', this['export'], this);

            this.addRemoveColumnsButton = this.$('#add_remove_columns');

            this.layoutChooser = new views.LayoutChooser({ versions: this.versions }).render();
            this.layoutChooser
                .on('change', this.changeLayout, this)
                .$el.insertBefore("#show_details");

            // show details button
            this.toggleDetailsButton = this.$('#show_details');
        },

        events: {
            'click #expand_level': 'expandLevel',
            'click #collapse_level': 'collapseLevel',
            'click #add_remove_columns': 'openAddRemoveColumnsView',
            'click #show_details': 'toggleDetailsButtonPressed',
            'click #expand_all': 'expandAll',
            'click #export_fitnesse': 'exportToFitNesse',
            'click #export_fitnesse_without_defaults': 'exportToFitNesseNoDefaults',
            'click #show_estimate_window': 'showEstimateWindowButtonPressed'
        },

        render: function (config) {
            var self = this;

            assemble.tour.unload();
            if (!assemble.accounts.currentUser.get('HasSeenGuide')) {
                this.showTour();
            }

            // TODO: provide the option to not trigger an event in each of the following components during resetting/rerendering
            //     so we don't have to use this.rendering
            this.rendering = true;
            // any time we need to refresh the grid, rebuild the components

            //   filter
            //     refresh available properties
            //     rebuild selectedFilters
            this.filtersSidebar.update(config);

            //   groupby
            this.groupBys.setModelVersion(config.selected);
            this.groupBys.render({ selectedGrouping: config.selectedGrouping });
            this.selectedGrouping = config.selectedGrouping;

            //   selected versions
            //don't want event fired here.  --using rendering flag
            this.versions.render();
            this.versions.setVersionSelection({ selected: config.selected, compared: config.compared }, { silent: true });

            // columns
            this.columns.setSelectedList(config.additionalColumns || []);
            this.columns.setShowDeltaOnly(config.showDeltaOnly);

            // grid
            if (this.grid) this.grid.off();

            this.grid = assemble.grid.initialize({
                id: config.gridId,
                viewId: config.viewId,
                versionId: config.selected,
                usingCompare: !(_.isNull(config.compared) || _.isUndefined(config.compared)),
                modelId: this.projectModel.id
            });

            var isCompare = this.isCompare();
            this.viewsList.enableSave(!isCompare);
            if (isCompare) {
                this.detailsPane.hide();
                this.toggleDetailsButton.addClass('disabled');
            } else {
                this.toggleDetailsButton.removeClass('disabled');
                this.grid.on('showDetails', function () { this.detailsPane.show(); }, this);
                this.grid.on('selectionChanged', this.selectionChanged, this);
                this.grid.on('rowUpdates', this.statusBar.update, this.statusBar);
            }

            self.refilterViewerInstances = config.refilterViewerInstances;
            this.grid.on('loadComplete', function () {
                this.trigger('grid:loadComplete', this);
                if (this.viewer && self.refilterViewerInstances) {
                    this.viewer.handleGridDataFiltered();
                    self.refilterViewerInstances = false;
                }
            }, this);
            this.$el
                    .toggleClass('version-comparison', isCompare)
                    .toggleClass('single-version', !isCompare)
                    .toggleClass('grouped-columns', isCompare && !config.showDeltaOnly);

            // Clean this up, probably just make it a config for a single method
            this.detailsPane.showEmpty();
            this.detailsPane.setGrouping(config.selectedGrouping);
            this.detailsPane.setModelVersion(config.selected);
            this.detailsPane.setAdditionalColumns(config.additionalColumns || []);
            this.detailsPane.setFilters(config.filters || []);
            this.detailsPane.grid = this.grid;

            this.setExpandCollapse(config.expandLevel, config.maxExpandLevel);

            this.rendering = false;

            // set initial layout, based on last for this model or grid if no geometry
            this.layoutChooser.reset({ projectModel: this.projectModel, project: this.project });

            return this;
        },

        runView: function (view, version) {
            var self = this,
                takeoffViewId = view.get('Id'),
                modelVersionId,
                modelVersionName;

            this.trigger('grid:beforeLoad');

            // setup based on how user got here
            if (version) {
                // user chose a version to view, so we'll load the default view for this version
                modelVersionId = version.get("id");
                this.currentModelVersion = version;
            } else if (this.versions.getSelected()) {
                // user chose a view and is already looking at the current view
                modelVersionId = this.versions.getSelected().get("id");
                this.currentModelVersion = this.versions.getSelected();
            } else {
                // user chose a view not from the grid page, so load it with the most recent version
                modelVersionId = this.versions.collection.first().get("id");
                this.currentModelVersion = this.versions.collection.first();
            }

            this.columns.setSelectedModelId(this.projectModel.id);

            this.destroyGrid();
            if (this.grid) this.grid.cancelLoad();
            if (this.gridXHR) this.gridXHR.abort();

            // only for running views that are saved or default
            // run ajax request for grid setup and render config on response
            this.setPostParams({
                isAdHoc: false,
                selectedModelVersion: modelVersionId,  //if default view, need this
                takeoffView: takeoffViewId,
                expandLevel: view.get('ExpandLevel')
            });

            var key = assemble.grid.generateColumnSizingKey(view.get('Id'), this.projectModel.get('id'), false);
            var columnSizes = assemble.grid.userStorage.getObject(key, null);
            var data = { id: takeoffViewId, modelVersionId: modelVersionId, columnWidths: JSON.stringify(columnSizes) };

            // drop grid onto page
            this.gridXHR = $.ajax({
                url: assemble.mvcRoutes.runView(),
                data: data,
                contentType: 'application/json',
                dataType: 'json',
                success: function (result) {
                    self.gridXHR = null;
                    $('#takeoff_grid_container').html(result.html);
                    self.render({
                        gridId: result.gridId,
                        selected: modelVersionId,
                        expandLevel: view.get('ExpandLevel'),
                        maxExpandLevel: result.maxExpandLevel,
                        selectedGrouping: view.get('Grouping'),
                        filters: result.validFilters,
                        filterProperties: result.filterProperties,
                        changesOnly: result.changesOnly,
                        additionalColumns: view.get('AdditionalColumns'),
                        showDeltaOnly: !!result.showDeltaOnly,
                        viewId: view.id,
                        refilterViewerInstances: true
                    });
                },
                error: function (response) {
                    self.gridXHR = null;
                    assemble.status.updateFromResponseError(response);
                }
            });
        },

        //TODO: HD DRY out
        runAdHoc: function () {
            var self = this;

            this.trigger('grid:beforeLoad');

            // this is happening too much ??
            this.destroyGrid();

            // only for running adHoc views when add/remove columns or version choosing occurs,
            // or comparing when not 
            // comparing previously
            //(anything that can change columnset)

            var selectedModelVersion = this.versions.getSelected().get('id'),
                comparedModelVersion = this.versions.getCompared() ? this.versions.getCompared().get('id') : null,
                expandLevel = this.expandLevel,
                filters = this.filters.validFilters(),
                changesOnly = this.filtersSidebar.changesOnly,
                selectedGrouping = this.selectedGrouping;

            var usingCompare = !(_.isNull(comparedModelVersion) || _.isUndefined(comparedModelVersion));
            var additionalColumns = this.columns.getSelectedList();

            this.setPostParams({
                isAdHoc: true,
                selectedModelVersion: selectedModelVersion,
                comparedModelVersion: comparedModelVersion,
                expandLevel: expandLevel,
                filters: JSON.stringify(filters),
                changesOnly: changesOnly,
                selectedGrouping: selectedGrouping,
                additionalColumns: JSON.stringify(additionalColumns),
                showDeltaOnly: this.columns.showDeltaOnly
            });

            var columnSizes = assemble.grid.userStorage.getObject(assemble.grid.generateColumnSizingKey(this.view.get("Id"), this.projectModel.get("id"), usingCompare), null);

            if (this.grid)
                this.grid.cancelLoad();

            if (this.gridXHR)
                this.gridXHR.abort();

            var data = {
                selectedModelVersion: selectedModelVersion,
                comparedModelVersion: comparedModelVersion,
                selectedGrouping: selectedGrouping,
                filters: JSON.stringify(filters),
                changesOnly: changesOnly,
                additionalColumns: JSON.stringify(additionalColumns),
                columnWidths: JSON.stringify(columnSizes),
                showDeltaOnly: this.columns.showDeltaOnly
            };

            // drop grid onto page
            this.gridXHR = $.get(assemble.mvcRoutes.runAdHocView(),
            data,
            function (result) {
                self.gridXHR = null;
                $('#takeoff_grid_container').html(result.html);
                self.render({
                    gridId: result.gridId,
                    selected: selectedModelVersion,
                    compared: comparedModelVersion,
                    expandLevel: expandLevel,
                    maxExpandLevel: result.maxExpandLevel,
                    selectedGrouping: selectedGrouping,
                    filters: filters,
                    filterProperties: result.filterProperties,
                    changesOnly: changesOnly,
                    additionalColumns: additionalColumns,
                    viewId: self.view ? self.view.id : 0,
                    modelId: self.projectModel.id,
                    showDeltaOnly: !!result.showDeltaOnly
                });
            });
        },

        updateGrid: function (options) {
            var self = this;
            options = options || {};
            if (options.clearSelection) this.statusBar.clear();

            this.trigger('grid:beforeLoad');

            // hey grid, change yo self, but we're not changing columns, so you're good with the grid you got
            // does not need to render
            var additionalColumns = this.columns.getSelectedList();
            var selectedModelVersion = this.versions.getSelected().get('id');
            var comparedModelVersion = this.versions.getCompared() ? this.versions.getCompared().get('id') : null;
            var expandLevel = this.expandLevel;
            var filters = this.filters.validFilters();
            var changesOnly = this.filtersSidebar.changesOnly;
            var selectedGrouping = this.selectedGrouping;

            this.setPostParams({
                isAdHoc: true,
                selectedModelVersion: selectedModelVersion,
                comparedModelVersion: comparedModelVersion,
                expandLevel: expandLevel,
                filters: JSON.stringify(filters),
                changesOnly: changesOnly,
                selectedGrouping: selectedGrouping,
                additionalColumns: JSON.stringify(additionalColumns)
            });

            this.grid.reload(options);
            this.detailsPane.showEmpty();
            this.filters.reset(filters.sort());
            this.detailsPane.setFilters(filters);

            //reset filter properties
            var data = JSON.stringify({ modelVersionId: selectedModelVersion, filters: filters });
            $.ajax({
                type: "POST",
                url: assemble.mvcRoutes.filterableProperties(),
                data: data,
                contentType: 'application/json',
                dataType: 'json',
                success: function (result) {
                    self.filtersSidebar.setPropertyList(result);
                },
                error: function (response) {
                    assemble.status.updateFromResponseError(response);
                }
            });
        },

        loadDetails: function (selected) {
            var self = this;
            if (this.detailsPane.hasChanges()) {
                this.detailsPane.warn({
                    discard: function () {
                        self.detailsPane.load(selected);
                    },
                    save: function () {
                        self.detailsPane.load(selected);
                    },
                    cancel: function () {
                        self.grid.$grid.setSelection(self.detailsPane.rowData, false);
                    }
                });
            } else {
                this.detailsPane.load(selected);
            }
        },

        getParams: function () {
            // need to make this a more universally-used method to get the needed params from the view
            var additionalColumns = this.columns.getSelectedList();
            var selectedModelVersion = this.versions.getSelected().get('id');
            var comparedModelVersion = this.versions.getCompared() ? this.versions.getCompared().get('id') : null;
            var expandLevel = this.expandLevel;
            var filters = this.filters.validFilters();
            var selectedGrouping = this.selectedGrouping;
            var columnSizes = assemble.grid.userStorage.getObject(assemble.grid.generateColumnSizingKey(this.view.get("Id"), this.projectModel.get("id"), this.isCompare()), null);

            return {
                expandLevel: expandLevel,
                selectedModelVersion: selectedModelVersion,
                comparedModelVersion: comparedModelVersion,
                selectedGrouping: selectedGrouping,
                filters: JSON.stringify(filters),
                additionalColumns: JSON.stringify(additionalColumns),
                showDeltaOnly: this.columns.showDeltaOnly,
                columnWidths: JSON.stringify(columnSizes),
                changesOnly: this.filtersSidebar.changesOnly
            };
        },

        cannotOpenViewer: function () {
            this.checkForWebGL();
            this.checkForGeometry();
        },

        changeLayout: function (layout) {
            var self = this,
                validLayouts = ['gridOnly', 'horizontalViewer', 'verticalViewer', 'twoScreen'];
            if (!_.include(validLayouts, layout)) throw new Error(layout + ' is not a valid layout, dude.');

            if (this.popoutClosedChecker) clearInterval(this.popoutClosedChecker);

            this.$el.attr('data-layout', layout);
            switch (layout) {
                case 'gridOnly':
                    this.showViewer = false;
                    if (this.viewer) this.viewer.closePopout();
                    break;
                case 'twoScreen':
                    this.showViewer = false;
                    this.resetViewer(true);
                    if (!this.closePopout) this.closePopout = _.bind(this.viewer.closePopout, this.viewer);
                    this.viewer.openPopout();
                    $(window)
                        .off("beforeunload", this.closePopout)
                        .on("beforeunload", this.closePopout);
                    this.popoutClosedChecker = setInterval(function () {
                        if (self.viewer.popoutWin.closed) {
                            self.layoutChooser.setLayout('gridOnly');
                        }
                    }, 1000);
                    this.update3dView(true);
                    break;
                default:
                    if (this.viewer) this.viewer.closePopout();
                    this.showViewer = true;
                    this.update3dView(true);
                    this.changeSplitOrientation(layout == 'horizontalViewer' ? 'h' : 'v');
            }

            this.resize();
        },

        changeSplitOrientation: function (which) {
            this.splitOrientation = which;
            this.resetSplitter();
        },

        updateSplitSize: function () {
            if (this.splitOrientation == 'h') {
                this.splitProportion('h', this.$("#grid_pane").height() / this.gridAndViewer.height());
            } else {
                this.splitProportion('v', this.$("#grid_pane").width() / this.gridAndViewer.width());
            }
        },

        splitProportion: function (orientation, value) {
            // if value is given, we set it, otherwise get it
            var getKey = _.bind(function (which) {
                return "Layout:SplitterProportion UserId:" + assemble.accounts.currentUser.get("Id") + " ModelId:" + this.projectModel.get('id') + " Orientation:" + which;
            }, this);

            if (value) {
                assemble.userStorage.setObject(getKey(orientation), value);
            } else {
                return assemble.userStorage.getObject(getKey(orientation)) || .5;
            }
        },

        splitSize: function (which) {
            return [this.splitProportion(which) * this.gridAndViewer[which == 'h' ? 'height' : 'width']()];
        },

        resetSplitter: function () {
            var self = this;
            this.gridAndViewer.trigger("destroySplitter");
            var options = {
                vOptions: {
                    type: 'v',
                    minLeft: 100,
                    minRight: 100,
                    sizeLeft: this.splitSize('v')
                },
                hOptions: {
                    type: 'h',
                    minTop: 100,
                    minBottom: 100,
                    sizeTop: this.splitSize('h')
                }
            };

            this.gridAndViewer.splitter(_.extend({ outline: true }, options[this.splitOrientation + 'Options']));

            this.$el.on('resize:end', function (e) { e.stopPropagation(); self.resize({ resizingSplitter: true }); });
            this.gridAndViewer.attr('data-split-orientation', this.splitOrientation)
        },

        toggleDetailsButtonPressed: function (e) {
            e.preventDefault();
            this.toggleDetails();
        },

        toggleDetails: function (options) {
            options = options || {};

            if (this.toggleDetailsButton.hasClass('disabled')) return;

            if (this.detailsPane.shown) {
                this.detailsPane.verifyClose(options);
            } else {
                var selected = assemble.grid.selection.getSelected(true);
                this.detailsPane.show(options);
                if (selected.length || selected.instances.length) this.loadDetails(selected);
            }
        },

        showEstimateWindowButtonPressed : function(evt) {
            evt.preventDefault();

            if(!this.$('#show_estimate_window').hasClass("disabled"))
                this.showEstimateWindow();
        },

        showEstimateWindow: function () {
            var self = this;
            var estimatesView = new assemble.catalog.EstimateWindow({ modelVersion: this.currentModelVersion });
            estimatesView.on("estimate:complete", function () {
                self.updateGrid({ clearSelection: true });
            });
            estimatesView.render();
        },

        showDetails: function (options) {
            options = options || {};
            assemble.app.trigger('details:toggled');
            this.toggleDetailsButton.addClass('active');
        },

        hideDetails: function (options) {
            options = options || {};
            if (!options.noBubble) {
                assemble.app.trigger('details:toggled');
            }
            this.toggleDetailsButton.removeClass('active');
        },

        resize: function (options) {
            options = options || {};
            this.gridAndViewer.css({ right: this.detailsPane.shown ? 350 : 0 });

            if (!options.resizingSplitter) {
                if (this.splitOrientation == 'h') {
                    this.gridAndViewer.trigger("resizeSplitter", this.splitSize('h'));
                } else {
                    this.gridAndViewer.trigger("resizeSplitter", this.splitSize('v'));
                }
            }

            if (this.showViewer) this.updateSplitSize();
            if (this.grid && this.grid.$grid) this.grid.resize();
            if (this.showViewer && this.viewer) this.viewer.handleResize();
        },

        //set expand level to maxexpandlevel + 1 => loading everything expanded
        expandAll: function (e) {
            e.preventDefault();
            this.expandAll = true;
            this.expandLevel = this.maxExpandLevel + 1;
            this.runAdHoc();
        },

        exportToFitNesse: function (e) {
            this._exportToFitNesseCore(e, false);
        },

        exportToFitNesseNoDefaults: function (e) {
            this._exportToFitNesseCore(e, true);
        },

        _exportToFitNesseCore: function (e, skipDefaults) {
            e.preventDefault();
            var comparedModelVersion = this.versions.getCompared() ? this.versions.getCompared().get('id') : null;
            var isVariance = !(_.isNull(comparedModelVersion) || _.isUndefined(comparedModelVersion));
            this.grid.FitNesse.exportToWiki({ isVariance: isVariance, skipDefaults: skipDefaults });
        },

        selectionChanged: function () {
            var selected = this.grid.selection.getSelected(true);
            if (this.detailsPane.shown) this.loadDetails(selected);
            this.statusBar.update(selected);
        },

        setView: function (view) {
            this.view = view;
        },

        setGrouping: function (grouping) {
            this.detailsPane.setGrouping(grouping);
            this.selectedGrouping = grouping;
        },

        setPostParams: function (config) {
            this.postData = config;
        },

        getSaveState: function () {
            return {
                Grouping: this.selectedGrouping,
                modelId: this.projectModel.get("id"),
                Filters: this.filters.validFilters(),
                AdditionalColumns: this.columns.getSelectedList(),
                active: true
            };

        },

        isCompare: function () {
            return !!this.versions.getCompared();
        },

        expandLevel: function (event) {
            event.preventDefault();

            if (this.expandLevel < this.maxExpandLevel) {
                this.expandLevel++;
                this.grid.expandToLevel(this.expandLevel);
                this.setExpandButtonState();
            }
        },

        collapseLevel: function (event) {
            event.preventDefault();

            if (this.expandLevel > 0) {
                this.expandLevel--;
                this.grid.collapseToLevel(this.expandLevel);
                this.setExpandButtonState();
            }
        },

        setExpandCollapse: function (expandLevel, maxExpandLevel) {
            this.expandLevel = expandLevel;
            this.maxExpandLevel = maxExpandLevel;
        },

        setExpandButtonState: function () {
            this.expandLevelButton.toggleClass('disabled', (this.expandLevel >= this.maxExpandLevel));
            this.collapseLevelButton.toggleClass('disabled', (this.expandLevel === 0));
        },

        disableLevelButtons: function () {
            this.expandLevelButton.addClass('disabled');
            this.collapseLevelButton.addClass('disabled');
        },

        openAddRemoveColumnsView: function (event) {
            var self = this;
            event.preventDefault(event);

            // add/remove columns no good for variance
            // if (this.isCompare()) return;

            if (this.columns.needsUpdate) {
                this.columns.fetch({
                    success: function () {
                        self.showAddRemoveColumnsView();
                    }
                });
            } else {
                this.showAddRemoveColumnsView();
            }
        },

        showAddRemoveColumnsView: function () {
            this.addRemoveColumnsView = new assemble.columns.AddRemoveColumnsView({ columns: this.columns, isCompare: this.isCompare() });
            this.addRemoveColumnsView.render();
        },

        resetViewer: function (showMessages) {
            if (this.viewer && this.viewer.hasPopout())
                this.viewer.closePopout();

            this.updateViewerVarianceMessage();

            if (this.isCompare())
                return;

            var selectedModelVersion = this.versions.getSelected();

            var self = this;
            var ctx = {};

            ctx.modelVersionId = selectedModelVersion.get('id');
            ctx.geometryCount = selectedModelVersion.get('geometryCount');
            ctx.geometrySize = selectedModelVersion.get('geometrySize');
            ctx.canvasId = "viewer_canvas";

            if (this.viewer && this.viewer.ctx.modelVersionId == ctx.modelVersionId) {
                this.viewer.makeValid();
                this.viewer.handleResize();
                this.viewer.initGridHandlers();
            } else {
                this.viewer = new assemble.Viewer(ctx);
                this.viewer.events.on("renderCompleted", function () { self.trigger("renderCompleted"); });
                this.viewer.downloadGeometry();
            }
        },

        update3dView: function (showMessages) {
            if (this.showViewer) {
                this.resetViewer(showMessages);
            } else {
                if (this.viewer && this.viewer.hasPopout()) {
                    this.viewer.refreshPopout();
                }
            }
        },

        updateViewerVarianceMessage: function () {
            var $canvas = $("#viewer_canvas");
            var msgId = "viewer_canvas_varianceMessage";

            $("#" + msgId).remove();

            if (!this.isCompare())
                return;

            var message = "The viewer currently does not support model comparisons.";
            var html = "<table class='viewerMessageBox' id='" + msgId + "'><tr><td style='text-align: center; vertical-align: middle;'><span class='viewerMessageBorder'>" + message + "</span></td></tr></table>";

            $canvas.parent().append(html);
        },

        'export': function (tool, options) {
            var primaryModelId = this.versions.getSelected().get('id'),
                compared = this.versions.getCompared(),
                gridParam = this.grid.$grid.getGridParam(),
                config = _.extend({
                    viewName: this.view.get('Name'),
                    primaryModelId: primaryModelId,
                    secondaryModelId: compared ? compared.get('id') : "",
                    filters: JSON.stringify(this.filters.validFilters()),
                    selectedGrouping: this.selectedGrouping,
                    additionalColumns: JSON.stringify(this.columns.getSelectedList()) || [],
                    sortColumn: gridParam.sortname,
                    sortDirectionString: gridParam.sortorder,
                    showDeltaOnly: this.columns.showDeltaOnly,
                    changesOnly: this.filtersSidebar.changesOnly
                }, options);

            /* Don't remove 'var win =' - this is doing some funky magic in javascript 
            to clean up the window for us when it goes out of scope. */
            var win = window.open(tool.url() + '?' + $.param(config), "_blank");
        },

        showTour: function (options) {
            if (this.detailsPane.shown) {
                this.detailsPane.verifyClose({ callback: function () { assemble.tour.start(options); } });
            } else {
                assemble.tour.start(options);
            }
        },

        show: function (view, version) {
            var self = this;
            this.view = view;
            $("#tutorial_start").on('click', function (e) {
                e.preventDefault();
                self.showTour({ welcome: false });
            }).show();
            this.runView(view, version);
            this.$el.show();
            this.filtersSidebar.show();
            this.exportSidebar.show();
            $('#save_current_view').slideDown('fast');
            this.viewsList.showingGrid(true);
            this.resize();
            assemble.app.on('explorer:mainContentResized', this.resize, this);
        },

        hide: function () {
            if (this.viewer) this.viewer.makeInvalid();
            $("#tutorial_start").off().hide();
            this.$el.hide();
            this.filtersSidebar.hide();
            this.exportSidebar.hide();
            this.detailsPane.hide();
            $('#save_current_view').hide();
            this.unload();
            this.viewsList.showingGrid(false);
            assemble.app.off('explorer:mainContentResized', this.resize, this);
        },

        unload: function () {            
            this.filtersSidebar.unload();
            this.columns.reset([], { silent: true });
            this.addRemoveColumnsView = undefined;
            this.versions.unload();
            if (this.gridXHR) this.gridXHR.abort();
            //groupbys

            this.destroyGrid();
        },

        destroyGrid: function () {
            if (this.grid) this.grid.destroy();
        }
    });

    views.LayoutChooser = Backbone.View.extend({
        initialize: function (config) {
            this.versions = config.versions;
        },

        events: {
            'click li > a': 'itemSelected',
            'click .btn.disabled': 'disabledClick',
            'click .layout-toggle': 'toggleLayout'
        },

        layouts: new Backbone.Collection([
            { id: 'gridOnly', icon: 'list-alt', title: 'Grid Only'},
            { id: 'horizontalViewer', icon: 'horizontal-viewer', title: 'Horizontal Viewer' },
            { id: 'verticalViewer', icon: 'vertical-viewer', title: 'Vertical Viewer' },
            { id: 'twoScreen', icon: 'two-screen', title: 'Popped-out Viewer' }
        ]),

        template: Handlebars.compile(
            '<div class="btn-group pull-left mrs" style="overflow: visible" id="layout_chooser">' +
              '<button class="btn layout-toggle btn-small"></button>' +
              '<button class="btn dropdown-toggle btn-small" data-toggle="dropdown">' +
                '<span class="caret"></span>' +
              '</button>' +
              '<ul class="dropdown-menu" data-menu-align="right"></ul>' +
            '</div>'
        ),

        menuItemTemplate: Handlebars.compile(
            '<li><a href="#" data-value="{{id}}" title="{{title}}">{{title}}</a></li>'
        ),

        render: function () {
            var self = this;
            this.setElement($(this.template()));

            this.layouts.each(function (layout) {
                self.$('.dropdown-menu').append(self.menuItemTemplate(layout.toJSON()));
            });

            this.layoutToggle = this.$('.layout-toggle');
            this.dropdownToggle = this.$('.dropdown-toggle');

            return this;
        },

        reset: function (config) {
            _.extend(this, config);

            if (!Modernizr.webgl || !this.versions.getSelected().get('hasGeometry')) {
                this.toggleEnabled(false);
                this.setLayout('gridOnly');
            } else {
                this.toggleEnabled(true);
                this.setLayout();
            }
        },

        itemSelected: function (e) {
            var layout = $(e.target).attr('data-value');
            this.change(layout);
            e.preventDefault();
        },

        change: function(layout){
            this.layoutPreference(layout);
            this.updateLayoutToggle(layout);
            this.currentLayout = layout;
            this.trigger('change', layout);
        },

        toggleLayout: function(e){
            e.preventDefault();
            if (this.layoutToggle.hasClass('disabled')) return;

            this.change(this.layoutToggle.attr('data-layout'));
        },

        setLayout: function (layout) {
            layout = layout || this.layoutPreference();
            this.change(layout);
        },

        layoutPreference: function (layout) {
            // if layout is given, we set it, otherwise get it
            var hasGeometry = this.versions.getSelected().get('hasGeometry'),
                layoutDefault = hasGeometry ? "horizontalViewer" : "gridOnly";

            var getKey = _.bind(function () {
                return "Layout:Style UserId:" + assemble.accounts.currentUser.get("Id") + " ProjectId:" + this.project.get('id');
            }, this);

            // if they don't have geometry, don't save the preference
            // we'd like to automatically show the viewer if they ever do get geometry in subsequent publishings
            if (layout && hasGeometry) { 
                var layoutToSaveAsPreference = layout == "twoScreen" ? "gridOnly" : layout;
                assemble.userStorage.setObject(getKey(), layoutToSaveAsPreference);
                if (layout != 'gridOnly') {
                    this.lastViewerLayoutPreference(layout);
                }
            } else {
                return this.currentLayout || assemble.userStorage.getObject(getKey()) || layoutDefault;
            }
        },

        lastViewerLayoutPreference: function (layout) {
            var getKey = _.bind(function () {
                return "Layout:ViewerStyle UserId:" + assemble.accounts.currentUser.get("Id") + " ProjectId:" + this.project.get('id');
            }, this);

            if (layout) {
                assemble.userStorage.setObject(getKey(), layout);
            } else {
                return assemble.userStorage.getObject(getKey()) || 'horizontalViewer';
            }
        },

        updateLayoutToggle: function (currentLayout) {
            var icon,
                toggleLayout;

            if (currentLayout == 'gridOnly') {
                // if layout is grid, show icon of lastViewerPreference
                toggleLayout = this.layouts.get(this.lastViewerLayoutPreference());
            } else {
                // if layout is a viewer layout, show the grid icon
                toggleLayout = this.layouts.get('gridOnly');
            }
            
            this.layoutToggle
                    .html('<i class="icon-' + toggleLayout.get('icon') + '"></i>')
                    .attr('data-layout', toggleLayout.get('id'))
                    .attr('title', 'Show ' + toggleLayout.get('title'));
        },

        disabledClick: function (e) {
            e.preventDefault();
            e.stopPropagation();

            if (!Modernizr.webgl) {
                this.informAboutWebGL();
            } else if (!this.versions.getSelected().get('hasGeometry')) {
                this.informAboutGeometry();
            }
        },

        toggleEnabled: function (toggle) {
            this.$('.btn').toggleClass('disabled', !toggle);
        },

        informAboutWebGL: function (showMessages) {
            var modal = assemble.modal.create({
                title: 'WebGL Required',
                id: 'notify_nowebgl',
                primaryButtonText: 'OK'
            });

            modal.on('click', '.btn-primary', function (event) {
                event.preventDefault();
                modal.modal('hide');
            });

            modal.find('.btn.cancel').hide(); // hide cancel button
            modal.find('.modal-body').html('Your web browser or computer appears not to support WebGL, which is required for viewing 3D model(s).');
            modal.modal('show');
        },

        informAboutGeometry: function (showMessages) {
            var message,
                modal = assemble.modal.create({
                    title: 'No Geometry Available',
                    id: 'notify_view3d',
                    primaryButtonText: 'OK'
                });

            modal.on('click', '.btn-primary', function (event) {
                event.preventDefault();
                modal.modal('hide');
            });

            modal.find('.btn.cancel').hide(); // hide cancel button
            if (this.projectModel.get('Datasource') === "AutoCad") {
                message = "3D is not currently available for AutoCAD models.";
            } else {
                message = "This model was published without 3D information. To see the model in a 3D view, please re-publish the model.";
            }
            modal.find('.modal-body').html(message);
            modal.modal('show');
        }

    });

    views.ExportToolModel = Backbone.Model.extend({
        url: function () {
            return assemble.mvcRoutes[this.get('type') + "Export"]({ id: this.get('id') });
        }
    });

    views.ExportToolsCollection = Backbone.Collection.extend({
        model: views.ExportToolModel
    });

    views.ExportToolView = Backbone.View.extend({
        events: {
            'click': 'select'
        },

        template: Handlebars.compile(
            '<a href="#" class="export-tool export-{{type}} bordered">' +
                '<i class="icon-{{type}}-export mrxs"></i>{{name}}' +
            '</a>'
        ),

        render: function () {
            this.setElement($(this.template(this.model.toJSON())));

            return this;
        },

        select: function (event) {
            event.preventDefault();
            this.trigger('select', this.model);
        }
    });

    views.ExportToolsList = Backbone.View.extend({
        initialize: function (config) {
            this.toolsList = this.$('.tool');
            this.collection = new views.ExportToolsCollection([
                    { type: 'excel', name: 'Microsoft Excel' },
                    { type: 'navis', name: 'Navisworks Search Sets' }
            ]);
            this.currentView = config.currentView;
        },

        render: function () {
            this.toolsList.empty();
            this.addAll();

            return this;
        },

        addOne: function (tool) {
            var view = new views.ExportToolView({ model: tool });
            view.on('select', this.select, this);
            this.toolsList.append(view.render().el);
        },

        addAll: function () {
            var self = this;

            this.collection.each(function (tool) {
                self.addOne(tool);
            });
        },

        select: function (model) {
            var self = this;
            var params = this.currentView.getParams();
            if (this.currentAjax) this.currentAjax.abort();
            this.currentAjax = $.ajax("/Exports/FileName", {
                data: _.extend({ exportType: model.get('type'), viewName: this.currentView.view.get('Name') }, params),
                success: function (result) {
                    self.showSetupModal(model, result);
                }
            });
        },

        showSetupModal: function (model, fileInfo) {
            var title = "Export Options";
            switch (model.get('type')) {
                case 'excel':
                    title = "Export to Microsoft Excel";
                    break;
                case 'navis':
                    title = "Export Navisworks Search Sets";
                    break;
            }

            var modal = assemble.modal.create({
                title: title,
                id: 'export_options',
                primaryButtonText: 'Export',
                withForm: true
            });

            var self = this;

            modal.find('.modal-body').html(Handlebars.templates['export'].modal(fileInfo));

            modal.find('form').on('submit', function (event) {
                event.preventDefault();
                event.stopPropagation();

                var form = $(this);
                if (!form.valid()) {
                    return false;
                }
                modal.modal('hide');
                var serialized = {
                    fileName: form.find("input[name='fileName']").val(),
                    includeInstances: form.find("input[name='includeInstances']").is(":checked")
                }; //TODO: jquery serialize/serializeObject doesn't work here, so manually serializing this form - we need to get this working later
                self.trigger('select', model, serialized);

                return false;
            });

            $.validator.unobtrusive.parse(modal);
            assemble.form.setFocus(modal);

            modal.modal('show');
        },

        show: function () {
            this.$el.slideDown('fast');
        },

        hide: function () {
            this.$el.hide();
        }
    });

    views.StatusBar = Backbone.View.extend({
        initialize: function () {

        },

        render: function () {
            this.setElement($(Handlebars.templates.views.statusBar()).appendTo('#grid_pane'));
            this.instanceCount = this.$('.instance-count');
            this.aggregation = this.$('.selection-aggregation');

            return this;
        },

        update: function () {
            var canSum = true,
                quantityMeasure = null,
                unitOfMeasure,
                self = this,
                selected = assemble.grid.selection.getSelected(true);
        
            var sums = _.inject(selected.instances, function (memo, item) {
                var quantity = memo.quantity + assemble.numbers.undelimit(item.TakeoffQuantity);

                canSum = canSum && self.canSum(quantityMeasure, quantity, item.QuantityProperty);

                quantityMeasure = item.QuantityProperty;
                unitOfMeasure = item.TakeoffUnitAbbreviation;
                memo.count += assemble.numbers.undelimit(item.InstanceCount);
                memo.quantity = quantity;
                
                return memo;
            }, { count: 0, quantity: 0 });

            if (selected.instances.length == 0) {
                this.clear();
            } else {
                if (canSum) {
                    this.aggregation.html('Quantity Sum: ' + assemble.numbers.delimit(sums.quantity.toFixed(2)) + ' ' + unitOfMeasure);
                } else {
                    this.aggregation.html('');
                }
                this.instanceCount.html(assemble.numbers.delimit(sums.count) + ' Selected Instance' + (sums.count == 1 ? '' : 's'));
            }
        },

        canSum: function (quantityMeasure, quantity, quantityProperty) {
            // test for the same quantity every time, if not apples to apples, remove sum
            if (quantityMeasure != quantityProperty && quantityMeasure !== null) return false;
            if (!$.isNumeric(quantity)) return false;
            return true;
        },

        clear: function () {
            this.instanceCount.html('');
            this.aggregation.html('');

            return this;
        }

    });

}());
