
(function (assemble, $) {

    function GL(gl) {
        this.gl = gl;
    }

    GL.prototype.bindStaticArrayBuffer = function (bufferObject, bufferData) {
        this.bindStaticBuffer(this.gl.ARRAY_BUFFER, bufferObject, bufferData);
    };

    GL.prototype.bindStaticElementBuffer = function (bufferObject, bufferData) {
        this.bindStaticBuffer(this.gl.ELEMENT_ARRAY_BUFFER, bufferObject, bufferData);
    };

    GL.prototype.bindStaticBuffer = function (bufferType, bufferObject, bufferData) {
        this.gl.bindBuffer(bufferType, bufferObject);
        this.gl.bufferData(bufferType, bufferData, this.gl.STATIC_DRAW);
    };

    GL.prototype.unbindArrayBuffer = function () {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    };

    GL.prototype.unbindElementBuffer = function () {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
    };

    GL.prototype.createBuffer = function () {
        return this.gl.createBuffer();
    };

    assemble.GL = GL;
    
}(window.assemble, jQuery));