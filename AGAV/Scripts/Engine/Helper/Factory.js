var __types = null;

 function Factory(name, argArray)
 {
     argArray = getOrDefault(argArray, []);
    var types = makeTypeDatabase();

    if (types[name] == undefined)
        console.error("Factory type " + name + "unknown")

    return __construct(types[name], argArray);
}

function __construct(type, argArray)
 {
    argArray.splice(0, 0, "")
    if(type != undefined)
        return new (Function.prototype.bind.apply(type, argArray));
    else 
        return {};
}

function makeTypeDatabase()
{
    if (__types == null) {
        __types = {}; 
        __types["EventHandlerCollection"] = EventHandlerCollection;
        __types["AssetLoadQueue"] = AssetLoadQueue;
        __types["AssetLoadQueueItem"] = AssetLoadQueueItem;
        __types["ShaderProgram"] = ShaderProgram; 
        __types["VertexBuffer"] = VertexBuffer;
        __types["ColorBuffer"] = ColorBuffer;
        __types["TextureBuffer"] = TextureBuffer;
        __types["RenderObject"] = RenderObject;
        __types["Shader"] = Shader;
        __types["DrawShader"] = DrawShader;
        __types["TextureShader"] = TextureShader;
        __types["ColorShader"] = ColorShader;
        
        __types["DrawShader2D"] = DrawShader2D;
        __types["ColorShader2D"] = ColorShader2D;


        __types["Camera"] = Camera;
        __types["RenderQueue"] = RenderQueue;



    }
    return __types;
}