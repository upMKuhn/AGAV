class RenderQueue{
    constructor(foundation) {
        this.foundation = foundation;
        this.queue = [];
    }

    enqueue(renderObject) {
        this.queue.push({
            renderObj: renderObject,
            vertexBuffer: renderObject.getVertexBuffer()
        });
    }

    drawObjects(camera) {

        for (var i = 0; i < this.queue.length; i++)
        {
            var item = this.queue[i];
            var renderObject = item.renderObj;
            var vertexBuffer = item.vertexBuffer;
            var program = this.__getShaderProgram(vertexBuffer.shaderProgramName);
            var viewModelMatrix = camera.getViewMatrix();
            var projectionMatrix = camera.getProjectionMatrix();
            renderObject.applyModelMatrix(viewModelMatrix);
            program.activate();

            if (program) {
                var shader = program.getShader();
                shader.setViewModelMatrix(viewModelMatrix);
                shader.setProjectionMatrix(projectionMatrix);

                vertexBuffer.applyToShader(shader);
                shader.draw(vertexBuffer);
            }
        }


        this.queue.length = 0;
    }

    __getShaderProgram(name)
    {
        return this.foundation.getShaderProgram(name);
    }

}



