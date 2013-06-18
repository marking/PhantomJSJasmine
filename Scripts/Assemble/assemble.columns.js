(function () {
    var columns = assemble.columns = {};

    columns.ColumnModel = Backbone.Model.extend({
        isSelected: function () {
            var selectionIndex = this.get('selectionIndex');
            return selectionIndex === 0 || selectionIndex > 0;
        }
    });

    columns.ColumnsCollection = Backbone.Collection.extend({
        initialize: function (config) {
            this.on('reset', this.mark);
            this.versions = config.versions;
            this.versions.on('change', this.markNeedsUpdate, this);
            this.showDeltaOnly = config.showDeltaOnly || false;
        },

        model: columns.ColumnModel,

        selectedModelId: 0,

        setSelectedModelId : function(id) {

            if (id != this.selectedModelId) {
                this.comparisonSelectedList = [];
            }

            this.selectedModelId = id;
        },

        url: function () {
            return assemble.mvcRoutes.versionAvailableColumns(
                { modelVersionId: this.versions.get('selected'),
                    comparedModelVersionId: this.versions.get('compared')
                }
            );
        },

        isCompare: function () {
            return !!this.versions.get('compared');
        },

        needsUpdate: true,

        markNeedsUpdate: function (event) {
            this.needsUpdate = true;
        },

        mark: function () {
            this.needsUpdate = false;
            this.markFrozen();
            this.setSelected({ silent: true });
        },

        frozen: ["AssembleName", "TakeoffQuantity", "TakeoffUnit"],
        comparisonFrozen: ["AssembleName", "TakeoffQuantity", "TakeoffUnit", "AssembleTotalCost"],

        getColumnNames: function () {
            return this.reduce(function (memo, column) {
                if (!column.get('frozen'))
                    memo.push(column.get('id'));
                return memo;
            }, []);
        },

        selectedList: [],
        comparisonSelectedList: [],

        markFrozen: function () {
            var self = this;

            if (this.size() > 0) {
                _.each(this.getFrozen(), function (frozenColumnName) {
                    var col = self.get(frozenColumnName);
                    if (col)
                        col.set("frozen", true, { silent: true });
                });
            }
        },

        setShowDeltaOnly: function (showDeltaOnly) {
            this.showDeltaOnly = !!showDeltaOnly;
        },


        setSelectedList: function (list) {
            if (this.isCompare())
                this.comparisonSelectedList = list;
            else
                this.selectedList = list;
            if (!this.needsUpdate) {
                this.setSelected({ silent: true });
            }
        },

        setSelected: function (options) {
            options = options || {};
            var selected = this.isCompare() ? this.comparisonSelectedList.concat([]) : this.selectedList.concat([]);
            selected.unshift.apply(selected, this.getFrozen());

            // reset selectedIndex
            this.each(function (column) {
                var id = column.get('id');
                selectionIndex = _.indexOf(selected, id);

                column.set('selectionIndex', (selectionIndex < 0 ? null : selectionIndex), { silent: true });
            });

            if (!options.silent) {
                this.trigger('change');
            }
        },

        getSelectedList: function () {
            if (this.isCompare())
                return this.comparisonSelectedList;
            return this.selectedList;
        },

        getFrozen: function () {
            return this.isCompare() ? this.comparisonFrozen : this.frozen;
        }

    });

    // should we just create this once? or every time it's clicked.
    // it depends on version chosen, version compared, so, do we just get rid and load freshly every time?
    columns.AddRemoveColumnsView = Backbone.View.extend({
        initialize: function (config) {
            this.columns = config.columns;
            this.isCompare = config.isCompare;
        },

        events: {
            'click .btn-primary': 'updateSelectedColumns'
        }
    });

    _.extend(columns.AddRemoveColumnsView.prototype, {
        render: function () {
            var self = this;
            var modal = $(Handlebars.templates.modal({
                id: 'add_remove_columns_modal',
                title: 'Add/Remove Columns',
                primaryButtonText: 'Apply'
            }));
            this.setElement(modal);

            assemble.help.mainrepository.load(function (helpConfig) {
                self.helpLink = new assemble.help.KeyView({ model: helpConfig, el: modal.find(".help-link")[0], key: "10001" });
            });

            this.selector = new listSelector.SelectorControl({
                items: this.columns.toJSON(),
                selectFromHeader: 'Available columns',
                selectedHeader: 'Selected columns',
                searchable: true,
                idProperty: 'id',
                nameProperty: 'name',
                limit: this.isCompare ? 13 : undefined,
                limitMessage: "Allowed up to 10 additional columns. You\'ve hit the limit!"
            });

            this.$('.modal-body')
                    .html(this.selector.render().el);

            if (this.isCompare) {
                this.$('.selected-list-container').append(Handlebars.templates.columns.referenceColumnsToggle({ showDeltaOnly: this.columns.showDeltaOnly }));
            }

            this.$el
                    .modal({ backdrop: 'static' })
                    .on('hidden', function () {
                        $(this).remove();
                        self.unload();
                    })
                    .modal('show');

            this.selector.$('.search').focus();

            this.selector.selectedList.sortable({ items: '> a:not(.frozen)' });

            return this;
        },

        updateSelectedColumns: function (event) {
            event.preventDefault();
            var selectedColumns = this.selector.getColumnSet();

            var selected = _.pluck(_.filter(selectedColumns, function (column) { return !column.get('frozen'); }), 'id');

            this.columns.setSelectedList(selected);
            if (this.isCompare) {
                this.columns.showDeltaOnly = this.$('[name=showDeltaOnly]').is(":checked");
            }
            this.columns.trigger('columns.changed');

            this.$el.modal('hide');
        },

        unload: function () {
            this.selector.destroy();
            this.off();
            this.$el
                .remove()
                .off();
        }
    });

    // selector controls
    var listSelector = assemble.listSelector = {};

    // {id: id, name: 'name', selected: false}
    listSelector.ItemModel = Backbone.Model.extend({
        isSelected: function () {
            var selectionIndex = this.get('selectionIndex');
            return selectionIndex === 0 || selectionIndex > 0;
        }
    });

    listSelector.ItemsCollection = Backbone.Collection.extend({
        model: listSelector.ItemModel,

        initialize: function (items, config) {
            this.idProperty = config.idProperty;
            this.nameProperty = config.nameProperty;
        },

        comparator: function (model) {
            return model.get('name').toLowerCase();
        },

        getSelected: function () {
            var self = this;

            return _.sortBy(
                _.reduce(self.models, function (memo, item) {
                    if (item.isSelected()) {
                        memo.push(item);
                    }

                    return memo;
                }, []),
                function (item) { return item.get('selectionIndex'); }
            );
        },

        updateSelection: function (selectedIds) {
            var self = this;

            this.deselectAll();

            this.each(function (item) {
                var selectionIndex = _.indexOf(selectedIds, item.get(self.idProperty));

                if (selectionIndex >= 0) {
                    item.set({ 'selectionIndex': selectionIndex });
                }
            });

            return this.getSelected();
        },

        deselectAll: function () {
            this.each(function (column) {
                column.set({ 'selectionIndex': -1 });
            });
        }

    });

    listSelector.SelectorControl = Backbone.View.extend({
        items: {},

        initialize: function (config) {
            this.config = config;
            this.idProperty = config.idProperty || 'id';
            this.nameProperty = config.nameProperty || 'name';
            this.searchProperty = config.searchProperty || this.nameProperty;
            this.collection = new listSelector.ItemsCollection(config.items, { idProperty: this.idProperty, nameProperty: this.nameProperty });
            this.limit = config.limit || undefined;
            this.limitMessage = config.limitMessage || 'Allowed up to ' + this.limit + '. You\ve hit the limit';

            this.searchable = this.config.searchable;
            _.extend(this, assemble.modules.search);
        },

        events: {
            "click .selected-list .remove-me": "itemDeselected",
            "click .select-from-list .selector-item": "itemSelected",
            "click .selected-list .move-arrow": "move",
            "keydown .search": "searchUpdated",
            "keydown .selector-item:focus": "selectFromKeyboard"
        }
    });

    _.extend(listSelector.SelectorControl.prototype, {
        //{selectFromHeader: selectFromHeader, selectedHeader: selectedHeader, emptyMessage: emptyMessage }
        template: _.template(
            '<div class="selector clearfix reorderable">' +
                '<div class="pull-left select-from-list-container">' +
                    '<p class="mbs"><%= selectFromHeader %></p>' +
                    '<div class="select-from-list">' +
                    '</div>' +
                '</div>' +
                '<div class="pull-left selector-arrow-col mtl"></div>' +
                '<div class="pull-left selected-list-container">' +
                    '<p class="mbs"><%= selectedHeader %></p>' +
                    '<div class="selected-list">' +
                    '</div>' +
                    '<p class="error help-block limit-error" style="display: none;"><%= limitMessage %></p>' +
                '</div>' +
            '</div>'
        ),

        searchTemplate: _.template(
            '<div class="search-box input-append">' +
                '<input class="search" value=""/><span class="add-on"><i class="icon-search"></i></span>' +
            '</div>'
        ),

        itemTemplate: _.template(
            '<a onclick="return false;" href="#" class="selector-item" data-id="<%= id %>">' +
                '<span class="remove-me pull-right"><i class="icon-remove icon-white"></i></span>' +
                '<span class="move-arrow down-arrow pull-right"><i class="icon-fat-arrow-down icon-white"></i></span>' +
                '<span class="move-arrow up-arrow pull-right"><i class="icon-fat-arrow-up icon-white"></i></span>' +
                '<span class="item-name"><%= name %></span>' +
                '<div class="move-handle" title="Drag to reorder">::</div>' +
            '</a>'
        ),

        render: function () {
            var self = this;
            this.items = {};

            this.setElement($(this.template(this.config)));
            this.selectFromList = this.$('.select-from-list');
            this.selectedList = this.$('.selected-list');

            if (this.config.searchable) {
                this.$el.addClass('searchable');
                this.$('.select-from-list').before(this.searchTemplate());
                this.searchInput = this.$('.search');
            }

            this.addAll();

            _.each(this.collection.getSelected(), function (item) {
                self.selectItemById(item.get(self.idProperty));
            });

            return this;
        },

        addOne: function (item) {
            var columnData = _.extend(item.toJSON(), { id: item.get(this.idProperty), name: item.get(this.nameProperty) });
            var view = $(this.itemTemplate(columnData));

            // for ie9, which doesn't understand that this el should be block before it's shown
            view.css('display', 'block');

            if (item.get('frozen')) {
                view.addClass('frozen');
            }

            // store a reference to the view
            this.items[item.get(this.idProperty)] = view;
            this.selectFromList.append(view);
        },

        addAll: function () {
            var self = this;
            this.collection.each(function (item) { self.addOne.call(self, item); });
        },

        itemSelected: function (event) {
            event.preventDefault();
            var hitLimit = this.hitLimit();
            this.$('.limit-error').toggle(hitLimit);
            
            if (!hitLimit) this.selectItem($(event.currentTarget));
        },

        itemDeselected: function (event) {
            event.preventDefault();
            event.stopPropagation();
            var hitLimit = this.hitLimit();

            this.$('.limit-error').toggle(hitLimit);
            this.deselectItem($(event.currentTarget).parents('.selector-item'));
        },

        selectItem: function ($item, id) {
            id = id || $item.attr('data-id');

            $item.addClass('selected');
            $item
                .clone()
                    .appendTo(this.selectedList)
                    .fadeIn(200);

            this.resetSearch();
            if (!assemble.browser.ipad) {
                this.searchInput.focus();
            }
        },

        selectItemById: function (id) {
            this.selectItem(this.$("[data-id='" + id + "']"), id);
        },

        deselectItem: function ($item, id) {
            id = id || $item.attr('data-id');

            $item.remove();

            this.selectFromList.find("[data-id='" + id + "']")
                .removeClass('selected')
                .css('display', 'block');
        },

        move: function (event) {
            var $arrow = $(event.currentTarget),
                up = $arrow.hasClass('up-arrow'),
                $targetItem = $arrow.parents('.selector-item'),
                sibling;

            if (up) {
                sibling = $targetItem.prev();
                if (!sibling.hasClass('frozen')) {
                    sibling.before($targetItem);
                }
            } else {
                sibling = $targetItem.next();
                if (sibling.length > 0) {
                    sibling.after($targetItem);
                }
            }

            event.stopPropagation();
            event.preventDefault();
        },

        getSelectableItems: function () {
            return this.$('.select-from-list .selector-item');
        },

        getSelectedItems: function () {
            return this.$('.selected-list .selector-item');
        },

        getColumnSet: function () {
            var selectedColsIds = _.map(this.selectedList.find('.selector-item'), function (item) { return $(item).attr('data-id'); });

            return this.collection.updateSelection(selectedColsIds);
        },

        hitLimit: function () {
            return (!!this.limit && this.getSelectedItems().length >= this.limit);
        },

        selectFromKeyboard: function (event) {
            var key = event.keyCode,
                up = key == 38,
                down = key == 40,
                enter = key == 13;

            if (!up && !down && !enter) return;

            if (up) {
                var prevElem = $(event.currentTarget).prevAll(":visible");

                if (this.searchable && !prevElem.length) {
                    this.searchInput.focus();
                } else {
                    prevElem.first().focus();
                }
            } else if (down) {
                $(event.currentTarget).nextAll(":visible").first().focus();
            } else if (enter) {
                this.selectItem($(event.currentTarget));
            }

            event.preventDefault();
        },

        downToList: function () {
            this.selectFromList.find('.selector-item:visible:first').focus();
        },

        destroy: function () {
            this.collection.reset([], { silent: true });
            this.collection = undefined;
            this.items = undefined;
            this.off();
            this.$el
                .remove()
                .off();
        }

    });

} ());
