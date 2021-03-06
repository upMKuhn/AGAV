﻿class Camera {
    constructor(x, y, z, pitch, heading, roll, minZoom, maxZoom)
    {
        this.x = x;
        this.y = y;
        this.z = z;

        this.minZoom = getOrDefault(minZoom, 0);
        this.maxZoom = getOrDefault(maxZoom, 65);

        this.pitch = pitch;
        this.heading = heading;
        this.roll = roll;
        this.moveSpeed = 0.01;
    }

    pitchUp() {
        this.pitch += this.moveSpeed;
    }

    pitchDown() {
        this.pitch -= this.moveSpeed;
    }

    headingLeft() {
        this.heading += this.moveSpeed;
    }

    headingRight() {
        this.heading -= this.moveSpeed;
    }

    rollLeft() {
        this.roll += this.moveSpeed;
    }

    rollRight() {
        this.roll -= this.moveSpeed;
    }


    moveLeft() {
        console.log("X: " + this.x + " Y:" + this.y + " Z" + this.z);
        this.x -= this.moveSpeed *10;
    }

    moveRight() {
        console.log("X: " + this.x + " Y:" + this.y + " Z" + this.z);

        this.x += this.moveSpeed * 10;
    }

    moveUp() {
        console.log("X: " + this.x + " Y:" + this.y + " Z" + this.z);

        this.y += this.moveSpeed * 10;
    }

    moveDown() {
        console.log("X: " + this.x + " Y:" + this.y + " Z" + this.z);

        this.y -= this.moveSpeed * 10;
    }

    moveForward() {
        if (Math.abs(this.z) <= this.minZoom)
            return;
        this.z += this.moveSpeed * 60;
    }

    moveBackward() {
        if (Math.abs(this.z) >= this.maxZoom)
            return;
        this.z -= this.moveSpeed * 60;
    }

    getViewMatrix() {
        var viewMatrix = mat4.create();
        mat4.identity(viewMatrix);
        mat4.lookAt(viewMatrix, [this.x, this.y, this.z], [0, 0, 0], [0, 1, 0]);
        mat4.translate(viewMatrix, [this.x, this.y, this.z]);
        mat4.rotateX(viewMatrix, this.pitch, viewMatrix);
        mat4.rotateY(viewMatrix, this.heading, viewMatrix);
        mat4.rotateZ(viewMatrix, this.roll, viewMatrix);
        return viewMatrix;
    }

    getProjectionMatrix() {
        var projectionMatrix = mat4.create();
        mat4.perspective(90, gl.viewportWidth / gl.viewportHeight, 0.9, 0.0, projectionMatrix);
        mat4.perspective(60, gl.viewportWidth / gl.viewportHeight,0.1, 100.0, projectionMatrix)
        return projectionMatrix;
    }

    setMovementSpeed(newSpeed) {
        this.moveSpeed = newSpeed > 0 ? newSpeed : 0.1;
    }

    applyToModelView(modelViewMatrix) {
        mat4.lookAt([this.x, this.y, this.z], [0, 0, 0], [0, 1, 0], modelViewMatrix);
        mat4.translate(viewMatrix, [this.x, this.y, this.z]);
        mat4.rotateX(modelViewMatrix, this.pitch, modelViewMatrix);
        mat4.rotateY(modelViewMatrix, this.heading, modelViewMatrix);
        mat4.rotateZ(modelViewMatrix, this.roll, modelViewMatrix);
        return modelViewMatrix;
    }

    getEyePositionVe3() { return [this.x, this.y, this.z]; }
    
    
    

}