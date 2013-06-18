describe("assemble.columns", function () {
     describe("ColumnsCollection", function () {

         it("clears comparison list with first model set", function () {
             var collection = new assemble.columns.ColumnsCollection({ versions: new assemble.versions.VersionsCollection() });
             collection.setSelectedModelId(4);
             expect(collection.comparisonSelectedList.length).toBe(0);
         });

         it("clears comparison list with model set", function () {
             var collection = new assemble.columns.ColumnsCollection({ versions: new assemble.versions.VersionsCollection() });
             collection.setSelectedModelId(4);
             collection.comparisonSelectedList = ["UnitCost"];
             collection.setSelectedModelId(5);
             expect(collection.comparisonSelectedList.length).toBe(0);
         });

    });
});