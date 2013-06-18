
(function (assemble, $) {

    function Geometry(ctx) {
        this.id = ctx.id;
        this.positions = null;
        this.indices = null;
        this.normals = null;
        this.materialId = ctx.materialId;
        this.diagonal = new assemble.Diagonal();
        this.singleMaterial = true;
        this.vertexMaterialMap = [];  //only applies if !this.singleMaterial
        this.vertexCount = 0;

        this.initialize(ctx);
    }

    Geometry.prototype.initialize = function (ctx) {
        var i, j, k, p, faceIndices = [], faceIndex, faceMaterial,
            faceMaterialKey, faceOffset,
            indexOffset, v, indexMaterialLookup = {},
            expandingPositions = [], indexMaterialArray, mappedIndex,
            expandingNormals = [], normalArray, materialChunks = [];
        
        //calculate normals
        normalArray = assemble.ViewerUtility.calculateNormals(ctx.positions, ctx.indices);        

        //calculate diagonal
        for (p = 0; p < ctx.positions.length; p += 3) {
            this.diagonal.encounter(ctx.positions[p], ctx.positions[p + 1], ctx.positions[p + 2]);
        }

        //analyze face materials, if they are all the same then business as usual, otherwise
        //break up the positions and indices into faces        

        if (ctx.faceMaterialMap.length > 1 && ctx.faceMaterialMap.length % 4 == 0) {            
            while (ctx.faceMaterialMap.length) {
                materialChunks.push(ctx.faceMaterialMap.splice(0, 4));
            }
            
            for (i = 1; i < materialChunks.length; i++) {
                if (this.singleMaterial) {
                    for (j = 0; j < 4; j++) {
                        if (materialChunks[i][j] != materialChunks[i - 1][j]) {
                            this.singleMaterial = false;
                            break;
                        }
                    }
                }
            }            
        }
        
        if (this.singleMaterial) {

            this.positions = ctx.positions;
            this.indices = ctx.indices;
            this.normals = new Float32Array(normalArray);
            
        } else {
            
            expandingPositions = Array.apply([], ctx.positions);
            expandingNormals = Array.apply([], normalArray);

            var currentVertexCount = ctx.positions.length / 3;
            for (i = 0; i < currentVertexCount; i++) {
                this.vertexMaterialMap[i] = null;
            }
            
            //indexMaterialLookup[position index] = [facematerial_string: mappedPosition]

            //console.log("geometry for instance: " + ctx.id + " contains faces with differing colors");
            
            //we have to duplicate vertices where vertex has different colors            
            //positions and indices will be extracted by faces
            for (i = 0; i < ctx.faceTriangleMap.length; i++) {                

                faceIndex = ctx.faceTriangleMap[i];
                
                faceMaterial = new assemble.materials.Model({
                    red: materialChunks[faceIndex][0],
                    green: materialChunks[faceIndex][1],
                    blue: materialChunks[faceIndex][2],
                    transparency: materialChunks[faceIndex][3]
                });
                
                faceMaterialKey = faceMaterial.toString();
                indexOffset = 3 * i;
                
                for (j = 0; j < 3; j++) {
                    
                    v = ctx.indices[indexOffset + j];
                    mappedIndex = v;


                    if (_.has(indexMaterialLookup, v)) { //have we seen this position before
                        indexMaterialArray = indexMaterialLookup[v];
                        if (_.has(indexMaterialArray, faceMaterialKey)) {
                            mappedIndex = indexMaterialArray[faceMaterialKey];
                        } else {
                            //duplicate the vertex
                            for (k = 0; k < 3; k++) { //each position is composed of x,y,z, 
                                expandingPositions.push(ctx.positions[3 * v + k]);
                                expandingNormals.push(normalArray[3 * v + k]);
                            }
                            mappedIndex = expandingPositions.length / 3 - 1;
                            indexMaterialArray[faceMaterialKey] = mappedIndex;
                            this.vertexMaterialMap.push(faceMaterial);
                        }
                    } else {  //add with existing index
                        indexMaterialLookup[v] = {};
                        indexMaterialLookup[v][faceMaterialKey] = mappedIndex;
                        this.vertexMaterialMap[v] = faceMaterial;
                    }
                    
                    //faceIndices.push(indexOffset + j);
                    faceIndices.push(mappedIndex);
                    
                    
                    //for (k = 0; k < 3; k++) {  //each position is composed of x,y,z, 
                    //    facePositions.push(ctx.positions[3 * v + k]);
                    //}
                }
            }

            this.positions = new Float32Array(expandingPositions);
            this.indices = new Uint16Array(faceIndices);
            this.normals = new Float32Array(expandingNormals);            
        }

        this.vertexCount = this.positions.length / 3;        
    };

    assemble.Geometry = Geometry;

}(window.assemble, jQuery));