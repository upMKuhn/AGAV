class CameraControl {

    constructor(camera, myCanvas, keySetup)
    {
        this.myCanvas = myCanvas;
        this.camera = camera;
        this.enableZoom = true;
        this.lastKnownMousePos = null;
        this.mouseSensivity = 1;
        this.keySetup = getOrDefault(keySetup, {
            moveUpOrDownOrLeftOrRight: ['leftMouseBtn'], //Rotation x,y
            moveUpOrDownWithAlt: ['alt', 'leftMouseBtn'], //Camera move Y
            moveLeftOrRightWithShift: ['shift', 'leftMouseBtn'], // Camera move X
            moveLeftOrRightWithMouseMiddleBtn: ['middleMouseBtn'], // Camera Z rotation
        });
        keySetup = this.keySetup;
        //ROATIONS
        myCanvas.subscribeToMouseWheelUp(makeCallback(this, this.onScrollUp))
        myCanvas.subscribeToMouseWheelDown(makeCallback(this, this.onScrollDown))
        myCanvas.subscribeToMouseMovementWithKeyCombo(keySetup.moveUpOrDownOrLeftOrRight, makeCallback(this, this.onMoveUpOrDownOrLeftOrRight));
        //MOVEMENT
        myCanvas.subscribeToMouseMovementWithKeyCombo(keySetup.moveLeftOrRightWithShift, makeCallback(this, this.onMoveLeftOrRightWithShift));
        myCanvas.subscribeToMouseMovementWithKeyCombo(keySetup.moveUpOrDownWithAlt, makeCallback(this, this.onMoveUpOrDownWithAlt));
        myCanvas.subscribeToMouseMovementWithKeyCombo(keySetup.moveLeftOrRightWithMouseMiddleBtn, makeCallback(this, this.onMoveLeftOrRightWithMouseMiddleBtn));

    }

    onScrollUp() {
        this.camera.moveForward();
    }

    onScrollDown() {
        this.camera.moveBackward();
    }

    onMoveUpOrDownOrLeftOrRight(mouseX, mouseY) {
        if (this.lastKnownMousePos == null) {
            this.lastKnownMousePos = [mouseX, mouseY];
        }

        var distance = Math.abs(this.lastKnownMousePos[0] - mouseY);
        if (this.lastKnownMousePos[1] - mouseY > 0 && distance > this.mouseSensivity) {
            this.camera.pitchDown();
        }
        else if (this.lastKnownMousePos[1] - mouseY < 0 && distance > this.mouseSensivity) {
            this.camera.pitchUp();
        }

        if (this.lastKnownMousePos[0] - mouseX > 0 && distance > this.mouseSensivity) {
            this.camera.headingRight();
        }
        else if (this.lastKnownMousePos[0] - mouseX < 0 && distance > this.mouseSensivity) {
            this.camera.headingLeft();
        }
        this.lastKnownMousePos = [mouseX, mouseY];
    }

    onMoveUpOrDownWithAlt(mouseX, mouseY) {
        if (this.lastKnownMousePos == null) {
            this.lastKnownMousePos = [mouseX, mouseY];
        }

        var distance = Math.abs(this.lastKnownMousePos[0] - mouseY);
        if (this.lastKnownMousePos[1] - mouseY > 0 && distance > this.mouseSensivity) {
            this.camera.moveDown();
        }
        else if (this.lastKnownMousePos[1] - mouseY < 0 && distance > this.mouseSensivity) {
            this.camera.moveUp();
        }
        this.lastKnownMousePos = [mouseX, mouseY];
    }

    onMoveLeftOrRightWithShift(mouseX,mouseY) {
        if (this.lastKnownMousePos == null) {
            this.lastKnownMousePos = [mouseX, mouseY];
        }

        var distance = Math.abs(this.lastKnownMousePos[0] - mouseX);
        if (this.lastKnownMousePos[0] - mouseX > 0 && distance > this.mouseSensivity) {
            this.camera.moveRight();
        }
        else if (this.lastKnownMousePos[0] - mouseX < 0 && distance > this.mouseSensivity) {
            this.camera.moveLeft();
        }
        this.lastKnownMousePos = [mouseX, mouseY];
    }

    onMoveLeftOrRightWithMouseMiddleBtn(mouseX, mouseY) {
        if (this.lastKnownMousePos == null) {
            this.lastKnownMousePos = [mouseX, mouseY];
        }

        var distance = Math.abs(this.lastKnownMousePos[0] - mouseX);
        if (this.lastKnownMousePos[0] - mouseX > 0 && distance > this.mouseSensivity) {
            this.camera.rollRight();
        }
        else if (this.lastKnownMousePos[0] - mouseX < 0 && distance > this.mouseSensivity) {
            this.camera.rollLeft();

        }
        this.lastKnownMousePos = [mouseX, mouseY];
    }

}