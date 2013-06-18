
(function (assemble, $) {

    function Viewer(ctx) {
        this.valid = true;
        this.gl    = assemble.ViewerUtility.getGLContext(ctx.canvasId);

        if (this.gl === null) {
            this.valid = false;
            return;
        }
                
        this.ctx       = ctx;
        this.canvasId  = ctx.canvasId;
        this.$canvas   = $("#"+ ctx.canvasId);
        this.canvas    = this.$canvas[0];        
        this.camera    = new assemble.Camera();
        this.events    = new assemble.ViewerEvents();        
        this.picker    = new assemble.Picker(this.gl, this.$canvas);
        this.programs  = new assemble.ViewerPrograms(this.gl);
        this.navigator = new assemble.ViewerNavigator();
        this.popoutWin = null;

        ctx.gl     = this.gl;
        ctx.camera = this.camera;
        ctx.events = this.events;
        ctx.picker = this.picker;

        this.model = new assemble.ViewerModel(ctx);

        this.isPopout      = ctx.isPopout || false;
        this.isInitialized = false;
        this.mouseDragging = false;
        this.mouseDown     = false;
        this.mouseButton   = 0;
        this.mouseDownId   = 0;
        this.key           = 0;
        this.shiftKey      = false;
        this.ctrlKey       = false;
        this.arrowUpKey    = false;
        this.arrowDownkey  = false;
        this.arrowLeftKey  = false;
        this.arrowRightKey = false;
        this.mouseX        = 0;
        this.mouseY        = 0;
        this.mouseLastX    = 0;
        this.mouseLastY    = 0;
        this.mouseDownX    = 0;
        this.mouseDownY    = 0;
        this.aspectRatio   = 0;
        this.zoomDirection = 1; // zoomin = 1, zoomout = -1, none = 0
        this.calculateDiagonals = true;
        this.isolationMode      = false;
        this.lastRenderTime     = Date.now();
        this.animRenderDelta    = 0;
        this.defaultCursor      = "default";
        this.isExtentZoomed     = false;

        this.progressContainerId = this.canvasId + "_progress_container";
        this.progressBarId       = this.canvasId + "_progress_bar";
        this.navContainerId      = this.canvasId + "_nav_container";
        this.navHomeButtonId     = this.canvasId + "_home_button";
        this.xrayButtonId        = this.canvasId + "_xray_button";
        this.navZoomInButtonId   = this.canvasId + "_zoom_in";
        this.navZoomOutButtonId  = this.canvasId + "_zoom_out";
        this.navZoomExtentsButtonId  = this.canvasId + "_zoom_extents";
        this.navViewpointsButtonId = this.canvasId + "_viewpoints_button";
        this.navKeyboardMouseButtonId = this.canvasId + "_keyboard_mouse_help";
        this.orthoWarningId      = this.canvasId + "_ortholabel";

        this._programIds = {
            DEFAULT:     "default",
            TRANSPARENT: "transparent",
            PICKER:      "picker"
        };

        this.DISPLACEMENT_FACTOR = 10.0;

        this.clearNavControls();
        this.initialize();
        this.setGLState();        

        this.isInitialized = true;
    }

    Viewer.prototype.initialize = function () {        
        var $document = $(document);
        var $canvas   = this.$canvas;
        var self      = this;
        var events    = this.events;

        // clear out any lingering event handlers to other objects
        $canvas.unbind();

        // attach bindings for this class to the canvas
        $canvas.bind("mousedown",  function (event) { self.handleMouseDown.call(self, event); });
        $canvas.bind("mouseup",    function (event) { self.handleMouseUp.call(self, event); });
        $canvas.bind("mousemove",  function (event) { self.handleMouseMove.call(self, event); });
        $canvas.bind("mouseleave", function (event) { self.handleMouseLeave.call(self, event); });
        $canvas.bind("mousewheel DOMMouseScroll", function (event) { self.handleMouseWheel.call(self, event); });        

        // bind to geometry progress events
        events.on("geometryLoaded",   function () { self.handleGeometryLoaded.call(self);   });
        events.on("geometryReceived", function () { self.handleGeometryReceived.call(self); });
        //events.on("geometryBatched",  function () { self.handleGeometryBatched.call(self);  });

        this.initGridHandlers();
        
        if (this.isPopout) {
            $document.on("keydown.popout", function (event) { window.assemble.viewer.handleKeyDown(event); });
            $document.on("keyup.popout",   function (event) { window.assemble.viewer.handleKeyUp(event); });
        }
        else {
            // unbind previous handlers in the viewer namespace
            $document.off(".viewer");

            // bind to keyboard events, but can't do this to the canvas. Ths needs to be outside this class
            $document.on("keydown.viewer", function (event) { assemble.explorer.view.modelView.currentView.viewer.handleKeyDown(event); });
            $document.on("keyup.viewer",   function (event) { assemble.explorer.view.modelView.currentView.viewer.handleKeyUp(event); });                        
        }

        // create the progess bar
        this.initProgressBar();
        this.showProgress(true);

        // make sure called at least once to start
        this.handleResize();
    };

    Viewer.prototype.initGridHandlers = function () {
        var eventCtx = this.isPopout ? "viewerpopout" : "viewer";

        // remove all viewer event callbacks
        assemble.grid.off(null, null, eventCtx);

        var self = this;

        // bind to the grid selection updates
        assemble.grid.on('selectionChanged', function (memo) { self.handleGridSelectionChanged.apply(self, memo); }, eventCtx);
        assemble.grid.on('dataFiltered',     function (memo) { self.handleGridDataFiltered.apply(self, memo); },     eventCtx);
    };

    Viewer.prototype.unbind = function () {
        var $document = $(document);
        var eventCtx = this.isPopout ? "viewerpopout" : "viewer";

        assemble.grid.off(null, null, eventCtx);
        $document.off(".viewer");
    };

    Viewer.prototype.initProgressBar = function () {
        
        $("#" + this.progressContainerId).remove();

        var s = [];

        if (this.isPopout) {
            s.push("<div id='" + this.progressContainerId + "' class='viewer_progress_container'>");
            s.push("<div id='" + this.progressBarId + "' class='bar' style='width: 100%; color: #fff; font-weight: bold;'>Loading...</div>");
            s.push("</div>");
        }
        else {
            s.push("<div id='" + this.progressContainerId + "' class='viewer_progress_container progress progress-info progress-striped active'>");
            s.push("<div id='" + this.progressBarId + "' class='bar' style='width: 0%;'></div>");
            s.push("</div>");
        }

        this.$canvas.parent().append(s.join(""));
    };

    Viewer.prototype.initNavControls = function () {
        var self = this;

        this.clearNavControls();
        
        var button = function (title, id, icon, hasSpace) {
            if (!hasSpace) var hasSpace = false;
            var spaceClass = hasSpace ? "nav_btn_withGap" : "";

            return '<li class="nav_btn '+ spaceClass +'">'+
                   '<button class="btn btn-inverse btn-mini" title="' + title + '" id="'+ id +'">'+
                   '<i class="icon-'+ icon +'"></i>'+
                   '</button></li>';
        };        
        
        var s = [];

        s.push("<div class='viewer_ortho_warning' id='" + this.orthoWarningId + "'>Orthographic</div>");

        s.push('<div class="viewer_nav_container" id="'+ this.navContainerId +'"><ul class="viewer_nav_list">');
        s.push(button("Move to Home Viewpoint", this.navHomeButtonId, "home"));
        s.push(button("Toggle X-ray Mode", this.xrayButtonId, "eye-open", true));
        s.push(button("Zoom Extents", this.navZoomExtentsButtonId, "screenshot"));
        s.push(button("Zoom In",  this.navZoomInButtonId, "plus"));
        s.push(button("Zoom Out", this.navZoomOutButtonId, "minus", true));
        //s.push("<div id='" + this.navViewpointsButtonId + "'></div>");
        s.push(button("Keyboard & Mouse Commands", this.navKeyboardMouseButtonId, "keyboard"));
        s.push('</ul></div>');

        this.$canvas.parent().append(s.join(""));

        var dropdown = new assemble.dropdowns.SelectorListView({
            collection: new Backbone.Collection([
                { id: "v0", name: '<i class="icon-list-arrow"></i><span class="selection-no-show mlxs">Bottom</span>', title: "Viewpoint Bottom" },
                { id: "v1", name: '<i class="icon-list-arrow"></i><span class="selection-no-show mlxs">Bottom</span>', title: "Viewpoint Top Front Left" },
                { id: "v2", name: '<i class="icon-list-arrow"></i><span class="selection-no-show mlxs">Bottom</span>', title: "Viewpoint Front" },
                { id: "v3", name: '<i class="icon-list-arrow"></i><span class="selection-no-show mlxs">Bottom</span>', title: "Viewpoint Top Front Right" },
                { id: "v4", name: '<i class="icon-list-arrow"></i><span class="selection-no-show mlxs">Bottom</span>', title: "Viewpoint Left" },
                { id: "v5", name: '<i class="icon-list-arrow"></i><span class="selection-no-show mlxs">Bottom</span>', title: "Viewpoint Top" },
                { id: "v6", name: '<i class="icon-list-arrow"></i><span class="selection-no-show mlxs">Bottom</span>', title: "Viewpoint Right" },
                { id: "v7", name: '<i class="icon-list-arrow"></i><span class="selection-no-show mlxs">Bottom</span>', title: "Viewpoint Top Back Left" },
                { id: "v8", name: '<i class="icon-list-arrow"></i><span class="selection-no-show mlxs">Bottom</span>', title: "Viewpoint Back" },
                { id: "v9", name: '<i class="icon-list-arrow"></i><span class="selection-no-show mlxs">Bottom</span>', title: "Viewpoint Top Back Right" }
            ]),
            menuAlign: 'right',
            classes: 'pull-left',
            toggleClasses: 'btn btn-small'
        });

        //dropdown.$el = $("#" + this.navViewpointsButtonId);
        //dropdown.render();

        // add handlers for the nav buttons
        $("#" + this.navHomeButtonId).on("click",        function () { self.camera.goHome(); self.render(); });
        $("#" + this.xrayButtonId).on("click",           function () { self.toggleIsolationMode(); self.render(); });
        $("#" + this.navZoomInButtonId).on("mousedown",  function () { if (self.zoomDirection != 0) return; self.zoomDirection = 1; self.handleZoomPress(); });
        $("#" + this.navZoomOutButtonId).on("mousedown", function () { if (self.zoomDirection != 0) return; self.zoomDirection = -1; self.handleZoomPress(); });
        $("#" + this.navZoomInButtonId).on("mouseup",    function () { self.zoomDirection = 0; });
        $("#" + this.navZoomOutButtonId).on("mouseup",   function () { self.zoomDirection = 0; });
        $("#" + this.navZoomExtentsButtonId).on("mouseup", function () { self.isExtentZoomed = !self.isExtentZoomed; self.zoomExtents(); });
        $("#" + this.navKeyboardMouseButtonId).on("mouseup", function () 
        { 
            var modal = assemble.modal.create({
                title: 'Assemble Viewer Keyboard & Mouse Commands',
                id: 'notify_viewerkeyboardmouse',
                primaryButtonText: 'OK'
            });

            modal.on('click', '.btn-primary', function (event) {
                event.preventDefault();
                modal.modal('hide');
            });

            modal.find('.btn.cancel').hide(); // hide cancel button
            modal.find('.modal-body').html(self.getKeyboardActionsText());
            modal.modal('show');
        });
    };

    Viewer.prototype.clearNavControls = function () {
        $("#" + this.navContainerId).remove();
    };

    Viewer.prototype.downloadGeometry = function () {
        if (!this.valid)
            return;

        if (this.model.buffersLoaded)
            this.render();
        else
            this.model.downloadGeometry();
    };

    Viewer.prototype.render = function () {
        if (!this.valid || !this.model.geometryLoaded || !this.isViewerActive())
            return;

        // make sure camera values are up to date
        this.updateCamera();
        
        // draw to onscreen buffer
        this.drawScene(this.programs.use("transparent"), false, false);

        // draw to offscreen buffer (for 3d selection)
        this.drawScene(this.programs.use("pickernew"), true, false);

        //this.stats.end();
        this.events.trigger("renderCompleted");
    };

    Viewer.prototype.renderDepth = function () {
        if (!this.valid || !this.model.geometryLoaded)
            return;

        // draw to offscreen buffer (for 3d selection)
        this.drawScene(this.programs.use("depth"), true, true);        
    };

    Viewer.prototype.drawScene = function (program, isOffscreen, isDepth) {
        if (isOffscreen && this.mouseDragging)
            return;

        var isSolid = isOffscreen || isDepth;
        var gl      = this.gl;

        if (isOffscreen) gl.bindFramebuffer(gl.FRAMEBUFFER, this.picker.framebuffer);
        if (isDepth)     gl.bindFramebuffer(gl.FRAMEBUFFER, this.picker.framebufferDepth);
        
        // set the various state bits
        this.setGLState(isSolid);

        // update matrices, camera, etc
        this.updateTransforms();

        // set the shader variables
        this.setProgramUniforms();

        // draw all the things!
        for (var i = 0; i < this.model.bufferCount; i++)
            this.drawBuffers(i, isOffscreen);

        // unbind the buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        if (isOffscreen || isDepth) gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    Viewer.prototype.drawBuffers = function (idx, isOffscreen) {
        var gl      = this.gl;
        var model   = this.model;
        var program = this.programs.currentProgram;

        if (isOffscreen) {            
            gl.bindBuffer(gl.ARRAY_BUFFER, model.vboAttribPickerColorsBO[idx]);
            gl.vertexAttribPointer(program.aVertexColor, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(program.aVertexColor);
        } else {
            if (model.vboAttribSelectionsBO[idx] === null) {
                gl.disableVertexAttribArray(program.aVertexSelected);                
            } else {
                gl.bindBuffer(gl.ARRAY_BUFFER, model.vboAttribSelectionsBO[idx]);
                gl.vertexAttribPointer(program.aVertexSelected, 1, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(program.aVertexSelected);
            }
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, model.pnmVisible[idx]);
        gl.vertexAttribPointer(program.aVertexPosition, 3, gl.FLOAT, false, 40, 0);
        gl.enableVertexAttribArray(program.aVertexPosition);

        if (!isOffscreen) {            
            gl.vertexAttribPointer(program.aVertexNormal, 3, gl.FLOAT, false, 40, 12);
            gl.enableVertexAttribArray(program.aVertexNormal);
            
            //material colors            
            gl.vertexAttribPointer(program.aVertexMaterialColor, 4, gl.FLOAT, false, 40, 24);
            gl.enableVertexAttribArray(program.aVertexMaterialColor);
        }
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.iboVisible[idx]);
        gl.drawElements(gl.TRIANGLES, model.indicesVisibleCounts[idx], gl.UNSIGNED_SHORT, 0);
    };

    Viewer.prototype.setGLState = function (isOffscreen) {
        var gl = this.gl;
        
        if (isOffscreen) {
            gl.clearColor(0.5, 0.5, 0.5, 1.0);
            gl.clearDepth(1.0);
            
            gl.enable(gl.DEPTH_TEST);
            gl.disable(gl.BLEND);
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);

        } else {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clearDepth(1.0);

            gl.disable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);            

            if (this.isolationMode) {
                gl.disable(gl.CULL_FACE);
                gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA_SATURATE, gl.SRC_ALPHA);
                gl.blendColor(0.3, 0.3, 0.3, 1.0);                
            }
            else {
                gl.enable(gl.CULL_FACE);
                gl.enable(gl.DEPTH_TEST);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                gl.blendColor(0.5, 0.5, 0.5, 1.0);
            }
        }

        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    };

    Viewer.prototype.updateTransforms = function () {
        var camera = this.camera;
        var model  = this.model;

        camera.setAspectRatio(this.aspectRatio); // should do this on resize instead of here

        if (this.calculateDiagonals) {
            camera.zoomDiagonal(model.homeDiagonal);
            camera.setCurrentPositionAsHome(model.homeDiagonal);
            this.calculateDiagonals = false;
        }

        model.mvMatrix = camera.getViewMatrix();
        model.pMatrix  = camera.getProjectionMatrix();

        mat4.copy(model.nMatrix, model.mvMatrix);
        mat4.invert(model.nMatrix, model.nMatrix);
        mat4.transpose(model.nMatrix, model.nMatrix);
    };

    Viewer.prototype.setProgramUniforms = function () {
        var programs = this.programs;
        var model    = this.model;

        programs.setUniformMatrix4fv("uMVMatrix", model.mvMatrix);
        programs.setUniformMatrix4fv("uPMatrix",  model.pMatrix);
        programs.setUniformMatrix4fv("uNMatrix",  model.nMatrix);
        programs.setUniform1f("uAlpha", 1.0);
        programs.setUniform1f("uIsolationMode", !!this.isolationMode);
    };

    Viewer.prototype.handlePopout = function () {        
        var popoutCtx = assemble.ViewerUtility.clone(this.ctx);

        popoutCtx.gl       = null;
        popoutCtx.camera   = null;
        popoutCtx.events   = null;
        popoutCtx.picker   = null;
        popoutCtx.isPopout = true;
        // pass something for events?
        //popoutCtx.geometry = this.model.geometry;

        this.popoutWin.Load(popoutCtx);
    };

    Viewer.prototype.handleMouseWheel = function (event) {
        var e     = event.originalEvent;
        var delta = e.wheelDelta ? e.wheelDelta : e.detail;
        var rate  = e.wheelDelta ? 120 : -3;

        var zoomAmount = delta / rate;

        if (window.opera)
            zoomAmount = -zoomAmount;

        //this.camera.zoom(zoomAmount);
        this.updateZoom(zoomAmount);
        this.render();

        event.preventDefault();
    };

    Viewer.prototype.handleMouseDown = function (event) {
        event.preventDefault();
        assemble.ViewerUtility.normalizeEventOffsets(event);

        this.mouseDown  = true;
        this.mouseLastX = event.pageX;
        this.mouseLastY = event.pageY;
        this.mouseDownX = event.pageX;
        this.mouseDownY = event.pageY;

        if (this.camera.type == 0) {
            // this is for changing the orbit center to be under the mouse cursor
            // however, this is not correct either, the real behavior should be this (based on Navis):
            // we should get the object under the mouse, but place the orbit center on the surface of that
            // object nearest the camera, at a point under the cursor
            // basically, shoot a ray from cursor into the scene, and place orbit center at coords 
            // of first intersection with an object

            var x = event.offsetX;
            var y = this.canvas.height - event.offsetY;
            this.mouseDownId = this.picker.getId({ x: x, y: y });

            //console.log("mouseDownOnId: " + this.mouseDownId);
            //if (this.mouseDownId >= 0) {
            //    this.renderDepth();
            //    var depth = this.picker.readDepth({ x: x, y: y });
            //    console.log("depth: " + depth);
            //}

            //if (this.mouseDownId >= 0)
            //    this.model.calculateOrbitCenter(this.mouseDownId);
            
            //var point1 = [];
            //var point2 = [];
            //var viewport = [0, 0, this.canvas.width, this.canvas.height];

            //point1[0] = x;
            //point1[1] = y;
            //point1[2] = 0; // near plane

            //point2[0] = point1[0];
            //point2[1] = point1[1];
            //point2[2] = 1; // far plane

            //var coords1 = this.camera.unProject(point1, viewport);
            //var coords2 = this.camera.unProject(point2, viewport);

            //var join = function (x) { var s = []; for (var i = 0; i < x.length; i++) s.push(x[i]); return s.join(","); };
            //console.log(point1.join(",") + " --> " + join(coords1));
            //console.log(point2.join(",") + " --> " + join(coords2));
            //console.log(this.model.diagonal.length());
            //console.log("")
        }
    };

    Viewer.prototype.handleMouseUp = function (event) {
        assemble.ViewerUtility.normalizeEventOffsets(event);

        if (!this.mouseDragging) {
            var x = event.offsetX;
            var y = this.canvas.height - event.offsetY;
            var result = this.picker.click({ x: x, y: y }, this.ctrlKey);

            for (var i = 0; i < result.added.length; i++)
                this.setInstanceSelection(result.added[i], true);

            for (var i = 0; i < result.removed.length; i++)
                this.setInstanceSelection(result.removed[i], false);

            // sync grid           
            assemble.grid.selectionCache.syncGridSelection(this.picker.picklist);
        }

        this.mouseDragging = false;
        this.mouseDown     = false;
       
        this.render();
    };

    Viewer.prototype.handleMouseMove = function (event) {
        event.preventDefault();

        if (!this.mouseDown)
            return;

        this.mouseDragging = true;
        this.mouseX   = event.pageX;
        this.mouseY   = event.pageY;
        this.shiftKey = event.shiftKey;
        this.ctrlKey  = event.ctrlKey;

        var deltaX = this.mouseX - this.mouseLastX;
        var deltaY = this.mouseY - this.mouseLastY;

        this.mouseLastX = this.mouseX;
        this.mouseLastY = this.mouseY;

        if (this.camera.type == 0) {
            if (this.mouseButton == 0) {
                if (this.shiftKey)
                    this.camera.pan((deltaX / this.canvas.width), (deltaY / this.canvas.height));
                else
                    this.camera.orbit(deltaX, deltaY);

                this.render();
            }
        }
    };

    Viewer.prototype.handleMouseLeave = function (event) {
        this.mouseDragging = false;
        this.mouseDown     = false;
    };

    Viewer.prototype.handleKeyDown = function (event) {        
        this.ctrlKey  = event.ctrlKey;
        this.shiftKey = event.shiftKey;

        var key = event.keyCode;

        if (this.zoomDirection == 0) {
            // + key zooms in
            if (key == 107) {
                this.zoomDirection = 1;
                this.handleZoomPress();
            }

            // - key zooms out
            if (key == 109) {
                this.zoomDirection = -1;
                this.handleZoomPress();
            }
        }

        if (this.ctrlKey && key == 79) { // O
            this.camera.toggleCameraMode();
            this.toggleOrthoWarning();
            this.render();
            event.preventDefault();
            event.stopPropagation();
        }

        //if (this.ctrlKey) {
        //    if (key == 50) { // ctrl + 2
        //        this.switchMode(1); // walk
        //        event.preventDefault();
        //        event.stopPropagation();
        //    }

        //    if (key == 55) { // ctrl + 7
        //        this.switchMode(0); // orbit
        //        event.preventDefault();
        //        event.stopPropagation();
        //    }
        //}                

        // if in walk mode, update amounts by which to walk
        //if (key >= 37 && key <= 40) {

        //    if (key == 37) this.arrowLeftKey  = true;
        //    if (key == 38) this.arrowUpKey    = true;
        //    if (key == 39) this.arrowRightKey = true;
        //    if (key == 40) this.arrowDownkey  = true;

        //    event.preventDefault();
        //}

        // check for viewpoint switches
        if (this.ctrlKey && !this.shiftKey) {
            var camera = this.camera;

            if (key == 96)         { camera.setViewPoint(camera.VIEWPOINT_BOTTOM);          // 0
            } else if (key == 97)  { camera.setViewPoint(camera.VIEWPOINT_TOP_FRONT_LEFT);  // 1
            } else if (key == 98)  { camera.setViewPoint(camera.VIEWPOINT_FRONT);           // 2
            } else if (key == 99)  { camera.setViewPoint(camera.VIEWPOINT_TOP_FRONT_RIGHT); // 3
            } else if (key == 100) { camera.setViewPoint(camera.VIEWPOINT_LEFT);            // 4
            } else if (key == 101) { camera.setViewPoint(camera.VIEWPOINT_TOP);             // 5
            } else if (key == 102) { camera.setViewPoint(camera.VIEWPOINT_RIGHT);           // 6
            } else if (key == 103) { camera.setViewPoint(camera.VIEWPOINT_TOP_BACK_LEFT);   // 7
            } else if (key == 104) { camera.setViewPoint(camera.VIEWPOINT_BACK);            // 8
            } else if (key == 105) { camera.setViewPoint(camera.VIEWPOINT_TOP_BACK_RIGHT);  // 9
            }

            if(key >= 96 && key <= 105) {                
                this.render();
                event.preventDefault();
                event.stopPropagation();
            }
        }

        // tab key toggles x-ray mode
        if (key == 9) {
            if (this.canHandleTab()) {
                event.preventDefault();
                event.stopPropagation();
                this.toggleIsolationMode();
            }
        }

        // page up, page down walks the list of selections
        if (key == 33 || key == 34) {            
            this.isExtentZoomed = key == 33 ? false : true;            
            this.zoomExtents();
            event.preventDefault();
            event.stopPropagation();
        }

        // home key - go to home viewpoint
        if (key == 36) {
            this.camera.goHome();
            this.render();
            event.preventDefault();
            event.stopPropagation();
        }

        if ((this.camera.type == 0 && this.shiftKey) || (this.camera.type == 1 && this.ctrlKey))
            this.$canvas.css("cursor", "move");
    };

    Viewer.prototype.handleKeyUp = function (event) {
        this.ctrlKey  = event.ctrlKey;
        this.shiftKey = event.shiftKey;

        if ((this.camera.type == 0 && !this.shiftKey) || (this.camera.type == 1 && !this.ctrlKey))
            this.$canvas.css("cursor", this.defaultCursor);

        var key = event.keyCode;

        // escape key unselects all
        if (key == 27) {
            event.preventDefault();
            this.clearCurrentSelections();
            assemble.grid.selectionCache.syncGridSelection([]);
            this.render();
        }

        // unset zoom if let go of +/-
        if (key == 107 || key == 109) {
            event.preventDefault();
            this.zoomDirection = 0;            
        }        

        // arrows
        if (key >= 37 && key <= 40) {

            if (key == 37) this.arrowLeftKey  = false;
            if (key == 38) this.arrowUpKey    = false;
            if (key == 39) this.arrowRightKey = false;
            if (key == 40) this.arrowDownkey  = false;

            event.preventDefault();
        }
    };

    Viewer.prototype.handleGridSelectionChanged = function (memo) {
        memo = memo || {};
        if (memo.skipHeaderUpdate) return;

        var selected = assemble.grid.selectionCache.getSelectedInstances();
        var hasSelections = !!selected.length;

        if (!hasSelections) {
            this.clearCurrentSelections();
        }
        else {
            var id = 0;

            this.clearCurrentSelections();

            for (var i = 0; i < selected.length; i++) {
                id = parseInt(selected[i]);
                this.picker.addPick(id);
                this.setInstanceSelection(id, true);
            }
        }

        this.render();
    };

    Viewer.prototype.handleResize = function (event) {     
        if (!this.isViewerActive()) return;

        this.updateCanvas();
        this.picker.setupTexture(true);
        this.render();
        this.updateProgressBarLocation();
    };

    Viewer.prototype.handleGeometryLoaded = function () {        
        this.render();        
        this.showProgress(false);
        this.initNavControls();

        //has the grid finished loading yey
        if (assemble.grid.initialized) {
            this.handleGridSelectionChanged();
        }
    };

    Viewer.prototype.handleGeometryReceived = function () {
        var progress = 0;

        if (!this.isViewerActive()) {
            this.model.cancelDownload = true;
            this.setGLState();
            return;
        }

        if (this.model.totalBytesToLoad == 0)
            return;

        //var percent = Math.round( ((this.model.totalBytes / this.model.totalBytesToLoad) * 0.5 * 100) ); // for use with geometry batch as the other 50%
        var percent = Math.round(((this.model.totalBytes / this.model.totalBytesToLoad) * 100));

        this.showProgress(true);
        this.updateProgress(percent);
    };

    Viewer.prototype.handleGeometryBatched = function () {
        // this is for progress during geometry batching (peformance buffer batches)
        var percent = Math.round((0.5 + (this.model.batchNum / this.model.batchCount * 0.5)) * 100);
        
        //setTimeout(this.updateProgress, 50, percent);
        this.updateProgress(percent);
    };

    Viewer.prototype.handleGridDataFiltered = function () {
        this.model.updateSortedIncludedGeometries();
        this.model.updateBatchBuffers();
        this.picker.clearPicks();
        this.render();
    };

    Viewer.prototype.handleZoomPress = function () {
        if (this.zoomDirection == 0)
            return;

        this.updateZoom(this.zoomDirection);

        var self = this;
        setTimeout(function () { self.handleZoomPress.call(self) }, 100);
    };

    Viewer.prototype.performWalk = function () {

        if (!this.mouseDown && !this.arrowDownkey && !this.arrowLeftKey && !this.arrowRightKey && !this.arrowUpKey)
            return;

        var deltaX      = 0;
        var deltaY      = 0;
        var dollyDir    = 0;
        var spinDir     = 0;
        var dollyAmount = 0;
        var spinAmount  = 0;

        var scale = this.camera.modelSize / 100;

        if(this.mouseDown && this.mouseButton == 0){
            deltaY = this.mouseY - this.mouseDownY;
            deltaX = this.mouseX - this.mouseDownX;

            dollyDir    = deltaY > 0 ? -1 : 1;
            spinDir     = deltaX > 0 ? -1 : 1;            

            dollyAmount = 5 * deltaY / (this.canvas.width / 2);
            spinAmount  = scale * deltaX / this.canvas.height;

            if (dollyAmount < 0) dollyAmount = -dollyAmount;
            if (spinAmount  < 0) spinAmount  = -spinAmount;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                dollyDir    = 0; // don't dolly if they are trying to spin
                dollyAmount = 0;
            }
            else {
                spinDir    = 0; // don't spin if they are trying to dolly
                spinAmount = 0;
            }
        }
        
        if (this.arrowUpKey)    dollyDir =  1;
        if (this.arrowDownkey)  dollyDir = -1;
        if (this.arrowLeftKey)  spinDir  =  1;
        if (this.arrowRightKey) spinDir  = -1;

        if (this.arrowUpKey   || this.arrowDownkey)  dollyAmount = 3.0;
        if (this.arrowLeftKey || this.arrowRightKey) spinAmount  = 0.3;
                
        // scale amounts by time
        dollyAmount = this.animRenderDelta * dollyAmount / 1000;
        spinAmount  = this.animRenderDelta * spinAmount  / 1000;

        if (this.ctrlKey) {
            this.camera.pan(-(deltaX / this.canvas.width), -(deltaY / this.canvas.height));
        }
        else {
            if (dollyDir != 0) this.camera.dolly(dollyAmount * dollyDir);
            if (spinDir  != 0) this.camera.spin(spinAmount   * spinDir);
        }
    };

    Viewer.prototype.renderLoop = function () {

        if (this.camera.type == 1)
            assemble.ViewerUtility.requestAnimFrame(this.renderLoop.bind(this));
        
        var now = Date.now();
        this.animRenderDelta = now - this.lastRenderTime;
        this.lastRenderTime  = now;

        this.render();
    };

    Viewer.prototype.switchMode = function (mode) {
        if (mode == 0) { // orbit
            this.camera.setType(0);
            this.defaultCursor = "default";
        }
        else if (mode == 1) { // walk
            this.camera.setType(1);
            this.renderLoop();
            this.defaultCursor = "default";
        }
    };

    Viewer.prototype.updateCamera = function () {
        if (this.camera.type === 1) {// walk
            this.performWalk();
        }
    };

    Viewer.prototype.updateCanvas = function () {
        var w = this.$canvas.width();
        var h = this.$canvas.height();

        this.$canvas.attr("width",  w);
        this.$canvas.attr("height", h);

        this.aspectRatio = w / h;
    };

    Viewer.prototype.clearCurrentSelections = function () {
        this.clearInstanceSelections(this.picker.picklist);
        this.picker.clearPicks();
    };

    Viewer.prototype.clearInstanceSelections = function (ids) {
        for (var i = 0; i < ids.length; i++)
            this.setInstanceSelection(ids[i], false);
    };

    Viewer.prototype.setInstanceSelection = function (id, isSelected) {
        var map = this.model.vboAttribSelectionsMap[id];

        if (map === undefined) {
            console.error("setInstanceSelection failed to get map for id: " + id);
            return;
        }

        var start = map.offset;
        var end   = start + map.length;
        var selectionsArray = this.model.vboAttribSelections[map.bufferIdx];

        for (var i = start; i < end; i++)
            selectionsArray[i] = isSelected ? 1 : 0;

        var bufferObject = this.model.vboAttribSelectionsBO[map.bufferIdx];
        var gl = this.gl;

        if (bufferObject == null) {
            bufferObject = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject);
            gl.bufferData(gl.ARRAY_BUFFER, selectionsArray, gl.DYNAMIC_DRAW);
        } else {
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, selectionsArray);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        this.model.vboAttribSelectionsBO[map.bufferIdx] = bufferObject;
    };

    Viewer.prototype.updateProgressBarLocation = function () {
        var $pc = $("#"+ this.progressContainerId);

        var W = this.$canvas.width();
        var H = this.$canvas.height();
        var w = $pc.width();
        var h = $pc.height();

        $pc.css("left", Math.round((W - w) / 2));
        $pc.css("top",  Math.round((H - h) / 2));
    };

    Viewer.prototype.showProgress = function (show) {
        if (show) {
            this.updateProgressBarLocation();
            $("#"+ this.progressContainerId).show();
            $("#"+ this.progressBarId).width("0%");
        }
        else
            $("#"+ this.progressContainerId).hide();
    };

    Viewer.prototype.updateProgress = function (percent) {
        
        $("#"+ this.progressBarId).width(percent + "%");
    };
        
    Viewer.prototype.updateZoom = function (zoomDirection) {        
        this.camera.dolly(zoomDirection);

        this.render();
    };

    Viewer.prototype.toggleIsolationMode = function () {
        this.isolationMode = !this.isolationMode;
        this.render();
    };

    Viewer.prototype.hasPopout = function () {
        if (!this.popoutWin || this.popoutWin.closed)
            return false;

        return true;
    };

    Viewer.prototype.openPopout = function () {
        this.popoutWin = window.open("/visualization/popout", self.canvasId + "_popout");
    };

    Viewer.prototype.closePopout = function () {
        if (!this.popoutWin)
            return;

        this.popoutWin.close();
    };

    Viewer.prototype.refreshPopout = function () {
        if (!this.popoutWin)
            return;

        if (this.isCompare())
            this.closePopout();
        else {
            try {
                this.popoutWin.Refresh();
            } catch (e) { }
        }
    };

    Viewer.prototype.geometryLoaded = function () {
        return this.model.geometryLoaded;
    };

    Viewer.prototype.initFromGeometry = function (geometry) {
        this.model.initFromGeometry(geometry);
    };

    Viewer.prototype.isCompare = function () {
        return assemble.explorer.view.modelView.currentView.isCompare();
    };

    Viewer.prototype.isViewerActive = function () {
        if (!assemble.explorer.view.modelView.currentView.viewer)
            return false;

        return assemble.explorer.view.modelView.currentView.viewer.ctx.modelVersionId == this.ctx.modelVersionId;
    };

    Viewer.prototype.zoomExtents = function () {
        var selectedInstancesDiagonal = null;

        if (!this.isExtentZoomed || this.picker.picklist.length == 0) {// up - model
            selectedInstancesDiagonal = this.model.modelDiagonal;
            
            if (this.picker.picklist.length == 0)
                this.isExtentZoomed = false;
        }
        else {// down - selected instance(s)
            selectedInstancesDiagonal = this.model.getSelectedExtentsDiagonal();

            if (!selectedInstancesDiagonal.set) {
                selectedInstancesDiagonal = this.model.modelDiagonal;
                this.isExtentZoomed = false;
            }
        }
        
        this.camera.dollyToExtents(selectedInstancesDiagonal);
        this.render();
    };

    Viewer.prototype.getKeyboardActionsText = function () {
        var s = [];

        var keyboard = 
            [
                { shortcut: "NUMPAD +", command: "Zoom In" },
                { shortcut: "NUMPAD -", command: "Zoom Out" },
                { shortcut: "CTRL + NUMPAD 0", command: "Viewpoint Bottom" },
                { shortcut: "CTRL + NUMPAD 1", command: "Viewpoint Top Front Left" },
                { shortcut: "CTRL + NUMPAD 2", command: "Viewpoint Front" },
                { shortcut: "CTRL + NUMPAD 3", command: "Viewpoint Top Front Right" },
                { shortcut: "CTRL + NUMPAD 4", command: "Viewpoint Left" },
                { shortcut: "CTRL + NUMPAD 5", command: "Viewpoint Top" },
                { shortcut: "CTRL + NUMPAD 6", command: "Viewpoint Right" },
                { shortcut: "CTRL + NUMPAD 7", command: "Viewpoint Top Back Left" },
                { shortcut: "CTRL + NUMPAD 8", command: "Viewpoint Back" },
                { shortcut: "CTRL + NUMPAD 9", command: "Viewpoint Top Back Right" },
                { shortcut: "TAB", command: "Toggle X-Ray Mode" },
                { shortcut: "ESCAPE", command: "Unselect All" },
                { shortcut: "PAGE UP", command: "Zoom Model Extents" },
                { shortcut: "PAGE DOWN", command: "Zoom Selection Extents" },
                { shortcut: "HOME", command: "Go to Home Viewpoint" },
                { shortcut: "CTRL + O", command: "Toggle Orthographic Mode" }
            ];

        var mouse =
            [
                { shortcut: "MOUSE WHEEL", command: "Zoom In / Out" },
                { shortcut: "LEFT MOUSE BUTTON (click)", command: "Select Instance" },
                { shortcut: "LEFT MOUSE BUTTON + CTRL (click)", command: "Multi-Select Instances" },
                { shortcut: "LEFT MOUSE BUTTON (drag)", command: "Rotate/Orbit model" },
                { shortcut: "LEFT MOUSE BUTTON + SHIFT (drag)", command: "Pan" }
            ];

        var table = function (t, a, s) {
            s.push("<table class='viewerHelpTable'>");
            s.push("<tr><td colspan=2 class='viewerHelpHeader'>"+ t +"</td></tr>");
            for (var i = 0; i < a.length; i++)
                s.push("<tr><td class='shortcut'>" + a[i].shortcut + "</td><td>" + a[i].command + "</td></tr>");
            s.push("</table>");
        };

        table("Keyboard", keyboard, s);
        table("Mouse", mouse, s);

        return s.join("");
    };

    Viewer.prototype.toggleOrthoWarning = function () {
        if (this.camera.isPerspective)
            $("#" + this.orthoWarningId).hide();
        else
            $("#" + this.orthoWarningId).show();
    };    

    Viewer.prototype.canHandleTab = function () {
        return $("#" + this.canvasId).is(":hover") || $("#takeoff_grid_container").is(":hover");
    };

    Viewer.prototype.makeInvalid = function () {
        var gl = this.gl;
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        this.valid = false;
    };

    Viewer.prototype.makeValid = function () {        
        this.valid = true;
    };

    assemble.Viewer = Viewer;

}(window.assemble, jQuery));
