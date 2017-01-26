/// <reference path="VertexBuffer.js" />
/// <reference path="ShaderProgram.js" />
/// <reference path="RenderModel.js" />
/// <reference path="Foundation.js" />
/// <reference path="Factory.js" />
/// <reference path="AssetLoadQueueItem.js" />
/// <reference path="AssetLoadQueue.js" />
/// <reference path="WebGlDataTypeFactory.js" />


if ($ == undefined)
    alert("Jquery was not loaded! Please connect to the internet.");

class Foundation{
    constructor(camera){
        
        this.shaderProgams = {};

        this.Models = {};
        this.SceneObjects = {};
        this.camera = camera;
        this.renderQueue = new RenderQueue(this);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
    }

    addShaderProgram(program) {
        this.shaderProgams[program.name] = {
            isLinked: false,
            prog: program
        };
    }

    getShaderProgram(name)
    {
        return this.shaderProgams[name].prog;
    }

    add3dModel(model) {
        this.Models[model.getName()] = model;
    }

    addSceneObject(obj) {
        this.SceneObjects[obj.name] = obj;
        obj.setModel(this.Models[obj.modelName]);
    }

    renderScene() {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        for (var name in this.SceneObjects) {
            this.renderQueue.enqueue(this.SceneObjects[name]);
        }
        this.renderQueue.drawObjects(this.camera);
    }

    
}


