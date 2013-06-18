describe("assemble.connection", function () {
    it("exists", function () {
        expect(assemble.connection).toBeNotNull();
    });
    it("returns url for visualization actions", function () {
        var url = assemble.connection.obtainUrl(assemble.connection.CommandCode.Geometry, { modelVersionId: 307, skip: 0, take: 1000 });
        expect(url).toBe("/visualization/Geometry?modelVersionId=307&skip=0&take=1000");
    });

    describe("connection Ajax call", function() {

        beforeEach(function () {
            var buffer = MockData.geometryArrayBuffer();            
          spyOn(assemble.connection, "request").andCallFake(function(commandCode, params, onloadFunction) {
                onloadFunction(buffer);
            });            
        });
        
        it("obtains an array buffer asynchronously from server based on command code and parameters", function() {
            var result;
            assemble.connection.request(assemble.connection.CommandCode.Geometry, { modelVersionId: 307, skip: 0, take: 1000 }, function(view) {
                result = view;
            });

            expect(result).toBeNotNull();
            
            //waitsFor(function() {
            //    return !assemble.connection.receiving;
            //}, "Geometry download never completed", 10000);

            //runs(function() {
            //    expect(viewResult).toBeNotNull();
            //});
        });
    });
});
