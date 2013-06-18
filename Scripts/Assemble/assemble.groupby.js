﻿﻿// TODO use listSelector control like add/remove columns dialog
(function () {

    var groupBy = assemble.groupBy = {};



    /**************************************
    Chooser View
    **************************************/
    groupBy.chooserView = Backbone.View.extend({

        current: null,
        config: null,

        initialize: function (config) {
            var self = this;
            this.config = config;
            this.setElement($(config.element));
            this.groupByDropDownList = this.$el.find(".group-by-list");
            this.createGroupByButton = this.$el.find(".create-group-by");
            this.editGroupByButton = this.$el.find(".edit-group-by");
            this.deleteGroupByButton = this.$el.find(".delete-group-by");

            this.updateActionLinks(this.current);

            //Select a group by to view
            this.$el.on("click", ".group-by-choice", {}, function (event) {
                event.preventDefault();

                var choice = $(this);

                if (!choice.hasClass('selected')) {
                    self.changeChoice.call(self, choice.attr('data-id'));
                }
            });
        },

        events: {
            "click .create-group-by": "createGroupBy",
            "click .edit-group-by": "editGroupBy",
            "click .delete-group-by": "deleteGroupBy"
        },

        createGroupBy: function (event) {
            event.preventDefault();
            var self = this;
            this.currentCreateGroupByView = new groupBy.createGroupByView({ modelVersionId: this.modelVersionId });
            this.currentCreateGroupByView.render();
            this.currentCreateGroupByView.on("complete", function (data) {
                self.render(data);
            });
        },

        deleteGroupBy: function (event) {
            event.preventDefault();
            var self = this;
            this.currentDeleteGroupByView = new groupBy.deleteGroupByView({
                id: this.current,
                name: this.$el.find(".group-by-choice[data-id='" + this.current + "']").text()
            });
            this.currentDeleteGroupByView.render();
            this.currentDeleteGroupByView.on("destroyed", function () {
                self.currentDeleteGroupByView.off("destroyed", this);
                var selectedElement = self.$el.find(".group-by-choice[data-id='" + self.current + "']");
                selectedElement.parent().remove();
                self.changeChoice('');
            });
        },

        editGroupBy: function (event) {
            event.preventDefault();
            var self = this;
            this.currentEditGroupByView = new groupBy.editGroupByView({ modelVersionId: this.modelVersionId, current: this.current });
            this.currentEditGroupByView.render();
            this.currentEditGroupByView.on("complete", function (data) {
                self.render(data);
            });
        },

        render: function (config) {

            var self = this;

            if (config === null)
                config = { selectedGrouping: '' };

            this.fetch();
            this.groupByDropDownList.empty();

            //append (none) grouping
            this.groupByDropDownList.append(this.template({ Id: '', Name: '(none)' }));

            _.each(this.groupBys, function (groupByItem) {
                var $item = $(self.template(groupByItem));
                
                if(!groupByItem.AllowEditing) {
                    var $a = $item.find("a");
                    $a.html($a.html() + " <i class=\"icon-lock\"></i>");
                }

                self.groupByDropDownList.append($item[0]);
            });

            this.changeChoice(config.selectedGrouping);

            return this;
        },

        changeChoice: function (id, options) {
            var choiceElem = this.findChoice(id);
            options = options || {};

            // update the control selected text
            var $selectionText = this.$el.find('.selection-text');
            
            var currentGroupBy = Enumerable.From(this.groupBys).Where(function(x) { return x.Id == id; }).SingleOrDefault();

            if(!_.isUndefined(currentGroupBy) && currentGroupBy.AllowEditing) {
                $selectionText.html(choiceElem.text());
            }
            else {
                $selectionText.html(choiceElem.text() + " <i class=\"icon-lock\"></i>");
            }

            // update the menu to indicate the right one is selected
            choiceElem.parent().parent().radioClass('selected');
            // update the edit and delete link text
            this.updateActionLinks(id);

            this.current = choiceElem.attr('data-id');
            // set current grid state

            if (!options.silent)
                this.publishChange();
        },

        findChoice: function (id) {
            return this.$el.find('[data-id=' + (id || '""') + ']');
        },

        publishChange: function () {
            this.trigger('groupBy.changed', { groupBy: this.current });
        },

        preventDefaultOnDisable: function(event) {
            event.preventDefault();
        },

        updateActionLinks: function (id) {
            var choiceElem = this.findChoice(id);
            var editLink = this.$el.find('#edit_current_group_by');
            var deleteLink = this.$el.find('#delete_current_group_by');

            var currentGroupBy = Enumerable.From(this.groupBys).Where(function(x) { return x.Id == id; }).SingleOrDefault();

            if (choiceElem.attr('data-id') === '') {
                editLink.parent().addClass('hide');
                deleteLink.parent().addClass('hide');
            } else {
                editLink.text('Edit ' + choiceElem.text() + '...').parent().removeClass('hide');
                deleteLink.text('Delete ' + choiceElem.text() + '...').parent().removeClass('hide');

                var disable = (!_.isUndefined(currentGroupBy) && !currentGroupBy.AllowEditing);
                editLink.prop("disabled", disable);
                deleteLink.prop("disabled", disable);   

                if(!_.isUndefined(currentGroupBy) && !currentGroupBy.AllowEditing) {
                    editLink.prop("disabled", true);
                    deleteLink.prop("disabled", true);
                    editLink.addClass("disabled-dropdown").on("click", this.preventDefaultOnDisable);
                    deleteLink.addClass("disabled-dropdown").on("click", this.preventDefaultOnDisable);
                }
                else {
                    editLink.prop("disabled", false);
                    deleteLink.prop("disabled", false);
                    editLink.removeClass("disabled-dropdown").off("click", this.preventDefaultOnDisable);
                    deleteLink.removeClass("disabled-dropdown").off("click", this.preventDefaultOnDisable);
                }
                
            }
        },

        fetch: function () {
            var self = this;
            $.ajax({
                url: '/GroupBy/Index',
                async: false,
                success: function (result) {
                    self.groupBys = result;
                }
            });
        },

        template: _.template(
            '<li><div><a href="#" data-id="<%= Id %>" class="group-by-choice"><%= Name %></a></div></li>'
        ),

        setModelVersion: function (modelVersionId) { //do nothing for now
            this.modelVersionId = modelVersionId;
        }
    });



    /**************************************
    Create Group By View
    **************************************/
    groupBy.createGroupByView = Backbone.View.extend({
        config: null,

        initialize: function (config) {
            this.config = config;
        },

        render: function () {
            var self = this;
            assemble.modal.show(assemble.mvcRoutes.groupByCreate({ id: self.config.modelVersionId }), null, function (data) {
                assemble.groupBy.groupByControl.initialize({ $modalElement: data.$modalElement }, function (result) {
                    self.trigger("complete", result);
                });
                data.$modalElement.on('hidden', function() { $(this).remove(); });
            });
        }
    });



    /**************************************
    Edit Group By View
    **************************************/
    groupBy.editGroupByView = Backbone.View.extend({
        config: null,

        initialize: function (config) {
            this.config = config;
        },

        render: function () {
            var self = this;
            assemble.modal.show(assemble.mvcRoutes.groupByEdit({ id: this.config.current, modelVersionId: self.config.modelVersionId }), null, function (data) {
                assemble.groupBy.groupByControl.initialize({ $modalElement: data.$modalElement }, function (result) {
                    self.trigger("complete", result);
                });
                data.$modalElement.on('hidden', function() { $(this).remove(); });
            });
        }
    });



    /**************************************
    Delete Group By View
    **************************************/
    groupBy.deleteGroupByView = Backbone.View.extend({
        initialize: function (config) {
            this.config = config;
            this.setElement(Handlebars.templates.groupBy.deleteModal(config));
        },

        events: {
            "click .remove-groupby": "destroy"
        },

        render: function () {
            var self = this;
            this.$el.modal().on('hidden', function(){ self.unload(); });
        },

        destroy: function (event) {
            event.preventDefault();
            var self = this;
            $.ajax({
                type: 'POST',
                url: assemble.mvcRoutes.groupByDelete({ id: this.config.id }),
                success: function () {
                    self.trigger("destroyed", self.config);
                    self.$el.modal('hide');
                }
            });
        },
        
        unload: function () {
            this.off();
            this.$el
                    .off()
                    .remove();
        }
    });

    /************************************************
    * Legacy groupByControl
    *************************************************/
    groupBy.groupByControl = (function () {

        var selectedElems = [],
            groupByLimit = 10,
            selector = {};

        var initialize = function (config, completeCallBack) {
            var $container = config.$modalElement.find('#group_by_selector, #group_by_name');
            config.$modalElement.on('hide', destroy);
            
            // Disabling auto naming for now, not going into 1.1 release. Too risky and not enough time.
            //selector.autoNaming = true;
            selector.autoNaming = false;
            
            selector.container = $container;
            selector.name = selector.container.find("#Name");
            selector.selectFromList = selector.container.find(".select-from-list");
            selector.selectedList = selector.container.find(".selected-list");
            selector.search = selector.container.find(".search");

            selector.selectedItems = selector.container.find('.selected-items');
            selector.selectedList.sortable({
                update: orderChanged
            });

            selector.selectedList.on('touchend', '.move-arrow', move);

            if (selector.selectedItems.length > 0) {
                var initialSelectionValue = selector.selectedItems.val();
                if (initialSelectionValue.length > 0) {
                    $.each(initialSelectionValue.split('@_FieldSeparator_@'), function () {
                        if (this && this.length > 0)
                            addGroupByProperty(selector.selectFromList.find(".selector-item[data-id=" + this + "]"));
                    });
                }
            }

            //turn off auto naming as soon as user interacts with the name box with keyboard
            selector.name.on("keypress", function () {
                selector.autoNaming = false;
            });

            // select event handlers
            selector.selectFromList
                .on('click', '.selector-item', {}, function (event) {
                    event.preventDefault();
                    addGroupByProperty(this);
                    updateSelectedItemsAutoName(selector);
                })
                .on('keydown', '.selector-item:focus', {}, selectFromKeyboard);
            selector.selectedList
                .on('click', '.remove-me', {}, function (event) {
                    event.preventDefault();
                    removeGroupByProperty(this);
                    updateSelectedItemsAutoName(selector);
                })
                .on('click', function(event){ event.preventDefault(); });

            selector.search.on('keydown', searchUpdated);

            var form = $('#group_by_form');
            selector.form = form;

            // ajaxed form
            form.submit(function (event) {
                event.preventDefault();

                var validator = form.validate();
                validator.settings.ignore = "";
                if (!form.valid()) return;

                // don't do this in the future
                var o = {};
                var a = form.serializeArray();
                $.each(a, function () {
                    if (o[this.name]) {
                        if (!o[this.name].push) {
                            o[this.name] = [o[this.name]];
                        }
                        o[this.name].push(this.value || '');
                    } else {
                        o[this.name] = this.value || '';
                    }
                });

                $.ajax({
                    url: form.attr('action'),
                    data: JSON.stringify(o),
                    type: 'POST',
                    dataType: 'json',
                    contentType: 'application/json; charset=utf-8',
                    success: function (data, textStatus, jqXHR) {
                        if (completeCallBack !== null)
                            completeCallBack({ selectedGrouping: data.id });

                        $('.modal').modal('hide');
                        selector.autoNaming = true;
                    }
                });
            });
        };

        var remarginSelected = function () {
            $.each(selectedElems, function (indexInArray, valueOfElement) {
                $(this).css('margin-left', 10 * indexInArray);
            });
        };

        var updateSelectedItemsAutoName = function (selector) {
            if (selector.autoNaming) {
                var autoName = Enumerable.From(selector.selectedList.find(".selector-item .item-name"))
                    .Select(function (x) {
                        return $(x).html();
                    })
                    .ToArray()
                    .join("-");
                selector.name.val(autoName);
                selector.form.valid();
            }
        };

        var addGroupByProperty = function (elem) {
            elem = $(elem);

            if (selectedElems.length >= groupByLimit) {
                selector.container.find(".error").removeClass('invisible');
                return;
            }

            if (selectedElems.length <= 0) {
                selector.selectedList.removeClass('empty');
            }

            elem.addClass('selected');
            var selectedElem = elem
                                .clone()
                                    .appendTo(selector.selectedList)
                                    .fadeIn(200);

            selectedElems.push(selectedElem[0]);
            updateSelectedItemsField();

            // cleanup the selectedList
            remarginSelected();

            if (!assemble.browser.ipad) selector.search.val('').focus();
            search('');
        };

        var removeGroupByProperty = function (elem) {
            var selectedElem = $(elem).parent(),
                propertyId = selectedElem.attr('data-id');

            selectedElem.remove();
            selectedElems.splice($.inArray(selectedElem[0], selectedElems), 1);
            updateSelectedItemsField();

            // cleanup the selectedList
            remarginSelected();
            if (selectedElems.length <= 0) {
                selector.selectedList.addClass('empty');
            } else if (selectedElems.length < groupByLimit) {
                selector.container.find(".error").addClass('invisible');
            }

            selector.selectFromList.find("[data-id=" + propertyId + "]")
                .removeClass('selected');
        };

        var move = function (event) {
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

            orderChanged();

            event.stopPropagation();
            event.preventDefault();
        };

        var orderChanged = function () {
            reloadSelected();
            remarginSelected();
        };

        var reloadSelected = function () {
            selectedElems = selector.selectedList.find('.selector-item');
            updateSelectedItemsField();
        };

        //TODO: rework view model to just accept a json list rather than a flat string
        //TODO: probably should just redo backing schema to store field list as serialized xml too
        var updateSelectedItemsField = function () {
            var ids = _.reduce(selectedElems, function (memo, item) {
                return memo + $(item).attr('data-id') + '@_FieldSeparator_@';
            }, '');
            selector.selectedItems.val(ids);

            var form = $('#group_by_form');
            var validator = form.validate();
            validator.settings.ignore = "";
            form.valid();
        };

        var searchUpdated = function (event) {
            event = event || {};
            // if down arrow, go down to the list
            if (event.keyCode == 40) {
                event.preventDefault();
                downToList();
            }

            setTimeout(function () { search(selector.search.val()); }, 1);
        };

        var search = function (query) {
            var $items = selector.selectFromList.find('.selector-item');
            query = query.toLowerCase();

            $items
                .hide()
                .each(function () {
                    var $elem = $(this),
                        itemText = $elem.find('.item-name').text().toLowerCase(),
                        matched = itemText.indexOf(query) != -1;

                    if (matched) { $elem.show().css('display', 'block'); }
                });
        };

        var selectFromKeyboard = function (event) {
            var key = event.keyCode,
                up = key == 38,
                down = key == 40,
                enter = key == 13;

            if (!up && !down && !enter) return;

            if (up) {
                var prevElem = $(event.currentTarget).prevAll(":visible");

                if (!prevElem.length) {
                    selector.search.focus();
                } else {
                    prevElem.first().focus();
                }
            } else if (down) {
                $(event.currentTarget).nextAll(":visible").first().focus();
            } else if (enter) {
                addGroupByProperty($(event.currentTarget));
            }

            event.preventDefault();
        };

        var downToList = function () {
            selector.selectFromList.find('.selector-item:visible:first').focus();
        };

        var destroy = function () {
            selector = {};
            selectedElems = [];
        };

        return {
            initialize: initialize
        };
    }());
}());