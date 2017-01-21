class Camera {
    constructor(x, y, z, pitch, heading, roll)
    {
        this.x = x;
        this.y = y;
        this.z = z;

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
        this.x -= this.moveSpeed;
    }

    moveRight() {
        console.log("X: " + this.x + " Y:" + this.y + " Z" + this.z);

        this.x += this.moveSpeed;
    }

    moveUp() {
        console.log("X: " + this.x + " Y:" + this.y + " Z" + this.z);

        this.y += this.moveSpeed;
    }

    moveDown() {
        console.log("X: " + this.x + " Y:" + this.y + " Z" + this.z);

        this.y -= this.moveSpeed;
    }

    moveForward() {
        console.log("X: " + this.x + " Y:" + this.y + " Z" + this.z);
        this.z += this.moveSpeed * 10;
    }

    moveBackward() {
        console.log("X: " + this.x + " Y:" + this.y + " Z" + this.z);
        this.z -= this.moveSpeed * 10;
    }

    getViewMatrix() {
        var viewMatrix = mat4.create();
        mat4.identity(viewMatrix);
        //mat4.lookAt([0, 0,  0], [0, 0, 0], [0, 1, 0], viewMatrix);
        mat4.translate(viewMatrix, [this.x, this.y, this.z]);
        mat4.rotateX(viewMatrix, this.pitch, viewMatrix);
        mat4.rotateY(viewMatrix, this.heading, viewMatrix);
        mat4.rotateZ(viewMatrix, this.roll, viewMatrix);
        return viewMatrix;
    }

    getProjectionMatrix() {
        var projectionMatrix = mat4.create();
        mat4.perspective(100, gl.viewportWidth / gl.viewportHeight, 5, 0.0, projectionMatrix);
        return projectionMatrix;
    }

    setMovementSpeed(newSpeed) {
        this.moveSpeed = newSpeed > 0 ? newSpeed : 0.1;
    }

    applyToModelView(modelViewMatrix) {
        mat4.lookAt([this.x, this.y, this.z], [0, 0, 0], [0, 1, 0], modelViewMatrix);
        mat4.rotateX(modelViewMatrix, this.pitch, modelViewMatrix);
        mat4.rotateY(modelViewMatrix, this.heading, modelViewMatrix);
        mat4.rotateZ(modelViewMatrix, this.roll, modelViewMatrix);
        return modelViewMatrix;
    }


    
    
    

}