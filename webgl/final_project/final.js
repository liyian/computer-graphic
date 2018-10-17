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
var u_lightPosition2;
var u_modelview;
var u_projection;
var u_normalMatrix;    
var squareVertexColorBuffer;
var projection = mat4.create();          // projection matrix
var modelview;                           // modelview matrix; value comes from rotator
var normalMatrix = mat3.create();        // matrix, derived from model and view matrix, for transforming normal vectors
var rotator;                             // A TrackballRotator to implement rotation by mouse.
var light=false;
var lastTime = 0;
//var colors = [  // RGB color arrays for diffuse and specular color values
//    [255,255,0],
//];

//var lightPositions;
//= [  
//  [0,0,0,1],
//];

var objects = [         // Objects for display
   uvSphere(0.5,32,16),cube(0.15),ring(1.5,2.5,32),uvCylinder(3.0, 0.3, 0, false, false),cube(0.2),uvTorus(0.15,0.08) ,uvCylinder(0.02, 0.15, 0, false, false),uvCylinder(0.05, 0.05, 0, false, false),uvCylinder(0.05, 0.7, 0, false, false),uvCone(0.4, 1,16, false),
];

var currentModelNumber;  // contains data for the current object

function degToRad(degrees) {
  return degrees * Math.PI / 180;
}


