class RenderQueue{
    constructor(foundation) {
        this.foundation = foundation;
        this.queue = [];
    }

    enqueue(renderObject) {
        this.queue.push({
            sceneObj: renderObject,
            vertexBuffers: renderObject.getVertexBuffers()
        });
    }

    drawObjects(camera) {

        for (var i = 0; i < this.queue.length; i++)
        {
            var item = this.queue[i];
            var sceneObject = item.sceneObj;
            var viewModelMatrix = camera.getViewMatrix();
            var projectionMatrix = camera.getProjectionMatrix();
            sceneObject.onRendering();
            sceneObject.applyModelMatrix(viewModelMatrix);

            var vertexBuffers = item.vertexBuffers;

            for (var j = 0; j < vertexBuffers.length; j++) {
                var buffer = vertexBuffers[j];
                var program = this.__getShaderProgram(buffer.shaderProgramName);
                if (program) {
                    program.activate();

                    var shader = program.getShader();
                    shader.setViewModelMatrix(viewModelMatrix);
                    shader.setProjectionMatrix(projectionMatrix);

                    buffer.applyToShader(shader);
                    shader.draw(buffer);
                }

            }
        }


        this.queue.length = 0;
    }

    __getShaderProgram(name)
    {
        return this.foundation.getShaderProgram(name);
    }

}



