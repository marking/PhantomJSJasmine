
(function (assemble, $) {

    function Utility() {
    }

    Utility.prototype.calculateNormals = function (vs, ind) {
        var x = 0, y = 1, z = 2;
        var ns = [];

        for (var i = 0; i < vs.length; i++) { //for each vertex, initialize normal x, normal y, normal z
            ns[i] = 0.0;
        }

        for (var i = 0; i < ind.length; i = i + 3) { //we work on triads of vertices to calculate normals so i = i+3 (i = indices index)
            var v1 = [];
            var v2 = [];
            var normal = [];
            //p1 - p0
            v1[x] = vs[3 * ind[i + 1] + x] - vs[3 * ind[i] + x];
            v1[y] = vs[3 * ind[i + 1] + y] - vs[3 * ind[i] + y];
            v1[z] = vs[3 * ind[i + 1] + z] - vs[3 * ind[i] + z];
            // p0 - p1
            v2[x] = vs[3 * ind[i + 2] + x] - vs[3 * ind[i + 1] + x];
            v2[y] = vs[3 * ind[i + 2] + y] - vs[3 * ind[i + 1] + y];
            v2[z] = vs[3 * ind[i + 2] + z] - vs[3 * ind[i + 1] + z];
            //cross product by Sarrus Rule
            normal[x] = v1[y] * v2[z] - v1[z] * v2[y];
            normal[y] = v1[z] * v2[x] - v1[x] * v2[z];
            normal[z] = v1[x] * v2[y] - v1[y] * v2[x];

            for (var j = 0; j < 3; j++) { //update the normals of that triangle: sum of vectors
                ns[3 * ind[i + j] + x] = ns[3 * ind[i + j] + x] + normal[x];
                ns[3 * ind[i + j] + y] = ns[3 * ind[i + j] + y] + normal[y];
                ns[3 * ind[i + j] + z] = ns[3 * ind[i + j] + z] + normal[z];
            }
        }

        //normalize the result
        for (var i = 0; i < vs.length; i = i + 3) { //the increment here is because each vertex occurs with an offset of 3 in the array (due to x, y, z contiguous values)

            var nn = [];
            nn[x] = ns[i + x];
            nn[y] = ns[i + y];
            nn[z] = ns[i + z];

            var len = Math.sqrt((nn[x] * nn[x]) + (nn[y] * nn[y]) + (nn[z] * nn[z]));
            if (len == 0) len = 0.00001;

            nn[x] = nn[x] / len;
            nn[y] = nn[y] / len;
            nn[z] = nn[z] / len;

            ns[i + x] = nn[x];
            ns[i + y] = nn[y];
            ns[i + z] = nn[z];
        }

        return ns;
    };

    Utility.prototype.avgVec3 = function (a, b) {
        var c = [0, 0, 0];
        for (var i = 0; i < 3; i++) {
            c[i] = (a[i] + b[i]) / 2;
        }
        return c;
    };

    Utility.prototype.float32Concat = function (a, b) {
        var length = a.length;
        var result = new Float32Array(length + b.length);

        result.set(a);
        result.set(b, length);

        return result;
    };

    Utility.prototype.uint16Concat = function (a, b) {
        var length = a.length;
        var result = new Uint16Array(length + b.length);

        result.set(a);
        result.set(b, length);

        return result;
    };

    Utility.prototype.getGLContext = function (id) {
        var canvas = $("#" + id)[0];
        var ctx = null;

        if (canvas == null) {
            alert('there is no canvas on this page');
            return null;
        }

        var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];

        for (var i = 0; i < names.length; ++i) {
            try {
                ctx = canvas.getContext(names[i]);
            } catch (e) {
            }

            if (ctx)
                break;
        }

        if (ctx == null) {
            alert("Could not initialise WebGL.  The assemble viewer will not be available.");
            return null;
        } else {
            return ctx;
        }
    };

    Utility.prototype.clone = function (source) {
        return $.extend({}, source);
    };

    Utility.prototype.normalizeEventOffsets = function (event) {
        if (event.offsetX === undefined || event.offsetY === undefined) {
            var targetOffset = $(event.target).offset();

            event.offsetX = event.pageX - targetOffset.left;
            event.offsetY = event.pageY - targetOffset.top;
        }
    };

    Utility.prototype.requestAnimFrame = function (callback) {
        requestAnimFrame(callback);
    };

    Utility.prototype.prettyPrintDuration = function (milliseconds) {
        var x = milliseconds / 1000;
        return x.toFixed(5) + " seconds";
    };

    Utility.prototype.prettyPrintInteger = function (n) {
        var a = n.toString();
        var b = [];
        var j = 1;

        for (var i = a.length - 1; i >= 0; i--) {
            b.push(a[i]);

            if (j % 3 == 0 && i != 0)
                b.push(",");

            j++;
        }
        
        b.reverse();
        return b.join("");
    };

    requestAnimFrame = (function () {
        return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
                window.setTimeout(callback, 1000 / 60);
            };
    })();

    assemble.ViewerUtility = new Utility();

}(window.assemble, jQuery));