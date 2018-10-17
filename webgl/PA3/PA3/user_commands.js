/**
* @fileoverview This file is responsible for the manipulation of the camera view. It takes
* user input upon arrow key strokes and manipulates the view accordingly. This file is dependent
* upon gl-matrix-min.js and webgl-utils.js.
*/

var origUp = vec3.fromValues(0.0, 1.0, 0.0);
var origEyePt = vec3.fromValues(0.0,0.0,10.0);

/**
* Function which adds a new rotation around a given axis to the global quaternion 
* @param {float} rotationRate Angle (in radians) by which to rotate around the given axis
* @param {vec3.<float, float, float>} rotAxis Axis to rotate around
* @return None
*/
function quatRotation(rotationRate, rotAxis){
    // create a new quaternion to apply new rotation
    var tempQuat = quat.create();
    quat.setAxisAngle(tempQuat, rotAxis, rotationRate);
    quat.normalize(tempQuat, tempQuat);
    
    // apply new rotation to global quaternion
    quat.multiply(globalQuat, tempQuat, globalQuat);
    quat.normalize(globalQuat, globalQuat);
}

/**
* Function to handle user input (from arrow keys)
* @param {keystroke event} event Data structure containing information about the previous
*   keystroke.
*/
function handleKeyDown(event){
	// left arrow key -> orbit left
    if (event.keyCode == 37){
        // rotate around origUp
        quatRotation(-0.05, origUp);
        
        vec3.transformQuat(eyePt, origEyePt, globalQuat);
		vec3.normalize(viewDir, eyePt);
		vec3.scale(viewDir, viewDir, -1);
    }
    // right arrow key -> orbit right
    else if (event.keyCode == 39){
        // rotate around origUp
        quatRotation(0.05, origUp);
        
        vec3.transformQuat(eyePt, origEyePt, globalQuat);
		vec3.normalize(viewDir, eyePt);
		vec3.scale(viewDir, viewDir, -1);
    }
	// Up arrow key -> spin teapot right
	else if (event.keyCode == 38){
		modelYRotationRadians += 0.05;
	}
	// Down arrow key -> spin teapot left
	else if (event.keyCode == 40){
		modelYRotationRadians -= 0.05;
	}
}

