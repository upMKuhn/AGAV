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

var Foundation = function (shaderProg, assetLoadQueue, camera, renderQueue)
{
    this.shaderProgam = shaderProg;
    this.assetLoadQueue = assetLoadQueue;
    this.RenderObjects = {};
    this.camera = camera;
    this.renderQueue = renderQueue;
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    
}


Foundation.prototype.loadShader = function (filePaths)
{
    if (typeof filePaths == 'string')
        filePaths = [filePaths];

    for (var i = 0; i < filePaths.length; i++)
    {
        var queueItem = Factory("AssetLoadQueueItem", [filePaths[i], makeCallback(this, this.__onShaderLoaded)]);
        this.assetLoadQueue.enqueue(queueItem)
    }
}

Foundation.prototype.loadObject = function (filePaths) {
    if (typeof filePaths == 'string')
        filePaths = [filePaths];

    for (var i = 0; i < filePaths.length; i++) {
        var queueItem = Factory("AssetLoadQueueItem", [filePaths[i], makeCallback(this, this.__onObjectLoaded)]);
        this.assetLoadQueue.enqueue(queueItem)
    }
}


Foundation.prototype.render = function () {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    //gl.enable(gl.CULL_FACE);
    //gl.cullFace(gl.BACK);
    for (var obj in this.RenderObjects)
    {
        this.renderQueue.enqueue(this.RenderObjects[obj]);
    }

    this.renderQueue.drawObjects(this.camera);
}


Foundation.prototype.__onObjectLoaded = function (object)
{
    var renderObject = Factory("RenderObject", [object]);
    this.RenderObjects[object.ObjectName] = renderObject;
    var buffer = Factory(object.Vertex.class, [object.Vertex]);
    renderObject.setVertexBuffer(buffer);
    //Load texture image if needed
    if (object.Vertex.class == "TextureBuffer")
    {
        buffer.setImage($('#boxTexture')[0]);
        //var queueItem = Factory("AssetLoadQueueItem", [object.Vertex.texture.src, makeCallback(buffer, buffer.setImage)]);
        //this.assetLoadQueue.enqueue(queueItem);
    }

}


Foundation.prototype.__onShaderLoaded = function (object) {

    var shader = Factory(object.shaderClass.name, [object, makeCallback(this.shaderProgam, this.shaderProgam.addShader)]);
    //now that we have the model we quickly fetch the source code as well. 
    var queueItem = Factory("AssetLoadQueueItem", [object.src, makeCallback(shader, shader.setSourceCodeAndCompile)]);
    this.assetLoadQueue.enqueue(queueItem);
    this.shaderProgam.subscripeOnProgramLinked(makeCallback(shader, shader.onProgramLinked));
}

