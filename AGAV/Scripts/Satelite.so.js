/// <reference path="Engine/Core/SceneObject.js" />
//.so means secene object
class Satelite extends SceneObject{

    constructor(name, modelName, worldCoords)
    {
        super(name, modelName, worldCoords);
        this.radius = 10;
        this.angle = 1.5;
        this.orbitSpeed = 0.01;
    }

    onRendering() {
        var newX = this.radius * Math.cos(this.angle);
        var newZ = this.radius * Math.sin(this.angle)-(this.radius);
        this.setPosition(newX, null, newZ);

        var maxRadiant = (Math.PI / 180) * 360;
        this.angle += this.orbitSpeed;

        if (this.angle > maxRadiant)
            this.angle -= maxRadiant;

        super.rotate(0, -this.orbitSpeed, 0);


    }


}