/// <reference path="Factory.js" />
/// <reference path="VertexBuffer.js" />

class SceneObject{
    constructor(model, shaderProgram)
    {
        this.rgba = model.color;
        this.shaderProgram = shaderProgram;
        this.objectName = model.ObjectName;
        this.model = model;
        this.vertexBuffer = Factory("VertexBuffer", [model.Vertex]);

        this.RenderOptions = model.RenderOptions;
        this.RenderOptions.drawShape = WebGlDataTypeFactory.Enum(this.RenderOptions.drawShape)
        this.objectPosition = model.objectPosition;
    }

    getVertexBuffer() { return this.vertexBuffer; }


    applyModelMatrix(modelMatrix) {
        var xyz = vec3.create([this.objectPosition[0], this.objectPosition[1], this.objectPosition[2]]);
        mat4.translate(modelMatrix, xyz);
        mat4.rotateX(modelMatrix, this.objectPosition[3]);
        mat4.rotateY(modelMatrix, this.objectPosition[4]);
        mat4.rotateZ(modelMatrix, this.objectPosition[5]);

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





