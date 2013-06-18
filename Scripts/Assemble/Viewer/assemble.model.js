
(function (assemble, $) {

    function Model(ctx) {
        this.isPopout = ctx.isPopout;
        this.gl       = ctx.gl;
        this.modelVersionId = ctx.modelVersionId;
        this.events    = ctx.events;
        this.camera    = ctx.camera;
        this.picker    = ctx.picker;
        this.homeDiagonal  = new assemble.Diagonal(); // HOME / default location diagonal
        this.modelDiagonal = new assemble.Diagonal(); // diagonal of entire model
        this.parser    = new assemble.Parser();
        this.materials = new assemble.materials.Collection([], { modelVersionId: ctx.modelVersionId });

        this.lastProgress = 0;
        this.connection   = null;
        this.geometry     = ctx.geometry || [];
        this.iboVisible   = [];
        this.indicesVisibleCounts     = [];
        this.vboAttribSelections      = []; // float32arrays of 0/1 values indicating selected or not (per vertex), each element holds an array for one vertex batch
        this.vboAttribSelectionsBO    = []; // gl buffer objects to which the vboAttribSelections are assigned/bound
        this.vboAttribSelectionsMap   = {}; // key=geometry id, value={ bufferIdx: idx of vboAttribSelections Idx in which this geometries vertices are stored, offset: start idx in vboAttribSelections, length: how many vertices are in geometry }
        this.vboAttribPickerColors    = []; // float32arrays of colors for the offscreen render pass (for object picking)
        this.vboAttribPickerColorsBO  = []; // gl buffer objects to which the vbovboAttribPickerColors are assigned/bound
        this.vboAttribPickerColorsMap = {}; // key=geometry id, value={ bufferidx: idx of buffer holding vertices offset:start idx in buffer,  length: num vertices }
        
        this.pnmVisible = []; //interleaved buffer object (bo) container for positions (p), normals (n), and materials (m)

        //later will be the camera,
        this.mvMatrix = mat4.create(); // The Model-View matrix
        this.pMatrix  = mat4.create(); // The projection matrix
        this.nMatrix  = mat4.create(); // The normal matrix

        this.isTransparent = true;

        this.batchamount = 1000; //the number of geometry pieces to request in each go
        this.loadedCount = 0;
        this.loadTotal   = ctx.geometryCount;

        this.bufferCount = 0;
        this.vertexCount = 0;
        this.indexCount  = 0;
        this.totalBytes  = 0;
        this.totalBytesToLoad = ctx.geometrySize;
        this.geometryLoaded   = false;
        this.buffersLoaded    = false;
        this.batchCount  = 0;
        this.batchNum    = 0;
        this.cancelDownload = false;
        this.downloadDuration = 0;
        this.parseDuration    = 0;

        //included and sorted geometries
        this.sortedIncludedGeometries = null;

        this.initialize(ctx);
    }

    Model.prototype.initialize = function (ctx) {
        this.materials.fetch({ async: false });
        this.initBuffers();
    };

    Model.prototype.initBuffers = function () {
        if (!this.isPopout)
            this.geometry.length = 0;

        this.initBatchBuffers();
    };

    Model.prototype.initBatchBuffers = function () {
        if (this.gl) {
            this.deleteBuffer(this.pnmVisible);
            this.deleteBuffer(this.iboVisible);            
            this.deleteBuffer(this.vboAttribSelectionsBO);
            this.deleteBuffer(this.vboAttribPickerColorsBO);            
        }

        this.pnmVisible.length              = 0;
        this.iboVisible.length              = 0;        
        this.indicesVisibleCounts.length    = 0;
        this.vboAttribSelections.length     = 0;
        this.vboAttribSelectionsBO.length   = 0;
        this.vboAttribSelectionsMap         = {};
        this.vboAttribPickerColors.length   = 0;
        this.vboAttribPickerColorsBO.length = 0;
        this.vboAttribPickerColorsMap       = {};
    };

    Model.prototype.deleteBuffer = function (bufferArray) {
        for (var i = 0; i < bufferArray.length; i++)
            this.gl.deleteBuffer(bufferArray[i]);
    };

    Model.prototype.initFromGeometry = function (geometry) {
        this.geometry = geometry;

        if (this.geometry.length == 0)
            return;

        this.geometryLoaded = true;
        this.picker.labelGeometries(this.geometry);
        this.updateSortedIncludedGeometries();
        this.updateBatchBuffers();
        this.events.trigger("geometryLoaded");
    };

    Model.prototype.downloadGeometry = function () {
        this.vertexCount = 0;
        this.indexCount  = 0;
        this.totalBytes  = 0;
        this.parseDuration = 0;
        this.downloadDuration = Date.now();        
        this.getGeometryBatch();
    };

    Model.prototype.getGeometryBatch = function () {
        if (this.loadedCount >= this.loadTotal) {
            this.geometryLoaded = true;

            this.downloadDuration = Date.now() - this.downloadDuration;
            var durationLabeling  = Date.now();
            var durationSorting   = Date.now();
            
            this.picker.labelGeometries(this.geometry); durationLabeling = Date.now() - durationLabeling; durationSorting   = Date.now();
            this.updateSortedIncludedGeometries();      durationSorting  = Date.now() - durationSorting;
            
            var stats = {
                vertexCount:   this.vertexCount,
                indexCount:    this.indexCount,
                instanceCount: this.geometry.length,
                byteCount:     this.totalBytes,
                durationDownload:  this.downloadDuration,
                durationParse:     this.parseDuration,
                durationLabeling:  durationLabeling,
                durationSorting:   durationSorting,
                durationBatching:  0,
                durationRendering: 0
            };

            var arg = { self: this, stats: stats };
            this.waitForGrid(arg);
            
        } else {

            var self = this;
            var callback = function (view) {
                self.totalBytes += view.byteLength;
                self.onGeometryReceived(view);
            };

            assemble.connection.request(assemble.connection.CommandCode.Geometry,
                { modelVersionId: this.modelVersionId, skip: this.loadedCount, take: this.batchamount },
                callback);
        }
    };

    Model.prototype.waitForGrid = function(arg){
        var self = arg.self;

        if (assemble.grid.isReady)
            self.finishLoading(arg);
        else
            setTimeout(self.waitForGrid, 200, arg);
    };

    Model.prototype.finishLoading = function (arg) {
        var self = arg.self;

        var durationBatching  = Date.now();
        self.updateBatchBuffers();
        durationBatching  = Date.now() - durationBatching;

        var durationRendering = Date.now();
        self.events.trigger("geometryLoaded");
        durationRendering = Date.now() - durationRendering;

        arg.stats.durationBatching  = durationBatching;
        arg.stats.durationRendering = durationRendering;

        self.printStats(arg.stats);
    };

    Model.prototype.onGeometryReceived = function (view) {
        this.parser.setBuffer(view);

        while (true) {
            var duration = Date.now();
            var geom = this.parser.yieldGeometry();
            this.parseDuration += Date.now() - duration;

            if (geom == null) {
                if(!this.cancelDownload) this.getGeometryBatch();
                break;
            } else {
                this.loadedCount++;
                this.geometry.push(geom);

                this.vertexCount += geom.positions.length / 3;
                this.indexCount  += geom.indices.length;

                this.events.trigger("geometryReceived");
            }
        }
    };

    //synchronize with visible items in the grid (adhere to filters there)
    Model.prototype.updateSortedIncludedGeometries = function() {

        var self = this;
        var includedInstances = assemble.grid.selectionCache.getIncludedInstances();
        var includedGeometries = $.map(this.geometry, function (g) {
            return _.contains(includedInstances, g.id) ? _.extend(g, { material: self.materials.get(g.materialId) }) : null;
        });

        this.sortedIncludedGeometries = _.sortBy(includedGeometries, function (geom) {
            return geom.material.get('transparency');
        });
    };

    //Batching for sorted included geometries
    Model.prototype.updateBatchBuffers = function (isLoad) {
        var gl        = this.gl;
        var geometry  = this.sortedIncludedGeometries;
        var positions = [];
        var normals = [];
        var indices = [];
        var start = 0;
        var length = 0;
        var map = [];
                
        var materials = [];

        this.initBatchBuffers();        
        
        //this is just a prelimimary measure, in case we are going to reset our inclusion of geometries in our world view.
        this.homeDiagonal.reset();
        this.modelDiagonal.reset();

        this.batchCount = geometry.length;
        this.batchNum   = 0;

        for (var i = 0; i < geometry.length; i++) {
            this.batchNum++;
            this.events.trigger("geometryBatched");

            this.modelDiagonal.encounterDiagonal(geometry[i].diagonal);
            if (this.isCategoryUsedForDiagonal(geometry[i].id))
                this.homeDiagonal.encounterDiagonal(geometry[i].diagonal);
                        
            if (geometry[i].positions.length + positions.length <= 65536) {

                start  = indices.length;
                length = positions.length / 3; //number of vertices

                positions = assemble.ViewerUtility.float32Concat(positions, geometry[i].positions);
                normals   = assemble.ViewerUtility.float32Concat(normals, geometry[i].normals);
                indices   = assemble.ViewerUtility.uint16Concat(indices, geometry[i].indices);

                this.updateMaterials(geometry[i], materials);

                map.push({ id: geometry[i].id, bufferIdx: -1, offset: length, length: geometry[i].vertexCount });

                for (var j = start; j < indices.length; j++)
                    indices[j] += length;

                if (i == geometry.length - 1) {
                    this.addBatchBuffers(gl, map, positions, normals, indices, materials);
                    map.length = 0;
                }

                continue;
            }

            this.addBatchBuffers(gl, map, positions, normals, indices, materials);
            map.length = 0;

            positions = new Float32Array(geometry[i].positions);
            normals = new Float32Array(geometry[i].normals);
            indices = new Uint16Array(geometry[i].indices);

            map.push({ id: geometry[i].id, bufferIdx: -1, offset: 0, length: geometry[i].vertexCount });

            materials.length = 0;
            this.updateMaterials(geometry[i], materials);
        }

        this.bufferCount   = this.pnmVisible.length;
        this.buffersLoaded = true;
    };

    Model.prototype.isCategoryUsedForDiagonal = function (instanceId) {
        var categoriesToIgnore = ["Detail items", "Mass", "Topography"];
        var instance = assemble.grid.selectionCache.instanceLookup[instanceId];
        
        if (instance === undefined)
            return true;

        var category = assemble.grid.selectionCache.getCategoryFromRowId(instance.rowId);

        if (category == "DetailSPACETOKENItems") return false;
        if (category == "Mass") return false;
        if (category == "Topography") return false;

        return true;
    };

    Model.prototype.updateMaterials = function (geometry, materials) {
        var n, material, vertexCount = geometry.vertexCount;
        if (geometry.singleMaterial) {
            material = geometry.material;
            for (n = 0; n < vertexCount; n++) {
                materials.push(material.get('red') / 255);
                materials.push(material.get('green') / 255);
                materials.push(material.get('blue') / 255);
                materials.push(1 - (material.get('transparency') / 100));
            }
        } else {
            for (n = 0; n < vertexCount; n++) {
                material = geometry.vertexMaterialMap[n];
                materials.push(material.get('red') / 255);
                materials.push(material.get('green') / 255);
                materials.push(material.get('blue') / 255);
                materials.push(1 - (material.get('transparency') / 100));
            }
        }        
    };

    Model.prototype.addBatchBuffers = function (gl, map, positions, normals, indices, materials) {
        var indexBufferObject  = gl.createBuffer();
        var colorsBufferObject = gl.createBuffer(); // colors for offscreen render for object picking
        
        //interleaved positions (3), normals (3), and materials (4) => 10 numbers per vertex
        var pnmBufferObject = gl.createBuffer();        

        var numVertices = positions.length / 3;
        var pnmArray    = new Float32Array(numVertices * 10);

        for (var p = 0; p < numVertices; p++) {

            pnmArray[p * 10]     = positions[p * 3];
            pnmArray[p * 10 + 1] = positions[p * 3 + 1];
            pnmArray[p * 10 + 2] = positions[p * 3 + 2];
            
            pnmArray[p * 10 + 3] = normals[p * 3];
            pnmArray[p * 10 + 4] = normals[p * 3 + 1];
            pnmArray[p * 10 + 5] = normals[p * 3 + 2];

            pnmArray[p * 10 + 6] = materials[p * 4];
            pnmArray[p * 10 + 7] = materials[p * 4 + 1];
            pnmArray[p * 10 + 8] = materials[p * 4 + 2];
            pnmArray[p * 10 + 9] = materials[p * 4 + 3];
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, pnmBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, pnmArray, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        this.pnmVisible.push(pnmBufferObject);
        this.iboVisible.push(indexBufferObject);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        this.indicesVisibleCounts.push(indices.length);

        this.vboAttribSelections.push(new Float32Array(positions.length / 3));
        this.vboAttribSelectionsBO.push(null); // lazy, only needed if an object in the array is clicked/selected

        // create the array and buffer object (and binding) for the offscreen colors for object picking
        var pickerColorsArray = this.createPickerColorsArray(map, positions.length); // num vertices * 3, same as positions.length
        this.vboAttribPickerColors.push(pickerColorsArray);
        this.vboAttribPickerColorsBO.push(colorsBufferObject); // can't be lazy on these, needed for rendering offscreen (object selection)

        gl.bindBuffer(gl.ARRAY_BUFFER, colorsBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, pickerColorsArray, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        // loop through the map and update the index position and store a reference to the maps for each geometry
        for (var i = 0; i < map.length; i++) {
            map[i].bufferIdx = this.vboAttribSelections.length - 1;
            this.vboAttribSelectionsMap[map[i].id] = map[i];
            this.vboAttribPickerColorsMap[map[i].id] = map[i]; // having a second map may not be necessary, may want to just use the selections map (rename it)
        }
    };

    Model.prototype.createPickerColorsArray = function (map, length) {
        var colorsArray   = new Float32Array(length);
        var geometryColor = null;
        var start = 0;
        var end   = 0;

        // this is too slow, we should only loop through the array once, and just get the colors as we go
        // need a better map or lookup, mayhaps I'm too sleepy while I do this
        for (var i = 0; i < map.length; i++) {
            geometryColor = this.picker.getGeometryOffscreenColor(map[i].id);

            start = map[i].offset * 3; // 3 values per vertex
            end   = start + (map[i].length * 3);// 3 values per vertex

            for (var j = start; j < end; j += 3) {
                colorsArray[j + 0] = geometryColor[0] / 255;
                colorsArray[j + 1] = geometryColor[1] / 255;
                colorsArray[j + 2] = geometryColor[2] / 255;
            }
        }

        return colorsArray;
    };

    Model.prototype.calculateOrbitCenter = function (id) {
        var instanceGeometry = _.find(this.geometry, function (g) { return g.id == id; });

        if (instanceGeometry === null || instanceGeometry === undefined)
            return;

        this.camera.calculateOrbitCenter(instanceGeometry.diagonal);
    };

    Model.prototype.getSelectedExtentsDiagonal = function () {
        var selectedIds = this.picker.picklist;
        var geometries  = _.filter(this.geometry, function (g) { return _.contains(selectedIds, g.id); });
        var diagonal    = new assemble.Diagonal();

        for (var i = 0; i < geometries.length; i++)
            diagonal.encounterDiagonal(geometries[i].diagonal);

        return diagonal;
    };

    Model.prototype.printStats = function (stats) {
        var printInt      = assemble.ViewerUtility.prettyPrintInteger;
        var printDuration = assemble.ViewerUtility.prettyPrintDuration;

        console.log(" ");
        console.log("Download Stats: ");
        console.log("=========================================");
        console.log("Loaded " + printInt(stats.vertexCount)     + " vertices");
        console.log("Loaded " + printInt(stats.indexCount)      + " indices");
        console.log("Loaded " + printInt(stats.instanceCount) + " instances");
        console.log("Loaded " + printInt(stats.byteCount)      + " bytes");
        console.log(" ");
        console.log("Time to download: "    + printDuration(stats.durationDownload));
        console.log("  --> Time to parse: " + printDuration(stats.durationParse));
        console.log("Time to label: "  + printDuration(stats.durationLabeling));
        console.log("Time to sort: "   + printDuration(stats.durationSorting));
        console.log("Time to batch: "  + printDuration(stats.durationBatching));
        console.log("Time to render: " + printDuration(stats.durationRendering));
        console.log("=========================================");
    };

    assemble.ViewerModel = Model;

}(window.assemble, jQuery));
