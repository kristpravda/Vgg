'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

let point;
let texturePoint;
let scalingKoef;



function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.count = 0;
    this.countTexture = 0;

    this.BufferData = function (vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.TextureBufferData = function (normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        this.countTexture = normals.length / 2;
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexture);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }

    this.DisplayPoint = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    }
}

function CreateSphereSurface(r = 0.05) {
    let vertexList = [];
    let lon = -Math.PI;
    let lat = -Math.PI * 0.5;
    while (lon < Math.PI) {
        while (lat < Math.PI * 0.5) {
            let v1 = sphereSurfaceData(r, lon, lat);
            vertexList.push(v1.x, v1.y, v1.z);
            lat += 0.05;
        }
        lat = -Math.PI * 0.5;
        lon += 0.05;
    }
    return vertexList;
}

function sphereSurfaceData(r, u, v) {
    let x = r * Math.sin(u) * Math.cos(v);
    let y = r * Math.sin(u) * Math.sin(v);
    let z = r * Math.cos(u);
    return { x: x, y: y, z: z };
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribTexture = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.iTranslatePoint = -1;
    this.iTexturePoint = -1;
    this.iScalingKoef = -1;
    this.iTMU = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();
    let backPlaneView = m4.identity();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let bPRotate = m4.axisRotation([0.707, 0.707, 0], 0.0);
    let translateToPointZero = m4.translation(0, 0, -10);
    let bPTranslate = m4.translation(-0.5, -0.5, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
    let bPMat0 = m4.multiply(bPRotate, backPlaneView);
    let bPMat1 = m4.multiply(bPTranslate, bPMat0);
    let bPMat2 = m4.multiply(m4.scaling(4, 4, 1), bPMat1);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);


    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);

    gl.uniform1i(shProgram.iTMU, 0);
    gl.enable(gl.TEXTURE_2D);
    gl.uniform2fv(shProgram.iTexturePoint, [texturePoint.x, texturePoint.y]);
    gl.uniform1f(shProgram.iScalingKoef, scalingKoef);
    gl.bindTexture(gl.TEXTURE_2D, vTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        video
    );
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, bPMat2);
    backPlane.Draw();
    let tangibleMat = m4.multiply(m4.axisRotation([0, 1, 0], -0.5 * Math.PI * accelerometer.x * 0.1), m4.axisRotation([1, 0, 0], 0.5 * Math.PI * accelerometer.y * 0.1));
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, m4.multiply(matAccum1, tangibleMat));
    gl.bindTexture(gl.TEXTURE_2D, texture);
    cam.Param();
    cam.ApplyLeftFrustum();
    gl.colorMask(false, true, true, false);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, cam.mProjectionMatrix);
    surface.Draw();
    gl.clear(gl.DEPTH_BUFFER_BIT);
    cam.ApplyRightFrustum();
    gl.colorMask(true, false, false, false);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, cam.mProjectionMatrix);
    surface.Draw();
    gl.colorMask(true, true, true, true);
    // let tr = AstroidalTorus(map(texturePoint.x, 0, 1, 0, Math.PI * 2), map(texturePoint.y, 0, 1, 0, Math.PI * 2))
    // gl.uniform3fv(shProgram.iTranslatePoint, [tr.x, tr.y, tr.z]);
    // gl.uniform1f(shProgram.iScalingKoef, -scalingKoef);
    // point.DisplayPoint();
}

function reDraw() {
    draw()
    window.requestAnimationFrame(reDraw);
}

function CreateSurfaceData() {
    let vertexList = [];
    let uMax = Math.PI * 2;
    let vMax = Math.PI * 2;
    let uStep = uMax / 50;
    let vStep = vMax / 50;

    for (let u = 0; u <= uMax; u += uStep) {
        for (let v = 0; v <= vMax; v += vStep) {
            let vert = AstroidalTorus(u, v);
            let avert = AstroidalTorus(u + uStep, v);
            let bvert = AstroidalTorus(u, v + vStep);
            let cvert = AstroidalTorus(u + uStep, v + vStep);

            vertexList.push(vert.x, vert.y, vert.z);
            vertexList.push(avert.x, avert.y, avert.z);
            vertexList.push(bvert.x, bvert.y, bvert.z);

            vertexList.push(avert.x, avert.y, avert.z);
            vertexList.push(cvert.x, cvert.y, cvert.z);
            vertexList.push(bvert.x, bvert.y, bvert.z);
        }
    }

    return vertexList;
}

function CreateTexture() {
    let texture = [];
    let uMax = Math.PI * 2;
    let vMax = Math.PI * 2;
    let uStep = uMax / 50;
    let vStep = vMax / 50;

    for (let u = 0; u <= uMax; u += uStep) {
        for (let v = 0; v <= vMax; v += vStep) {
            let u1 = map(u, 0, uMax, 0, 1);
            let v1 = map(v, 0, vMax, 0, 1);
            texture.push(u1, v1);
            u1 = map(u + uStep, 0, uMax, 0, 1);
            texture.push(u1, v1);
            u1 = map(u, 0, uMax, 0, 1);
            v1 = map(v + vStep, 0, vMax, 0, 1);
            texture.push(u1, v1);
            u1 = map(u + uStep, 0, uMax, 0, 1);
            v1 = map(v, 0, vMax, 0, 1);
            texture.push(u1, v1);
            v1 = map(v + vStep, 0, vMax, 0, 1);
            texture.push(u1, v1);
            u1 = map(u, 0, uMax, 0, 1);
            v1 = map(v + vStep, 0, vMax, 0, 1);
            texture.push(u1, v1);
        }
    }

    return texture;
}

