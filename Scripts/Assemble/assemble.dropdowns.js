(function () {
    assemble.dropdowns = {};

    assemble.dropdowns.SelectorItemView = Backbone.View.extend({


    });

    assemble.dropdowns.SelectorListView = Backbone.View.extend({
        items: {},

        initialize: function (config) {
            config = config || {};

            // REFACTOR: this should be a default options object, with defaults defined, then a second statement to extend the default obj with the config
            var self = this;
            this.searchable = config.searchable;
            this.defaultText = config.defaultText || "(no selection)";
            this.classes = config.classes;
            this.menuClasses = config.menuClasses;
            this.toggleClasses = config.toggleClasses;
            this.menuAlign = config.menuAlign;
            this.noValue = config.noValue || config.noValue === "" ? config.noValue : null;
            this.idProperty = config.idProperty || 'id';
            this.nameProperty = config.nameProperty || 'name';
            this.searchProperty = config.searchProperty || this.nameProperty;
            this.emptyMessage = config.emptyMessage || 'No items';
            this.dividerBefore = config.dividerBefore || [];
            this.valid = config.valid || this.valid;
            this.htmlId = config.htmlId || "";
            
            if (config.itemTemplate) this.itemTemplate = config.itemTemplate;

            _.extend(this, assemble.modules.search);

            if ($.isArray(config.collection)) {
                this.collection = new Backbone.Collection(
                    config.collection,
                    { comparator: function (item) { return item.get(self.nameProperty); } }
                );
                this.originalCollection = true;
            }

            this.collection.bind('reset add change remove', function () {
                var selection = this.val();
                this.render();
                if (selection && this.getModel(selection)) {
                    this.val(selection, false);
                } else {
                    // WM:  Might want to trigger the change event here, but it makes more sense right now
                    //      to just trigger that event manually if you want it to happen when resetting or changing the collection
                    this.reset();
                }
            }, this);
        },

        events: {
            "click .selector-item": "itemSelected",
            "keydown .search": "searchUpdated",
            "click .search-box": "stopProp",
            "keydown a:focus": "arrowUpDown"
        }
    });

    _.extend(assemble.dropdowns.SelectorListView.prototype, {
        baseTemplate: _.template(
            '<div id="<%= htmlId %>" class="dropdown dropdown-selector">' +
                '<a href="#"  class="dropdown-toggle selection" data-toggle="dropdown"><b class="mlxs caret pull-right"></b><span class="selection-text">(no selection)</span></a>' +
                '<%= menu %>' +
            '</div>'
        ),

        searchableMenuTemplate: _.template(
            '<div class="dropdown-menu">' +
                '<div class="search-box input-append"><input class="search" value=""/><span class="add-on"><i class="icon-search"></i></span></div>' +
                '<ul class="scroll-at-medium">' +
                '</ul>' +
            '</div>'
        ),

        normalMenuTemplate: _.template(
            '<ul class="dropdown-menu scroll-at-large"></ul>'
        ),

        itemTemplate: _.template(
            '<li>' +
                '<a href="#" data-id="<%= id %>" title="<%= title || name %>" class="selector-item item-name">' +
                    '<%= name %>' +
                '</a>' +
            '</li>'
        ),

        dividerTemplate: _.template(
            '<li class="divider"></li>'
        ),

        render: function () {
            this.items = {};

            if (!this.controlsCreated) this.createControls();

            this.empty();
            this.addAll();

            return this;
        },

        createControls: function () {
            var menuHtml = this.searchable ? this.searchableMenuTemplate() : this.normalMenuTemplate(),
                self = this;
            this.setElement($(this.baseTemplate({ menu: menuHtml, htmlId: this.htmlId })));
            this.selectionText = this.$('.selection-text');
            this.menu = this.$(".dropdown-menu");
            this.searchInput = this.$(".search");

            this.$el.bind('opened', function (event) { self.opened(); });
            this.$el.bind('closed', function (event) { self.closed(); });

            if (this.classes) {
                this.$el.addClass(this.classes);
            }
            if (this.menuClasses) {
                this.menu.addClass(this.menuClasses);
            }
            if (this.toggleClasses) {
                this.$('.dropdown-toggle').addClass(this.toggleClasses);
            }
            if (this.menuAlign) {
                this.menu.attr('data-menu-align', this.menuAlign);
            }
            if (this.defaultText) {
                this.resetDefaultText();
            }

            this.list = this.searchable ? this.$(".dropdown-menu ul") : this.menu;
            this.list.append('<li class="empty-message"><a href="#" onclick="return false;">' + this.emptyMessage + '</a></li>');

            this.controlsCreated = true;
        },

        addOne: function (item) {
            var obj = { id: item.get(this.idProperty), name: item.get(this.nameProperty), title: item.get('title') || item.get(this.nameProperty) };
            var view = $(this.itemTemplate(obj));
            this.items[item.get(this.idProperty)] = view;
            this.list.append(view);
        },

        addAll: function () {
            var self = this;
            if (this.collection.length) this.$el.removeClass('empty');
            this.collection.each(function (item, index) {
                if (index != 0 && _.include(self.dividerBefore, item.get(self.idProperty))) {
                    self.list.append(self.dividerTemplate());
                }
                self.addOne.call(self, item);
            });
        },

        opened: function () {
            if (this.searchable) {
                this.searchInput.focus();
                this.resetSearch();
            }
        },

        closed: function () {
            this.trigger('closed', this.getValue());
        },

        itemSelected: function (event) {
            event.preventDefault();

            this.selectItem($(event.currentTarget));
        },

        select: function (id, triggerEvent) {
            var selectedItem = this.$('[data-id="' + id + '"]');

            if (selectedItem.length === 0) {
                this.text(this.defaultText);
                this.menu.find('li').removeClass('selected');
                return;
            }

            this.selectItem(selectedItem, triggerEvent);
        },

        selectItem: function ($elem, triggerEvent) {
            triggerEvent = triggerEvent || triggerEvent === undefined ? true : false;

            var id = $elem.attr('data-id');
            if ($elem.hasClass('selected')) return;
            this.text($elem.text());
            $elem.parent().radioClass('selected');
            if (triggerEvent) {
                this.trigger('change', this.getModel(id));
            }
        },

        getValue: function () {
            var value = this.$('.selected .selector-item').attr('data-id'),
                model = this.getModel(value);

            return value === undefined || model === undefined ? this.noValue : model.get(this.idProperty);
        },

        val: function (value, triggerEvent) {
            if (value !== undefined) {
                this.select(value, triggerEvent);
                return this;
            } else {
                return this.getValue();
            }
        },

        text: function (text) {
            if (text !== undefined) {
                this.selectionText.text(text.replace(new RegExp('&quot;', "g"), '"'));
                return this;
            } else {
                return this.selectionText.text();
            }
        },

        getSelectableItems: function () {
            return this.menu.find('li').not('.empty-message, .divider');
        },

        reset: function () {
            this.select(this.initialSelection || this.noValue, false);
        },

        arrowUpDown: function (event) {
            var key = event.keyCode,
                up = key == 38,
                down = key == 40;

            if (!up && !down) return;

            if (up) {
                var prevElem = $(event.currentTarget).parent().prevAll(":visible");
                if (this.searchable && !prevElem.length) {
                    this.menu.find('.search').focus();
                } else {
                    prevElem.first().children('a').focus();
                }
            } else if (down) {
                $(event.currentTarget).parent().nextAll(":visible").first().children('a').focus();
            }

            event.stopPropagation();
            event.preventDefault();
        },

        downToList: function () {
            this.menu.find('li:visible:first a').focus();
        },

        stopProp: function (event) {
            event.stopPropagation();
        },

        resetDefaultText: function () {
            this.selectionText.text(this.defaultText);
        },

        empty: function () {
            this.getSelectableItems().remove();
            this.$el.addClass('empty');
        },

        focus: function () {
            this.forceOpen();
        },

        forceOpen: function () {
            var self = this;
            setTimeout(function () { self.$('[data-toggle="dropdown"]').trigger('click.dropdown.data-api'); }, 1);
        },
        
        valid: function () {
            return true;
        },

        getModel: function (id) {
            var self = this;
            return this.collection.find(function (item) { return item.get(self.idProperty) == id; });
        },

        enable: function(){
            this.$el.removeClass('disabled');
            this.$(".dropdown-toggle").off('click', this.disabledClick);
        },

        disable: function () {
            this.$el
                .addClass('disabled')
                .removeClass('open');
            this.$(".dropdown-toggle").on('click', { dropdownMenu: this }, this.disabledClick);
        },

        disabledClick: function (e) {
            var dropdown = e.data.dropdownMenu;
            dropdown.$el.removeClass('open');
            dropdown.trigger('disabledRejection');
            e.stopPropagation();
            e.preventDefault();
        },

        unload: function () {
            this.off();
            this.$el.off();
            this.items = undefined;
            this.$el.remove();
            if (this.originalCollection) this.collection.reset([], { silent: true });
        }
    });

    assemble.dropdowns.FreetextEntry = Backbone.View.extend({
        initialize: function (config) {
            config = config || {};
            this.defaultText = config.defaultText || "(any)";
            this.helpText = config.helpText || false;
            this.initialValue = config.initialValue || "";

            // TODO: make this dynamic, so people can send this in and we refer to it dynamically
            this.idProperty = 'id';
            this.nameProperty = 'name';
        },

        events: {
            'keydown input': 'submit',
            "click .dropdown-menu": "stopProp"
        }
    });

    _.extend(assemble.dropdowns.FreetextEntry.prototype, {
        template: _.template(
            '<div class="dropdown dropdown-selector">' +
                '<a href="#" class="dropdown-toggle selection" data-toggle="dropdown"><b class="mlxs caret pull-right"></b><span class="selection-text"><%= defaultText %></span></a>' +
                '<div class="dropdown-menu force-right-left pas freetext-input">' +
                    '<input value="" type="text" class="input-medium" />' +
                    '<span class="add-on"></span>' +
                '</div>' +
            '</div>'
        ),

        render: function () {
            var self = this;
            this.setElement($(this.template({ defaultText: this.defaultText })));
            this.input = this.$('input');
            this.input.val(this.initialValue);
            this.selectionText = this.$('.selection-text');
            this.menu = this.$('.dropdown-menu');
            this.helpTextEl = this.$('.add-on');

            this.updateHelpText(this.helpText);

            this.$el.bind('opened', function () {
                self.opened();
            });
            return this;
        },

        updateHelpText: function (text) {
            if (text) {
                this.helpTextEl.text(text);
                this.menu.addClass('input-append');
            } else {
                this.menu.removeClass('input-append');
            }
            this.helpText = text;
        },

        getValue: function () {
            return this.selectionText.text();
        },

        opened: function () {
            var newValue = '',
                currentValue = this.getValue();
            if (currentValue != this.defaultText) {
                if (this.helpText && currentValue.indexOf(' ' + this.helpText) > -1) {
                    currentValue = currentValue.replace(' ' + this.helpText, '');
                }
                newValue = currentValue;
            }

            this.input
                    .val(newValue)
                    .focus();
        },

        submit: function (event) {
            if (event.keyCode != 13) return;
            var value = this.input.val(),
                text = value;
            this.$el.removeClass('open');

            if (text.length && this.helpText) {
                text = text + ' ' + this.helpText;
            } else if (!text.length) {
                text = this.defaultValue;
            }

            this.$('.selection-text').text(text);
            this.trigger('change', value);
        },

        stopProp: function (event) {
            event.stopPropagation();
        },

        setValue: function (value, triggerEvent) {
            triggerEvent = triggerEvent || triggerEvent === undefined ? true : false;

            this.input.val(value);
            this.$('.selection-text').text(value.length ? value : this.defaultValue);

            if (triggerEvent) {
                this.trigger('change', value);
            }
        },

        unload: function () {
            this.off();
            this.$el.off();
            this.remove();
        }
    });

} ());