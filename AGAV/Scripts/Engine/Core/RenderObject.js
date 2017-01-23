/// <reference path="Factory.js" />
/// <reference path="VertexBuffer.js" />

class RenderObject {
    constructor(model, vertexBuffer)
    {
        this.model = model;
        this.shaderProgramName = model;
        this.objectName = model.ObjectName;
        this.vertexBuffer = vertexBuffer;
        this.objectPosition = model.objectPosition;
    }

    setVertexBuffer(buffer) { this.vertexBuffer = buffer; }

    getVertexBuffer() { return this.vertexBuffer; }


    applyModelMatrix(modelMatrix) {
        var xyz = vec3.create([this.objectPosition[0], this.objectPosition[1], this.objectPosition[2]]);
        mat4.translate(modelMatrix, xyz, modelMatrix);
        mat4.rotateX(modelMatrix, this.objectPosition[3], modelMatrix);
        mat4.rotateY(modelMatrix, this.objectPosition[4]), modelMatrix;
        mat4.rotateZ(modelMatrix, this.objectPosition[5], modelMatrix);

        return modelMatrix;
    }

    getModelMatrix()
    {
        var modelMatrix = mat4.create();
        mat4.identity(modelMatrix);
        modelMatrix = this.applyModelMatrix(modelMatrix);
        return modelMatrix;
    }

}





