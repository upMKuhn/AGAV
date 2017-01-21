﻿class RenderQueue{
    constructor(shaderProgram){
        this.shaderProg = shaderProgram;
        this.shader = null;
        this.queue = [];
    }

    enqueue(renderObject) {
        this.queue.push({
            renderObj: renderObject,
            vertexBuffer: renderObject.getVertexBuffer()
        });
    }

    drawObjects(camera) {

        var shader = this.shaderProg.getDefaultShader();
        for (var i = 0; i < this.queue.length; i++)
        {
            var item = this.queue[i];
            var renderObject = item.renderObj;
            var vertexBuffer = item.vertexBuffer;

            var viewMatrix = camera.getViewMatrix();
            var viewModelMatrix = renderObject.applyModelMatrix(viewMatrix);
            var projectionMatrix = camera.getProjectionMatrix();

            shader.setViewModelMatrix(viewMatrix);
            shader.setProjectionMatrix(projectionMatrix);

            vertexBuffer.applyToShader(shader);
            shader.draw(vertexBuffer);
        }


        this.queue.length = 0;
    }



}


