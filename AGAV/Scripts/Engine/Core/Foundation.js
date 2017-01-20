/// <reference path="VertexBuffer.js" />
/// <reference path="ShaderProgram.js" />
/// <reference path="SceneObject.js" />
/// <reference path="Foundation.js" />
/// <reference path="Factory.js" />
/// <reference path="AssetLoadQueueItem.js" />
/// <reference path="AssetLoadQueue.js" />
/// <reference path="WebGlDataTypeFactory.js" />


if ($ == undefined)
    alert("Jquery was not loaded! Please connect to the internet.");

var Foundation = function (shaderProg, assetLoadQueue, camera, renderer)
{
    this.shaderProgam = shaderProg;
    this.assetLoadQueue = assetLoadQueue;
    this.SceneObjects = {};
    this.camera = camera;
    this.renderer = renderer;
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    //gl.enable(gl.DEPTH_TEST);
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

    for (var obj in this.SceneObjects)
    {
        this.renderer.drawObject(this.SceneObjects[obj], this.camera);
    }
}

Foundation.prototype.__onObjectLoaded = function (object)
{
    this.SceneObjects[object.ObjectName] = Factory("SceneObject", [object, this.shaderProgam]);
}

Foundation.prototype.__onShaderLoaded = function (object) {

    var shader = Factory(object.shaderClass.name, [object, makeCallback(this.shaderProgam, this.shaderProgam.addShader)]);
    //now that we have the model we quickly fetch the source code as well. 
    var queueItem = Factory("AssetLoadQueueItem", [object.src, makeCallback(shader, shader.setSourceCodeAndCompile)]);
    this.assetLoadQueue.enqueue(queueItem);
    this.shaderProgam.subscripeOnProgramLinked(makeCallback(shader, shader.onProgramLinked));
}

