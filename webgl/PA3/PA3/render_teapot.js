/**
* @fileoverview This file is concerned with all parts of the rendering process for the teapot.
* It sets up the vertex position, normal and tri-index buffers. It also contains the helper
* function to draw the teapot. This file is dependent upon gl-matrix-min.js and webgl-utils.js.
*/

// Global buffers used to render teapot
var teapotVertexBuffer;
var teapotVertexNormalBuffer;
var teapotTriIndexBuffer;

/**
* Function to parse the teapot_0.obj file and setup the vertex and tri-index buffers. Then,
* 	based on the data collected, calculating the vertex normal buffers.
* @param {string} raw_file_text The entire teapot_0.obj file as one string
* @return None
*/
function setupTeapotBuffers(raw_file_text){
	var vertices = [];
	var faces = [];
	count_vertices = 0;
	count_faces = 0;
	
	// read in vertex and face data
	var lines = raw_file_text.split("\n");
	for (var line_num in lines){
		list_elements = lines[line_num].split(' ');
		
		// line corresponds to vertex information
		if (list_elements[0] == 'v'){
			vertices.push(parseFloat(list_elements[1]));
			vertices.push(parseFloat(list_elements[2]));
			vertices.push(parseFloat(list_elements[3]));
			count_vertices += 1;
		}
		// line corresponds to face information
		else if(list_elements[0] == 'f'){
			faces.push(parseInt(list_elements[2])-1);
			faces.push(parseInt(list_elements[3])-1);
			faces.push(parseInt(list_elements[4])-1);
			count_faces += 1;
		}
	}
	
	// bind vertex data
	teapotVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	teapotVertexBuffer.numItems = count_vertices;
	
	// calculate normals
	var normals = [];
	for (var i=0; i < count_vertices; i++){
		normals.push(0);
		normals.push(0);
		normals.push(0);
	}
	// Calculate vertex normals
	calculateNormals(vertices, faces, count_faces, count_vertices, normals);
	
	// bind normal data
	teapotVertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    teapotVertexNormalBuffer.itemSize = 3;
    teapotVertexNormalBuffer.numItems = count_vertices; // JC: orignally it was count_faces !!
	
	// bind face data
    teapotTriIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotTriIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), gl.STATIC_DRAW);
	teapotTriIndexBuffer.numItems = count_faces;
	
	// Global indicator that teapot can now be rendered
	ready_to_draw = true;
}

/**
* Helper function to draw() routine to set the vertex positions and vertex normals before
*   drawing the teapot for each frame. Also switches the shader to the teapot settings.
* @return None
*/
function drawTeapot(){
	switchShaders(false);
	uploadViewDirToShader()
	
	// Draw the cube by binding the array buffer to the cube's vertices
	// array, setting attributes, and pushing it to GL.
	gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
		
	gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);  

	// Draw the cube.
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotTriIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, count_faces * 3, gl.UNSIGNED_SHORT, 0);
}

/**
* This function calculates the vertex normals by calculating the surface normals
*   of each face of the teapot, and then for each point averaging the surface normals
*   of the faces it is a part of.
* @param {Array.<[float, float, float]>} vertices Array of floats
*   indicating the X,Y,Z coordinates of each vertex in space
* @param {Array.<[int, int, int]>} Array of integers specifing
*   which verticies constitute the triangle face
* @param {int} numT Number of triangles in the terrain
* @param {int} numV Number of verticies in the terrain
* @param {Array.<[float, float, float]>} Array of floats
*   indicating the X,Y,Z components of each face's normal vector
* @return None
*/
function calculateNormals(vertices, faces, numT, numV, normals){
    var faceNormals = [];
    
    // calculate normals for each triangle
    for (var i = 0; i < numT; i++){
        var v1 = faces[i*3];
        var v2 = faces[i*3 + 1];
        var v3 = faces[i*3 + 2];
        
        // compute surface normal
        var vector1 = vec3.fromValues(vertices[3*v2]-vertices[3*v1], vertices[3*v2+1]-vertices[3*v1+1], vertices[3*v2+2]-vertices[3*v1+2]);
        var vector2 = vec3.fromValues(vertices[3*v3]-vertices[3*v1], vertices[3*v3+1]-vertices[3*v1+1], vertices[3*v3+2]-vertices[3*v1+2]);
        var normal = vec3.create();
        vec3.cross(normal, vector1, vector2);
		
        faceNormals.push(normal[0]);
        faceNormals.push(normal[1]);
        faceNormals.push(normal[2]);
    }
	    
    // initialize count array to all 0s
    var count = []
    for (var i = 0; i < numV; i++)
        count.push(0);
    
    // calculate sum of the surface normal vectors to which each vertex belongs
    for (var i = 0; i < numT; i++){
        var v1 = faces[i*3 + 0]
        var v2 = faces[i*3 + 1]
        var v3 = faces[i*3 + 2]
        // iterate over each vertex in triangle
        count[v1] += 1
        count[v2] += 1
        count[v3] += 1
        
        // vertex 0
        normals[3*v1 + 0] += faceNormals[i*3 + 0];
        normals[3*v1 + 1] += faceNormals[i*3 + 1];
        normals[3*v1 + 2] += faceNormals[i*3 + 2];
        
        // vertex 1
        normals[3*v2 + 0] += faceNormals[i*3 + 0];
        normals[3*v2 + 1] += faceNormals[i*3 + 1];
        normals[3*v2 + 2] += faceNormals[i*3 + 2];
        
        // vertex 2
        normals[3*v3 + 0] += faceNormals[i*3 + 0];
        normals[3*v3 + 1] += faceNormals[i*3 + 1];
        normals[3*v3 + 2] += faceNormals[i*3 + 2];
    }
	    
    // average each normal vector in normalsNormalBuffer
    // then normalize each normal vector in normalsNormalBuffer
    for (var i = 0; i < numV; i++){
        // average out the adjacent surface normal vectors for point
        normals[3*i+0] = normals[3*i+0]/count[i];
        normals[3*i+1] = normals[3*i+1]/count[i];
        normals[3*i+2] = normals[3*i+2]/count[i];
        
        // normalize the normal vector
        var normal = vec3.fromValues(normals[i*3+0], normals[i*3+1], normals[i*3+2]);
        var normalized = vec3.create();
        vec3.normalize(normalized, normal);
        
        // store the normal vector
        normals[i*3+0] = normalized[0];
        normals[i*3+1] = normalized[1];
        normals[i*3+2] = normalized[2];
    }
}