(function () {
    var filters = assemble.filters = {};

    // one of these models instantiated per filter line
    // these are each managed by a filters.FilterView
    // {property: 'string', operator: 'string', value: 'string' }
    filters.FilterModel = Backbone.Model.extend({
        initialize: function () {
            this.bind('destroy', this.destroyCautiously);
        },

        defaults: {
            property: '(select)',
            operator: 'is',
            value: '(any)',
            propertyType: 'string',
            valueType: 'string'
        }
    });

    _.extend(filters.FilterModel.prototype, {
        // has the user completely configured the filter?
        // e.g. defined property, operator (always defined), and value
        // need to be careful of the case when property has changed (and operator type changes) 
        // but value is not the correct type.
        isComplete: function () {
            var value = this.get('value'),
                propertyType = this.get('propertyType'),
                property = this.get('property'),
                valueIsNumeric = !isNaN(parseFloat(value)) && isFinite(value),
                valueMatches = (propertyType == 'numeric' && valueIsNumeric) || propertyType == 'string';

            return valueMatches &&
                      property != this.defaults.property &&
                      value != this.defaults.value && value !== null;
        },

        // wrapper for this.set that only triggers the filter.changed event to reload the grid if
        //     the filter is now complete
        // it always updates the filter
        setCautiously: function (attributes, options) {
            this.set.apply(this, arguments);

            if (this.isComplete()) {
                this.trigger('filter.changed');
            }
        },

        // similar to setCautiously, always destroys the model, but only triggers
        //     filter.changed if filter isComplete
        destroyCautiously: function () {
            this.destroyed = true;

            if (this.isComplete()) {
                this.trigger('filter.changed');
            }
        }
    });

    // home to the set of filters (filters.FilterModel's) shown in the current view
    // this is where we package up the effective filters
    filters.FiltersCollection = Backbone.Collection.extend({
        model: filters.FilterModel,

        initialize: function () {
            this.bind('filter.changed', this.filterChanged, this);
        },

        // get set of valid, active filters
        validFilters: function () {
            return this.reduce(function (memo, filter) {
                // have to check for filter.destroyed here because this is called
                //     before the model has actually destroyed itself
                //     is there a way to get around that? like an afterDestroy that still has a reference to the model destroyed?
                if (filter.isComplete() && !filter.destroyed) {
                    memo.push(filter.toJSON());
                }
                return memo;
            }, []);
        },

        // trigger the event that triggers the grid to update itself
        filterChanged: function () {
            this.trigger('filters.changed', this.validFilters());
        },

        comparator: function (filter) {
            return [filter.get('property'), filter.get('operator'), filter.get('value')];
        }
    });

    // model for each property. need an id and name for assemble.dropdowns.select
    // {id: 'string', name: Name, type: "numeric" || "string" }
    filters.FilterPropertyModel = Backbone.Model.extend({

    });

    // for list of properties available by which to filter
    // should be instantiated and persisted for the selected model
    filters.FilterPropertyCollection = Backbone.Collection.extend({
        model: filters.FilterPropertyModel,
        comparator: function (property) {
            return property.get("name");
        }
    });

    // model for each operator, type is normal for free-text or select for a dropdown selector
    // {id: 1, name: Name, type: "select" || "normal" }
    filters.FilterOperatorModel = Backbone.Model.extend({
        defaults: {
            type: "normal"
        }
    });

    // collection of operators, one collection is instantiated for string operators, one for numeric
    // should be instantiated once in the page, the operators never change
    filters.FilterOperatorCollection = Backbone.Collection.extend({
        model: filters.FilterOperatorModel,
        comparator: function (operator) {
            return operator.get("name");
        }
    });

    // possible filter values for selected property when operator requires select dropdown
    //     not used in value free-text input case
    // {id: 'string', name: 'string'}
    filters.FilterValueSelectListModel = Backbone.Model.extend({

    });

    // collection of valid values for selected property when operator requires select dropdown
    //     not used in value free-text input case
    filters.FilterValueSelectListCollection = Backbone.Collection.extend({
        model: filters.FilterValueSelectListModel,
        comparator: function (value) {
            return value.get("name");
        }
    });

    // view for each filter instance
    // renders its own property, operator, and value dropdowns and manages changes to each
    filters.FilterView = Backbone.View.extend({
        initialize: function (config) {
            this.numericOperators = config.numericOperators;
            this.stringOperators = config.stringOperators;
            this.propertyList = config.propertyList;
            this.modelVersionId = config.modelVersionId;
            this.comparedModelVersionId = config.comparedModelVersionId;
        },

        events: {
            'click .filter-remove': 'destroy'
        }
    });

    _.extend(filters.FilterView.prototype, {
        template: _.template(
            '<div class="filter">' +
                '<div class="filter-properties filter-part"></div>' +
                '<div class="filter-operator filter-part"></div>' +
                '<div class="filter-value filter-part"></div>' +
                '<a class="filter-remove close close-light">&times;</a>' +
                '<div class="ugly-clearfix"></div>' +
            '</div>'
        ),

        selectedProperty: function () {
            return this.propertyList.get(this.model.get('property'));
        },

        selectedOperator: function () {
            return this[this.selectedProperty().get('type') + 'Operators'].get(this.model.get('operator'));
        },

        render: function () {
            var filterIsComplete = this.model.isComplete();
            this.setElement(this.template({}));

            if (filterIsComplete) {
                // load dropdowns and set their values based on existing data
                this.showProperties();
                this.property.select(this.model.get('property'), false);

                this.showOperatorsFor(this.selectedProperty().get('type'), false);
                this.operator.select(this.model.get('operator'), false);

                var inputType = this.selectedOperator().get('type');
                this.showValueInputFor(inputType, false, false, false);
                if (inputType == 'normal' && this.model.get('value') != this.model.defaults.value) {
                    this.valueInput.setValue(this.model.get('value'), false);
                }
            } else {
                // just load dropdowns with the default values
                this.showProperties();
                this.showOperatorsFor('string');
                this.showValueInputFor('select', false);
            }

            return this;
        },

        showProperties: function () {
            var self = this;
            this.property = new assemble.dropdowns.SelectorListView({ searchable: true, defaultText: this.model.defaults.property, collection: this.propertyList });
            this.$('.filter-properties').html(this.property.render().el);
            this.property.bind('change', function (property) {
                self.propertySelected(property);
            });
        },

        propertySelected: function (property) {
            var type = property.get('type') || 'string';
            this.model.set('property', property.get('id'));
            this.showOperatorsFor(type);
            this.model.setCautiously({ property: property.get('id'), propertyType: type });
        },

        showOperatorsFor: function (type, resetOperator) {

            if (typeof (resetOperator) == 'undefined')
                resetOperator = true;

            if (this.operatorType == type) {
                this.showValueInputFor(this.selectedOperator().get('type'));
                return;
            }

            var self = this;
            this.operatorType = type;
            this.operator = new assemble.dropdowns.SelectorListView({
                defaultText: "is",
                collection: this[type + 'Operators'],
                classes: type == 'numeric' ? 'numeric-operator' : ''
            });

            this.$('.filter-operator').html(this.operator.render().el);

            if (this.operatorType == 'numeric') {
                this.operator.select('equals');
            }

            //need to set the operator:
            if (resetOperator)
                this.model.set({ operator: type == 'numeric' ? 'equals' : 'is', operatorType: type });

            var typeForInput = resetOperator ? this.operatorType : this.selectedOperator().get('type');
            this.showValueInputFor(typeForInput == 'string' ? 'select' : 'normal', true, false);

            this.operator.bind('change', function (property) {
                self.operatorSelected(property);
            });
        },

        operatorSelected: function (operator) {
            //this.model.setCautiously("operator", operator.get('id'));
            this.model.setCautiously({ operator: operator.get('id'), operatorType: operator.get('filterType') });
            this.showValueInputFor(operator.get('type') || 'normal', true);
        },

        showValueInputFor: function (type, operatorChanged, resetValue) {
            var self = this,
            property = this.selectedProperty();

            if (typeof (resetValue) == 'undefined')
                resetValue = true;

            if (this.valueInputType == type) {
                if (operatorChanged) { //don't reload the selects for reset the value
                    return;
                }
            }

            this.valueInputType = type;

            if (resetValue)
                this.model.set("value", this.model.defaults.value);

            if (type == 'normal') {
                this.updateValueInput(new assemble.dropdowns.FreetextEntry({ defaultText: this.model.defaults.value, helpText: (property ? property.get('unit') : false) }));
                this.valueInput.updateHelpText(property.get('unit'));
            } else {
                //if property is undefined use temp value list
                if (property === undefined) {
                    this.valueCollection = new filters.FilterValueSelectListCollection(tempSelectedValue);
                    this.updateValueInput(new assemble.dropdowns.SelectorListView({ searchable: true, defaultText: self.model.defaults.value, collection: this.valueCollection, menuClasses: "force-right-left" }));
                } else {
                    //HD: Ajax request, lazy loading...
                    $.ajax({
                        type: "POST",
                        url: assemble.mvcRoutes.versionFilterPropertyValues({
                            id: this.modelVersionId
                        }),
                        data: {
                            comparedModelVersionId: !(_.isNull(this.comparedModelVersionId) || _.isUndefined(this.comparedModelVersionId)) ? this.comparedModelVersionId : null,
                            propertyName: property.id,
                            filters: JSON.stringify(this.model.collection.validFilters())
                        },
                        success: function (selectValueItems) {
                            self.valueCollection = new filters.FilterValueSelectListCollection(selectValueItems);
                            var input = new assemble.dropdowns.SelectorListView({ searchable: true, defaultText: self.model.get('value'), collection: self.valueCollection, menuClasses: "force-right-left" });
                            input.render().select(self.model.get('value'), false);
                            self.updateValueInput(input);
                        }
                    });
                }
            }
        },

        //method for dry-ness
        updateValueInput: function (input) {
            var self = this;
            this.valueInput = input;
            this.$('.filter-value').html(this.valueInput.render().el);
            this.valueInput.bind('change', function (value) {
                self.valueSelected(value);
            });
        },

        valueSelected: function (value) {
            var selectedValue = this.valueInputType == 'select' ? value.get('name') : value;
            this.model.setCautiously("value", selectedValue);
        },

        destroy: function () {
            this.model.destroy();
            this.$el.off().remove();
            this.propertyList = undefined;
            this.property.unload();
            this.operator.unload();
            this.valueInput.unload();
            if (this.valueCollection) this.valueCollection.reset([], { silent: true });
            this.model.off();
            this.off();
        }
    });

    // containing view for all current filters and adding a new filter
    filters.FilterListView = Backbone.View.extend({
        filterViews: [],

        initialize: function () {
            var self = this;

            this.collection = new filters.FiltersCollection();

            this.filtersList = this.$('#filters_list');
            this.changesOnlyTool = this.$('#changes_only_tool');

            // keep only one refernce and share with underlying filter views, since these never change
            this.configuration = {
                numericOperators: new filters.FilterOperatorCollection(numericOperators),
                stringOperators: new filters.FilterOperatorCollection(stringOperators),
                propertyList: new filters.FilterPropertyCollection()
            };

            this.collection.bind('add', function (filter) {
                self.addOne(filter);
            });
            this.collection.bind('reset', this.render, this);
        },

        update: function (config) {
            this.setModelVersion(config.selected, config.compared);
            this.setPropertyList(config.filterProperties);
            this.isVarianceMode = !!config.compared;
            this.changesOnly = config.changesOnly;
            this.collection.reset(config.filters || []);
        },

        setPropertyList: function (props) {
            this.configuration.propertyList.reset(props);
        },

        setModelVersion: function (modelVersionId, comparedModelVersionId) {
            this.configuration.modelVersionId = modelVersionId;
            this.configuration.comparedModelVersionId = comparedModelVersionId;
            this.inVarianceMode = !!comparedModelVersionId;
        },

        events: {
            'click #add_filter': 'addFilter',
            'change #changes_only': 'updateVarianceFilters'
        },

        render: function () {
            // remove all existing filters
            this.filtersList.empty();

            // load existing or create a new empty one
            if (this.collection.any()) {
                this.loadExisting();
            } else {
                this.addFilter();
            }

            this.setupVarianceFilters();
        },

        addOne: function (filter) {
            // add a filter view from a new filter model instance
            var view = new assemble.filters.FilterView($.extend({ model: filter }, this.configuration));
            this.filterViews.push(view);
            this.filtersList.append(view.render().$el.hide());
            view.$el.fadeIn('fast');
        },

        loadExisting: function () {
            var self = this;
            this.collection.each(function (item) {
                self.addOne.call(self, item);
            });
        },

        addFilter: function (event) {
            // this ONLY adds a blank filter to the collection
            // the collection's add event fires which this view listens for and runs addOne in response for the view

            // this may or may not be in response to an event, maybe we should write a wrapper
            if (event && $.isFunction(event.preventDefault)) {
                event.preventDefault();
            }
            this.collection.add({});
        },

        updateVarianceFilters: function (e) {
            e.preventDefault();
            this.changesOnly = $(e.currentTarget).is(":checked");
            this.trigger("change:varianceFilters", { changesOnly: this.changesOnly });
        },

        setupVarianceFilters: function (config) {
            config = config || {};
            this.changesOnlyTool.toggle(this.isVarianceMode);
            if (config.changesOnly) this.changesOnly = config.changesOnly;

            if (this.changesOnly) {
                this.$('#changes_only').attr('checked', 'checked');
            } else {
                this.$('#changes_only').removeAttr('checked');
            }
        },

        show: function () {
            this.$el.slideDown('fast');
        },

        hide: function () {
            this.$el.hide();
            this.filtersList.empty();
        },

        unload: function () {
            _.each(this.filterViews, function (view) {
                view.destroy();
            });
            this.collection.each(function (filter) {
                filter.off();
                filter.destroy();
            });
            this.filterViews = [];
            this.configuration.propertyList.reset([], { silent: true });
        }
    });

    var numericOperators = [
        { id: 'lessThan', name: '<', filterType: 'numeric' },
        { id: 'greaterThan', name: '>', filterType: 'numeric' },
        { id: 'lessThanOrEqual', name: '<=', filterType: 'numeric' },
        { id: 'greaterThanOrEqual', name: '>=', filterType: 'numeric' },
        { id: 'equals', name: '=', filterType: 'numeric' },
        { id: 'notEquals', name: '!=', filterType: 'numeric' }
    ];

    var stringOperators = [
        { id: 'is', name: 'is', type: 'select', filterType: 'string' },
        { id: 'isNot', name: 'is not', type: 'select', filterType: 'string' },
        { id: 'like', name: 'like', filterType: 'string' },
        { id: 'notLike', name: 'not like', filterType: 'string' }
    ];

    var tempSelectedValue = [
        { id: 1, name: '(any)' }
    ];

} ());