/// <reference path="TextureLoadQueueItem.js" />
/// <reference path="../Core/Buffers/TextureBuffer.js" />
class AssetLoader {
    constructor(assetLoadQueue, foundationObj, onDoneCallback)
    {
        this.assetLoadQueue = assetLoadQueue;
        this.onDoneCallback = getOrDefault(onDoneCallback, function () { });
        this.foundation = foundationObj;
        this.shaderProgamsToBeLinked = 0;
    }

    setCallbackOnDone(func) {
        this.onDoneCallback = getOrDefault(func, function () { });
        if (this.shaderProgamsToBeLinked <= 0)
            this.onDoneCallback();
    }

    addRenderModel(renderModel) {
        var buffers = renderModel.getVertexBuffers();

        for (var i = 0; i < buffers.length; i++)
            this.loadTextureIfNeeded(buffers[i]);

        this.foundation.add3dModel(renderModel);
    }

    loadModel(filePaths) {
        if (typeof filePaths == 'string')
            filePaths = [filePaths];

        for (var i = 0; i < filePaths.length; i++) {
            var queueItem = Factory("AssetLoadQueueItem", [filePaths[i], makeCallback(this, this.__onModelLoaded)]);
            this.assetLoadQueue.enqueue(queueItem)
        }
    }

    __onModelLoaded(model) {
        model.Mesh = getOrDefault(model.Mesh, []);
        if (!(model.Mesh instanceof Array))
            model.Mesh = [model.Mesh];

        var buffers = [];
        for (var i = 0; i < model.Mesh.length; i++) {
            var mesh = model.Mesh[i]
            var buffer = Factory(mesh.class, [mesh]);
            buffers.push(buffer);
        }

        var renderModel = Factory("RenderModel", [model, buffers]);
        this.addRenderModel(renderModel);
    }

    loadTextureIfNeeded(buffer)
    {
        if (buffer instanceof TextureBuffer) {
            var src = buffer.src
            var queueItem = Factory("TextureLoadQueueItem", [src, makeCallback(buffer, buffer.setImage)]);
            this.assetLoadQueue.enqueue(queueItem);
        }
    }
        

    loadProgram(filePaths) {
        if (typeof filePaths == 'string')
            filePaths = [filePaths];

        for (var i = 0; i < filePaths.length; i++) {
            var queueItem = Factory("AssetLoadQueueItem", [filePaths[i], makeCallback(this, this.__onProgramLoaded)]);
            this.assetLoadQueue.enqueue(queueItem)
        }
    }

    __onProgramLoaded(shaderProgramModel) {

        var fragShaderModel = shaderProgramModel.fragmentShader;
        var vertexShaderModel = shaderProgramModel.vertexShader;
        var shaderProgram = Factory("ShaderProgram", [shaderProgramModel.name]);

        var fragShader = Factory(fragShaderModel.shaderClass.name, [fragShaderModel, makeCallback(shaderProgram, shaderProgram.addShader)]);
        var vertexShader = Factory(vertexShaderModel.shaderClass.name, [vertexShaderModel, makeCallback(shaderProgram, shaderProgram.addShader)]);

        this.__addShaderProgram(shaderProgram);
        shaderProgram.subscripeOnProgramLinked(makeCallback(this, this.__onProgramLinked));
        shaderProgram.subscripeOnProgramLinked(makeCallback(fragShader, fragShader.onProgramLinked));
        shaderProgram.subscripeOnProgramLinked(makeCallback(vertexShader, vertexShader.onProgramLinked));

        //now that we have the model we quickly fetch the source code as well. 
        var vertexQueueItem = Factory("AssetLoadQueueItem", [vertexShaderModel.src, makeCallback(vertexShader, vertexShader.setSourceCodeAndCompile)]);
        var fragmentQueueItem = Factory("AssetLoadQueueItem", [fragShaderModel.src, makeCallback(fragShader, fragShader.setSourceCodeAndCompile)]);
        this.assetLoadQueue.enqueue(vertexQueueItem);
        this.assetLoadQueue.enqueue(fragmentQueueItem);

    }

    __addShaderProgram(programObj) {
        this.foundation.addShaderProgram(programObj);
        this.shaderProgamsToBeLinked++;
    }

    __onProgramLinked(program) {
        program.isLinked = true;
        this.shaderProgamsToBeLinked--;
        if (this.shaderProgamsToBeLinked <= 0)
            this.onDoneCallback();
    }

}