function map(val, f1, t1, f2, t2) {
    let m;
    m = (val - f1) * (t2 - f2) / (t1 - f1) + f2;
    return Math.min(Math.max(m, f2), t2);
}

function AstroidalTorus(u, v) {
    let r = 1;
    let a = 0.5;
    let t = 0.5 * Math.PI;
    let x = (r + a * Math.cos(u) ** 3 * Math.cos(t) - a * Math.sin(u) ** 3 * Math.sin(t)) * Math.cos(v);
    let y = (r + a * Math.cos(u) ** 3 * Math.cos(t) - a * Math.sin(u) ** 3 * Math.sin(t)) * Math.sin(v);
    let z = a * Math.cos(u) ** 3 * Math.sin(t) + Math.sin(u) ** 3 * Math.cos(t);
    return { x: x, y: y, z: z }
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iTranslatePoint = gl.getUniformLocation(prog, 'translatePoint');
    shProgram.iTexturePoint = gl.getUniformLocation(prog, 'texturePoint');
    shProgram.iScalingKoef = gl.getUniformLocation(prog, 'scalingKoef');
    shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');

    surface = new Model('AstroidalTorus');
    surface.BufferData(CreateSurfaceData());
    LoadTexture();
    surface.TextureBufferData(CreateTexture());
    point = new Model('Point');
    point.BufferData(CreateSphereSurface())
    backPlane = new Model('Plane')
    backPlane.BufferData([0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0]);
    backPlane.TextureBufferData([1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1]);
    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function StereoCamera(
    Convergence,
    EyeSeparation,
    AspectRatio,
    FOV,
    NearClippingDistance,
    FarClippingDistance
) {
    this.mConvergence = Convergence;
    this.mEyeSeparation = EyeSeparation;
    this.mAspectRatio = AspectRatio;
    this.mFOV = FOV;
    this.mNearClippingDistance = NearClippingDistance;
    this.mFarClippingDistance = FarClippingDistance;

    this.mProjectionMatrix = null;
    this.mModelViewMatrix = null;

    this.ApplyLeftFrustum = function () {
        let top, bottom, left, right;
        top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
        bottom = -top;

        let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
        let b = a - this.mEyeSeparation / 2;
        let c = a + this.mEyeSeparation / 2;

        left = (-b * this.mNearClippingDistance) / this.mConvergence;
        right = (c * this.mNearClippingDistance) / this.mConvergence;

        // Set the Projection Matrix
        this.mProjectionMatrix = m4.frustum(
            left,
            right,
            bottom,
            top,
            this.mNearClippingDistance,
            this.mFarClippingDistance
        );

        // Displace the world to right
        this.mModelViewMatrix = m4.translation(
            this.mEyeSeparation / 2,
            0.0,
            0.0
        );
    };

    this.ApplyRightFrustum = function () {
        let top, bottom, left, right;
        top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
        bottom = -top;

        let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
        let b = a - this.mEyeSeparation / 2;
        let c = a + this.mEyeSeparation / 2;

        left = (-c * this.mNearClippingDistance) / this.mConvergence;
        right = (b * this.mNearClippingDistance) / this.mConvergence;

        // Set the Projection Matrix
        this.mProjectionMatrix = m4.frustum(
            left,
            right,
            bottom,
            top,
            this.mNearClippingDistance,
            this.mFarClippingDistance
        );

        // Displace the world to left
        this.mModelViewMatrix = m4.translation(
            -this.mEyeSeparation / 2,
            0.0,
            0.0
        );
    };

    this.Param = function () {
        let ins = document.getElementsByClassName("in");
        let outs = document.getElementsByClassName("out");
        let eyeSeparation = 70.0;
        eyeSeparation = ins[0].value;
        outs[0].innerHTML = eyeSeparation;
        this.mEyeSeparation = eyeSeparation;
        let FOV = 0.8;
        FOV = ins[1].value;
        outs[1].innerHTML = FOV;
        this.mFOV = FOV;
        let nearClippingDistance = 5.0;
        nearClippingDistance = ins[2].value - 0.0;
        outs[2].innerHTML = nearClippingDistance;
        this.mNearClippingDistance = nearClippingDistance
        let convergence = 2000.0;
        convergence = ins[3].value;
        outs[3].innerHTML = convergence;
        this.mConvergence = convergence;
    }
}

function init() {
    cam = new StereoCamera(
        2000,        // Convergence
        70.0,        // Eye Separation
        1,           // Aspect Ratio
        0.8,         // FOV in degrees * PI / 180 degrees
        10,          // Near Clipping Distance
        20000        // Far Clipping Distance
    );
    texturePoint = { x: 0.1, y: 0.1 }
    scalingKoef = 1.0;
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        video = document.createElement('video');
        video.setAttribute('autoplay', true);
        window.vid = video;
        getWebcam();
        vTexture = CreateWebCamTexture();
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    reDraw();
}

let texture, video, track;
let vTexture, backPlane, cam;

function LoadTexture() {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymus';

    image.src = "https://raw.githubusercontent.com/RewindRewind/WebGL/CGW/texture.jpg";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        draw()
    }
}

function getWebcam() {
    navigator.getUserMedia({ video: true, audio: false }, function (stream) {
        video.srcObject = stream;
        track = stream.getTracks()[0];
    }, function (e) {
        console.error('Rejected!', e);
    });
}

function CreateWebCamTexture() {
    let textureID = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureID);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return textureID;
}
const accelerometer = new Accelerometer({ frequency: 60 });
accelerometer.addEventListener("reading", () => {
    console.log(`Acceleration along the X-axis ${accelerometer.x}`);
    console.log(`Acceleration along the Y-axis ${accelerometer.y}`);
    console.log(`Acceleration along the Z-axis ${accelerometer.z}`);
});
accelerometer.start();