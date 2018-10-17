"use strict";

var gl;                 // The webgl context.

var a_coords_loc;       // Location of the a_coords attribute variable in the shader program.
var a_coords_buffer;    // Buffer to hold the values for a_coords.
var a_normal_loc;       // Location of a_normal attribute.
var a_normal_buffer;    // Buffer for a_normal.
var index_buffer;       // Buffer to hold vetex indices from model.

var u_diffuseColor;     // Locations of uniform variables in the shader program
var u_specularColor;
var u_specularExponent;
var u_lightPosition;
var u_modelview;
var u_projection;
var u_normalMatrix;    

var projection = mat4.create();          // projection matrix
var modelview;                           // modelview matrix; value comes from rotator
var normalMatrix = mat3.create();        // matrix, derived from model and view matrix, for transforming normal vectors
var rotator;                             // A TrackballRotator to implement rotation by mouse.

var lastTime = 0;
var colors = [  // RGB color arrays for diffuse and specular color values
    [1,1,1],
];

var lightPositions = [  // values for light position
  [0,0,0,1],
];

var objects = [         // Objects for display
    chair(),table(), cube(),
];

var currentModelNumber;  // contains data for the current object

function degToRad(degrees) {
  return degrees * Math.PI / 180;
}


function perspective(inputmodel,fovy,aspect,near,far//TODO: function inputs
    ){

    if (document.getElementById("my_gl").checked) {
        let f = 1.0 / Math.tan(fovy / 2);
  let nf = 1 / (near - far);
  inputmodel[0] = f / aspect;
  inputmodel[1] = 0;
  inputmodel[2] = 0;
  inputmodel[3] = 0;
  inputmodel[4] = 0;
  inputmodel[5] = f;
  inputmodel[6] = 0;
  inputmodel[7] = 0;
  inputmodel[8] = 0;
  inputmodel[9] = 0;
  inputmodel[10] = (far + near) * nf;
  inputmodel[11] = -1;
  inputmodel[12] = 0;
  inputmodel[13] = 0;
  inputmodel[14] = (2 * far * near) * nf;
  inputmodel[15] = 0;
  return inputmodel;
         /*
        TODO: Your code goes here.
        Write the code to perform perspective transformation. 
        Think about what would be the input and output to the function would be
        */
    }
    else {
        mat4.perspective(inputmodel,fovy,aspect,near,far);
        return inputmodel;
        /*
        TODO: Your code goes here.
        use inbuilt_gl functions to perform perspective projection
        */ 
    }  
}

