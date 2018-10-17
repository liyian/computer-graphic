/**
* @fileoverview This file is the main javascript file for this program. It wraps together
* the skybox and teapot drawing algorithms, the camera manipulation algorithms, and the lighting
* model. This file is where all the drawing functions are called from. This file is dependent upon
* user_commands.js, readText.js, skybox.js, render_teapot.js, teapot_0, gl-matrix-min.js, and webgl-utils.js.
*/

var gl;
var canvas;

var shaderProgram;

// Create a place to store the texture coords for the mesh
var cubeTCoordBuffer;

// Create a place to store terrain geometry
var cubeVertexBuffer;

// Create a place to store the triangles
var cubeTriIndexBuffer;

// Create ModelView matrix
var mvMatrix = mat4.create();

// Create Projection matrix
var pMatrix = mat4.create();

// Create Normal matrix
var nMatrix = mat3.create();

var mvMatrixStack = [];

// Create a place to store the texture
var cubeImage;
var cubeTexture;

// View parameters
var eyePt = vec3.fromValues(0.0,0.0,10.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);
var globalQuat = quat.create();

// For animation 
var then =0;
var modelXRotationRadians = degToRad(0);
var modelYRotationRadians = degToRad(0);

// ready variable
ready_to_draw = false;

/**
* Function to pass the model view matrix to the shader program
* @return None
*/
function uploadModelViewMatrixToShader() {
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
* Function to pass the projection matrix to the shader program
* @return None
*/
function uploadProjectionMatrixToShader() {
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

/**
* Function to pass the normal matrix to the shader program
* @return None
*/
function uploadNormalMatrixToShader() {
    mat3.fromMat4(nMatrix,mvMatrix);
    mat3.transpose(nMatrix,nMatrix);
    mat3.invert(nMatrix,nMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

/**
* Function to manipulate lighting information in shader for Phong Lighting Model
* @return None
*/
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

/**
* Function to pass the view direction vector to the shader program
* @return None
*/
function uploadViewDirToShader(){
	gl.uniform3fv(gl.getUniformLocation(shaderProgram, "viewDir"), viewDir);
}

/**
* Function to pass the rotation matrix to the shader program so that reflections work as the teapot spins
* @return None
*/
function uploadRotateMatrixToShader(rotateMat){
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uRotateMat"), false, rotateMat);
}

/**
* Routine for pushing a current model view matrix to a stack for hieroarchial modeling
* @return None
*/
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


/**
* Routine for popping a stored model view matrix from stack for hieroarchial modeling
* @return None
*/
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
    	throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/**
* Function which calls subroutines to upload model matricies to the shader program
* @return None
*/
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
	uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

/**
* Subroutine which converts from degrees to radians
* @param {float} degrees Angle in degrees
* @return Value of angle in radians
*/
function degToRad(degrees) {
	return degrees * Math.PI / 180;
}

/**
* Function to create a WebGL context upon startup
* @param {canvas} canvas Canvas object for the program
* @return WebGL context
*/
function createGLContext(canvas) {
	var names = ["webgl", "experimental-webgl"];
	var context = null;
	for (var i=0; i < names.length; i++) {
		try {
		  context = canvas.getContext(names[i]);
		} catch(e) {}
		if (context) {
		  break;
		}
	}
	if (context) {
		context.viewportWidth = canvas.width;
		context.viewportHeight = canvas.height;
	} else {
		alert("Failed to create WebGL context!");
	}
	return context;
}

/**
* Function to load shader from document
* @param {int} id ID to query for shader program from document
* @return Shader object for program
*/
function loadShaderFromDOM(id) {
	var shaderScript = document.getElementById(id);

	// If we don't find an element with the specified id
	// we do an early exit 
	if (!shaderScript) {
		return null;
	}

	// Loop through the children for the found DOM element and
	// build up the shader source code as a string
	var shaderSource = "";
	var currentChild = shaderScript.firstChild;
	while (currentChild) {
		if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
			shaderSource += currentChild.textContent;
		}
		currentChild = currentChild.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, shaderSource);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	} 
	return shader;
}

/**
* Function to pass boolean variable to shader program. The shading color is different for the
* 	teapot and the skybox, so it is necessary to switch between the settings when shading.
* @param {bool} isSkybox Variable that is True when shading the skybox or is False when shading the teapot
* @return None
*/
function switchShaders(isSkybox){
	gl.uniform1f(gl.getUniformLocation(shaderProgram, "uIsSkybox"), isSkybox);
}

/**
* Function to set up shader programs upon startup
* @return None
*/
function setupShaders() {
	vertexShader = loadShaderFromDOM("shader-vs");
	fragmentShader = loadShaderFromDOM("shader-fs");

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Failed to setup shaders");
	}

	gl.useProgram(shaderProgram);

	// Enable vertex position
    shaderProgram.texCoordAttribute = gl.getAttribLocation(shaderProgram, "aTexCoord");
    
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	console.log("Vertex attrib: ", shaderProgram.vertexPositionAttribute);
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	
	// Enable vertex normals
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

	// Enable matrix manipulations
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	
	// Enable Phong Shading options
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
	shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
	shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
	shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
	shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}

/**
* Function to setup the draw buffers for the teapot and skybox
* @return None
*/
function setupBuffers(){
    setupSkybox();
	readTextFile("teapot_0.obj", setupTeapotBuffers);
}

/**
* Function to set camera location and viewing direction, as well as facilitate the rending of the
*   skybox and teapot for each animation frame
* @return None
*/
function draw() { 
    var translateVec = vec3.create();
    var scaleVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(90), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
 
    // Setup the scene and camera
    mvPushMatrix();
	var rotateMat = mat4.create();
	mat4.rotateY(rotateMat, rotateMat, modelYRotationRadians);
	uploadRotateMatrixToShader(rotateMat);
    vec3.set(translateVec,0.0,0.0,-10.0);
    mat4.translate(mvMatrix, mvMatrix,translateVec);
    setMatrixUniforms();
	
    vec3.add(viewPt, eyePt, viewDir);
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);
	// Setup lights
	uploadLightsToShader([0,20,0],[0.0,0.0,0.0],[0.3,0.3,0.3],[0.3,0.3,0.3]);
	
	// render the skybox
    drawSkybox();
	// if the teapot has been successfully read in, render the teapot
	if (ready_to_draw){
		mat4.rotateY(mvMatrix,mvMatrix,modelYRotationRadians);
		drawTeapot();
	}
	
	// reset mvMatrix
    mvPopMatrix();
  
}

