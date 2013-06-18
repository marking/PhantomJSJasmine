
(function (assemble, $) {

    function Camera() {
        this.MAX_PITCH = Math.PI - 0.00001;
        this.MIN_PITCH = 0.00001;
        this.yaw = 0.82;
        this.pitch = 1.27;  //rotation about x-axis (pi/2 = 1.57)
        this.home = null;
        this.type = 0; // 1 = walk, 0 = orbit
        this.fov = 0.45;
        this.orthoZoomFactor = 1;
        this.isPerspective = true;

        this.orbitDistance = null;
        this.orbitCenter = null;
        this.lookAt = [0,0,0];
        this.eye = [0, 0, 0];
        this.aspectRatio = 1.0;
        this.dollyInc = null;
        this.spinAmount = 0;
        this.modelSize = null;
        this.homeDiagonal = null;
        this.extentsDiagonal = null;

        this.VIEWPOINT_BOTTOM = 0;
        this.VIEWPOINT_TOP_FRONT_LEFT = 1;
        this.VIEWPOINT_FRONT = 2;
        this.VIEWPOINT_TOP_FRONT_RIGHT = 3;
        this.VIEWPOINT_LEFT = 4;
        this.VIEWPOINT_TOP = 5;
        this.VIEWPOINT_RIGHT = 6;
        this.VIEWPOINT_TOP_BACK_LEFT = 7;
        this.VIEWPOINT_BACK = 8;
        this.VIEWPOINT_TOP_BACK_RIGHT = 9;

        this.viewPoints = [];
        this.initViewPoints();

        this.modelViewMat = mat4.create();
        this.projectionMat = mat4.create();
        this.cameraMat = mat4.create();
        this.up = [0, 0, 1];
        //this.right = [1, 0, 0];
    }

    Camera.prototype.initViewPoints = function () {
        var v = this.viewPoints;
        var pi = Math.PI;
        var top = pi * 0.35;
        var side = pi * 0.50;

        v[this.VIEWPOINT_BOTTOM] = { yaw: 0.0, pitch: pi };
        v[this.VIEWPOINT_TOP_FRONT_LEFT] = { yaw: pi * 0.25, pitch: top };
        v[this.VIEWPOINT_FRONT] = { yaw: pi * 0.50, pitch: side };
        v[this.VIEWPOINT_TOP_FRONT_RIGHT] = { yaw: pi * 0.75, pitch: top };
        v[this.VIEWPOINT_LEFT] = { yaw: pi * 0.00, pitch: side };
        v[this.VIEWPOINT_TOP] = { yaw: 0.0, pitch: this.MIN_PITCH };
        v[this.VIEWPOINT_RIGHT] = { yaw: pi * 1.00, pitch: side };
        v[this.VIEWPOINT_TOP_BACK_LEFT] = { yaw: pi * 1.25, pitch: top };
        v[this.VIEWPOINT_BACK] = { yaw: pi * 1.50, pitch: side };
        v[this.VIEWPOINT_TOP_BACK_RIGHT] = { yaw: pi * 1.75, pitch: top };
    };

    //#region model projection onto sphere with orbit center and orbit distance calculations

    Camera.prototype.zoomDiagonal = function (d) {

        var points = this.calculateOrbitCenter(d);
        this.zoomPoints(points);
        this.resetSpinAmount();

        this.update();
    };

    //Calculates center of model (in model coordinate system) and extracts points on bounding box (cube)
    Camera.prototype.calculateOrbitCenter = function (d) {
        if (this.modelSize === null)
            this.modelSize = d.length();

        var minVec = [d.minX, d.minY, d.minZ];
        var maxVec = [d.maxX, d.maxY, d.maxZ];

        this.orbitCenter = assemble.ViewerUtility.avgVec3(minVec, maxVec);

        this.eye[0] = this.lookAt[0] = this.orbitCenter[0];
        this.eye[1] = this.lookAt[1] = this.orbitCenter[1];
        this.eye[2] = this.lookAt[2] = this.orbitCenter[2];
        
        var points = []; //points in the bounding box

        for (var i = 0; i < 8; i++) {
            var x = i & 1 ? d.minX : d.maxX;
            var y = i & 2 ? d.minY : d.maxY;
            var z = i & 4 ? d.minZ : d.maxZ;

            points.push([x, y, z]);
        }

        return points;
    };

    Camera.prototype.zoomPoints = function (points) {
        var max = 0;

        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            max = Math.max(max, this.fitPoint(p[0], p[1], p[2]));
        }

        this.orbitDistance = max;
        this.dollyInc = this.orbitDistance / 30;
    };

    Camera.prototype.fitPoint = function (x, y, z) {
        var a = this.yaw;
        var b = this.pitch;
        var c = this.aspectRatio;
        var ox = this.orbitCenter[0];
        var oy = this.orbitCenter[1];
        var oz = this.orbitCenter[2];
        var c1 = 25 * (2 * Math.PI) / 360; //  why 25?
        var c2 = 0.9;

        var d1 =
        (
            (
                Math.sqrt(Math.pow(Math.sin(a), 2) + Math.pow(Math.cos(a), 2))
                    * (
                        (c * x * Math.sin(a) * Math.sin(b) * Math.abs(Math.sin(b))) +
                            (c * y * Math.sin(b) * Math.cos(a) * Math.abs(Math.sin(b)) * (-1)) +
                            (c * z * Math.cos(b) * Math.abs(Math.sin(b))) +
                            (c * ox * Math.sin(a) * Math.sin(b) * Math.abs(Math.sin(b)) * (-1)) +
                            (c * oy * Math.sin(b) * Math.cos(a) * Math.abs(Math.sin(b))) +
                            (c * oz * Math.cos(b) * Math.abs(Math.sin(b)) * (-1))
                    )
                    * c2
                    * Math.sin(c1 * (1 / 2))
            )
                + (
                    (
                        (x * Math.sin(b) * Math.cos(a))
                            + (y * Math.sin(a) * Math.sin(b))
                            + (ox * Math.sin(b) * Math.cos(a) * (-1))
                            + (oy * Math.sin(a) * Math.sin(b) * (-1))
                    )
                        * Math.cos(c1 * (1 / 2))
                )
        )
            * Math.pow(c, -1)
            * Math.pow(c2, -1)
            * Math.pow(Math.sin(c1 * (1 / 2)), -1)
            * Math.pow(Math.abs(Math.sin(b)), -1);

        var d2 = (((Math.pow((Math.pow(Math.sin(a), 2)) + (Math.pow(Math.cos(a), 2)), 1 / 2)) * (((c) * (x) * (Math.sin(a)) * (Math.sin(b)) * (Math.abs(Math.sin(b)))) + ((c) * (y) * (Math.sin(b)) * (Math.cos(a)) * (Math.abs(Math.sin(b))) * (-1)) + ((c) * (ox) * (Math.sin(a)) * (Math.sin(b)) * (Math.abs(Math.sin(b))) * (-1)) + ((c) * (oy) * (Math.sin(b)) * (Math.cos(a)) * (Math.abs(Math.sin(b)))) + ((c) * (z) * (Math.cos(b)) * (Math.abs(Math.sin(b)))) + ((c) * (oz) * (Math.cos(b)) * (Math.abs(Math.sin(b))) * (-1))) * (c2) * (Math.sin((c1) * (1 / 2)))) + ((((x) * (Math.sin(b)) * (Math.cos(a))) + ((y) * (Math.sin(a)) * (Math.sin(b))) + ((ox) * (Math.sin(b)) * (Math.cos(a)) * (-1)) + ((oy) * (Math.sin(a)) * (Math.sin(b)) * (-1))) * (Math.cos((c1) * (1 / 2))) * (-1))) * (Math.pow(c, -1)) * (Math.pow(c2, -1)) * (Math.pow(Math.sin((c1) * (1 / 2)), -1)) * (Math.pow(Math.abs(Math.sin(b)), -1));
        var d3 = (((Math.pow((Math.pow(Math.sin(a), 2)) + (Math.pow(Math.cos(a), 2)), 1 / 2)) * (Math.pow((((Math.pow(Math.sin(a), 2)) + (Math.pow(Math.cos(a), 2))) * (Math.pow(Math.sin(b), 2))) + (Math.pow(Math.cos(b), 2)), 1 / 2)) * (((x) * (Math.sin(a)) * (Math.sin(b)) * (Math.abs(Math.sin(b)))) + ((y) * (Math.sin(b)) * (Math.cos(a)) * (Math.abs(Math.sin(b))) * (-1)) + ((ox) * (Math.sin(a)) * (Math.sin(b)) * (Math.abs(Math.sin(b))) * (-1)) + ((oy) * (Math.sin(b)) * (Math.cos(a)) * (Math.abs(Math.sin(b)))) + ((z) * (Math.cos(b)) * (Math.abs(Math.sin(b)))) + ((oz) * (Math.cos(b)) * (Math.abs(Math.sin(b))) * (-1))) * (c2) * (Math.sin((c1) * (1 / 2)))) + (((((Math.pow(Math.sin(a), 2)) + (Math.pow(Math.cos(a), 2))) * (z) * (Math.pow(Math.sin(b), 2))) + (((Math.pow(Math.sin(a), 2)) + (Math.pow(Math.cos(a), 2))) * (oz) * (Math.pow(Math.sin(b), 2)) * (-1)) + ((ox) * (Math.sin(a)) * (Math.sin(b)) * (Math.cos(b)) * (-1)) + ((y) * (Math.sin(b)) * (Math.cos(a)) * (Math.cos(b))) + ((ox) * (Math.sin(a)) * (Math.sin(b)) * (Math.cos(b))) + ((oy) * (Math.sin(b)) * (Math.cos(a)) * (Math.cos(b)) * (-1))) * (Math.cos((c1) * (1 / 2))))) * (Math.pow(c2, -1)) * (Math.pow(Math.sin((c1) * (1 / 2)), -1)) * (Math.pow(Math.abs(Math.sin(b)), -1));
        var d4 = (((Math.pow((Math.pow(Math.sin(a), 2)) + (Math.pow(Math.cos(a), 2)), 1 / 2)) * (Math.pow((((Math.pow(Math.sin(a), 2)) + (Math.pow(Math.cos(a), 2))) * (Math.pow(Math.sin(b), 2))) + (Math.pow(Math.cos(b), 2)), 1 / 2)) * (((x) * (Math.sin(a)) * (Math.sin(b)) * (Math.abs(Math.sin(b)))) + ((y) * (Math.sin(b)) * (Math.cos(a)) * (Math.abs(Math.sin(b))) * (-1)) + ((ox) * (Math.sin(a)) * (Math.sin(b)) * (Math.abs(Math.sin(b))) * (-1)) + ((oy) * (Math.sin(b)) * (Math.cos(a)) * (Math.abs(Math.sin(b)))) + ((z) * (Math.cos(b)) * (Math.abs(Math.sin(b)))) + ((oz) * (Math.cos(b)) * (Math.abs(Math.sin(b))) * (-1))) * (c2) * (Math.sin((c1) * (1 / 2)))) + (((((Math.pow(Math.sin(a), 2)) + (Math.pow(Math.cos(a), 2))) * (z) * (Math.pow(Math.sin(b), 2))) + (((Math.pow(Math.sin(a), 2)) + (Math.pow(Math.cos(a), 2))) * (oz) * (Math.pow(Math.sin(b), 2)) * (-1)) + ((ox) * (Math.sin(a)) * (Math.sin(b)) * (Math.cos(b)) * (-1)) + ((y) * (Math.sin(b)) * (Math.cos(a)) * (Math.cos(b))) + ((ox) * (Math.sin(a)) * (Math.sin(b)) * (Math.cos(b))) + ((oy) * (Math.sin(b)) * (Math.cos(a)) * (Math.cos(b)) * (-1))) * (Math.cos((c1) * (1 / 2))) * (-1))) * (Math.pow(c2, -1)) * (Math.pow(Math.sin((c1) * (1 / 2)), -1)) * (Math.pow(Math.abs(Math.sin(b)), -1));

        return Math.max(d1, d2, d3, d4);
    };

    //#endregion 

    Camera.prototype.setType = function (type) {
        this.type = type;
        
        this.resetSpinAmount();

        //this.updateLookAt();

        //if (this.type == 0) {
        //    this.orbitCenter[0] = this.lookAt[0];
        //    this.orbitCenter[1] = this.lookAt[1];
        //    this.orbitCenter[2] = this.lookAt[2];
        //} else {
        //    this.lookAt[0] = this.orbitCenter[0];
        //    this.lookAt[1] = this.orbitCenter[1];
        //    this.lookAt[2] = this.orbitCenter[2];
        //}        
        //console.log("center: " + this.orbitCenter.join(","));
        // + ", lookat: " + this.lookAt.join(","));
    };

    Camera.prototype.setAspectRatio = function (aspectRatio) {
        this.aspectRatio = aspectRatio;
    };

    Camera.prototype.pan = function(deltaX, deltaY) {
        var distance = Math.abs(this.orbitDistance);
        var mat = mat4.create(); //new identity matrix
        mat4.rotate(mat, mat, this.yaw, vec3.fromValues(0, 0, 1));
        mat4.rotate(mat, mat, this.pitch, vec3.fromValues(1, 0, 0));

        if (distance < 1) distance = this.dollyInc;

        var sx = 2 * (distance * Math.tan(this.fov * 0.5)) * this.aspectRatio;
        var sy = 2 * (distance * Math.tan(this.fov * 0.5));
        sx = deltaX * sx;
        sy = deltaY * sy;

        if (this.type == 0) {

            var n = [-sx, sy, 0, 0];

            vec4.transformMat4(n, n, mat);

            this.eye[0] += n[0];
            this.eye[1] += n[1];
            this.eye[2] += n[2];
        } else {
            
            //TODO: we might need a multiplier here.
            this.eye[0] -= deltaX;
            this.eye[1] += deltaY;            
        }
        
        this.update();
    };

    Camera.prototype.zoom = function (dir) {
        var delta = Math.PI / 180;
        this.fov -= delta * dir;

        if (this.fov < 0.0) this.fov = 0.01;
        if (this.fov > Math.PI / 2) this.fov = Math.PI / 2;

        this.update();
    };

    Camera.prototype.dolly = function (amount) {
        this.orbitDistance -= amount * this.dollyInc;
        //this.orbitDistance -= amount * this.dollyInc * Math.pow(8 * this.orbitDistance / this.dollyInc, 0.25);
        //this.orbitDistance = Math.max(this.dollyInc, this.orbitDistance);
        this.orbitDistance = Math.min(this.modelSize * 5, this.orbitDistance);

        
        var sign = amount > 0 ? 1 : -1;
        var length = this.extentsDiagonal.length();
        var fraction = 0.05;
        var min = length * fraction;
        this.orthoZoomFactor -= length * fraction * sign;

        if (this.orthoZoomFactor < min)
            this.orthoZoomFactor = min;

        this.update();
    };

    Camera.prototype.dollyToExtents = function (extentsDiagonal) {
        this.fov = this.home.fov;
        this.zoomDiagonal(extentsDiagonal);
        this.extentsDiagonal = extentsDiagonal;

        this.orbitDistance *= 1.25;

        if(this.orbitDistance < 1)
            this.orbitDistance = 1.25;

        this.orthoZoomFactor = this.extentsDiagonal.length() * 0.8;
    };

    Camera.prototype.spin = function (amount) {
        this.spinAmount += amount;        
        this.yaw -= amount;
        this.update();
    };

    //#region notes on rotation
    /* 
        Note: Matrices are column-major

        Rotations:

        Any 3D rotation can be described as a sequence of yaw, pitch, and roll
        Here we don't care about the roll,  yaw rotates about the up axis (eg. z),
        pitch rotates about the right axis (eg. x)
   
        yaw = counterclockwise rotation around z

        (4x4)  Rz(angle) =
            cos angle       sin angle       0       0
            -sin angle      cos angle       0       0
            0               0               1       0
            0               0               0       1

        pitch = counterclockwise rotation around x

        (4x4) Ry(angle) =
            cos angle       0           -sin angle      0
            0               1           0               0
            sin angle       0           cos angle       0
            0               0           0               1
             
        matrix = identity;
        mat4.rotateZ(matrix, matrix, this.yaw);                
        mat4.rotateX(matrix, matrix, this.pitch);
        
        is the same as:

        var x =  Math.sin(this.yaw) * Math.sin(this.pitch)
        var y = -Math.cos(this.yaw) * Math.sin(this.pitch)
        var z =  Math.cos(this.pitch)

        but the latter mitigates "matrix drift" that results from the more floating point multiplications. 
    */
    //#endregion
    
    //0.01 = rotation speed
    Camera.prototype.orbit = function (xdelta, ydelta) {
        this.yaw -= xdelta * 0.01;
        this.pitch -= ydelta * 0.01;
        this.pitch = Math.min(this.MAX_PITCH, this.pitch);
        this.pitch = Math.max(this.MIN_PITCH, this.pitch);
        this.update();
    };

    //#region model-view transform

    /*
        WIP (HD):
        I really want to get this to work with look-at transformation, but I need to experiment with third
        person versus first person camera reference.
        Look At matrix transforms the points in world coordinates to points
        in the viewing coordinates wiht the eye at the origin (for orbiting camera)
        or the orbitCenter at the origin (for the walking camera).  
        The look at matrix creation is preferred to a series of rotations and translations.        
    */

    //update the modelViewMatrix (really the inverse of it)
    Camera.prototype.update = function () {
        if (this.type == 1) {

            mat4.identity(this.modelViewMat);            
            mat4.translate(this.modelViewMat, this.modelViewMat, this.eye);
            mat4.rotateZ(this.modelViewMat, this.modelViewMat, this.yaw);
            mat4.rotateX(this.modelViewMat, this.modelViewMat, this.pitch);
                        
        } else {

            mat4.identity(this.modelViewMat);
            //TODO: update translation (eye) to take-in mouse coordinates
            mat4.translate(this.modelViewMat, this.modelViewMat, this.eye);
            mat4.rotateZ(this.modelViewMat, this.modelViewMat, this.yaw);
            mat4.rotateX(this.modelViewMat, this.modelViewMat, this.pitch);
            
            //update the position
            this.eye[0] = this.modelViewMat[12];
            this.eye[1] = this.modelViewMat[13];
            this.eye[2] = this.modelViewMat[14];
        }
    };
    
    //#endregion

    // #region WIP (HD): HD's experiment with first person movement ;)
    Camera.prototype.move = function (direction) {
        //update camera position
        var yawRotation = mat4.create();
        mat4.rotateZ(yawRotation, yawRotation, this.yaw); 
        //move position by magnitude = move speed 
        var movespeed = 25;
        
        //update camera position
        var dir = [0, 0, 0];
        
        switch (direction) {
            case "back":  //"S"
                dir[1] -= 1;
                //this.eye[0] += Math.cos(this.yaw)*movespeed;
                //this.eye[1] += Math.sin(this.yaw)*movespeed;
                //vec3.transformMat4(dir, dir, yawRotation);
                break;
            case "forward": //"W"
                dir[1] += 1;
                break;
            case "left":  //"A"
                dir[0] -= 1;
                //this.eye[0] -= Math.sin(this.yaw) * movespeed;
                //this.eye[1] += Math.cos(this.yaw) * movespeed;
                //vec3.transformMat4(dir, dir, yawRotation);
                break;
            case "right": //"D"
                dir[0] += 1;
                break;
        }

        if (dir[0] !== 0 || dir[1] !== 0 || dir[2] !== 0) {
            mat4.identity(this.cameraMat);
            mat4.rotateZ(this.cameraMat, this.yaw);
            mat4.invert(this.cameraMat, this.cameraMat);
            vec3.transformMat4(dir, dir, this.cameraMat);
        }

        //update camera position
        this.eye[0] += dir[0] * movespeed;
        this.eye[1] += dir[1] * movespeed;
        this.eye[2] += dir[2] * movespeed;
    };

    //#endregion 
    
    Camera.prototype.getViewMatrix = function () {
        if (this.orbitCenter === null) {
            console.warn("getViewMatrix called before diagonal established");
            return null;
        }

        var m = mat4.create();
        mat4.invert(m, this.modelViewMat);        

        if (this.isPerspective)
            m[14] -= this.orbitDistance;  //movin-on up..., the camera that is, like a satellite into space
        else
            m[14] -= this.home.orbitDistance;
        
        //#region commented: print-outs and look-at operation comparison
        /* 

        var result = mat4.create();

        var x = Math.sin(this.yaw) * Math.sin(this.pitch) * this.orbitDistance;
        var y = -Math.cos(this.yaw) * Math.sin(this.pitch) * this.orbitDistance;
        var z = Math.cos(this.pitch) * this.orbitDistance;

        mat4.lookAt(result,
            [this.orbitCenter[0] + x,
            this.orbitCenter[1] + y,
            this.orbitCenter[2] + z]            
            , this.orbitCenter, this.up);

        console.log("orbitDistance: " + this.orbitDistance);
        console.log("x,y,z " + [x, y, z].join(','));


        console.log("model-view transform:");
        for (var i = 0; i < 16; i++) {
            console.log("m[" + i + "] = " + m[i]);
        }

        console.log("look-out matrix:");
        for (var i = 0; i < 16; i++) {
            console.log("m[" + i + "] = " + result[i]);
        }
        */
        //#endregion
        
        return m;        
    };

    Camera.prototype.resetSpinAmount = function () {
        // make sure we have the right angle based on where we are looking
        this.spinAmount = Math.acos((this.lookAt[0] - this.eye[0]) / this.orbitDistance);
    };

    Camera.prototype.getProjectionMatrix = function () {
        var result = mat4.create();
        var near = this.orbitDistance / 1000;
        var far = this.modelSize * 5 + this.orbitDistance;

        if (near < 1)
            near = 1;

        if (this.isPerspective)
            mat4.perspective(result, this.fov, this.aspectRatio, near, far);
        else {
            var topBottom = this.orthoZoomFactor;
            var leftRight = this.orthoZoomFactor * this.aspectRatio;

            mat4.ortho(result, -leftRight, leftRight, -topBottom, topBottom, near, far);
        }

        return result;
    };

    Camera.prototype.unProject = function (point, viewport) {
        var dest = vec3.create();//output
        var m = mat4.create();//view * proj
        var im = mat4.create();//inverse view proj
        var v = vec4.create();//vector
        var tv = vec4.create();//transformed vector

        //apply viewport transform
        v[0] = (point[0] - viewport[0]) * 2.0 / viewport[2] - 1.0;
        v[1] = (point[1] - viewport[1]) * 2.0 / viewport[3] - 1.0;
        v[2] = point[2];
        v[3] = 1.0;

        //build and invert viewproj matrix
        mat4.multiply(m, this.modelViewMat, this.getProjectionMatrix());
        if (!mat4.invert(im, m)) { return []; }

        vec4.transformMat4(tv, v, im);
        if (v[3] === 0.0) { return []; }

        dest[0] = tv[0] / tv[3];
        dest[1] = tv[1] / tv[3];
        dest[2] = tv[2] / tv[3];

        //this.update();
        return dest;
    };

    Camera.prototype.setCurrentPositionAsHome = function (homeDiagonal) {
        var oc = this.orbitCenter;

        this.home =
        {
            orbitDistance: this.orbitDistance,
            orbitCenter: [oc[0], oc[1], oc[2]],
            modelDiagonal: homeDiagonal,
            dollyInc: this.dollyInc,
            pitch: this.pitch,
            yaw: this.yaw,
            fov: this.fov,
            orthoZoomFactor: homeDiagonal.length()
        };

        this.orthoZoomFactor = homeDiagonal.length();
        this.extentsDiagonal = homeDiagonal;
    };

    Camera.prototype.goHome = function () {
        var oc = this.home.orbitCenter;

        this.orbitDistance = this.home.orbitDistance;
        this.orbitCenter = [oc[0], oc[1], oc[2]];
        this.dollyInc = this.home.dollyInc;
        this.pitch = this.home.pitch;
        this.yaw = this.home.yaw;
        this.fov = this.home.fov;
        this.orthoZoomFactor = this.home.orthoZoomFactor;
        this.extentsDiagonal = this.home.modelDiagonal;

        this.zoomDiagonal(this.home.modelDiagonal);
        this.update();
    };

    Camera.prototype.setViewPoint = function (viewPoint) {
        var center = this.home.orbitCenter;
        var viewPoint = this.viewPoints[viewPoint];

        //this.orbitDistance = this.home.orbitDistance;
        this.orbitCenter = [center[0], center[1], center[2]];
        this.dollyInc = this.home.dollyInc;
        this.pitch = viewPoint.pitch;
        this.yaw = viewPoint.yaw;

        //this.zoomDiagonal(this.home.modelDiagonal);
        this.update();
    };

    Camera.prototype.toggleCameraMode = function () {
        this.isPerspective = !this.isPerspective;
    };

    assemble.Camera = Camera;

}(window.assemble, jQuery));// JavaScript source code