function translate(inputmodel,trans_vector//TODO: function inputs
    ){

    if (document.getElementById("my_gl").checked) {
    var x = trans_vector[0], y = trans_vector[1], z = trans_vector[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
        if (inputmodel == modelview) {
    inputmodel[12] = modelview[0] * x + modelview[4] * y + modelview[8] * z + modelview[12];
    
    inputmodel[13] = modelview[1] * x + modelview[5] * y + modelview[9] * z + modelview[13];
    inputmodel[14] = modelview[2] * x + modelview[6] * y + modelview[10] * z +modelview[14];
    inputmodel[15] = modelview[3] * x + modelview[7] * y + modelview[11] * z+modelview[15];}
        
       else {
    a00 = modelview[0]; a01 = modelview[1]; a02 = modelview[2]; a03 = modelview[3];
    a10 = modelview[4]; a11 = modelview[5]; a12 = modelview[6]; a13 = modelview[7];
    a20 =modelview[8]; a21 = modelview[9]; a22 = modelview[10]; a23 = modelview[11];

     inputmodel[0] = a00; inputmodel[1] = a01; inputmodel[2] = a02;  inputmodel[3] = a03;
     inputmodel[4] = a10;  inputmodel[5] = a11; inputmodel[6] = a12;  inputmodel[7] = a13;
    inputmodel[8] = a20;  inputmodel[9] = a21;  inputmodel[10] = a22; inputmodel[11] = a23;

     inputmodel[12] = a00 * x + a10 * y + a20 * z + modelview[12];
     inputmodel[13] = a01 * x + a11 * y + a21 * z + modelview[13];
     inputmodel[14] = a02 * x + a12 * y + a22 * z + modelview[14];
     inputmodel[15] = a03 * x + a13 * y + a23 * z + modelview[15];}
        return  inputmodel;
    }
    else {
        mat4.translate(inputmodel,inputmodel,trans_vector);
        return inputmodel;
        /*
        TODO: Your code goes here.
        use inbuilt_gl functions to perform translation
        */   
    }  
}


function rotate(inputmodel,radius,axis//TODO: function inputs
    ){
//    var mv=mat4.creat();
   if (document.getElementById("my_gl").checked) {
        var x=axis[0],y=axis[1],z=axis[2];
        var len=Math.sqrt(x*x+y*y+z*z);
        var s,c,t;
        var a00,a01,a02,a03;
        var a10,a11,a12,a13;
        var a20,a21,a22,a23;
        var b00,b01,b02;
        var b10,b11,b12;
        var b20,b21,b22;
        
        //if (Math.abs(len) &lt; glMatrix.EPSILON) { return null; }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;

  s = Math.sin(radius);
  c = Math.cos(radius);
  t = 1 - c;
  a00 = modelview[0]; a01 = modelview[1]; a02 = modelview[2]; a03 = modelview[3];
  a10 = modelview[4]; a11 = modelview[5]; a12 = modelview[6]; a13 = modelview[7];
  a20 = modelview[8]; a21 = modelview[9]; a22 = modelview[10]; a23 = modelview[11];
  
        // Construct the elements of the rotation matrix
  b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
  b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
  b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;
        
        // Perform rotation-specific matrix multiplication
  inputmodel[0] = a00 * b00 + a10 * b01 + a20 * b02;
  inputmodel[1] = a01 * b00 + a11 * b01 + a21 * b02;
  inputmodel[2] = a02 * b00 + a12 * b01 + a22 * b02;
  inputmodel[3] = a03 * b00 + a13 * b01 + a23 * b02;
  inputmodel[4] = a00 * b10 + a10 * b11 + a20 * b12;
  inputmodel[5] = a01 * b10 + a11 * b11 + a21 * b12;
  inputmodel[6] = a02 * b10 + a12 * b11 + a22 * b12;
  inputmodel[7] = a03 * b10 + a13 * b11 + a23 * b12;
  inputmodel[8] = a00 * b20 + a10 * b21 + a20 * b22;
  inputmodel[9] = a01 * b20 + a11 * b21 + a21 * b22;
  inputmodel[10] = a02 * b20 + a12 * b21 + a22 * b22;
  inputmodel[11] = a03 * b20 + a13 * b21 + a23 * b22;
        
        if (modelview !==inputmodel) { // If the source and destination differ, copy the unchanged last row
    inputmodel[12] = modelview[12];
    inputmodel[13] = modelview[13];
   inputmodel[14] = modelview[14];
    inputmodel[15] = modelview[15];
  }
    return inputmodel;
        /*
        TODO: Your code goes here.
        Write the code to perform rotation about ARBITARY axis.
        Note: One of the input to this function would be axis vector around which you would rotate. 
        Think about what would be the input and output to the function would be
        */
    }
    else {
        mat4.rotate(inputmodel,inputmodel,radius,axis);
        return inputmodel;
        /*
        TODO: Your code goes here.
        use inbuilt_gl functions to perform rotation
        */   
    }  

}

function scale(inputmodel,trans_vector//TODO: function inputs
    ){

    if (document.getElementById("my_gl").checked) {
        var x = trans_vector[0], y = trans_vector[1], z = trans_vector[2];
  inputmodel[0] = modelview[0] * x;
  inputmodel[1] = modelview[1] * x;
  inputmodel[2] = modelview[2] * x;
  inputmodel[3] = modelview[3] * x;
  inputmodel[4] = modelview[4] * y;
  inputmodel[5] = modelview[5] * y;
  inputmodel[6] = modelview[6] * y;
  inputmodel[7] = modelview[7] * y;
  inputmodel[8] = modelview[8] * z;
  inputmodel[9] = modelview[9] * z;
  inputmodel[10] = modelview[10] * z;
  inputmodel[11] = modelview[11] * z;
  inputmodel[12] = modelview[12];
  inputmodel[13] = modelview[13];
  inputmodel[14] = modelview[14];
  inputmodel[15] = modelview[15];
  return inputmodel;
        /*
        TODO: Your code goes here.
        Write the code to perform scale transformation. 
        Think about what would be the input and output to the function would be
        */
    }
    else {
        mat4.scale(inputmodel,inputmodel,trans_vector);
        return inputmodel;
        /*
        TODO: Your code goes here.
        use inbuilt_gl functions to perform scaling
        */   
    } 
}


function draw() { 
    gl.clearColor(0.15,0.15,0.3,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    mat4.perspective(projection,Math.PI/5,1,10,20);   
    modelview = rotator.getViewMatrix();
    
    // draw the 1st chair , object[0]
    installModel(objects[0]);
    currentModelNumber = 0;
    translate(modelview,[2,0,-1]);
    rotate(modelview,degToRad(40),[1,0,0]);
    
    update_uniform(modelview,projection,0);
    
    /*
    TODO: Your code goes here. 
    Compute all the necessary transformation to align object[0] (chair)
    Use your own functions with the proper inputs i.e
        1. translate()
        2. scale()
        3. rotate()
    Apply those transformation to the modelview matrix.
    Not all the transformations are relative and they keep on adding as you modify modelview. 
    Hence, you might want to reverse the previous transformation. Keep in mind the order
    in which you apply transformation.
    */
    
   

    // draw the 2nd chair , object[0]
    installModel(objects[0]);
    currentModelNumber = 0;
    rotate(modelview,degToRad(90),[0,1,0]);
    translate(modelview,[2.2,0,-0.9]);
    
    //TODO: Your code goes here.
    
     update_uniform(modelview,projection, 0);
    translate(modelview,[-2.2,0,0.9]);
    rotate(modelview,degToRad(-90),[0,1,0]);
     

    // draw the 3rd chair , object[0]
    installModel(objects[0]);
    currentModelNumber = 0;
    rotate(modelview,degToRad(180),[0,1,0]);
    translate(modelview,[3.1,0,1.4]);
    
    update_uniform(modelview,projection, 0);
   translate(modelview,[-3.1,0,-1.4]);
    rotate(modelview,degToRad(-180),[0,1,0]);


    // draw the 4th chair , object[0]
    installModel(objects[0]);
    currentModelNumber = 0;
    rotate(modelview,degToRad(270),[0,1,0]);
    translate(modelview,[0.8,0,2.2]);
   //TODO: Your code goes here. 
   
    update_uniform(modelview,projection, 0);
    
    
    

    // draw the Table , object[1]
    installModel(objects[1]);
    currentModelNumber = 1;

   //TODO: Your code goes here. 
    translate(modelview,[-1.6,0.6,-0.8]);
    scale(modelview,[1.1,1.1,1.1]);
    update_uniform(modelview,projection, 1);
    

    // draw the Cube , object[2]
    installModel(objects[2]);
    currentModelNumber = 2;
    translate(modelview,[0.1,0.4,0.1]);
    scale(modelview,[0.8,0.8,0.8]);
   //TODO: Your code goes here. 
    update_uniform(modelview,projection, 2);

}

/*
  this function assigns the computed values to the uniforms for the model, view and projection 
  transform
*/
function update_uniform(modelview,projection,currentModelNumber){

    /* Get the matrix for transforming normal vectors from the modelview matrix,
       and send matrices to the shader program*/
    mat3.normalFromMat4(normalMatrix, modelview);
    
    gl.uniformMatrix3fv(u_normalMatrix, false, normalMatrix);
    gl.uniformMatrix4fv(u_modelview, false, modelview );
    gl.uniformMatrix4fv(u_projection, false, projection );   
    gl.drawElements(gl.TRIANGLES, objects[currentModelNumber].indices.length, gl.UNSIGNED_SHORT, 0);
}



/* 
 * Called and data for the model are copied into the appropriate buffers, and the 
 * scene is drawn.
 */
function installModel(modelData) {
     gl.bindBuffer(gl.ARRAY_BUFFER, a_coords_buffer);
     gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexPositions, gl.STATIC_DRAW);
     gl.vertexAttribPointer(a_coords_loc, 3, gl.FLOAT, false, 0, 0);
     gl.enableVertexAttribArray(a_coords_loc);
     gl.bindBuffer(gl.ARRAY_BUFFER, a_normal_buffer);
     gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexNormals, gl.STATIC_DRAW);
     gl.vertexAttribPointer(a_normal_loc, 3, gl.FLOAT, false, 0, 0);
     gl.enableVertexAttribArray(a_normal_loc);
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index_buffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW);
}


