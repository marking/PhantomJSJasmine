describe("assemble.grid", function () {

    describe("loadDataError", function () {

        it("calls calls updateFromResponseError with response", function () {
            var response = {};
            var updateFromResponseError = sinon.mock(assemble.status).expects("updateFromResponseError").withExactArgs(response).once();
            assemble.grid.loadDataError(response);
            updateFromResponseError.verify();
            assemble.status.updateFromResponseError.restore();
        });
    });

    describe("selectionCache", function () {

        beforeEach(function () {

            //poor woman's mocking
            $.fn.jqGrid = {
                expandNode: function () {
                }
            };

            $.jgrid = {

                extend: function (args) {
                }
            };

            assemble.grid.$grid = {
                getRowData: function (rowid) {
                    var rowArray = [
                        { RowType: "item", ChildSourceIds: "181436", tree_loaded: false, tree_expanded: false, Id: "Casework_Casework_1234" },
                        { RowType: "group", ChildSourceIds: null, tree_loaded: true, tree_expanded: true, Id: "Casework" },
                        { RowType: "instance", ChildSourceIds: null, tree_loaded: false, tree_expanded: false, Id: "Casework_Casework_1234_181436" },
                        { RowType: "item", ChildSourceIds: "170517,170518,170519,170520,170522,170523,170524,170525,170526,170527,170528,170529,170530,170531,170532,170533,170534,170535,170536,170537,170538,170539,170540,170541,170542,170543,170544,170546,170547", tree_loaded: true, tree_expanded: true, Id: "Casework_Casework_5555" }
                    ];

                    if (typeof (rowid) != 'undefined') {
                        for (var i = 0; i < rowArray.length; i++) {
                            if (rowArray[i].Id == rowid)
                                return rowArray[i];
                        }
                    }

                    return rowArray;
                }                
            };

        });

        it("exists", function () {
            expect(assemble.grid.selectionCache).toBeNotNull();
        });

        it("initializes a cache of instance and type information", function () {

            assemble.grid.selectionCache.initialize();

            expect(assemble.grid.selectionCache.instanceLookup["181436"]).toBeNotNull();
            expect(assemble.grid.selectionCache.instanceLookup["181436"].typeRowId).toBe("Casework_Casework_1234");
            expect(assemble.grid.selectionCache.instanceLookup["181436"].typeExpanded).toBeFalsy();
            expect(assemble.grid.selectionCache.instanceLookup["181436"].rowId).toBe("Casework_Casework_1234_181436");

            expect(assemble.grid.selectionCache.instanceLookup["170518"]).toBeNotNull();
            expect(assemble.grid.selectionCache.instanceLookup["170518"].typeRowId).toBe("Casework_Casework_5555");

            expect(assemble.grid.selectionCache.typeLookup["Casework_Casework_1234"]).toBeNotNull();
            expect(assemble.grid.selectionCache.typeLookup["Casework_Casework_5555"]).toBeNotNull();
        });

        it("updates selected instances when an item or instance is selected", function () {

            //{ RowType: "instance", ChildSourceIds: null, tree_loaded: false, tree_expanded: false, Id: "Casework_Casework_1234_181436" },
            assemble.grid.selectionCache.initialize();
            var row = { RowType: "item", Id: "Casework_Casework_5555" };

            assemble.grid.selectionCache.updateSelected(row, true);

            var lookup = assemble.grid.selectionCache.instanceLookup;

            expect(lookup["181436"].selected).toBeFalsy();
            expect(lookup["170520"].selected).toBeTruthy();
            expect(lookup["170531"].selected).toBeTruthy();
            expect(lookup["170533"].selected).toBeTruthy();

        });

        it("updates selected instances when an item or instance is deselected", function () {

            assemble.grid.selectionCache.initialize();
            var row = { RowType: "item", Id: "Casework_Casework_5555" };
            var row2 = { RowType: "instance", Id: "Casework_Casework_1234_181436" };

            assemble.grid.selectionCache.updateSelected(row, false);
            assemble.grid.selectionCache.updateSelected(row2, true);

            var lookup = assemble.grid.selectionCache.instanceLookup;

            expect(lookup["181436"].selected).toBeTruthy();
            expect(lookup["170520"].selected).toBeFalsy();
            expect(lookup["170531"].selected).toBeFalsy();
            expect(lookup["170533"].selected).toBeFalsy();

        });

        it("figures out which instances have been selected from grid selections", function () {

            assemble.grid.selectionCache.initialize();

            var rows = [
                { RowType: "group", Id: "Casework" },
                { RowType: "instance", Id: "Casework_Casework_1234_181436" },
                { RowType: "item", Id: "Casework_Casework_5555" }
            ];

            assemble.grid.selectionCache.updateSelected(rows[0], true);
            assemble.grid.selectionCache.updateSelected(rows[1], true);
            assemble.grid.selectionCache.updateSelected(rows[2], true);

            var result = assemble.grid.selectionCache.getSelectedInstances();

            expect(result).toContain("181436");
            expect(result).toContain("170520");
            expect(result).toContain("170531");
            expect(result).toContain("170533");

        });

        it("updates grid selection based on list of instances selected (i.e. thru viewer)", function () {
            assemble.grid.selectionCache.initialize();

            spyOn(assemble.grid.selection, "selectById");

            spyOn(assemble.grid.selection, "partialize");

            spyOn(assemble.grid.selection, "deselectById");

            var row = { RowType: "item", Id: "Casework_Casework_5555" };
            var row2 = { RowType: "instance", Id: "Casework_Casework_1234_181436" };

            assemble.grid.selectionCache.updateSelected(row, true);
            assemble.grid.selectionCache.updateSelected(row2, true);

            var selectedInstances = ["170524", "170525", "170526", "170527"];
            assemble.grid.selectionCache.syncGridSelection(selectedInstances);

            var lookup = assemble.grid.selectionCache.instanceLookup;

            expect(lookup["181436"].selected).toBeFalsy();
            expect(lookup["170524"].selected).toBeTruthy();
            expect(lookup["170525"].selected).toBeTruthy();
            expect(lookup["170526"].selected).toBeTruthy();
            expect(lookup["170527"].selected).toBeTruthy();

            expect(assemble.grid.selection.partialize).toHaveBeenCalled();

            expect(assemble.grid.selection.deselectById).toHaveBeenCalled();
            //toHaveBeenCalledWith("Casework_Casework_1234");
        });

        it("returns list of integer id's of included instances (those not filtered)", function () {
            var result = assemble.grid.selectionCache.getIncludedInstances();
            expect(result).toBeNotNull();
        });
    });

});