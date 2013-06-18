(function ($) {

    function Parser() {
    }

    Parser.prototype.setBuffer = function(buffer) {
        
        this._buffer = buffer;
        this._ptr = 1;

        this._bytes = new Uint8Array(buffer);
        this._shorts = new Uint16Array(buffer);
        this._ints = new Int32Array(buffer);
        this._uints = new Uint32Array(buffer);
        this._floats = new Float32Array(buffer);

        this._withFaces = this.readByte() == 1;

        this._currentGeom = 0;
        this.geomCount = this.readShort();
        
        this._materialGroupCount = this.readShort();
        this._currentMaterialGroupCount = 0;

        this._ptr += 2;
        this._currentMaterial = null;
        this._currentMaterialCount = 0;
        this._materialCount = 0;
        
        //if faces come down then we are also getting the material for the faces and want to color accordingly

    };

    Parser.prototype.yieldGeometry = function () {
        var j, k, offset;

        if (this._currentGeom >= this.geomCount)
            return null;

        if (this._currentMaterialCount >= this._materialCount) { //read in the next material id

            this._currentMaterial = this.readInt();

            this._materialCount = this.readUint();
            
            this._currentMaterialCount = 0;

            this._currentMaterialGroupCount++;            
        }

        //we'll need to go 64 bit when we implement for AutoCad
        //var id = this.readInt64(this._byteOffset);
        //this._byteOffset += 8;

        var id = this.readInt();

        var countFloats = this.readUint() * 3;

        var positions = this.readFloats(countFloats);

        var numIndices = this.readUint();
        var indices = new Uint16Array(numIndices);

        var highest = 0;
        for (j = 0; j < numIndices; j++) {
            var code = this.decodeShort();

            var value = highest - code;

            indices[j] = value;
            if (code == 0) {
                highest++;
            }
        }

        offset = (this._ptr % 4) ? (4 - (this._ptr % 4)) : 0;
        this._ptr += offset;

        var faceTriaMap = [];
        var faceMaterialMap = [];
        
        if (this._withFaces) {
            //parse the face triangle map and the face material map
            
            var num = this.readUint();
            for (k = 0; k < num; k++) {
                faceTriaMap[k] = this.decodeShort();
            }
            
            offset = (this._ptr % 4) ? (4 - (this._ptr % 4)) : 0;
            this._ptr += offset;

            num = this.readUint();
            for (k = 0; k < num; k++) {
                faceMaterialMap[k] = this.readByte();
            }
            
            offset = (this._ptr % 4) ? (4 - (this._ptr % 4)) : 0;
            this._ptr += offset;
        }

        offset = (this._ptr % 4) ? (4 - (this._ptr % 4)) : 0;
        this._ptr += offset;

        this._currentGeom++;
        this._currentMaterialCount++;

        return new assemble.Geometry({
            positions: positions,
            id: id,
            indices: indices,
            materialId: this._currentMaterial,
            faceTriangleMap: faceTriaMap,
            faceMaterialMap: faceMaterialMap,
        });
    };

    Parser.prototype.decodeShort = function () {
        var b1, b2, b3, code = 0;
        b1 = this.readByte();
        if (b1 < 128) {  //one byte sequence
            code = b1;
        }
        else if (b1 < 224) { //two byte sequence
            b2 = this.readByte();
            code = ((b1 & 0x1F) << 6) + (b2 & 0x3F);
        }
        else if (b1 < 240) { //three byte sequence
            b2 = this.readByte();
            b3 = this.readByte();
            code = ((b1 & 0x0F) << 12) + ((b2 & 0x3F) << 6) + (b3 & 0x3F);
        }
        return code;
    };

    Parser.prototype.eof = function () {
        return this._ptr >= this._buffer.byteLength;
    };
    
    Parser.prototype.readByte = function () {
        var r = this._bytes[this._ptr];
        this._ptr += 1;
        return r;
    };

    Parser.prototype.readShort = function () {
        var r = this._shorts[this._ptr / 2];
        this._ptr += 2;
        return r;
    };

    Parser.prototype.readUint = function () {
        var r = this._uints[this._ptr / 4];
        this._ptr += 4;
        return r;
    };

    Parser.prototype.readInt = function () {
        var r = this._ints[this._ptr / 4];
        this._ptr += 4;
        return r;
    };

    Parser.prototype.readFloats = function (num) {
        if (_.isUndefined(num))
            num = this.readUint();
        var array = new Float32Array(this._buffer, this._ptr, num);
        this._ptr += num * 4;
        return array;
    };

    Parser.prototype.readShorts = function (num) {
        if (_.isUndefined(num))
            num = this.readUint();
        var array = new Uint16Array(this._buffer, this._ptr, num);
        this._ptr += num * 2;
        if (this._ptr % 4) {
            this._ptr += 2;
        }
        return array;
    };

    Parser.prototype.readShortFromUtf8 = function (numBytes) {
        var str = this._buffer[this._ptr];
        var charCode = str.charCodeAt(0);
        this._ptr += numBytes;
    };

    Parser.prototype.readString = function () {
        var len = this.readUint();
        var view = new Uint8Array(this._buffer, this._ptr, len);
        var ret = [];
        for (var i = 0; i < len; i++) {
            ret.push(view[i]);
        }
        var offset = (len % 4) ? (4 - (len % 4)) : 0;
        this._ptr += offset + len;
                
        return String.fromCharCode.apply(undefined, ret);
    };

    Parser.prototype.joinFaceIndices = function (faceIndices) {

        var totalLength = _.reduce(faceIndices, function (memo, x) {
            return memo + x.length;
        }, 0);

        var result = new Uint16Array(totalLength);
        var offset = faceIndices[0].length;
        result.set(faceIndices[0]);
        for (var i = 1; i < faceIndices.length; i++) {
            result.set(faceIndices[i], offset);
            offset += faceIndices[i].length;
        }
        return result;
    };

    assemble.Parser = Parser;

}(jQuery));