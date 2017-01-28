/// <reference path="Factory.js" />
/// <reference path="VertexBuffer.js" />

class RenderModel {
    constructor(model, vertexBuffers)
    {
        this.model = model;
        this.shaderProgramName = model;
        this.objectName = model.ObjectName;
        this.objectPosition = model.objectPosition;

        vertexBuffers = getOrDefault(vertexBuffers, []);
        if (!(vertexBuffers instanceof Array))
            this.vertexBuffers = [vertexBuffers];
        else
            this.vertexBuffers = vertexBuffers;

    }

    getName() { return this.objectName; }
    getVertexBuffers() {
        return this.vertexBuffers;
    }

    getCollisionBox() {
        var dimensions = [];
        //note that updates at runtime to the model or mesh does not affect the collision box
        //So either must be implemented or getCollisionBox called more frequently. 
        //Data/Dimensions is always copied, because positions need to be applied.
        for (var i = 0; i < this.vertexBuffers.length; i++)
        {
            var dimension = this.vertexBuffers[i].getDimensions();
            //cloned ;)
            dimensions.push(dimension.getDimensionWithAdjustedPosition(this.objectPosition));
        }

        return Factory("CollisionBox", [dimensions, this.objectPosition]);
    }


}





