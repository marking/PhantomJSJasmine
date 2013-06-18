describe("assemble.trees", function () {

    var aString = '<span title="A - Substructure" class="assembly-code-title" style="width:400px"><b>A</b> Substructure</span>';

    assemble.loadFixture('fixtures/treesTemplates.html');

    describe("AssemblyCodeTree", function () {
        this.view = null;
        this.assemblyList = null;
        this.filtersList = null;
        

        beforeEach(function () {
            this.filtersList = [
                {
                    name: "All",
                    id: 0
                },
                {
                    name : "Category 1",
                    id : -1
                },
                {
                    name: "Category 2",
                    id: -2
                },
                {
                    name: "Category 3",
                    id: -3
                },
                {
                    name: "Category 4",
                    id: -4
                },
                {
                    name: "Category 5",
                    id: -5
                }
            ];

            var self = this;

            sinon.stub(assemble.trees.categoriesFactory, "get", function () { return self.filtersList; });

            assemble.mvcRoutes = {};
            assemble.mvcRoutes.assemblyCodeCategories = function () { return "assemblyCodeCategories"; };

            this.assemblyList = [
                {
                    title: "A Substructure",
                    description: "Substructure",
                    key: "A",
                    categoryId: -1,
                    level: 1,
                    extendedProperties: {},
                    children: [
                        {
                            title: "A10 Foundations",
                            description: "Foundations",
                            key: "A10",
                            categoryId: -2,
                            level: 2,
                            extendedProperties: {},
                            children: null
                        },
                        {
                            title: "A20 Basement Construction",
                            description: "Basement Construction",
                            key: "A20",
                            categoryId: -3,
                            level: 2,
                            extendedProperties: {},
                            children: null
                        }
                    ]
                },
                {
                    title: "B Shell",
                    description: "Shell",
                    key: "B",
                    categoryId: -4,
                    level: 1,
                    extendedProperties: {},
                    children: null
                }
            ];

            try
            {
                this.view = new assemble.trees.AssemblyCodeTree({ assemblyList: this.assemblyList, filters: this.filtersList });
            }
            catch (ex) {
                var e = ex;
            }
        });

        afterEach(function () {
            this.view.$el.remove();
            assemble.trees.categoriesFactory.get.restore();
        });

        it("instantiates", function () {
            expect(this.view).not.toBeNull();
        });

        it("assigns assembly list", function () {
            expect(this.view.assemblyList).toBe(this.assemblyList);
        });

        it("can render", function () {
            this.view.render();
        });

        it("renders element", function () {
            this.view.render();

            expect(this.view.el).not.toBeNull();
        });

        it("renders dynatree", function () {
            this.view.render();

            expect(this.view.$el.find("ul.dynatree-container").length).toBeGreaterThan(0);
        });

        it("sets resultant tree", function () {
            expect(this.view.resultantTree.length).toEqual(2);
        });

        it("renders resultant tree", function () {
            this.view.render();

            expect(this.view.$el.find("span.dynatree-node").length).toEqual(2);
            expect(this.view.$el.find("a.dynatree-title").first().html()).toEqual(aString);
        });

        it("sets filter dropdown when setFilter called before render", function () {
            this.view.setFilter(-1);
            this.view.render();
            expect(this.view.$("select[name='filters']").val()).toBe("-1");
        });

        it("filters leaf code before render", function () {
            this.view.setFilter(-1);
            this.view.render();
            expect(this.view.$el.find("span.dynatree-node").length).toEqual(1);
            expect(this.view.$el.find("a.dynatree-title").first().html()).toEqual(aString);
        });

        it("filters leaf code after render", function () {
            this.view.render();
            this.view.setFilter(-1);
            expect(this.view.$el.find("span.dynatree-node").length).toEqual(1);
            expect(this.view.$el.find("a.dynatree-title").first().html()).toEqual(aString);
        });

        it("unfilters on all selected", function () {
            this.view.setFilter(-1);
            this.view.render();
            this.view.setFilter(0);
            expect(this.view.$el.find("span.dynatree-node").length).toEqual(2);
        });

        it("filters to all with id that doesn't exist", function () {
            this.view.setFilter(-99);
            this.view.render();
            expect(this.view.$el.find("span.dynatree-node").length).toEqual(2);
        });

        it("renders filters dropdown", function () {
            this.view.render();
            var $options = this.view.$("select[name='filters'] option");
            expect($options.length).toBe(6);
            expect($($options[0]).val()).toBe("0");
            expect($($options[5]).val()).toBe("-5");
        });

        it("calls setFilter on select change", function () {
            this.view.render();
            this.view.$("select[name='filters']").val("-1").change();
            expect(this.view.$el.find("span.dynatree-node").length).toEqual(1);
            expect(this.view.$el.find("a.dynatree-title").first().html()).toEqual(aString);
        });
    });

    describe("AssemblyCodeTreeModal", function () {
        var view = null;
        var assemblyList = null;
        this.filtersList = null;

        beforeEach(function () {
            this.filtersList = [
                {
                    Name: "All",
                    Id: 0
                },
                {
                    Name: "Category 1",
                    Id: -1
                },
                {
                    Name: "Category 2",
                    Id: -2
                },
                {
                    Name: "Category 3",
                    Id: -3
                },
                {
                    Name: "Category 4",
                    Id: -4
                },
                {
                    Name: "Category 5",
                    Id: -5
                }
            ];

            var self = this;

            sinon.stub(assemble.trees.categoriesFactory, "get", function () { return self.filterList; });

            assemble.mvcRoutes.assemblyCodeCategories = function () { return "assemblyCodeCategories"; };

            assemblyList = [
                {
                    title: "A Substructure",
                    description: "Substructure",
                    key: "A",
                    categoryId: -1,
                    level: 1,
                    extendedProperties: {},
                    children: [
                        {
                            title: "A10 Foundations",
                            description: "Foundations",
                            key: "A10",
                            categoryId: -2,
                            level: 2,
                            extendedProperties: {},
                            children: null
                        },
                        {
                            title: "A20 Basement Construction",
                            description: "Basement Construction",
                            key: "A20",
                            categoryId: -3,
                            level: 2,
                            extendedProperties: {},
                            children: null
                        }
                    ]
                },
                {
                    title: "B Shell",
                    description: "Shell",
                    key: "B",
                    categoryId: -4,
                    level: 1,
                    extendedProperties: {},
                    children: null
                }
            ];

            view = new assemble.trees.AssemblyCodeTreeModal({ assemblyList: assemblyList, filters: this.filtersList });
        });

        afterEach(function () {
            view.$el.remove();
            assemble.trees.categoriesFactory.get.restore();
        });


        it("assigns assembly list", function () {
            expect(view.assemblyList).toBe(assemblyList);
        });

        it("can render", function () {
            view.render();
        });

        it("renders element", function () {
            view.render();

            expect(view.el).not.toBeNull();
        });

        it("renders modal", function () {
            view.render();

            expect(view.$el.find(".modal-body").length).toEqual(1);
        });

        it("renders body into modal", function () {
            view.render();

            expect(view.$el.find(".tree-host").length).toEqual(1);
            expect(view.$el.find(".assembly-menu").length).toEqual(1);
        });

        it("renders dynatree", function () {
            view.render();

            expect(view.$el.find("ul.dynatree-container").length).toBeGreaterThan(0);
        });
        
        it("has data displayed", function () {
            view.render();

            expect(view.$el.find("span.dynatree-node").length).toEqual(2); //only two shown
            expect(view.$el.find("a.dynatree-title").first().html()).toEqual(aString);
        });

        it("shows", function () {
            view.render();
            view.hide();

            //cleanup
            view.$el.remove();

            view.show();

            expect(view.$el.is(":visible")).toBe(true);
        });

        it("sets focus to search on show", function () {
            view.show();
            expect(view.$el.find("input[name='search']").is(":focus")).toBe(true);
        });

        it("calls show on focus", function () {
            view.render();
            view.hide();

            //cleanup
            view.$el.remove();

            view.focus();

            expect(view.$el.is(":visible")).toBe(true);
        });

        it("gets null value when nothing selected", function () {
            view.render();

            expect(view.val()).toBeNull();
        });

        it("gets value when item selected", function () {
            view.render();
            view.$el.find("a.dynatree-title").first().click();
            
            var val = view.val();

            expect(val).not.toBeNull();
            expect(val).toBe("A");
        });

        it("gets data when item selected", function () {
            view.render();
            view.$el.find("a.dynatree-title").first().click();

            var data = view.data();

            expect(data).not.toBeNull();
            expect(data.key).toBe("A");
        });

        it("triggers item:selected event when item selected", function () {
            view.render();

            var triggered = false;
            view.on("item:selected", function () {
                triggered = true;
            });

            view.$el.find("a.dynatree-title").first().click();

            expect(triggered).toBe(true);
        });

        it("item:selected event passes val", function () {
            view.render();
            var val = null;

            view.on("item:selected", function (data) {
                val = data;
            });

            view.$el.find("a.dynatree-title").first().click();
            expect(val).toBe("A");
        });

        it("has choose item button disabled on render", function () {
            view.render();
            expect(view.$el.find(".btn-primary").is(":visible")).toBe(false);
        });

        it("choose item enabled when item selected", function () {
            view.render();

            view.$el.find("a.dynatree-title").first().click();

            expect(view.$el.find(".btn-primary").is(":visible")).toBe(true);
        });

        it("activates node if selected value passed in", function () {
            view = new assemble.trees.AssemblyCodeTreeModal({ assemblyList: assemblyList, selectedCode: "A" });
            view.render();

            var val = view.val();

            expect(val).not.toBeNull();
            expect(val).toBe("A");
        });

        it("activates node if val set", function () {
            view.render();
            view.val("A");

            var val = view.val();

            expect(val).not.toBeNull();
            expect(val).toBe("A");
        });

        it("fires itemChosen event", function () {
            view.render();
            view.val("A");
            var chosenFired = false;

            view.on("item:chosen", function () {
                chosenFired = true;
            });

            view.$el.find(".btn-primary").click();
            expect(chosenFired).toBe(true);
        });

        it("selects code based on search", function () {
            view.render();

            view.$el.find("input[name='search']").val("A").change();
            var val = view.val();

            expect(val).not.toBeNull();
            expect(val).toBe("A");
        });

        it("selects nothing on empty search", function () {
            view.render();

            view.$el.find("input[name='search']").val("").change();
            var val = view.val();

            expect(val).toBeNull();
        });

        it("choose enabled on search with activate", function () {
            view.render();

            view.$el.find("input[name='search']").val("A").change();
            var val = view.val();

            expect(view.$el.find(".btn-primary").is(":visible")).toBe(true);
        });

        it("expands all", function () {
            view.render();
            view.expandAll();

            var anyCollapsed = false;

            view.$el.find(".tree-host").dynatree("getTree").visit(function (node) {
                if (!node.isVisible()) {
                    anyCollapsed = true;
                }
            });

            expect(anyCollapsed).toBe(false);
        });

        it("expands one", function () {
            view.render();
            view.expandOne();

            var anyCollapsed = false;

            view.$el.find(".tree-host").dynatree("getTree").visit(function (node) {
                if (node.getLevel() < 2 && !node.isVisible()) {
                    anyCollapsed = true;
                }
            });

            expect(anyCollapsed).toBe(false);
        });


        it("collapses all", function () {
            view.render();
            view.collapseAll();

            var anyNotCollapsed = false;

            view.$el.find(".tree-host").dynatree("getTree").visit(function (node) {
                if (node.getLevel() > 1 && node.isVisible()) {
                    anyNotCollapsed = true;
                }
            });

            expect(anyNotCollapsed).toBe(false);
        });

        it("collapses one", function () {
            view.render();
            view.expandAll();
            view.collapseOne();

            var anyNotCollapsed = false;

            view.$el.find(".tree-host").dynatree("getTree").visit(function (node) {
                if (node.getLevel() > view.maxExpandLevel && node.isVisible()) {
                    anyNotCollapsed = true;
                }
            });

            expect(anyNotCollapsed).toBe(false);
        });

        it("disables collapse button on load", function () {
            view.render();

            expect(view.$el.find("a.collapse-tree").hasClass("disabled")).toBe(true);
        });

        it("enables collapse on any expand", function () {
            view.render();
            view.expandAll();

            expect(view.$el.find("a.collapse-tree").hasClass("disabled")).toBe(false);
        });

        it("disables collapse on collapse", function () {
            view.render();
            view.expandAll();
            view.collapseAll();

            expect(view.$el.find("a.collapse-tree").hasClass("disabled")).toBe(true);
        });

        it("enables expand on any collapse", function () {
            view.render();
            view.expandAll();
            view.collapseAll();

            expect(view.$el.find("a.expand-tree").hasClass("disabled")).toBe(false);
        });

        it("disables expand on expandAll", function () {
            view.render();
            view.expandAll();

            expect(view.$el.find("a.expand-tree").hasClass("disabled")).toBe(true);
        });


    });

});