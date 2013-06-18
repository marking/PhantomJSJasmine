describe("assemble.parser", function () {

    it("exists", function () {
        expect(assemble.Parser).toBeNotNull();
    });
    
    it("it parses geometry correctly from a binary stream/view", function() {

        var buffer = MockData.geometryArrayBuffer();
        var parser = new assemble.Parser();
        parser.setBuffer(buffer);
        
        expect(parser.geomCount).toBe(1);
        var firstGeometry = parser.yieldGeometry();
        expect(firstGeometry).toBeNotNull();
        expect(firstGeometry.positions.length).toBe(6);
        expect(firstGeometry.id).toBe(167531);
        expect(firstGeometry.category).toBe("Generic Models");
        expect(firstGeometry.indices.length).toBe(3);
        expect(firstGeometry.indices[0]).toBe(1);        

        /*
        assemble.connection.request(assemble.connection.CommandCode.Geometry, { modelVersionId: 307, skip: 0, take: 1000 }, function (view) {
            assemble.parser.setData(view);
        });

        waitsFor(function () {
            return !assemble.connection.receiving;
        }, "Geometry download never completed", 10000);

        runs(function () {
            expect(assemble.parser.geomCount).toBe(332);
            var firstGeometry = assemble.parser.yieldGeometry();
            expect(firstGeometry).toBeNotNull();
            expect(firstGeometry.positions.length).toBe(84);
            expect(firstGeometry.id).toBe(167531);
            expect(firstGeometry.indices[0]).toBe(0);
        });*/
    });

});