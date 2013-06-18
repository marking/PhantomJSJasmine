(function () {
    var details = assemble.details = {};

    details.Model = Backbone.Model.extend({
        valueIsNull: function () {
            return this.get('value') === null;
        },

        maskedValue: function () {
            return this.get('mask') ? assemble.mask(this.get('value'), this.get('mask')) : this.get('value');
        },

        selectedValue: function () {
            var self = this;
            return _.find(this.get('selectValues') || [], function (object) {
                return object.id == self.get('value');
            });
        }
    });

    details.Collection = Backbone.Collection.extend({
        model: details.Model,

        changed: function () {
            return this.filter(function (detail) {
                return detail.hasChanged('multipleValues') || (!detail.get('multipleValues') && detail.hasChanged('value'));
            });
        }
    });

    details.AssemblyCode = Backbone.Model.extend({});

    details.AssemblyCodesCollection = Backbone.Collection.extend({
        model: details.AssemblyCode,

        initialize: function (models, config) {
            this.project = config.project;
            this.url = assemble.mvcRoutes.assemblyCodes({id: this.project.id});
        },

        all: function () {
            if (!this.length) this.fetch({ async: false });
            return this;
        }
    });

    details.AssemblyListFactory = {
        assemblyList: {}
    };
    details.AssemblyListFactory.get = _.bind(function (projectId, fetchFromServer) {
        if (fetchFromServer || !this.assemblyList[projectId]) {
            var self = this;
            $.ajax({
                url: assemble.mvcRoutes.assemblyList({ id: projectId }),
                async: false,
                success: function (data) {
                    self.assemblyList[projectId] = data;
                }
            });
        }

        return this.assemblyList[projectId];
    }, details.AssemblyListFactory);

    details.AssemblyListFactory.flush = _.bind(function (projectId) {
        delete this.assemblyList[projectId];
    }, details.AssemblyListFactory);

    details.View = Backbone.View.extend({
        fields: {},

        rowData: {},

        initialize: function (config) {
            var self = this;
            this.setElement(config.el);
            this.shown = false;
            this.template = Handlebars.templates.details.frame;
            this.emptyTemplate = Handlebars.templates.details.empty;
            this.loadMaskTemplate = Handlebars.templates.details.loadMask;
            this.project = config.project;

            this.collection = new details.Collection();
            
            details.assemblyCodes = new details.AssemblyCodesCollection([], { project: config.project });
        },

        events: {
            'click .close-details': 'verifyClose',
            'click .discard-changes': 'discardButton',
            'click .save-changes': 'saveButton',
            'keydown': 'shortcutKey'
        },

        load: function (rowsAndInstances) {
            var self = this;
            if (!this.shown) this.show();

            //first add rows that exist in the grid and are selected
            var rows = [];
            for (var i = 0; i < rowsAndInstances.length; i++) {
                rows.push(rowsAndInstances[i]);
            }

            //now iterate through instances from selectionCache and add those that are not loaded/represented in grid.
            for (var j = 0; j < rowsAndInstances.instances.length; j++) {
                var instance = rowsAndInstances.instances[j];
                if (_.some(rows, function(r) {
                    return r.Id == instance.Id;
                })) {
                    continue;                    
                }                                        
                rows.push(instance);
            }

            if (!rows.length) {
                if (this.loadingXHR) this.loadingXHR.abort();
                this.showEmpty();
                return;
            }
            
            var dataIds = [];
            var rowIds = [];
            dataIds = _.pluck(rows, 'Id');
            rowIds = _.pluck(this.rowData, 'Id');

            if (rowIds.length == dataIds.length && _.difference(rowIds, dataIds).length == 0)
                return;
            else {
                // if they fast-clicked, let's abort the first request and move on to the last clicked object
                if (this.loadingXHR) this.loadingXHR.abort();
                this.unload();
            }
            this.showLoadMask('Loading&hellip;');

            this.rowData = rows;
            this.isSingleInstance = this.rowData.length == 1 && this.rowData[0].RowType == 'instance';

            var actionData = this.getRowIdsAndLevels(rows);

            this.loadingXHR = $.ajax({
                url: assemble.mvcRoutes.details(),
                type: 'POST',
                data: {
                    selectedRowIds: JSON.stringify(actionData.idsToSend),
                    selectedRowLevels: JSON.stringify(actionData.rowLevels),
                    selectedGrouping: this.selectedGrouping,
                    selectedModelVersion: this.modelVersion,
                    additionalColumns: JSON.stringify(this.additionalColumns),
                    filters: JSON.stringify(this.filters)
                },
                traditional: true,
                success: function (result) {
                    self.collection.reset(result.Properties);
                    self.render(result);
                },
                error: function (response) {
                    assemble.status.updateFromResponseError(response);
                }
            });
        },

        getRowIdsAndLevels: function (data) {
            var result = {
                idsToSend: [],
                rowLevels: []
            };

            for (var i = 0; i < data.length; i++) {
                var row = data[i];
                var parent = _.find(data, function (r) {
                    return r.Id == row.tree_parent;
                });
                if (!parent) {
                    result.idsToSend.push(row.Id);
                    result.rowLevels.push(row.tree_level);
                }
            }
            return result;
        },

        render: function (data) {
            var extraTemplateInfo = { instance: this.isSingleInstance, Title: data.Title || data.NumberInstances + ' Selected Instances' };
            this.$el.html(this.template(_.extend(data, extraTemplateInfo)));
            this.title = this.$('.details-name');
            this.body = this.$('fieldset');
            this.form = this.$('form');
            this.errorBox = this.$('.alert-error');
            this.messageBox = this.$("#DetailsErrorPanel");
            this.buttons = this.$('.save-changes, .discard-changes');
            this.closeX = this.$('.close');

            this.addAll();
            if (this.fields.TakeoffQuantity && this.collection.where({ name: 'TakeoffQuantity' })[0].get('multipleValues')) {
                if (this.fields.UnitCost) this.fields.UnitCost.disable();
                if (this.fields.AssembleTotalCost) this.fields.AssembleTotalCost.disable();
            }

            $.validator.unobtrusive.parse(this.$el);

            return this;
        },

        addOne: function (detail) {
            var view = new details.FieldView({ model: detail, project: this.project });
            this.fields[detail.get('name')] = view;
            this.body.append(view.render().el);
            view.on('change', this.changeMade, this);
            view.on('blurred', this.fieldBlurred, this);
        },

        addAll: function () {
            var self = this;

            this.collection.each(function (detail) {
                self.addOne(detail);
            });

            this.setupFieldInteractions();
        },

        setupFieldInteractions: function () {
            var totalCostField = this.fields.AssembleTotalCost,
                unitCostField = this.fields.UnitCost,
                takeoffQuantityField = this.fields.TakeoffQuantity,
                assemblyCodeField = this.fields.AssemblyCode,
                message = "Changing the Quantity may make the Unit Cost invalid. Make sure Unit Cost and Total Cost still make sense.",
                self = this;

            var calcTotal = function () {
                var unitCost = unitCostField.getValue(),
                    selectedTakeoffQuantity = takeoffQuantityField.model.selectedValue(),
                    total;

                // use the total from the selected takeoff quantity selectValues object if unit/tq are multiple values
                if (unitCostField.model.get('multipleValues') || takeoffQuantityField.model.get('multipleValues')) {
                    total = selectedTakeoffQuantity.totalcost;
                } else {
                    // otherwise calculate it
                    total = +($.isNumeric(unitCost) ? unitCost : 0) * selectedTakeoffQuantity.units;
                }

                return total;
            };

            if (unitCostField && takeoffQuantityField && assemblyCodeField) {
                assemblyCodeField.on("blurred", function () {
                    self.message(false);
                    var data = assemblyCodeField.input.data();

                    if (data != null &&
                        data.extendedProperties.UnitCost !== '' &&
                        data.extendedProperties.TakeoffQuantity !== '' &&
                        assemblyCodeField.input.$("input[name='apply_cost']:checked").length > 0) {

                        if (!_.find(takeoffQuantityField.input.collection.models, function (m) { return m.id == data.extendedProperties.TakeoffQuantity; })) {
                            self.message("The Quantity value of '" + data.extendedProperties.TakeoffQuantity + "' associated with the selected Assembly Code is not valid and has not been applied with the Assembly Code change.", "error");
                        }
                        else {
                            unitCostField.setValue(data.extendedProperties.UnitCost);
                            takeoffQuantityField.setValue(data.extendedProperties.TakeoffQuantity);
                            totalCostField.setValue(calcTotal());
                        }
                    }
                });
            }

            // should we always assume these fields are available?
            // just in case...
            if (totalCostField && unitCostField && takeoffQuantityField) {
                // when unit cost changes, calc total
                unitCostField.on('blurred', function (memo) {
                    totalCostField.setValue(unitCostField.input.valid() ? calcTotal() : 0);
                });

                // when quantity field changes, either reset for multiple values or set total cost
                takeoffQuantityField.on('blurred', function (memo) {
                    if (memo && memo.keepMultipleValues) {
                        totalCostField.resetValue();
                        totalCostField.disable();
                        unitCostField.resetValue();
                        unitCostField.disable();
                        self.message(false);
                    } else {
                        totalCostField.setValue(calcTotal());
                        totalCostField.enable();
                        unitCostField.enable();
                        self.message(takeoffQuantityField.hasChanged() ? message : false);
                    }
                });

                // when total cost field is changed, update the unit cost field
                totalCostField.on('blurred', function () {
                    var selectedTakeoffQuantity = takeoffQuantityField.model.selectedValue();
                    if (totalCostField.input.valid()) {
                        unitCostField.setValue(+selectedTakeoffQuantity.units == 0 ? 0 : (+totalCostField.model.get('value') / +selectedTakeoffQuantity.units));
                    } else {
                        unitCostField.setValue(0);
                    }
                
                    // if total cost is set to a value and selected takeoff quantity is 0, total cost must be 0
                    if (selectedTakeoffQuantity.units == 0) totalCostField.setValue(0);
                });
            }
            else if (takeoffQuantityField) {
                takeoffQuantityField.on('blurred', function (memo) {
                    if (memo && memo.keepMultipleValues) {
                        self.message(false);
                    } else {
                        self.message(takeoffQuantityField.hasChanged() ? message : false);
                    }
                });
            }
        },

        showEmpty: function (message) {
            var emptyMessage = message || 'Select an item to view and edit details.';
            this.unload();
            this.$el.html(this.emptyTemplate({ emptyMessage: emptyMessage }));
            this.closeX = this.$('.close');
        },

        show: function (options) {
            if (this.shown) return;

            this.shown = true;
            this.showEmpty();
            this.trigger('show', options);
        },

        showLoadMask: function (msg) {
            var loadMask = $(this.loadMaskTemplate({ message: msg })),
                detailsBody = this.$('.details-body');

            if (detailsBody.length) {
                detailsBody.append(loadMask);
            } else {
                this.$el.append(loadMask);
            }

            this.loadMask = loadMask;
        },

        hideLoadMask: function () {
            this.loadMask.remove();
        },

        hide: function (options) {
            this.shown = false;
            this.unload();
            this.trigger('hide', options);
        },

        shortcutKey: function (event) {
            // put in shortcut keys here
        },

        changed: function () {
            return this.collection.changed();
        },

        hasChanges: function () {
            return this.changed().length > 0;
        },

        setGrouping: function (grouping) {
            this.selectedGrouping = grouping;
        },

        setModelVersion: function (modelVersion) {
            this.modelVersion = modelVersion;
        },

        setAdditionalColumns: function (additionalColumns) {
            this.additionalColumns = additionalColumns;
        },

        setFilters: function (filters) {
            this.filters = filters;
        },
        
        message: function (message, messageType) {

            messageType = messageType || 'message';
            this.messageBox.removeClass("alert-message").removeClass("alert-success").removeClass("alert-error").removeClass("alert-alert");

            if (message) {
                this.messageBox.html(message).addClass('show').removeClass("hide").addClass("alert-" + messageType);
            } else {
                this.messageBox.removeClass('show').addClass("hide").html("");
            }
        },

        verifyClose: function (options) {
            options = options || {};
            var self = this,
                hideAndCallback = function () {
                    var callback = options.callback;
                    options.callback = undefined;

                    self.hide(options);
                    if (callback && (typeof callback === 'function')) callback();
                };
            if (this.closeX.hasClass('disabled')) return;

            // check if the form has any changes, verify if so
            if (this.hasChanges()) {
                this.warn({
                    discard: hideAndCallback,
                    save: hideAndCallback
                });
                
            } else {
                hideAndCallback();
            }
        },

        warn: function (options) {
            var modal = assemble.modal.create({
                title: 'You have made changes...',
                id: 'details_verify_discard_changes',
                primaryButtonText: 'Save'
            });
            var self = this;

            modal.find('.btn-primary').after('<a href="#" class="btn discard">Discard Changes</a>');
            modal
                .on('click', '.discard', function (event) {
                    event.preventDefault();
                    modal.modal('hide');
                    if (options.discard) options.discard.call(self);
                })
                .on('click', '.btn-primary', function (event) {
                    event.preventDefault();
                    modal.modal('hide');
                    self.save({
                        success: function () {
                            if (options.save) options.save.call(self);
                        }
                    });
                })
                .on('click', '.close, .cancel', function (event) {
                    event.preventDefault();
                    if (options.cancel) options.cancel();
                });

            modal.find('.modal-body').html('You have unsaved changes.  You can Save these changes, Discard them, or Cancel to return to editing this item.');
            modal.modal('show');
        },

        saveButton: function (event) {
            event.preventDefault();
            if (this.$('.save-changes').hasClass('disabled')) return;
            this.save();
        },

        save: function (options) {
            var self = this,
                toSave,
                changed;
            options = options || {};
            // save details

            if (this.form.valid()) {
                this.startSaving();

                changed = this.changed();
                toSave = _.reduce(changed, function (memo, detail) {
                    if (detail.get('name') != 'AssembleTotalCost') {
                        memo[detail.get('name')] = detail.get('value');
                    }
                    return memo;
                }, {});

                var actionData = this.getRowIdsAndLevels(this.rowData);

                $.ajax({
                    type: 'POST',
                    url: assemble.mvcRoutes.updateProperties(),
                    data: {
                        selectedRowIds: JSON.stringify(actionData.idsToSend),
                        selectedRowLevels: JSON.stringify(actionData.rowLevels),
                        selectedGrouping: this.selectedGrouping,
                        selectedModelVersion: this.modelVersion,
                        additionalColumns: JSON.stringify(this.additionalColumns),
                        filters: JSON.stringify(this.filters),
                        updates: JSON.stringify(toSave)
                    },
                    success: function (result) {
                        var currentView = assemble.explorer.view.modelView.currentView;
                        var currrentGrouping = _.find(currentView.groupBys.groupBys, function (gb) { return currentView.groupBys.current == gb.Id.toString(); });
                        var groupingPropertyNames = currrentGrouping.Properties.split("@_FieldSeparator_@");
                        var filterPropertyNames = _.map(currentView.filters.models, function (filterModel) { return filterModel.attributes.property; });

                        //artifically add assembly code to the names to check if anything based on assembly code is present
                        if (_.any(groupingPropertyNames, function (groupingPropertyName) { return groupingPropertyName.indexOf("AssemblyCodeLevel") > -1 || groupingPropertyName == "AssemblyDescription"; })) {
                            groupingPropertyNames[groupingPropertyNames.length] = "AssemblyCode";
                        }

                        var anyGridGroupingOrFilteringChanges = 
                            _.any(changed, function (detail) { return _.any(groupingPropertyNames, function (groupingPropertyName) { return groupingPropertyName == detail.get("name"); }); }) ||
                            _.any(changed, function (detail) { return _.any(filterPropertyNames, function (filterPropertyName) { return filterPropertyName == detail.get("name"); }); });

                        var needToReloadGrid =
                            _.any(changed, function (detail) { return detail.get('reloadGrid'); }) ||
                            anyGridGroupingOrFilteringChanges;

                        // update the name, just in case it's changed
                        self.updateName(result.name);

                        if (needToReloadGrid) {
                            assemble.explorer.view.modelView.currentView.setPostParams({
                                isAdHoc: true,
                                selectedModelVersion: self.modelVersion,
                                expandLevel: assemble.explorer.view.modelView.currentView.expandLevel,
                                filters: JSON.stringify(self.filters),
                                selectedGrouping: self.selectedGrouping,
                                additionalColumns: JSON.stringify(self.additionalColumns),
                                selectedRowIds: JSON.stringify(actionData.idsToSend),
                                selectedRowLevels: JSON.stringify(actionData.rowLevels),
                            });

                            self.grid.reload();

                            if (anyGridGroupingOrFilteringChanges) {
                                self.showEmpty('The item is no longer part of the grouped or filtered grid set.  Select an item to view and edit details.');
                            }
                        }

                        assemble.status.update('Changes saved.', 'success');

                        _.each(changed, function (detail) {
                            detail.change();
                            self.fields[detail.get('name')].reset();
                        });

                        self.errorBox.hide();
                        self.messageBox.hide();
                        self.endSaving();
                        if (options.success) options.success();
                    }
                });

            } else {
                this.errorBox.show();
            }
        },

        startSaving: function () {
            this.toggleButtons(false);
            this.toggleCloseX(false);
            this.showLoadMask();
            this.$('.save-changes').button('loading');
        },

        endSaving: function () {
            var self = this;
            this.toggleCloseX(true);
            this.hideLoadMask();
            this.$('.save-changes').button('reset');
            setTimeout(function () { self.$('.save-changes').addClass('disabled'); }, 1);
        },

        changeMade: function () {
            this.toggleButtons(true);
        },

        updateName: function (name) {
            if (!name) return;

            this.title.html(name);
            assemble.grid.$grid.setRowData(this.rowData.Id, { Name: name });
        },

        getRowData: function () {
            return assemble.grid.$grid.getRowData(this.rowData.Id);
        },

        fieldBlurred: function () {
            this.toggleButtons(this.hasChanges());
        },

        toggleButtons: function (toggle) {
            this.buttons.toggleClass('disabled', !toggle);
        },

        toggleCloseX: function (toggle) {
            this.closeX.toggleClass('disabled', !toggle);
        },

        discardButton: function (event) {
            event.preventDefault();
            if (this.buttons.hasClass('disabled')) return;
            this.hide();
        },

        selectThisGridRow: function () {
            if ($.isPlainObject(this.getRowData())) {
                assemble.grid.$grid.jqGrid("resetSelection");
                assemble.grid.$grid.setSelection(this.rowData.Id, false);
            } else {
                this.showEmpty();
            }
        },

        unload: function () {
            this.collection.reset();
            this.rowData = {};
            _.each(this.fields, function (field) {
                field.unload();
            });
            this.fields = {};
            this.$el.empty();
        }
    });

    details.FieldView = Backbone.View.extend({
        events: {
            'focusin .incognito-field': 'focus',
            'blur .incognito-field': 'change',
            'keydown .incognito-field': 'keydown',
            'click .incognito-empty-message': 'showEdit',
            'click .keep-multiple-values-message': 'showEdit',
            'click .keep-multiple-values-link': 'setKeepMultipleValues',
            'click .nullify': 'nullify'
        }
    });

    _.extend(details.FieldView.prototype, {
        initialize: function (config) {
            this.model = config.model;
            this.project = config.project;
        },
        render: function () {
            var emptyMessage = "Edit " + $.trim(this.model.get('label').split('(')[0]);
            this.setElement($(Handlebars.templates.details.field(_.extend(this.model.toJSON(), { emptyMessage: emptyMessage }))));
            this.$('.controls').prepend(this.getInput());

            this.setupValidation();
            this.reset();

            return this;
        },

        getInput: function () {
            var input,
                dropdown;

            switch (this.model.get('type')) {

                /* TYPE AHEAD */
                case 'typeAhead':
                    input = $(Handlebars.templates.details.input.typeAhead(this.model.toJSON()));
                    this.input = input.typeahead({
                        source: this.model.get('selectValues')
                    });

                    break;

                /* SELECT */
                case 'select':
                    if (this.model.get('name') == "TakeoffQuantity") {
                        dropdown = this.setupQuantityDropdown();
                    } else {
                        dropdown = new assemble.dropdowns.SelectorListView({
                            collection: this.model.get('selectValues'),
                            defaultText: 'Select one',
                            noValue: ""
                        });
                    }

                    dropdown.render().select(this.model.get('value'), false);

                    dropdown.on('change', this.change, this);
                    dropdown.on('closed', _.bind(this.updateState, this));
                    this.focus = _.bind(dropdown.forceOpen, dropdown);

                    this.input = dropdown;
                    input = dropdown.$el;
                    break;

                /* ASSEMBLY TREE */
                case 'assemblyTree':
                    var self = this;
                    var value = this.model.get('value');
                    var categoryId = parseInt(this.model.get('additionalData'));

                    if (categoryId == NaN) {
                        categoryId = 0;
                    }

                    var assemblyList = details.AssemblyListFactory.get(this.project.id);
                    var filters = assemble.trees.categoriesFactory.get(this.project.id);

                    var treeSearch = null;
                    treeSearch = function (element, key) {
                        if (element.key == key) {
                            return element;
                        }
                        else {
                            if (element.children && element.children != null && element.children.length > 0) {
                                for (var i = 0; i < element.children.length; i++) {
                                    var child = element.children[i];
                                    var retVal = treeSearch(child, key);
                                    
                                    if (retVal != null) {
                                        return retVal;
                                    }
                                    
                                }
                            }
                        }

                        return null;
                    };

                    input = $(Handlebars.templates.details.input.assemblyCode());
                    var $inputDisplay = input.find("#AssemblyCodeText");
                    var $inputOrphaned = input.find("#AssemblyCodeTextHelp");
                    
                    if(value && value !== null && value !== "") {
                        var element = treeSearch({ key: "", children: assemblyList }, value);
                        
                        if (element !== null) {
                            $inputDisplay.html(element.title);
                            $inputOrphaned.hide();
                        }
                        else {
                            $inputDisplay.html(value);
                            $inputOrphaned.show();
                        }
                    }

                    this.input = new assemble.trees.AssemblyCodeTreeModal({ assemblyList: assemblyList, selectedCode: value, filters: filters });
                    this.input.setFilter(categoryId);
                    this.input.on("change", function () {
                        var data = self.input.data();
                        $inputOrphaned.hide();

                        if (data != null) {
                            $inputDisplay.html(data.title);
                        }
                        else {
                            $inputDisplay.html("Edit Assembly Code");
                        }

                        self.change({ acceptSameValue: true });
                        self.updateState();
                    }, this);
                    this.on("blurred", function () {
                        var val = self.model.get("value");

                        if (val === null || val === "") {
                            $inputDisplay.html("Edit Assembly Code");
                            $inputOrphaned.hide();
                        }
                    });
                    var show = _.bind(this.input.show, this.input);
                    this.focus = show;

                    $inputDisplay.on("click", function (event) {
                        if (event)
                            event.preventDefault();

                        value = self.model.get('value');
                        self.input.val(value);
                        show();
                    });

                    assemble.help.mainrepository.load(function (helpConfig) {
                        self.helpLink = new assemble.help.KeyView({ model: helpConfig, el: input.find(".help-link")[0], key: "14002" });
                    });

                    break;

                /* DEFAULT */
                default:
                    input = $(Handlebars.templates.details.input[this.model.get('type')](this.model.toJSON()));
                    this.input = input;
            }

            return input;
        },

        setupQuantityDropdown: function () {
            var collection, dropdown, notPriority;
            
            collection = new Backbone.Collection(this.model.get('selectValues'), {
                comparator: function (model) {
                    return (model.get('isPriority') ? "0" : "1") + model.get('name');
                }
            });

            notPriority = collection.where({ isPriority: false });

            dropdown = new assemble.dropdowns.SelectorListView({
                collection: collection,
                defaultText: 'Select one',
                noValue: "",
                dividerBefore: notPriority.length ? [notPriority[0].get('id')] : [],
            });

            return dropdown;
        },

        setupValidation: function () {
            var validations = this.model.get('validations'),
                inputType = this.model.get('type'),
                input = (inputType == 'select' || inputType == 'tree') ? this.input.$el : this.input;
            if (!validations || _.isEmpty(validations)) return;

            input.attr('data-val', true);

            _.each(validations, function (value, key) {
                input.attr('data-val-' + key, value);
            });

            if (validations.required) this.$el.addClass("required");
        },

        change: function (options) {
            options = options || {};

            // odd case, if it must be a number and the field is blank, we change it to a 0
            if (this.input.val() === "" && this.model.get('validations') && this.model.get('validations').number) {
                this.input.val(0);
            }
            
            // format the data if it has a format mask
            if (this.input.valid()) {
                this.maskValue();
            }

            if (!options.acceptSameValue && this.model.maskedValue() == this.input.val()) {
                return;
            }

            this.updateModel();
            this.model.set('multipleValues', false, { silent: true });
            this.updateState();
            if (!options.silent) this.trigger('blurred');
        },

        setKeepMultipleValues: function (event) {
            event.preventDefault();
            this.input.val('');
            if (this.model.get('type') != 'select' && this.model.get('type') != 'tree') this.input.blur();
            this.model.set('multipleValues', true, { silent: true });
            this.model.set('value', this.model.previous('value'));
            this.updateState();
            this.trigger('blurred', { keepMultipleValues: true });
        },

        showEdit: function (event) {
            var value = "";
            event.preventDefault();

            if (this.$el.hasClass('disabled')) return;
            this.model.set('multipleValues', false, { silent: true });

            // automatically select the first in the list if this is a select and required
            if (this.model.get('type') == 'select' && this.model.get('validations').required)
                value = this.model.get('selectValues')[0].id;

            this.model.set('value', value, { silent: true });
            this.input.val(value);

            this.updateState();
            this.input.focus();
            this.trigger('blurred');
        },

        nullify: function () {
            if (this.$el.hasClass('disabled'))
                return;

            this.input.val('');

            if (this.model.get('type') != 'select' && this.model.get('type') != 'tree')
                this.input.blur();

            this.model.set('value', null, { silent: true });
            this.model.set('multipleValues', false, { silent: true });
            this.updateState();
            this.trigger('blurred', { nullify: true });
        },

        focus: function () {
            // override if control needs special treatment, e.g. selector needs to be opened
            this.input.select();
            this.lastFocusedValue = this.getValue();
        },

        setValue: function (value) {
            if (this.getValue() == value) return;
            this.$el.effect("highlight", { color: '#F7EEBF' }, 2000);
            this.input.val(value);
            this.change({ silent: true });
        },

        getValue: function () {
            // override if control does not have an input field, e.g. selector
            return this.input.val();
        },

        resetValue: function () {
            var previous = this.model.previousAttributes();
            this.setValue(previous.value);
            this.model.set('multipleValues', previous.multipleValues);
            this.updateState();
        },

        reset: function () {
            this.maskValue();
            this.$el.toggleClass('has-multiple-values', this.model.get('multipleValues'));
            this.updateState();
        },

        updateState: function () {
            this.showAsChanged();
            this.showAsKeepMultipleValues();
            this.showAsIsNull();
        },

        maskValue: function () {
            this.getValue() && this.model.get('mask') && this.input.val(assemble.mask(this.getValue(), this.model.get('mask')));
        },

        showAsChanged: function () {
            this.$el.toggleClass('changed', this.model.hasChanged());
        },
        
        hasChanged: function () {
            return this.model.hasChanged();
        },

        showAsKeepMultipleValues: function () {
            this.$el.toggleClass('keep-multiple-values', this.model.get('multipleValues'));
        },

        showAsIsNull: function () {
            this.$el.toggleClass('empty', this.model.valueIsNull());
        },

        updateModel: function () {
            // have to see if it's a number, and if it is, coerce the value into a number
            var value = $.isNumeric(this.model.get('value')) || (this.model.get('validations') && this.model.get('validations').number) ? +this.getValue() : this.getValue();
            this.model.set('value', value, { silent: true });
        },

        disable: function () {
            this.$el.addClass('disabled');
            this.input[0].disabled = true;
        },

        enable: function () {
            this.$el.removeClass('disabled');
            this.input[0].disabled = false;
        },

        keydown: function (event) {
            var key = event.keyCode;

            if (key == 13 || key == 9) {
                this.input.blur();
                this.trigger('blur');
            } else if (key == 27) {
                this.input.val(this.lastFocusedValue);
                this.input.blur();
            } else {
                this.trigger('change');
            }
        },

        unload: function () {
            switch (this.model.get('type')) {
                case 'typeAhead':
                    this.input.data('typeahead').$menu.remove();
                    break;
                case 'select':
                    this.input.unload();
                    break;
            }

            this.input.remove();
            this.off();
        }
    });
} ());