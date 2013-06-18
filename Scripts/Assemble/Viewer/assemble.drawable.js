
/*

NOT CURRENTLY USED

*/

(function (assemble, $) {

    function Drawable(gl, programs, picker) {
        this.gl           = gl;
        this.programs     = programs;
        this.programs     = picker;
        this.vertexBuffer = null;
        this.indexBuffer  = null;
        this.normalBuffer = null;
        this.geometry     = null;        
    }

    Drawable.prototype.initialize = function () {
        if (!this.gl)
            return;

        if (this.vertexBuffer != null) gl.deleteBuffer(this.vertexBuffer);
        if (this.normalBuffer != null) gl.deleteBuffer(this.normalBuffer);
        if (this.indexBuffer != null)  gl.deleteBuffer(this.indexBuffer);
    };

    Drawable.prototype.loadBuffers = function (geo) {
        var gl = this.gl;

        this.geometry = geo;
        this.vertexBuffer = gl.createBuffer();
        this.normalBuffer = gl.createBuffer();
        this.indexBuffer  = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, geo.positions, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(assemble.ViewerUtility.calculateNormals(geo.positions, geo.indices)), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    };

    Drawable.prototype.draw = function (offscreen) {
        var gl      = this.gl;
        var geo     = this.geometry;
        var program = this.programs.currentProgram;
        var picker  = this.picker;

        if (offscreen) {

            //offScreenColor = this._model._picker.getGeometryOffscreenColor(model.geometry[i].id);
            //gl.uniform3f(program.mColor, offScreenColor[0] / 255, offScreenColor[1] / 255, offScreenColor[2] / 255);

        } else {

            var useMaterials = false;

            if (useMaterials) {
                var materialColor = { r: 0.5, g: 0.5, b: 0.5 };// this.getMaterialColor(geometry.category);
                gl.uniform3f(program.mColor, materialColor.r, materialColor.g, materialColor.b);
            }

            gl.uniform1f(program.selected, (picker.isPicked(geo.id) ? 1.0 : 0.0));
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(program.aVertexPosition, 3, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(program.aVertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(program.aVertexNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(program.aVertexNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.geometry.indices.length, gl.UNSIGNED_SHORT, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    };

    assemble.Drawable = Drawable;

}(window.assemble, jQuery));