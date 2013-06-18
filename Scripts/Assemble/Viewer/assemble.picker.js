
/***************************************
* This object is used for selecting objects
* in the viewer (3D).
***************************************/

(function (assemble, $) {
        
    function Picker(gl, $canvas) {                
        this.currentColorLabel   = 1;
        this.gl                  = gl;
        this.$canvas             = $canvas;
        this.geometryColors      = {}; // map, { colorlabel: geometry_id }
        this.geometryColorLookup = {}; // map, { geometry_id: color_label }
        this.picklist            = [];

        // buffers for reading picks / selection under mouse
        this.texture      = gl.createTexture();
        this.renderbuffer = gl.createRenderbuffer();
        this.framebuffer  = gl.createFramebuffer(); 
        
        // buffers for reading depth under mouse
        this.textureDepth      = gl.createTexture();
        this.renderbufferDepth = gl.createRenderbuffer();
        this.framebufferDepth  = gl.createFramebuffer();

        this.initialize();
    }

    Picker.prototype.initialize = function () {        
        this.setupTexture(false); // sets texture size, and binds texture to renderbuffer

        var gl = this.gl;
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderbuffer);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferDepth);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textureDepth, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderbufferDepth);

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    Picker.prototype.setupTexture = function (withCleanup) {
        var gl            = this.gl;        
        var $canvas       = this.$canvas;
        var canvas_width  = $canvas.width();
        var canvas_height = $canvas.height();

        // *************************************************
        // setup the pickign buffer data
        // *************************************************
        gl.bindTexture(gl.TEXTURE_2D, this.texture);        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas_width, canvas_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas_width, canvas_height);

        // *************************************************
        // setup the depth buffer data
        // *************************************************
        gl.bindTexture(gl.TEXTURE_2D, this.textureDepth);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas_width, canvas_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbufferDepth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas_width, canvas_height);

        if (withCleanup) {
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        }
    };

    Picker.prototype.click = function (coords, append) {        
        var colorKey = this.getColorKey(coords);
        var id       = this.geometryColors[colorKey];

        if (id === undefined) {            
            return { added: [], removed: [] };
        }

        var idx = this.picklist.indexOf(id);

        if (idx >= 0) {
            this.picklist.splice(idx, 1);
            return { added: [], removed: [id] };
        }
        else {
            if (append) {
                this.picklist.push(id);
                return { added: [id], removed: [] };
            } else {
                var removed = [].concat(this.picklist);
                this.clearPicks();
                this.picklist.push(id);
                return { added: [id], removed: removed };
            }
        }        
    };

    Picker.prototype.getId = function (coords) {        
        var geometryColorKey = this.getColorKey(coords);
        var geometryId       = this.geometryColors[geometryColorKey];

        if (geometryId === undefined)
            return -1;

        return geometryId;
    };

    Picker.prototype.getColorKey = function (coords) {
        var gl    = this.gl;
        var pixel = new Uint8Array(4);

        gl.finish();

        // read the color of the pixel at the mouse coords
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.readPixels(coords.x, coords.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return pixel[0] + ':' + pixel[1] + ':' + pixel[2];
    };    

    Picker.prototype.readDepth = function (coords) {
        var gl    = this.gl;
        var pixel = new Uint8Array(4);

        gl.finish();

        // read the color of the pixel at the mouse coords
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferDepth);
        gl.readPixels(coords.x, coords.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        /*
        const vec4 bit_shift = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);
        float depth = dot(rgba_depth, bit_shift);
        */

        //var bitshift = [
        //        1.0 / (256.0 * 256.0 * 256.0),
        //        1.0 / (256.0 * 256.0),
        //        1.0 / (256.0),
        //        1.0
        //    ];

        //return (pixel[0] * mask0) + (pixel[1] * mask1) + (pixel[2] * mask2) + (pixel[3] * mask3);

        /*
        const vec4 bitSh = vec4(1.0 / (256.0 * 256.0 * 256.0), 1.0 / (256.0 * 256.0), 1.0 / 256.0, 1.0);
        return(dot(value, bitSh));
        */

        //var bitshift = [
        //        1.0, 
        //        1.0 / 255.0,
        //        1.0 / 65025.0,
        //        1.0 / 160581375.0
        //    ];

        var bitshift = [
                1.0,
                1 / (256.0),
                (256.0),
                (1.0)
        ];

        for (var i = 0; i <= 3; i++) {
            for (var j = 0; j <= 3; j++) {
                for (var k = 0; k <= 3; k++) {
                    for (var l = 0; l <= 3; l++) {
                        var r = (pixel[i] * bitshift[0]) +
                                (pixel[j] * bitshift[1]) +
                                (pixel[k] * bitshift[2]) +
                                (pixel[l] * bitshift[3]);

                        if(r == 12345.6789)
                            console.log("[" + i + "" + j + "" + k + "" + l + "]: " + r +" <=========================");
                        else
                            console.log("[" + i + "" + j + "" + k + "" + l + "]: " + r);
                    }
                }
            }
        }

        return (pixel[0] * bitshift[0]) + 
               (pixel[1] * bitshift[1]) + 
               (pixel[2] * bitshift[2]) + 
               (pixel[3] * bitshift[3]);
    };

    Picker.prototype.labelGeometries = function (geometries) {
        for (var i = 0; i < geometries.length; i++) {
            var colorLabel = this.generateColorLabel();
            var colorKey   = colorLabel[0] + ':' + colorLabel[1] + ':' + colorLabel[2];

            this.geometryColors[colorKey] = geometries[i].id;
            this.geometryColorLookup[geometries[i].id] = colorLabel;
        }
    };

    Picker.prototype.getGeometryOffscreenColor = function (id) {
        if (typeof (this.geometryColorLookup[id]) == "undefined")
            return [0.0, 0.0, 0.0];

        return this.geometryColorLookup[id];
    };

    Picker.prototype.generateColorLabel = function () {
        var label = this.currentColorLabel;

        var r = label >> 16;
        var g = label >> 8;
        var b = label & 0xff;

        this.currentColorLabel += 1;

        return [r, g, b];
    };

    Picker.prototype.addPick = function (id) {
        var idx = this.picklist.indexOf(id);

        if(idx == -1)
            this.picklist.push(id);
    };

    Picker.prototype.clearPicks = function () {
        this.picklist.length = 0;
    };

    Picker.prototype.isPicked = function (id) {
        return this.picklist.indexOf(id) >= 0;
    };

    assemble.Picker = Picker;

}(window.assemble, jQuery));