/**
* Function to animate the scene by spinning the teapot around its y axis.
* @return None
*/
function animate() {
    if (then==0)
    {
    	then = Date.now();
    }
    else
    {
		now=Date.now();
		// Convert to seconds
		now *= 0.001;
		// Subtract the previous time from the current time
		var deltaTime = now - then;
		// Remember the current time for the next frame.
		then = now;  
		
		// Animate the Rotation
//		modelYRotationRadians += 0.01;
    }
}

/**
* Function to setup the cubemap texture for the skybox and teapot.
* @return None
*/





function loadCubemapFace(gl,target,texture,url){
    var image=new Image();
    image.onload=function(){gl.bindTexture(gl.TEXTURE_CUBE_MAP,texture);
                            gl.texImage2D(target,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
                           gl.bindTexture(gl.TEXTURE_CUBE_MAP,null);}
                            image.src=url;
};
function setupCubeMap() {
    // TODO: Initialize the Cube Map, and set its parameters
    // See usage of gl.createTexture
	cubeTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
    
  
	// TODO: Set texture parameters
	// See uage of gl.texParameteri
    gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
 	// TODO: Bind the images to each side of the cubemap
 	// Images are in folder "canary"
 	// See usage of gl.bindTexture, gl.texImage2D
 	// Note that you are free to define new functions. If you write everything 
 	// in this function, it may get too long and contain a lot of duplicated 
 	// code. In such case, consider extract same code into new your function.
    loadCubemapFace(gl,gl.TEXTURE_CUBE_MAP_POSITIVE_X,cubeTexture, 'Skybox/pos-x.png');
    loadCubemapFace(gl,gl.TEXTURE_CUBE_MAP_NEGATIVE_X,cubeTexture, 'Skybox/neg-x.png');
    loadCubemapFace(gl,gl.TEXTURE_CUBE_MAP_POSITIVE_Y,cubeTexture, 'Skybox/pos-y.png');
    loadCubemapFace(gl,gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,cubeTexture, 'Skybox/neg-y.png');
    loadCubemapFace(gl,gl.TEXTURE_CUBE_MAP_POSITIVE_Z,cubeTexture, 'Skybox/pos-z.png');
    loadCubemapFace(gl,gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,cubeTexture, 'Skybox/neg-z.png');
    

}

function handleTextureLoaded(image, texture) {
  console.log("handleTextureLoaded, image = " + image);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  // Check if the image is a power of 2 in both dimensions.
  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
     // Yes, it's a power of 2. Generate mips.
     gl.generateMipmap(gl.TEXTURE_2D);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
     console.log("Loaded power of 2 texture");
  } else {
     // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     console.log("Loaded non-power of 2 texture");
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

/**
* Function to verify if a value is a power of 2 or not
* @param {int} value Value to determine whether or not it is a power of 2
* @return {boolean} Boolean indicating whether a value is a power of 2 (true) or not (false)
*/
function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}

/**
* Function for doing the initialization work of the program and kicking off
*   the animation callback
* @return None
*/
function startup() {
	canvas = document.getElementById("myGLCanvas");
	gl = createGLContext(canvas);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);

	// set up event listener for keystrokes
	document.onkeydown = handleKeyDown;

	// setup pipeline to be able to render scene
	setupShaders();
	setupBuffers();
	setupCubeMap();
	
	// kick off the drawing loop
	tick();
}

/**
* Callback function to perform draw each frame
* @return None
*/
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}

