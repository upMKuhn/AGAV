/// <reference path="VertexBuffer.js" />
/// <reference path="ShaderProgram.js" />
/// <reference path="RenderObject.js" />
/// <reference path="Foundation.js" />
/// <reference path="Factory.js" />
/// <reference path="AssetLoadQueueItem.js" />
/// <reference path="AssetLoadQueue.js" />
/// <reference path="WebGlDataTypeFactory.js" />


if ($ == undefined)
    alert("Jquery was not loaded! Please connect to the internet.");

class Foundation{
    constructor(assetLoadQueue, camera){
        this.shaderProgams = {};
        this.shaderProgamsToBeLinked = 0;
        this.onInitalizedCallback = function(){};

        this.assetLoadQueue = assetLoadQueue;
        this.RenderObjects = {};
        this.camera = camera;
        this.renderQueue = new RenderQueue(this);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
    }

    

    getShaderProgram(name)
    {
        return this.shaderProgams[name].isLinked ? this.shaderProgams[name].prog : null;
    }

    callbackWhenInitalized(callback) {
        this.onInitalizedCallback = callback;
        if (this.shaderProgamsToBeLinked <= 0)
            callback();
    }

    loadProgram(filePaths) {
        if (typeof filePaths == 'string')
            filePaths = [filePaths];

        for (var i = 0; i < filePaths.length; i++) {
            var queueItem = Factory("AssetLoadQueueItem", [filePaths[i], makeCallback(this, this.__onProgramLoaded)]);
            this.assetLoadQueue.enqueue(queueItem)
        }
    }

    loadObject(filePaths) {
        if (typeof filePaths == 'string')
            filePaths = [filePaths];

        for (var i = 0; i < filePaths.length; i++) {
            var queueItem = Factory("AssetLoadQueueItem", [filePaths[i], makeCallback(this, this.__onObjectLoaded)]);
            this.assetLoadQueue.enqueue(queueItem)
        }
    }

    render() {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        for (var obj in this.RenderObjects) {
            this.renderQueue.enqueue(this.RenderObjects[obj]);
        }
        this.renderQueue.drawObjects(this.camera);
    }

    __onObjectLoaded(object) {
        var renderObject = Factory("RenderObject", [object]);
        this.RenderObjects[object.ObjectName] = renderObject;
        var buffer = Factory(object.Vertex.class, [object.Vertex]);
        renderObject.setVertexBuffer(buffer);

        //Load texture image if needed
        if (object.Vertex.class == "TextureBuffer") {
            //buffer.setImage($('#boxTexture')[0]);
            var queueItem = Factory("TextureLoadQueueItem", [object.Vertex.texture.src, makeCallback(buffer, buffer.setImage)]);
            this.assetLoadQueue.enqueue(queueItem);
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

    __addShaderProgram(programObj, isLinked) {
        this.shaderProgams[programObj.name] = {
            isLinked: false,
            prog: programObj
        };
        this.shaderProgamsToBeLinked++;
    }

    __onProgramLinked(program)
    {
        this.shaderProgams[program.name].isLinked = true;
        this.shaderProgamsToBeLinked--;

        if (this.shaderProgamsToBeLinked <= 0)
            this.onInitalizedCallback();
    }
}


