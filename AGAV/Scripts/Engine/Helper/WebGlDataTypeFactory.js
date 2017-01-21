WebGlDataTypeFactory = {};
WebGlDataTypeFactory.createArrayType = function (name, array)
{
    var obj;
    switch (name)
    {
        case "Float32Array":
            obj = new Float32Array(array);
            break;
        case "Uint16Array":
            obj = new Uint16Array(array);
            break;
        default:
            console.error("GL Data type factory: Type not valid " + name)
    }
    return obj;
}

WebGlDataTypeFactory.Enum = function (stringName)
{
    return gl[stringName];
}