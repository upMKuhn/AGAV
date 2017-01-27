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

        this.camera = new Camera(0, 0, -30, 1, 2, 0);
        this.camerControl = new CameraControl(this.camera, this.myCanvas);
        this.scene = new Foundation(this.camera);

        this.assetLoader = new AssetLoader(this.assetLoadQueue, this.scene);

        this.assetLoader.loadProgram("Assets/Shaders/2DColorProgram.json");
        this.assetLoader.loadProgram("Assets/Shaders/ColorProgram.json");
        this.assetLoader.loadProgram("Assets/Shaders/TextureProgram.json");
        this.assetLoader.loadModel("Assets/Objects/Satelite.json");

        var sp = new Sphere("sphere", 5, 100, 620);
        this.assetLoader.addRenderModel(sp);

        this.assetLoadQueue.start();
    }

    


    onSuccessfullLoadedAssets()
    {
        console.log("All assets loaded :)");
        this.assetLoader.setCallbackOnDone(makeCallback(this, this.onInitalized));
    }

    onInitalized()
    {
        gl.clearColor(0.8, 0.8, 0.8, 1.0);
        gl.enable(gl.DEPTH_TEST);

        this.scene.addSceneObject(new Earth("Earth", "sphere"));

        this.scene.addSceneObject(new Satelite("SatCom1", "SateliteModel", this.myCanvas));

        setInterval(makeCallback(this.scene, this.scene.renderScene), 50);
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


