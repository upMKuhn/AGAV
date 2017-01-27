/// <reference path="Engine/Core/SceneObject.js" />
//.so means secene object
class Satelite extends SceneObject{

    constructor(name, modelName, myCanvas, worldCoords)
    {
        super(name, modelName, worldCoords);
        this.radius = 10;
        this.angle = 1.6;
        this.orbitSpeed = -0.02;

        myCanvas.subscribeOnKeyCombo(['ArrowDown'], makeCallback(this, this.reduceSpeed));
        myCanvas.subscribeOnKeyCombo(['ArrowUp'], makeCallback(this, this.increaseSpeed));
        myCanvas.subscribeOnKeyCombo(['ArrowRight'], makeCallback(this, this.increaseOrbit));
        myCanvas.subscribeOnKeyCombo(['ArrowLeft'], makeCallback(this, this.decreaseOrbit));

    }

    onRendering() {
        var newX = this.radius * Math.cos(this.angle);
        var newZ = this.radius * Math.sin(this.angle)-(this.radius);
        this.setPosition(newX, null, newZ);

        var maxRadiant = (Math.PI / 180) * 360;
        this.angle += this.orbitSpeed;

        if (this.angle > maxRadiant)
            this.angle -= maxRadiant;
        else if (this.angle < -maxRadiant) {
            this.angle += maxRadiant;
        }

        super.rotate(0, -this.orbitSpeed, 0);
    }


    reduceSpeed() {
        this.orbitSpeed += 0.01;
    }

    increaseSpeed() {
        this.orbitSpeed -= 0.01;
    }

    increaseOrbit() {
        this.radius += 0.1;
    }

    decreaseOrbit() {
        this.radius -= 0.1;
    }

}