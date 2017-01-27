/// <reference path="Engine/Core/SceneObject.js" />
//.so means secene object
class Satelite extends SceneObject{

    constructor(name, modelName, myCanvas, worldCoords)
    {
        super(name, modelName, worldCoords);
        this.radius = 10;
        this.angle = 1.6;
        this.orbitSpeed = -0.01;
        this.MaxOrbitSpeed = 0.5;
        this.MinRadius = 7.5;
        this.MaxRadius = 30;


        myCanvas.subscribeOnKeyDown('ArrowDown', makeCallback(this, this.reduceSpeed));
        myCanvas.subscribeOnKeyDown('ArrowUp', makeCallback(this, this.increaseSpeed));
        myCanvas.subscribeOnKeyDown('ArrowRight', makeCallback(this, this.increaseOrbit));
        myCanvas.subscribeOnKeyDown('ArrowLeft', makeCallback(this, this.decreaseOrbit));

    }

    onRendering() {
        var newX = this.radius * Math.cos(this.angle);
        var newZ = this.radius * Math.sin(this.angle);
        this.setPosition(newX, null, newZ);

        var maxRadiant = (Math.PI / 180) * 360;
        this.angle += this.orbitSpeed;

        if (this.angle > maxRadiant)
            this.angle -= maxRadiant;
        else if (this.angle < -maxRadiant) {
            this.angle += maxRadiant;
        }
        super.rotate(0, -this.orbitSpeed, 0);
        //this.logDistance();
    }

    logDistance() {
        var x = this.worldCoords[0];
        var y = this.worldCoords[1];
        var z = this.worldCoords[2];

        console.log(Math.sqrt(x * x + y * y + z * z));
    }

    increaseSpeed() {
        if (this.orbitSpeed < this.MaxOrbitSpeed)
            this.orbitSpeed += 0.01;
    }

    reduceSpeed() {
        if (this.orbitSpeed > -this.MaxOrbitSpeed)
            this.orbitSpeed -= 0.01;
    }

    increaseOrbit() {
        if(this.radius < this.MaxRadius)
            this.radius += 0.1;
    }

    decreaseOrbit() {
        if (this.radius > this.MinRadius)
            this.radius -= 0.1;
    }

}