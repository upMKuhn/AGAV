class VertexBuffer{

    constructor(data)
    {
        this.debugMode = debugDraw;
        this.debugSpeed = 4;
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
            //this.indexBuffer.array = reverseArray(this.indexBuffer.array);
        }
    }

    applyToShader(drawShader) {
        var glBuffers = this.getBuffers();
        drawShader.bindPositionBuffer(glBuffers[0])
    }

    getBuffers()
    {
        var buffers = [];
        this.__applyDebugMode();
        if (this.positionBuffer.array.length > 0) {
            this.__makeBuffers(this.glVertexBuffer, this.positionBuffer, gl.ARRAY_BUFFER, "Float32Array");
            buffers.push(this.glVertexBuffer)
        }

        if (this.indexBuffer.array.length > 0 && buffers.length > 0){
            this.__makeBuffers(this.glIndexBuffer, this.indexBuffer, gl.ELEMENT_ARRAY_BUFFER, "Uint16Array");
            buffers.push(this.glIndexBuffer);
        }

        return buffers;
    }


    __makeBuffers(glBuffer, modelBuffer, bufferTypeEnum, dataTypeEnum)
    {
        if (glBuffer.wasSetup != true || this.debugMode) {
            var data = WebGlDataTypeFactory.createArrayType(dataTypeEnum, modelBuffer.array);
            glBuffer.data = data;
            glBuffer.itemSize = modelBuffer.itemSize;
            glBuffer.numItems = modelBuffer.numItems;
            glBuffer.wasSetup = true;
            glBuffer.bufferType = bufferTypeEnum;
        }
        gl.bindBuffer(glBuffer.bufferType, glBuffer);
        gl.bufferData(glBuffer.bufferType, glBuffer.data, gl.STATIC_DRAW)
    }


    __applyDebugMode() {
        this.debugMode = debugDraw;
        if (this.debugMode && this.indexBuffer.array.length > 0)
        {
            this.____applyDebugModeToBuffer(this.indexBuffer.array, "indexBuffer", 3)
        } else if (this.debugMode)
        {
            this.____applyDebugModeToBuffer(this.positionBuffer.array, "positionBuffer", 9)
        } else if (!this.debugMode && this.debugData != undefined)
        {
            this[this.debugData.bufferName].array = this.debugData.orgBufferData;
        }
    }

    ____firstTimeDebugSetup(buffer, bufferName, itemSize) {
        if (this.debugData == undefined)
        {
            this.debugData = {
                posAt: 0,
                nthCall: 0,
                incrementBy: itemSize,
                orgBufferData: buffer,
                bufferName: bufferName
            };
            this[this.debugData.bufferName].array = [];
        }
    }

    ____debugResetBuffer()
    {
        var buffer = this[this.debugData.bufferName].array;
        if (buffer.length >= this.debugData.orgBufferData.length) {
            this.debugData.posAt = 0;
            this.debugData.nthCall = 0;
            this[this.debugData.bufferName].array = [];
        }
    }

    ____debugResetCallCounter() {
        if (this.debugData.nthCall >= this.debugSpeed)
            this.debugData.nthCall = 0;
    }

    ____debugAdjustBuffer_NumItems() {
        var buffer = this[this.debugData.bufferName];
        var itemSize = this.debugData.incrementBy / 3;
        buffer.numItems = buffer.array.length / itemSize;
    }

    ____applyDebugModeToBuffer(buffer, bufferName, itemSize) {

        this.____firstTimeDebugSetup(buffer, bufferName, itemSize);
        this.____debugResetBuffer();
        this.____debugResetCallCounter();

        var buffer = this[this.debugData.bufferName].array;
        if (this.debugData.nthCall == 0)
        {
            for (var i = 0; i < this.debugData.incrementBy; i++)
            { 
                buffer.push(this.debugData.orgBufferData[this.debugData.posAt++]);
            }
        }
        this.____debugAdjustBuffer_NumItems();
        this.debugData.nthCall++;
    }



}

