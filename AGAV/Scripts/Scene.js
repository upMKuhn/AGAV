var debugMode = true;

var myMain;
var gl;
$(start);
function start() { myMain = new main();}

class main {

    constructor()
    {
        gl = WebGLDebugUtils.makeDebugContext(createGlContext("myGLCanvas"));
        this.input = new Input();
        this.myCanvas = new MyCanvas("myGLCanvas", this.input);
        this.assetLoadQueue = new AssetLoadQueue(makeCallback(this, this.onSuccessfullLoadedAssets),
                                                makeCallback(this, this.onUnssucefullLoadedAssets));
        this.shaderProgram = new ShaderProgram();
        this.camera = new Camera(0,  0, -8.6, 0, 0, 0);
        this.camerControl = new CameraControl(this.camera, this.myCanvas);
        this.renderQueue = new RenderQueue(this.shaderProgram);
        this.scene = new Foundation(this.shaderProgram, this.assetLoadQueue, this.camera, this.renderQueue);

        //this.scene.loadShader("Assets/Shaders/2DColorShader.fs.json");
        //this.scene.loadShader("Assets/Shaders/2DColorShader.vs.json");
        //this.scene.loadObject("Assets/Objects/triangle.json");


        this.scene.loadShader("Assets/Shaders/ColorShader.fs.json");
        this.scene.loadShader("Assets/Shaders/ColorShader.vs.json");

        //this.scene.loadShader("Assets/Shaders/TextureShader.fs.json");
        //this.scene.loadShader("Assets/Shaders/TextureShader.vs.json");

        //this.scene.loadObject("Assets/Objects/earth.json");
        this.scene.loadObject("Assets/Objects/box.json");
        //this.scene.loadObject("Assets/Objects/texturedBox.json");
        this.scene.loadObject("Assets/Objects/Floor.json");
        //this.scene.loadObject("Assets/Objects/Cube.json");

        this.assetLoadQueue.start();
    }

    onSuccessfullLoadedAssets()
    {
        console.log("All assets loaded :)");
        this.shaderProgram.linkAndActivateGlProgram(
            makeCallback(this, this.onSuccessfullLinkedProgram),
            makeCallback(this, this.onLinkerErrors)
        );
    }

    onSuccessfullLinkedProgram()
    {
        gl.clearColor(0.8, 0.8, 0.8, 1.0);
        gl.enable(gl.DEPTH_TEST);
        setInterval(makeCallback(this.scene, this.scene.render), 50);
    }

    onUnssucefullLoadedAssets() { 
        alert("Same assets failed to load :(");
    }

    onLinkerErrors() { 
        alert("Webgl program had linker errors :("); 
    }

}


function createGlContext(canvasId) {
    var context = null;
    var names = ["webgl", "experimental-webgl"];
    var canvas = $('#' + canvasId)[0];
    for (var i = 0; i < names.length; i++) {
        try {
            context = canvas.getContext(names[i]);
        } catch (e) { }
        if (context) {
            break;
        }
    }

    if (context) {
        context.viewportWidth = Math.floor($(canvas).width());
        context.viewportHeight = Math.floor($(canvas).height());
    } else {
        alert("Failed to create WebGL context!");
    }
    this.glContext = context;
    return context;
}


