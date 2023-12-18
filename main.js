'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let light1, light2;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices, normales) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normales), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
    this.DrawLight = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

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
    let projection = m4.perspective(Math.PI / 8, 1, 8, 20);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.0);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    const normal = m4.identity();
    m4.inverse(modelView, normal);
    m4.transpose(normal, normal);

    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normal);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);
    let dx = document.getElementById('dx').value
    let dy = document.getElementById('dy').value
    let dz = document.getElementById('dz').value
    let px = document.getElementById('px').value
    let pz = document.getElementById('pz').value
    gl.uniform3fv(shProgram.iLDir, [dx, dy, dz]);
    gl.uniform3fv(shProgram.iLPos, [px, 3 * Math.sin(Date.now() * 0.001), pz]);
    gl.uniform1f(shProgram.iLimit, parseFloat(document.getElementById('lim').value));
    gl.uniform1f(shProgram.iEasing, parseFloat(document.getElementById('ease').value));

    surface.Draw();
    gl.uniform1f(shProgram.iLimit, -100.0);
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, m4.multiply(modelViewProjection,
        m4.translation(px,  1* Math.sin(Date.now() * 0.001), 1)));

    light1.Draw();
    light2.BufferData([0, 0, 0, -px,  -1* Math.sin(Date.now() * 0.001), -1],[0, 0, 0, 1, 1, 1])
    light2.DrawLight();
}

function drawe() {
    draw()
    window.requestAnimationFrame(drawe)
}

function CreateSurfaceData() {
    let vertexList = [];
    let normalList = [];
    let step = 0.03;
    let derivStep = 0.0001;
    let a = 1;
    let r = 1;
    let theta = 0;

    let getVert = (u, v) => {
        let x = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.cos(v);
        let y = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.sin(v);
        let z = a * Math.pow(Math.cos(u), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u), 3) * Math.cos(theta)
        return [x, y, z]
    }

    let getAvgNorm = (u, v) => {
        let v0 = getVert(u, v);
        let v1 = getVert(u + step, v);
        let v2 = getVert(u, v + step);
        let v3 = getVert(u - step, v + step);
        let v4 = getVert(u - step, v);
        let v5 = getVert(u - step, v - step);
        let v6 = getVert(u, v - step);
        let v01 = m4.subtractVectors(v1, v0)
        let v02 = m4.subtractVectors(v2, v0)
        let v03 = m4.subtractVectors(v3, v0)
        let v04 = m4.subtractVectors(v4, v0)
        let v05 = m4.subtractVectors(v5, v0)
        let v06 = m4.subtractVectors(v6, v0)
        let n1 = m4.normalize(m4.cross(v01, v02))
        let n2 = m4.normalize(m4.cross(v02, v03))
        let n3 = m4.normalize(m4.cross(v03, v04))
        let n4 = m4.normalize(m4.cross(v04, v05))
        let n5 = m4.normalize(m4.cross(v05, v06))
        let n6 = m4.normalize(m4.cross(v06, v01))
        let n = [(n1[0] + n2[0] + n3[0] + n4[0] + n5[0] + n6[0]) / 6.0,
        (n1[1] + n2[1] + n3[1] + n4[1] + n5[1] + n6[1]) / 6.0,
        (n1[2] + n2[2] + n3[2] + n4[2] + n5[2] + n6[2]) / 6.0]
        n = m4.normalize(n);
        return n;
    }


    for (let u = -Math.PI; u <= Math.PI; u += step) {
        for (let v = 0; v <= 2 * Math.PI; v += step) {
            let x = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.cos(v);
            let y = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.sin(v);
            let z = a * Math.pow(Math.cos(u), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u), 3) * Math.cos(theta)
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u, v))
            x = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.cos(v);
            y = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.sin(v);
            z = a * Math.pow(Math.cos(u + step), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u + step), 3) * Math.cos(theta)
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u + step, v))
            x = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.cos(v + step);
            y = (r + a * Math.pow(Math.cos(u), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u), 3) * Math.sin(theta)) * Math.sin(v + step);
            z = a * Math.pow(Math.cos(u), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u), 3) * Math.cos(theta)
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u, v + step))
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u, v + step))
            x = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.cos(v);
            y = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.sin(v);
            z = a * Math.pow(Math.cos(u + step), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u + step), 3) * Math.cos(theta)
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u + step, v))
            x = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.cos(v + step);
            y = (r + a * Math.pow(Math.cos(u + step), 3) * Math.cos(theta) - a * Math.pow(Math.sin(u + step), 3) * Math.sin(theta)) * Math.sin(v + step);
            z = a * Math.pow(Math.cos(u + step), 3) * Math.sin(theta) + a * Math.pow(Math.sin(u + step), 3) * Math.cos(theta)
            vertexList.push(x, y, z);
            normalList.push(...getAvgNorm(u + step, v + step))
        }
    }
    return [vertexList, normalList];
}

function CreateSphereData() {
    let vertexList = [];
    let normalList = [];

    let u = 0,
        t = 0;
    while (u < Math.PI * 2) {
        while (t < Math.PI) {
            let v = getSphereVertex(u, t);
            let w = getSphereVertex(u + 0.1, t);
            let wv = getSphereVertex(u, t + 0.1);
            let ww = getSphereVertex(u + 0.1, t + 0.1);
            vertexList.push(v.x, v.y, v.z);
            normalList.push(v.x, v.y, v.z);
            vertexList.push(w.x, w.y, w.z);
            normalList.push(w.x, w.y, w.z);
            vertexList.push(wv.x, wv.y, wv.z);
            normalList.push(wv.x, wv.y, wv.z);
            vertexList.push(wv.x, wv.y, wv.z);
            normalList.push(wv.x, wv.y, wv.z);
            vertexList.push(w.x, w.y, w.z);
            normalList.push(w.x, w.y, w.z);
            vertexList.push(ww.x, ww.y, ww.z);
            normalList.push(ww.x, ww.y, ww.z);
            t += 0.1;
        }
        t = 0;
        u += 0.1;
    }
    return [vertexList, normalList]
}
const r = 0.05;
function getSphereVertex(long, lat) {
    return {
        x: r * Math.cos(long) * Math.sin(lat),
        y: r * Math.sin(long) * Math.sin(lat),
        z: r * Math.cos(lat)
    }
}



/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iLDir = gl.getUniformLocation(prog, "lDir");
    shProgram.iLPos = gl.getUniformLocation(prog, "lPos");
    shProgram.iLimit = gl.getUniformLocation(prog, "lim");
    shProgram.iEasing = gl.getUniformLocation(prog, "eas");

    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData()[0], CreateSurfaceData()[1]);
    light1 = new Model()
    light2 = new Model()
    light1.BufferData(CreateSphereData()[0],CreateSphereData()[1])
    light2.BufferData([0, 0, 0, 1, 1, 1],[0, 0, 0, 1, 1, 1])

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
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
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

    drawe();
}
