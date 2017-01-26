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



}





