
(function (assemble, $) {

    function Programs(gl) {
        this.loaded   = false;
        this.gl       = gl;
        this.shaders  = null;
        this.programs = null;
        this.currentProgram = null;

        this.initialize();
    }

    Programs.prototype.initialize = function () {
        if (this.loaded)
            return;

        this.shaders = {};
        this.programs = {};

        this.loadPrograms();
    };

    Programs.prototype.loadPrograms = function () {
        // programs are defined with script attributes, find them all
        var elements = $("script[type='x-program/x-shader']");
        var self = this;

        elements.each(function () {

            var gl = self.gl;

            var vertexshaderid = $(this).attr('vertexshaderid');
            var fragmentshaderid = $(this).attr('fragmentshaderid');
            var vertexShader = self.loadShader.call(self, vertexshaderid);
            var fragmentShader = self.loadShader.call(self, fragmentshaderid);

            if (vertexShader === undefined) {
                console.error("Vertex shader " + vertexshaderid + " not found for program " + this.id + ".");
                return true;
            }

            if (fragmentShader === undefined) {
                console.error("Fragment shader " + fragmentshaderid + " not found for program " + this.id + ".");
                return true;
            }

            var program = gl.createProgram();

            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            var linked = gl.getProgramParameter(program, gl.LINK_STATUS);

            if (!linked) {
                console.error("Program " + this.id + " failed to link.");
                gl.deleteProgram(program);
            }
            else {
                self.programs[this.id] = program;
            }
        });
    };
    
    Programs.prototype.loadShader = function (shaderId) {
        var gl = this.gl;
        var $shader = $("#" + shaderId);
        var shaderType = $shader.attr("type");
        var shaderText = $shader.text();
        var shader = gl.createShader(shaderType == "x-shader/x-vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);

        gl.shaderSource(shader, shaderText);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Failed to compile WebGL shader : '" + shaderId + "'.  Reason: " + gl.getShaderInfoLog(shader));
            return undefined;
        }
        else {
            this.shaders[this.id] = shader; // store the compiled shaders
            return shader;
        }
    };

    Programs.prototype.use = function (programId) {
        if (this.programs[programId] === undefined) {
            console.error("Failed to use program " + programId + ".  Program not found.");
            return;
        }

        this.currentProgram = this.programs[programId];
        this.gl.useProgram(this.currentProgram);

        // this should be mode or program specific
        this.setAttribLocation("aVertexPosition");
        this.setAttribLocation("aVertexNormal");
        this.setAttribLocation("aVertexSelected");
        this.setAttribLocation("aVertexColor");
        this.setAttribLocation("aVertexMaterialColor");
        this.setUniformLocation("uPMatrix");
        this.setUniformLocation("uMVMatrix");
        this.setUniformLocation("uNMatrix");
        this.setUniformLocation("uAlpha");
        this.setUniformLocation("mColor");
        this.setUniformLocation("uIsolationMode");

        return this.currentProgram;
    };

    // set uniform locations (within the shader program(s))
    Programs.prototype.setUniformLocation = function (uniformName) {
        this.currentProgram[uniformName] = this.gl.getUniformLocation(this.currentProgram, uniformName);
    };

    // set attrib shader variable location
    Programs.prototype.setAttribLocation = function (attribName) {
        this.currentProgram[attribName] = this.gl.getAttribLocation(this.currentProgram, attribName);
    };

    // get the uniform variable location within the shader program
    Programs.prototype.getUniformLocation = function (uniformName) {
        return this.currentProgram[uniformName]; // bounds/existence check first mayhaps
    };

    Programs.prototype.getAttribLocation = function (attribName) {
        return this.currentProgram[attribName]; // bounds/existence check first mayhaps
    };

    Programs.prototype.setUniformMatrix4fv = function (uniformName, value) {
        // get location (offset) of uniform variable
        var location = this.currentProgram[uniformName];

        // if variable doesn't exist, or variable isn't used in shader code, don't set (can't)
        if (location === undefined || location == null || location == -1)
            return;

        this.gl.uniformMatrix4fv(location, false, value);
    };

    Programs.prototype.setUniform1f = function (uniformName, value) {
        // get location (offset) of uniform variable
        var location = this.currentProgram[uniformName];

        // if variable doesn't exist, or variable isn't used in shader code, don't set (can't)
        if (location === undefined || location == null || location == -1)
            return;

        this.gl.uniform1f(location, value);
    };

    Programs.prototype.setUniform3f = function (uniformName, value1, value2, value3) {
        // get location (offset) of uniform variable
        var location = this.currentProgram[uniformName];

        // if variable doesn't exist, or variable isn't used in shader code, don't set (can't)
        if (location === undefined || location == null || location == -1)
            return;

        this.gl.uniform3f(location, value1, value2, value3);
    };

    assemble.ViewerPrograms = Programs;

}(window.assemble, jQuery));