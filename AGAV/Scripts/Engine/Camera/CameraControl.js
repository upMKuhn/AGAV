class CameraControl {

    constructor(camera, myCanvas, keySetup)
    {
        this.myCanvas = myCanvas;
        this.camera = camera;
        this.enableZoom = true;
        this.lastKnownMousePos = null;
        this.keySetup = getOrDefault(keySetup, {
            moveLeftOrRight: ['shift', 'leftMouseBtn'],
            moveUpOrDown: ['alt', 'leftMouseBtn']
        });
        keySetup = this.keySetup;
        myCanvas.subscribeToMouseWheelUp(makeCallback(this, this.onScrollUp))
        myCanvas.subscribeToMouseWheelDown(makeCallback(this, this.onScrollDown))
        myCanvas.subscribeToMouseMovementWithKeyCombo(keySetup.moveLeftOrRight, makeCallback(this, this.onMoveLeftOrRight));
        myCanvas.subscribeToMouseMovementWithKeyCombo(keySetup.moveUpOrDown, makeCallback(this, this.onMoveUpOrDown));

    }

    onMoveLeftOrRight(mouseX,mouseY) {
        console.log("onMoveLeftOrRight: " + mouseX + " " + mouseY)
        if (this.lastKnownMousePos == null) {
            this.lastKnownMousePos = [mouseX, mouseY];
        }
        else if (this.lastKnownMousePos[0] - mouseX > 0) {
            this.camera.moveRight();
        }
        else if (this.lastKnownMousePos[0] - mouseX < 0) {
            this.camera.moveLeft();
        }

        this.lastKnownMousePos = [mouseX, mouseY];
    }

    onMoveUpOrDown(mouseX, mouseY) {
        console.log("onMoveUpOrDown: " + mouseX + " " + mouseY)
        if (this.lastKnownMousePos == null) {
            this.lastKnownMousePos = [mouseX, mouseY];
        }
        else if (this.lastKnownMousePos[1] - mouseY > 0) {
            this.camera.moveDown();
        }
        else if (this.lastKnownMousePos[1] - mouseY < 0) {
            this.camera.moveUp();
        }
        this.lastKnownMousePos = [mouseX, mouseY];
    }

    onScrollUp() {
        console.log("Scrolled Up");
        this.camera.moveForward();
    }

    onScrollDown() {
        console.log("Scrolled down")
        this.camera.moveBackward();
    }

}