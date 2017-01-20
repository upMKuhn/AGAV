class Renderer{
    constructor(shaderProgram){
        this.shaderProg = shaderProgram;
        this.shader = null;
    }

    drawObject(sceneObject, camera) {

        var renderOptions = sceneObject.RenderOptions;
        var vertexBuffer = sceneObject.getVertexBuffer();
        var glBuffers = vertexBuffer.getBuffers();
        var modelMatrix = sceneObject.getModelMatrix();
        var viewMatrix = camera.getViewMatrix();
        var viewModelMatrix = camera.applyToModelView(modelMatrix);

        sceneObject.applyModelMatrix(viewMatrix)

        this.shader = this.shaderProg.getDefaultShader();
        this.shader.setViewModelMatrix(viewMatrix);
        this.shader.setProjectionMatrix(camera.getProjectionMatrix());
        this.shader.bindPositionBuffer(glBuffers[0])
        this.shader.setVertexColorsRGBA(sceneObject.rgba);
        this.shader.draw(glBuffers, renderOptions);
    }



}



