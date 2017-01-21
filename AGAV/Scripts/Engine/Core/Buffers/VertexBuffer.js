class VertexBuffer{

    constructor(data)
    {
        this.positionBuffer = null;
        this.indexBuffer = null;
        this.RenderOptions = null;

        this.glVertexBuffer = gl.createBuffer();
        this.glIndexBuffer = gl.createBuffer();
        if (data != undefined)
            this.applyModel(data);

    }

    getRenderOptions() { return this.RenderOptions; }

    isValidVertexBufferModel(obj) {
        var result = true;
        result = result & obj.position != undefined;
        result = result & obj.position.array != undefined;
        result = result & obj.position.itemSize != undefined;
        result = result & obj.position.numItems != undefined;


        result = result & obj.indices != undefined;
        result = result & obj.indices.array != undefined;
        result = result & obj.indices.itemSize != undefined;
        result = result & obj.indices.numItems != undefined;

        return result;
    }


    applyModel(model)
    {
        if (this.isValidVertexBufferModel(model)) {
            this.positionBuffer = model.position;
            this.indexBuffer = model.indices;
            this.RenderOptions = model.RenderOptions;
            this.RenderOptions.drawShape = WebGlDataTypeFactory.Enum(this.RenderOptions.drawShape);
        }
    }

    applyToShader(drawShader) {
        var glBuffers = this.getBuffers();
        drawShader.bindPositionBuffer(glBuffers[0])
    }

    getBuffers()
    {
        var buffers = [];
        if (this.positionBuffer.array.length > 0) {
            this.__makeBuffers(this.glVertexBuffer, this.positionBuffer, gl.ARRAY_BUFFER, "Float32Array");
            buffers.push(this.glVertexBuffer)
        }

        if (this.indexBuffer.array.length > 0 && buffers.length > 0) {
            this.__makeBuffers(this.glIndexBuffer, this.indexBuffer, gl.ELEMENT_ARRAY_BUFFER, "Uint16Array");
            buffers.push(this.glIndexBuffer)
        }

        return buffers;
    }

    


    __makeBuffers(glBuffer, modelBuffer, bufferTypeEnum, dataTypeEnum)
    {
        if (glBuffer.wasSetup != true) {
            var data = WebGlDataTypeFactory.createArrayType(dataTypeEnum, modelBuffer.array);
            glBuffer.data = data;
            glBuffer.itemSize = modelBuffer.itemSize;
            glBuffer.numItems = modelBuffer.numItems;
            glBuffer.wasSetup = true;
            glBuffer.bufferType = bufferTypeEnum;
        }

        gl.bindBuffer(bufferTypeEnum, glBuffer);
        gl.bufferData(bufferTypeEnum, glBuffer.data, gl.STATIC_DRAW);
    }

}

