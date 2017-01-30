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

            sceneObject.onRendering();

            var viewMatrix = camera.getViewMatrix();
            var worldMatrix = sceneObject.getModelMatrix();
            var projectionMatrix = camera.getProjectionMatrix();
            var vertexBuffers = item.vertexBuffers;

            for (var j = 0; j < vertexBuffers.length; j++) {
                var buffer = vertexBuffers[j];
                var program = this.__getShaderProgram(buffer.shaderProgramName);
                if (program) {
                    program.activate();

                    var shader = program.getShader();
                    shader.setViewMatrix(viewMatrix);
                    shader.setWorldMatrix(worldMatrix);
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



