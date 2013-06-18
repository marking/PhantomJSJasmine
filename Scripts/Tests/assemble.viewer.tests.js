describe("assemble.viewer", function () {    

    it("exists", function () {
        expect(assemble.viewer).toBeNotNull();
    });

    describe("model", function () {        

        it("exists", function () {
            expect(assemble.viewer.Model).toBeNotNull();
        });

        it("exists", function () {
            expect(assemble.picker).toBeNotNull();
        });

        it("instantiates", function () {
            jasmine.getFixtures().fixturesPath = "/scripts/tests/fixtures";
            loadFixtures('viewerFixtures.html');

            var testConfig = { modelVersionId: 307, geometryCount: 332 };
            var viewer = new assemble.viewer.Model(testConfig);

            expect(viewer._modelVersionId).toBe(307);
            expect(viewer._loadTotal).toBe(332);
        });

        describe("calls assemble.connection", function() {

            beforeEach(function () {
                var buffer = MockData.geometryArrayBuffer();
                var view = new jDataView(buffer, 2, buffer.length, true);
                spyOn(assemble.connection, "request").andCallFake(function (commandCode, params, onloadFunction) {
                    onloadFunction(view);
                });
            });
            
            it("to download geometry in batches from server", function () {
                jasmine.getFixtures().fixturesPath = "/scripts/tests/fixtures";
                loadFixtures('viewerFixtures.html');

                var testConfig = { modelVersionId: 307, geometryCount: 1 };
                var viewer = new assemble.viewer.Model(testConfig);

                viewer.getGeometryBatch();
                expect(viewer.geometry.length).toBe(1);

                //waitsFor(function () {
                //    return viewer._loadedCount >= viewer._loadTotal;
                //}, "Full geometry download never completed", 10000);

                //runs(function() {
                //    expect(viewer.geometry.length).toBe(332);
                //});
            });
        });

        describe("renders", function () {
            beforeEach(function () {
                var buffer = MockData.smallModelArrayBuffer();
                var view   = new jDataView(buffer, 2, buffer.length, true);

                spyOn(assemble.connection, "request").andCallFake(function (commandCode, params, onloadFunction) {
                    onloadFunction(view);
                });
            });

            it("a small model in less than 5 seconds", function () {
                jasmine.getFixtures().fixturesPath = "/scripts/tests/fixtures";
                loadFixtures('viewerFixtures.html');

                var testConfig  = { modelVersionId: 1, geometryCount: 410 };
                var viewerModel = new assemble.viewer.Model(testConfig);
                var viewerView  = new assemble.viewer.View({model: viewerModel});

                var delta = 0;

                spyOn(viewerView, "render").andCallFake(function () {
                    var start = Date.now();
                    viewerView.render();
                    var end = Date.now();

                    return end - start; // millis
                });

                viewerModel.downloadGeometry();
                
                expect(viewerView.render).toBeLessThan(50000);
            });            
        });
    });
});

describe("assemble.diagonal", function () {
    it("exists", function() {
        expect(assemble.diagonal).toBeNotNull();
    });
    it("instantiates", function () {
        var diagonal = new assemble.diagonal.Model();
        expect(diagonal).toBeNotNull();
    });    
    describe("encounters a point", function () {
        it("becomes set", function () {
            var diagonal = new assemble.diagonal.Model();
            var x = 1.0, y = 1.0, z = 1.0;
            diagonal.encounter(x, y, z);
            expect(diagonal.isSet).toBeTruthy();            
        });
        it("updates its bounding box", function() {
            var x = 1.0, y = 1.0, z = 1.0;
            var diagonal = new assemble.diagonal.Model();
            diagonal.encounter(x, y, z);
            expect(diagonal.minX).toBe(1.0);
            expect(diagonal.minY).toBe(1.0);
            expect(diagonal.minZ).toBe(1.0);
            expect(diagonal.maxX).toBe(1.0);
            expect(diagonal.maxY).toBe(1.0);
            expect(diagonal.maxZ).toBe(1.0);
        });
    });
    
    describe("encounters another diagonal", function () {        
        it("updates its bounding box", function () {                        
            var otherDiagonal = new assemble.diagonal.Model();
            otherDiagonal.encounter(-1.0, -1.0, -1.0);
            otherDiagonal.encounter(1.0, 1.0, 1.0);
            
            expect(otherDiagonal.minX).toBe(-1.0);
            expect(otherDiagonal.minY).toBe(-1.0);
            expect(otherDiagonal.minZ).toBe(-1.0);
            expect(otherDiagonal.maxX).toBe(1.0);
            expect(otherDiagonal.maxY).toBe(1.0);
            expect(otherDiagonal.maxZ).toBe(1.0);

            var diagonal = new assemble.diagonal.Model();
            diagonal.encounterDiagonal(otherDiagonal);
            
            expect(diagonal.minX).toBe(-1.0);
            expect(diagonal.minY).toBe(-1.0);
            expect(diagonal.minZ).toBe(-1.0);
            expect(diagonal.maxX).toBe(1.0);
            expect(diagonal.maxY).toBe(1.0);
            expect(diagonal.maxZ).toBe(1.0);
        });
    });

    describe("when set", function() {
        it("calculates its length", function() {
            var diagonal = new assemble.diagonal.Model();
            diagonal.encounter(0.0, 0.0, 0.0);
            diagonal.encounter(3.0, 4.0, 5.0);

            var length = diagonal.length();
            expect(length).toBe(Math.sqrt(50));
        });
    });
});

describe("assemble.camera", function () {
    it("exists", function () {
        expect(assemble.camera).toBeNotNull();
    });
    it("instantiates", function () {        
        //assume canvas width = 600, height = 800        
        var camera = new assemble.camera.Model({aspectRatio : 6/8});
        expect(camera).toBeNotNull();
        expect(camera.aspectRatio).toBe(6 / 8);
    });
    it("zooms given a diagonal and sets its orbit center, orbit distance, zoom increment, modelSize", function() {
        var diagonal = new assemble.diagonal.Model();
        diagonal.encounter(-1.0, -1.0, -1.0);
        diagonal.encounter(1.0, 1.0, 1.0);
        
        var camera = new assemble.camera.Model({ aspectRatio: 6 / 8 });
        camera.zoomDiagonal(diagonal);

        expect(camera.orbitCenter[0]).toBe(0.0);
        expect(camera.orbitCenter[1]).toBe(0.0);
        expect(camera.orbitCenter[2]).toBe(0.0);

        expect(camera.modelSize).toBe(Math.sqrt(12));
        expect(camera.orbitDistance).toBe(9.787878025612523);
        expect(camera.zoomInc).toBe(0.24469695064031308);
        
    });
    it("nudges given x and y movements", function() {

    });
});

describe("assemble.geometry", function() {
    it("instantiates", function() {
        var geometry = new assemble.geometry.Model({ indices: [0, 1, 2, 2, 1, 0], positions: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], id: 1234, category: 'Walls' });
        expect(geometry.indices).toBeNotNull();
    });
});