function perspective(inputmodel,fovy,aspect,near,far//TODO: function inputs
    ){

    if (document.getElementById("my_gl").checked) {
        var f = 1.0 / Math.tan(fovy / 2);
  var nf = 1 / (near - far);
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

var anim=false;

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
//indices.length is .NUMItems.


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
 var limit = degToRad(20);
var prog;
/* Initialize the WebGL context.  Called from init() */
function initGL() {
    prog = createProgram(gl,"vshader-source","fshader-source");
    gl.useProgram(prog);
    //prog.vertexColorAttribute = gl.getAttribLocation(prog, "aVertexColor");
    //gl.enableVertexAttribArray(prog.vertexColorAttribute);
    var limitLocation = gl.getUniformLocation(prog, "u_limit");
    a_coords_loc =  gl.getAttribLocation(prog, "a_coords");
    a_normal_loc =  gl.getAttribLocation(prog, "a_normal");
    u_modelview = gl.getUniformLocation(prog, "modelview");
    u_projection = gl.getUniformLocation(prog, "projection");
    u_normalMatrix =  gl.getUniformLocation(prog, "normalMatrix");
    u_lightPosition=  gl.getUniformLocation(prog, "lightPosition");
    u_lightPosition2=  gl.getUniformLocation(prog, "lightPosition2");
    u_diffuseColor =  gl.getUniformLocation(prog, "diffuseColor");
    u_specularColor =  gl.getUniformLocation(prog, "specularColor");
    u_specularExponent = gl.getUniformLocation(prog, "specularExponent");
    a_coords_buffer = gl.createBuffer();
    a_normal_buffer = gl.createBuffer();
    index_buffer = gl.createBuffer();
    gl.enable(gl.DEPTH_TEST);
    gl.uniform3f(u_specularColor, 0.5, 0.5, 0.5);
//    if(light==true){gl.uniform4f(u_diffuseColor, 1, 1, 1, 1);}
//    else{
    gl.uniform4f(u_diffuseColor, 1, 1, 1, 1);//}
    gl.uniform1f(limitLocation, Math.cos(limit));
    gl.uniform1f(u_specularExponent, 10);
   
//    var r=4 ;
//    var y = r*Math.sin(degToRad(SunAngle));
//     var x= r*Math.cos(degToRad(SunAngle));
//    gl.uniform4f(u_lightPosition, x, y, 0, 1);
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

 var mvMatrixStack = [];
    
    function mvPushMatrix() {
    var copy = mat4.clone(modelview);
    mvMatrixStack.push(copy);
}
function switchcarlight(islight){
	gl.uniform1f(gl.getUniformLocation(prog, "uiscarlight"), islight);
}
function switchSun(islight){
	gl.uniform1f(gl.getUniformLocation(prog, "uissun"), islight);
}
function switchShaders1(islight){
	gl.uniform1f(gl.getUniformLocation(prog, "uislight"), islight);
}
function switchLand(islight){
	gl.uniform1f(gl.getUniformLocation(prog, "uisland"), islight);
}
function switchCar(islight){
	gl.uniform1f(gl.getUniformLocation(prog, "uiscar"), islight);
}
function switchWheel(islight){
	gl.uniform1f(gl.getUniformLocation(prog, "uiswheel"), islight);
}
function switchRing(islight){
	gl.uniform1f(gl.getUniformLocation(prog, "uisring"), islight);
}
function switchtree(islight){
	gl.uniform1f(gl.getUniformLocation(prog, "uistree"), islight);
}
/**
* Routine for popping a stored model view matrix from stack for hieroarchial modeling
* @return None
*/
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
    	throw "Invalid popMatrix!";
    }
    modelview = mvMatrixStack.pop();
}
var SunAngle=180;
var carangle=180;
var carangle2=180
function draw() { 
    gl.clearColor(0.15,0.15,0.3,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    

    mat4.perspective(projection,Math.PI/5,1,10,20);   
    modelview = rotator.getViewMatrix();
    //mat4.translate(modelview, [0, 0, -20]);
   switchLand(false);
    switchShaders1(false);
    switchCar(false);
    switchWheel(false);
    //太阳
    mvPushMatrix();
    
    switchShaders1(true);
    switchSun(true);
    rotate(modelview,degToRad(SunAngle),[0,0,1]);
    translate(modelview, [4, 0, 0]);
    var r=1 ;
    var y = r*Math.sin(degToRad(SunAngle));
     var x= r*Math.cos(degToRad(SunAngle));
    if(y>0){gl.uniform4f(u_lightPosition, x, y,2, 0);}
    if(y<0){gl.uniform4f(u_lightPosition, 0, 0.01, -0.27,0.02);}
    
    if(y<0){switchShaders1(false);}
    installModel(objects[0]);
    
    
    currentModelNumber = 0;
    update_uniform(modelview,projection,0);
    switchSun(false);
    mvPopMatrix();
    //车盖
    mvPushMatrix();
    switchSun(false);
    switchShaders1(false);
     switchCar(true);
    installModel(objects[1]);
    
    
    rotate(modelview,degToRad(carangle),[0,1,0]);//animation
    translate(modelview,[2,0.5,0]);
    rotate(modelview,degToRad(90),[0,0,1]);

    currentModelNumber = 1;
    update_uniform(modelview,projection,1);
    
    installModel(objects[1]);
    translate(modelview,[0,0.1,0]);
    currentModelNumber = 1;
    update_uniform(modelview,projection,1);
    installModel(objects[1]);
    translate(modelview,[0,-0.1,0.13]);
    currentModelNumber = 1;
    update_uniform(modelview,projection,1);
    installModel(objects[1]);
    translate(modelview,[0,0,0.13]);
    currentModelNumber = 1;
    update_uniform(modelview,projection,1);
     installModel(objects[1]);
    translate(modelview,[0,0.1,0]);
    currentModelNumber = 1;
    update_uniform(modelview,projection,1);
    installModel(objects[1]);
    translate(modelview,[0,0,-0.13]);
    currentModelNumber = 1;
    update_uniform(modelview,projection,1);
    installModel(objects[4]);
    translate(modelview,[-0.15,-0.15,-0.13]);
    currentModelNumber = 4;
    update_uniform(modelview,projection,4);
    installModel(objects[4]);
    translate(modelview,[0,0.16,0]);
    currentModelNumber = 4;
    update_uniform(modelview,projection,4);
    installModel(objects[4]);
    translate(modelview,[0,0,0.2]);
    currentModelNumber = 4;
    update_uniform(modelview,projection,4);
    installModel(objects[4]);
    translate(modelview,[0,-0.16,0]);
    currentModelNumber = 4;
    update_uniform(modelview,projection,4);
    
    installModel(objects[4]);
    translate(modelview,[0,0,0.2]);
    currentModelNumber = 4;
    update_uniform(modelview,projection,4);
    
     installModel(objects[4]);
    translate(modelview,[0,0,0.2]);
    currentModelNumber = 4;
    update_uniform(modelview,projection,4);
    installModel(objects[4]);
    translate(modelview,[0,0.2,0]);
    currentModelNumber = 4;
    update_uniform(modelview,projection,4);
    translate(modelview,[0,0,-0.2]);
    currentModelNumber = 4;
    update_uniform(modelview,projection,4);
    translate(modelview,[0,0,-0.2]);
    currentModelNumber = 4;
    update_uniform(modelview,projection,4);
    translate(modelview,[0,0,-0.2]);
    currentModelNumber = 4;
    update_uniform(modelview,projection,4);
    translate(modelview,[0,0,-0.1]);
    currentModelNumber = 4;
    update_uniform(modelview,projection,4);
    translate(modelview,[0,-0.2,0]);
    currentModelNumber = 4;
    update_uniform(modelview,projection,4);
    
    installModel(objects[4]);
    translate(modelview,[0,0,0.2]);
    currentModelNumber = 4;
    update_uniform(modelview,projection,4);
    //车灯
    switchcarlight(true);
    if(y>0){switchcarlight(false);}
    installModel(objects[7]);
    translate(modelview,[0,0,0.63]);
    update_uniform(modelview,projection,7);
    translate(modelview,[0,0.2,0]);
    update_uniform(modelview,projection,7);
    
    mvPopMatrix();
    //轮子
    mvPushMatrix();
    switchShaders1(false);
    switchcarlight(false);
    switchCar(false);
    switchWheel(true);
    installModel(objects[5]);
    rotate(modelview,degToRad(carangle),[0,1,0]);//animation
    var r2=0.01 ;
    var z = r2*Math.sin(degToRad(carangle));
     var x2= r2*Math.cos(degToRad(carangle));
    if(y<0){gl.uniform4f(u_lightPosition2, x2,0,z,0);}
    if(y>0){gl.uniform4f(u_lightPosition2, 0,0,0,1);}
   
    rotate(modelview,degToRad(90),[0,1,0]);
    translate(modelview,[0,0.27,2.25]);
    currentModelNumber = 5;
    update_uniform(modelview,projection,5);
    
    translate(modelview,[-0.5,0,0]);
    currentModelNumber = 5;
    update_uniform(modelview,projection,5);
    translate(modelview,[0,0,-0.6]);
    currentModelNumber = 5;
    update_uniform(modelview,projection,5);
    translate(modelview,[0.5,0,0]);
    currentModelNumber = 5;
    update_uniform(modelview,projection,5);
    //轮杠
    switchWheel(false);
    rotate(modelview,degToRad(carangle2),[0,0,1]);
    installModel(objects[6]);
    
    
    
    translate(modelview,[0,0,0.5]);
    
    currentModelNumber = 6;
    update_uniform(modelview,projection,6);
    
    rotate(modelview,degToRad(90),[0,1,0]);
    translate(modelview,[-0.1,0,0]);
    currentModelNumber = 6;
    update_uniform(modelview,projection,6);
    
    rotate(modelview,degToRad(55),[1,0,0]);
    update_uniform(modelview,projection,6);
    rotate(modelview,degToRad(-55),[-1,0,0]);
    rotate(modelview,degToRad(200),[1,0,0]);
    
    update_uniform(modelview,projection,6);
    translate(modelview,[0.6,0,0]);
    update_uniform(modelview,projection,6);
    rotate(modelview,degToRad(55),[1,0,0]);
    update_uniform(modelview,projection,6);
    rotate(modelview,degToRad(55),[1,0,0]);
    update_uniform(modelview,projection,6);
    rotate(modelview,degToRad(-55),[-1,0,0]);
    rotate(modelview,degToRad(-55),[-1,0,0]);
    rotate(modelview,degToRad(90),[0,1,0]);
    translate(modelview,[0,0,-0.1]);
    update_uniform(modelview,projection,6);
    mvPopMatrix();
    //第二个轮杠
    mvPushMatrix();
    
    installModel(objects[6]);
    rotate(modelview,degToRad(carangle),[0,1,0]);//animation
    translate(modelview,[2.25,0.27,0.5]);
    rotate(modelview,degToRad(carangle2),[1,0,0]);
    currentModelNumber = 6;
    update_uniform(modelview,projection,6);
    rotate(modelview,degToRad(55),[1,0,0]);
    
    currentModelNumber = 6;
    update_uniform(modelview,projection,6);
    rotate(modelview,degToRad(255),[1,0,0]);
    
    currentModelNumber = 6;
    update_uniform(modelview,projection,6);
    translate(modelview,[-0.6,0,0]);
    update_uniform(modelview,projection,6);
    rotate(modelview,degToRad(55),[1,0,0]);
    update_uniform(modelview,projection,6);
    rotate(modelview,degToRad(55),[1,0,0]);
    update_uniform(modelview,projection,6);
    rotate(modelview,degToRad(-55),[-1,0,0]);
    rotate(modelview,degToRad(-55),[-1,0,0]);
    rotate(modelview,degToRad(90),[0,1,0]);
    translate(modelview,[0,0,0.1]);
    update_uniform(modelview,projection,6);
    translate(modelview,[0,0,0.4]);
    update_uniform(modelview,projection,6);
    mvPopMatrix();
    
    //inner ring
    mvPushMatrix();
    switchRing(true);
    installModel(objects[2]);
    rotate(modelview,degToRad(90),[1,0,0]);
    translate(modelview,[0,0,-0.16]);
    rotate(modelview,degToRad(180),[0,1,0]);
    currentModelNumber = 2;
    update_uniform(modelview,projection,2);
    mvPopMatrix();
    
    //grass ring
    mvPushMatrix();
    switchRing(false);
    currentModelNumber = 3;
     switchLand(true);
    installModel(objects[3]);
   
    
    rotate(modelview,degToRad(90),[1,0,0]);
    update_uniform(modelview,projection,3);
    mvPopMatrix();
    switchLand(false);
    
    //灯柱子
    mvPushMatrix();
    installModel(objects[8]);
    rotate(modelview,degToRad(90),[1,0,0]);
     translate(modelview,[0,0,-0.5]);
    update_uniform(modelview,projection,8);
    //灯球
    if(y<0){switchShaders1(true);}
    installModel(objects[0]);
    scale(modelview, [0.23, 0.23, 0.23]);
    translate(modelview,[0,0,-1.4]);
    update_uniform(modelview,projection,0);
    mvPopMatrix();
    //树 
    mvPushMatrix();
    switchShaders1(false);
    switchtree(true);
    installModel(objects[8]);
    rotate(modelview,degToRad(90),[1,0,0]);
    translate(modelview,[0.7,0,-0.3]);
    scale(modelview, [2.2, 2.2, 0.5]);
    update_uniform(modelview,projection,8);
    
    translate(modelview,[-0.5,-0.2,0]);
    scale(modelview, [0.7, 0.7, 0.7]);
    update_uniform(modelview,projection,8);
    
    translate(modelview,[-0.2,0.75,0]);
    scale(modelview, [1.5,1.5,1.5]);
    update_uniform(modelview,projection,8);
    
    translate(modelview,[0.1,0.9,0.2]);
    scale(modelview, [0.4,0.4,0.4]);
    update_uniform(modelview,projection,8);
    translate(modelview,[-1,-5.5,0]);
    scale(modelview, [1.3,1.3,1.3]);
    update_uniform(modelview,projection,8);
    
    translate(modelview,[1.5,-0.4,0]);
    scale(modelview, [0.8,0.8,0.8]);
    update_uniform(modelview,projection,8);
    
    translate(modelview,[0.6,0.15,0]);
    scale(modelview, [0.8,0.8,0.8]);
    update_uniform(modelview,projection,8);
    
    translate(modelview,[2.2,3,0]);
    scale(modelview, [1.2,1.2,1.2]);
    update_uniform(modelview,projection,8);
    translate(modelview,[0.15,0.15,0]);
    scale(modelview, [1.2,1.2,1.2]);
    update_uniform(modelview,projection,8);
    translate(modelview,[-0.1,0.3,0]);
    scale(modelview, [0.8,0.8,0.8]);
    update_uniform(modelview,projection,8);
    
    
    
    switchtree(false);
    mvPopMatrix();
    //树叶
    mvPushMatrix();
    switchLand(true);
    installModel(objects[9]);
    rotate(modelview,degToRad(-90),[1,0,0]);
    translate(modelview,[0.7,0,1]);
    update_uniform(modelview,projection,9);
    translate(modelview,[-1.09,0.5,-0.25]);
    scale(modelview, [0.7, 0.7, 0.7]);
    update_uniform(modelview,projection,8);
    translate(modelview,[-0.45,-1.5,0.2]);
    scale(modelview, [1.5,1.5,1.5]);
    update_uniform(modelview,projection,8);
    translate(modelview,[-0.65,2.7,-0.34]);
    scale(modelview, [0.4,0.4,0.4]);
    update_uniform(modelview,projection,8);
    translate(modelview,[2.17,-12.1,-0.24]);
    scale(modelview, [0.8,0.8,0.8]);
    update_uniform(modelview,projection,8);
     translate(modelview,[2.6,16.5,0]);
    scale(modelview, [0.9,0.9,0.9]);
    update_uniform(modelview,projection,8);
    translate(modelview,[1.95,-0.5,-0.1]);
    scale(modelview, [0.8,0.8,0.8]);
    update_uniform(modelview,projection,8);
    translate(modelview,[7,-9.4,0]);
    scale(modelview, [1.2,1.2,1.2]);
    update_uniform(modelview,projection,8);
    translate(modelview,[0.45,-0.5,0]);
    scale(modelview, [1.2,1.2,1.2]);
    update_uniform(modelview,projection,8);
    translate(modelview,[-0.3,-0.9,0]);
    scale(modelview, [0.8,0.8,0.8]);
    update_uniform(modelview,projection,8);
    mvPopMatrix();
    switchLand(false);
    
}

function animate() {
        var timeNow = new Date().getTime();
        if (lastTime != 0) {
            var elapsed = timeNow - lastTime;
            SunAngle += 0.05 * elapsed;
            carangle -= 0.05 * elapsed;
            carangle2 += 0.5 * elapsed;
            
        }
        lastTime = timeNow;
    }
    function tick() {
        requestAnimFrame(tick);
        draw();
        if (document.getElementById("my_gl").checked){animate();}
        //animate();
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
    tick();
}







