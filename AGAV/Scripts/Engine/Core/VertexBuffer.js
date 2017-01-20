
var VertexBuffer = function (data, whenBufferFilledCallback)
{
    this.positionBuffer = null;
    this.indexBuffer = null;
    this.bufferHealthy = false;

    this.whenBufferFilledCallback = getOrDefault(whenBufferFilledCallback, function(){});
    this.bindWith = {};
    this.bufferType = null;
    this.glVertexBuffer = gl.createBuffer();
    this.glIndexBuffer = gl.createBuffer();
    if (data != undefined)
        this.fillBuffer(data);
}



VertexBuffer.prototype.isAllOk = function (data) { return this.bufferHealthy;}

VertexBuffer.prototype.fillBuffer = function (data)
{
    if (data.ObjectType != "VERTEX_BUFFER")
    {
        console.log("Sorry man, wrong object. expected Vertex buffer")
        console.log(data);
        return null;
    }

    if (this.isValidVertexBufferModel(data))
    {
        this.positionBuffer = data.position;
        this.indexBuffer = data.indices;
        this.bufferHealthy = true;
        this.whenBufferFilledCallback(this);
        this.bindWith = data.bindWith;
        this.bufferType = WebGlDataTypeFactory.Enum(data.bufferType);
    }
}

VertexBuffer.prototype.isValidVertexBufferModel = function (obj)
{
    var result = true;
    result = result & obj.position != undefined;
    result = result & obj.position.array != undefined;
    result = result & obj.position.itemSize != undefined;
    result = result & obj.position.numItems != undefined;
    result = result & obj.position.bufferBinding != undefined;
    result = result & obj.position.dataType != undefined;


    result = result & obj.indices != undefined;
    result = result & obj.indices.array != undefined;
    result = result & obj.indices.itemSize != undefined;
    result = result & obj.indices.numItems != undefined;
    result = result & obj.indices.bufferBinding != undefined;
    result = result & obj.indices.dataType != undefined;

    return result;
}

VertexBuffer.prototype.getBuffers = function ()
{
    var buffers = [];
    if (this.positionBuffer.array.length > 0) {
        this.__makeBuffers(this.glVertexBuffer, this.positionBuffer);
        buffers.push(this.glVertexBuffer)
    }

    if (this.indexBuffer.array.length > 0 && buffers.length > 0) {
        this.__makeBuffers(this.glIndexBuffer, this.indexBuffer);
        buffers.push(this.glIndexBuffer)
    }

    return buffers;
}


VertexBuffer.prototype.__makeBuffers = function(glBuffer, modelBuffer)
{
    if (glBuffer.wasSetup != true) {
        var data = WebGlDataTypeFactory.createArrayType(modelBuffer.dataType, modelBuffer.array);
        var bufferTypeEnum = WebGlDataTypeFactory.Enum(modelBuffer.bufferType);
        var bufferBindingEnum = WebGlDataTypeFactory.Enum(modelBuffer.bufferBinding);

        gl.bindBuffer(bufferTypeEnum, glBuffer);
        gl.bufferData(bufferTypeEnum, data, bufferBindingEnum);
        glBuffer.itemSize = modelBuffer.itemSize;
        glBuffer.numItems = modelBuffer.numItems;
        glBuffer.wasSetup = true;
        glBuffer.bufferType = bufferTypeEnum;
        glBuffer.bufferBinding = bufferBindingEnum;

    }
}