/* Initialize the WebGL context.  Called from init() */
function initGL() {
    var prog = createProgram(gl,"vshader-source","fshader-source");
    gl.useProgram(prog);
    a_coords_loc =  gl.getAttribLocation(prog, "a_coords");
    a_normal_loc =  gl.getAttribLocation(prog, "a_normal");
    u_modelview = gl.getUniformLocation(prog, "modelview");
    u_projection = gl.getUniformLocation(prog, "projection");
    u_normalMatrix =  gl.getUniformLocation(prog, "normalMatrix");
    u_lightPosition=  gl.getUniformLocation(prog, "lightPosition");
    u_diffuseColor =  gl.getUniformLocation(prog, "diffuseColor");
    u_specularColor =  gl.getUniformLocation(prog, "specularColor");
    u_specularExponent = gl.getUniformLocation(prog, "specularExponent");
    a_coords_buffer = gl.createBuffer();
    a_normal_buffer = gl.createBuffer();
    index_buffer = gl.createBuffer();
    gl.enable(gl.DEPTH_TEST);
    gl.uniform3f(u_specularColor, 0.5, 0.5, 0.5);
    gl.uniform4f(u_diffuseColor, 1, 1, 1, 1);
    gl.uniform1f(u_specularExponent, 10);
    gl.uniform4f(u_lightPosition, 0, 0, 0, 1);
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type String is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 *    The second and third parameters are the id attributes for <script>
 * elementst that contain the source code for the vertex and fragment
 * shaders.
 */
function createProgram(gl, vertexShaderID, fragmentShaderID) {
    function getTextContent( elementID ) {
            // This nested function retrieves the text content of an
            // element on the web page.  It is used here to get the shader
            // source code from the script elements that contain it.
        var element = document.getElementById(elementID);
        var node = element.firstChild;
        var str = "";
        while (node) {
            if (node.nodeType == 3) // this is a text node
                str += node.textContent;
            node = node.nextSibling;
        }
        return str;
    }
    try {
        var vertexShaderSource = getTextContent( vertexShaderID );
        var fragmentShaderSource = getTextContent( fragmentShaderID );
    }
    catch (e) {
        throw "Error: Could not get shader source code from script elements.";
    }
    var vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vertexShaderSource);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw "Error in vertex shader:  " + gl.getShaderInfoLog(vsh);
     }
    var fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fragmentShaderSource);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw "Error in fragment shader:  " + gl.getShaderInfoLog(fsh);
    }
    var prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw "Link error in program:  " + gl.getProgramInfoLog(prog);
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    try {
        var canvas = document.getElementById("myGLCanvas");
        gl = canvas.getContext("webgl") || 
                         canvas.getContext("experimental-webgl");
        if ( ! gl ) {
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
            "<p>Sorry, could not initialize the WebGL graphics context:" + e + "</p>";
        return;
    }

    document.getElementById("my_gl").checked = false;
    document.getElementById("my_gl").onchange = draw;
    rotator = new TrackballRotator(canvas, draw, 15);
    draw();
}







