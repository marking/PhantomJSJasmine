(function () {

    assemble.trees = {};

    assemble.trees.categoriesFactory = {};
    assemble.trees.categoriesFactory.categories = [];
    assemble.trees.categoriesFactory.get = function (id) {
        if (!assemble.trees.categoriesFactory.categories[id]) {
            $.ajax({
                url: assemble.mvcRoutes.assemblyCodeCategories({ id: id }),
                async: false,
                success: function (data) {
                    assemble.trees.categoriesFactory.categories[id] = data;
                }
            });
        }

        return assemble.trees.categoriesFactory.categories[id];
    };
    assemble.trees.categoriesFactory.flush = function (id) {
        delete assemble.trees.categoriesFactory.categories[id];
    };

    assemble.trees.AssemblyCodeTree = Backbone.View.extend({
        initialize: function (config) {
            this.filteringEnabled = true;
            this.assignAssemblyList(config);
            this.assignFilters(config);
            this.expanding = false;
            this.filterId = 0;
        },

        assignAssemblyList: function(config) {
            this.assemblyList = config.assemblyList;
            this.resultantTree = this.assemblyList;
            this.filteringEnabled = this.nodeCategoryIdCheck({ categoryId: null, children: this.assemblyList });
        },

        assignFilters: function(config) {
            this.filters = config.filters;
        },

        nodeCategoryIdCheck: function(node) {
            if (node.categoryId != null) {
                return true;
            }
            else if(node.children && node.children != null && node.children.length > 0) {
                for (var i = 0; i < node.children.length; i++) {
                    var found = this.nodeCategoryIdCheck(node.children[i]);

                    if (found)
                        return true;
                }
            }

            return false;
        },

        events: {
            "change input[name='search']": "searchValueChangedHandler",
            "keyup input[name='search']": "searchKeyHandler",
            "click a.expand-tree": "expandOne",
            "click a.collapse-tree": "collapseOne",
            "keypress input[name='search']": "searchKeyPressHandler",
            "change select[name='filters']" : "filtersChangeHandler"
        },

        render: function () {
            this.expandLevel = 0;
            this.maxExpandLevel = 0;
            this.setupElement();
            this.setupDynatree();
            this.setupFilters();
            this.setupInitialValue();
        },

        setupFilters: function () {
            if (this.filteringEnabled) {
                this.$filters = this.$("select[name='filters']").empty();
                var self = this;

                _.each(this.filters, function (filter) {
                    self.$filters.append('<option value="' + filter.id + '">' + filter.name + '</option>');
                });

                this.$filters.val(this.filterId.toString());
                this.doFilter(this.filterId);

                if (this.resultantTree.length == 0) {
                    this.setFilter(0);
                }
            }
            else {
                this.$("select[name='filters']").hide();
            }
        },

        setupElement: function() {
            this.setElement(Handlebars.templates.trees.assembleCodeTree());
        },

        setupDynatree: function() {
            var self = this;
            this.$dynatree = this.$el.find(".tree-host").dynatree({
                children: this.resultantTree,
                onActivate: _.bind(this.dynatreeOnActivateHandler, this),
                onKeypress: _.bind(this.onTreeKeyPressHandler, this),
                onCustomRender: _.bind(this.onCustomRenderTreeNode, this),
                onDblClick: _.bind(this.onDblClickTreeNode, this)
            });
            this.$dynatree.dynatree("getTree").visit(function (node) {
                if (self.maxExpandLevel < node.getLevel() - 1) {
                    self.maxExpandLevel = node.getLevel() - 1;
                }
            });

            this.disableCollapse();
        },

        onDblClickTreeNode: function(node) {
            node.toggleExpand();
        },

        onCustomRenderTreeNode: function (node) {
            var assemblyCode = node.data;
            var lineHtml = '<a class="dynatree-title" href="#" data-key="' + assemblyCode.key + '">';
            lineHtml += '<span title="' + assemblyCode.key + ' - ' + assemblyCode.description +'" class="assembly-code-title" style="width:' + (416 - (assemblyCode.level * 16)) + 'px"><b>' + assemblyCode.key + '</b> ' + assemblyCode.description + '</span>';
            var extendedProperties = assemblyCode.extendedProperties;

            for (var extendedPropertyName in extendedProperties) {
                var value = extendedProperties[extendedPropertyName];

                if (extendedPropertyName == "UnitCost" && _.isNumber(value)) {
                    lineHtml += '<span data-extended-property-name="' + extendedPropertyName + '" class="assembly-code-extended-property">' + value.toFixed(2) + '</span>';
                }
                else {
                    lineHtml += '<span data-extended-property-name="' + extendedPropertyName + '" class="assembly-code-extended-property">' + extendedProperties[extendedPropertyName] + '</span>';
                }
            }

            lineHtml += "</a>";
            return lineHtml;
        },

        setupInitialValue : function() {
            if (this.selectedCode) {
                this.setValue(this.selectedCode);
            }
        },

        onTreeKeyPressHandler : function(event) {
            var x = event;
        },

        onExpandHandler: function (expanded, node) {
            if (!this.expanding && !expanded) {
                var self = this;
                this.expandLevel = 0;
                this.$dynatree.dynatree("getTree").visit(function (node) {
                    if (node.isExpanded() && node.getLevel() > self.expandLevel)
                        self.expandLevel = node.getLevel();
                });
               
                this.configureExpandStates();
            }
        },

        searchKeyPressHandler: function (event) {
            if (event && event.which == 13)
                event.preventDefault();
        },

        dynatreeOnActivateHandler: function (node) {
            this.selectedCode = node.data.key;
            node.makeVisible();
            this.trigger("item:selected", this.getValue());
        },

        searchKeyHandler: function () {
            var self = this;
            var $searchBox = this.$("input[name='search']");
            var search = $searchBox.val();
            setTimeout(function () {
                var searchNow = $searchBox.val();

                if (searchNow == search)
                    self.search();
            }, 300);

        },

        filtersChangeHandler : function() {
            var id = parseInt(this.$("select[name='filters']").val());
            this.doFilter(id);
        },

        setFilter: function(id) {
            this.filterId = id;

            if (this.$filters) {
                this.$filters.val(id.toString());
                this.doFilter(this.filterId);

                if (this.resultantTree.length == 0) {
                    this.setFilter(0);
                }
            }
        },

        doFilter: function (id) {
            if (this.filteringEnabled && _.find(this.filters, function (v) { return v.id == id; })) {
                if (id != 0) {
                    var root = this.filterNode({ categoryId: "root", children: this.assemblyList }, id);

                    if (root != null) {
                        this.resultantTree = root.children;
                    }
                    else {
                        this.resultantTree = [];
                    }
                }
                else {
                    this.resultantTree = this.assemblyList;
                }

                if (this.$dynatree) {
                    this.$dynatree.dynatree("destroy");
                    this.setupDynatree();
                    this.search(); //reapply the search
                }

                this.$("input[name='search']").val("");
            }
        },

        filterNode: function (node, id) {
            var found = false;
            var clonedNode = _.clone(node);
            clonedNode.children = [];

            if (this.nodeFilterTest(node, id)) {
                found = true;
            }

            if (node.children && node.children != null) {
                for (var i = 0; i < node.children.length; i++) {
                    var foundNode = this.filterNode(node.children[i], id);

                    if (foundNode != null) {
                        clonedNode.children[clonedNode.children.length] = foundNode;
                        found = true;
                    }
                }
            }

            return found ? clonedNode : null;
        },

        nodeFilterTest : function(node, id) {
            return node.categoryId == id;
        },

        searchValueChangedHandler: function () {
            this.search();
        },

        search: function () {
            var self = this;
            var search = this.$el.find("input[name='search']").val();
            var tree = this.$dynatree.dynatree("getTree");

            var enableCollapse = _.once(function () {
                self.enableCollapse();
            });

            if (search == "") {
                tree.visit(function (node) {
                    node.deactivate();
                    node.select(false);
                    node.expand(false);
                }, false);
            }
            else {
                var regEx = new RegExp(search, "i");
                tree.visit(function (node) {

                    if (node.data.key == search) {
                        node.select(true);
                        node.activate();
                        node.makeVisible();
                    }
                    else if (node.data.description.search(regEx) > -1 || node.data.key.search(regEx) > -1) {
                        node.select(true);
                        node.makeVisible();
                    }
                    else {
                        node.deactivate();
                        node.select(false);
                        node.expand(false);
                    }

                    return true;
                }, false);
            }
        },

        expandAll: function () {
            if (this.expandLevel < this.maxExpandLevel) {
                var self = this;
                this.expandLevel = this.maxExpandLevel;
                this.expanding = true;
                this.$dynatree.dynatree("getTree").visit(function (node) {
                    node.expand(true);
                });
                this.expanding = false;
                this.configureExpandStates();
            }
        },

        expandOne: function () {
            if (this.expandLevel < this.maxExpandLevel) {
                var self = this;
                this.expandLevel++;
                this.expanding = true;
                this.$dynatree.dynatree("getTree").visit(function (node) {
                    if (node.getLevel() <= self.expandLevel) {
                        node.expand(true);
                    }
                });
                this.expanding = false;
                this.configureExpandStates();
            }
        },

        collapseAll: function () {
            if (this.expandLevel > 0) {
                this.expandLevel = 0;
                this.expanding = true;
                this.$dynatree.dynatree("getTree").visit(function (node) {
                    node.expand(false);
                });
                this.expanding = false;
                this.configureExpandStates();
            }
        },

        collapseOne: function () {
            if (this.expandLevel > 0) {
                var self = this;
                this.expandLevel--;
                this.expanding = true;
                this.$dynatree.dynatree("getTree").visit(function (node) {
                    if (node.getLevel() > self.expandLevel) {
                        node.expand(false);
                    }
                });
                this.expanding = false;
                this.configureExpandStates();
            }
        },

        configureExpandStates: function () {
            if (this.expandLevel == this.maxExpandLevel) {
                this.enableCollapse();
                this.disableExpand();
            }
            else if (this.expandLevel == 0) {
                this.enableExpand();
                this.disableCollapse();
            }
            else {
                this.enableExpand();
                this.enableCollapse();
            }
        },

        enableCollapse: function () {
            this.$el.find("a.collapse-tree").removeClass("disabled");
        },

        disableCollapse: function () {
            this.$el.find("a.collapse-tree").addClass("disabled");
        },

        enableExpand: function () {
            this.$el.find("a.expand-tree").removeClass("disabled");
        },

        disableExpand: function () {
            this.$el.find("a.expand-tree").addClass("disabled");
        },

        getValue: function () {
            return this.selectedCode;
        },

        setValue: function (code) {
            this.selectedCode = code;

            if (this.displayed && this.$dynatree) {
                this.$dynatree.dynatree("getTree").activateKey(code);
            }
        },

        val: function (value) {
            if (value !== undefined) {
                this.setValue(value);
            }
            else {
                return this.getValue();
            }
        },

        data: function () {

            if (this.$dynatree) {
                try {
                    var node = this.$dynatree.dynatree("getTree").getActiveNode();
                    return node != null ? node.data : null;
                }
                catch (ex) {
                    return null;
                }
            }
            else {
                return null;
            }
        }
    });

    assemble.trees.AssemblyCodeTreeModal = assemble.trees.AssemblyCodeTree.extend({
        initialize: function (config) {
            this.filteringEnabled = true;
            this.assignAssemblyList(config);
            this.assignFilters(config);
            this.selectedCode = config.selectedCode || null;
            this.displayed = false;
            this.filterId = 0;
        },

        events: function () {
            var events = {
                "click .btn-primary": "itemChosenHandler",
                "click .cancel" : "cancelClickHandler",
                "keypress input[name='search']": "searchKeyPressHandler"
            };

            return _.extend(events, assemble.trees.AssemblyCodeTree.prototype.events);
        },

        setupElement: function () {
            var self = this;
            this.modal = assemble.modal.create({ id: "assembly_code_tree_modal", title: "Select an Assembly Code", primaryButtonText: "Select" });
            this.modal.width(800);
            this.modal.on("hide", function () {
                self.displayed = false;
                self.trigger("cancel");
            });
            this.setElement(this.modal);
            this.$(".modal-body").append(Handlebars.templates.trees.assembleCodeTree());
            this.$(".modal-footer").prepend(Handlebars.templates.trees.assemblyCodeTreeApplyCost());
            this.$("#assembly_code_tree_apply_cost").hide();
            this.$(".btn-primary").hide();
            assemble.help.mainrepository.load(function (helpConfig) {
                self.helpLink = new assemble.help.KeyView({ model: helpConfig, el: self.modal.find(".help-link")[0], key: "14001" });
            });
        },

        cancelClickHandler : function() {
            this.setValue("");
        },

        itemChosenHandler: function (event) {

            if (event)
                event.preventDefault();

            this.trigger("item:chosen");
            this.trigger("change");
            this.hide();
        },

        onTreeKeyPressHandler: function (node, event) {
            if (event && event.which == 13 && this.hasValue()) {
                event.preventDefault();
                this.itemChosenHandler();
            }
        },

        searchKeyPressHandler : function(event) {
            if (event && event.which == 13) {
                event.preventDefault();

                if (this.hasValue()) {
                    this.itemChosenHandler();
                }
            }
        },

        hasValue : function() {
            var val = this.val();
            return (val && val != null && val != "");
        },

        dynatreeOnActivateHandler: function(node) {
            assemble.trees.AssemblyCodeTree.prototype.dynatreeOnActivateHandler.call(this, node);
            this.$el.find(".btn-primary").show();
            this.setupApplyArea();
        },

        doFilter: function(id) {
            assemble.trees.AssemblyCodeTree.prototype.doFilter.call(this, id);

            if (this.selectedCode != null) {
                this.setValue(this.selectedCode);
            }
        },

        setValue: function(code) {
            assemble.trees.AssemblyCodeTree.prototype.setValue.call(this, code);
            this.setupApplyArea();
        },

        setupApplyArea: function() 
        {
            var data = this.data();

            if (data != null && data.extendedProperties.UnitCost !== '' && data.extendedProperties.TakeoffQuantity !== '') {
                this.$("#assembly_code_tree_apply_cost").show();
            }
            else {
                this.$("#assembly_code_tree_apply_cost").hide();
            }
        },

        nodeFilterTest: function(node, id) {
            var test = assemble.trees.AssemblyCodeTree.prototype.nodeFilterTest.call(this, node, id);
            return test || node.key == this.selectedCode;
        },

        valid: function() {
            return true;
        },

        hide: function () {
            if (this.displayed) {
                this.modal.modal("hide");
                this.displayed = false;
            }
        },

        show: function () {
            if (!this.displayed) {
                this.displayed = true;
                this.render();
                this.modal.modal("show");
                this.$el.find("input[name='search']").focus();
            }
        },

        focus: function() {
            this.show();
        },

        select: function() {
            this.show();
        },

        blur: function() {
            this.hide();
        },

        cancel: function(event){
            if(event)
                event.preventDefault();

            this.hide();
            this.trigger("cancel");
        }
    });
})();