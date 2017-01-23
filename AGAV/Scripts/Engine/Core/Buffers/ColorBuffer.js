class ColorBuffer extends VertexBuffer {
    constructor(model, image) {
        super(model);
        this.model = model.color;
        this.image = image;
        this.colorVertexAr = this.model.array;
        this.colorRGBA = this.model.rgba;
        this.glColorBuffer = gl.createBuffer();
        this.isValidColorBufferModel(this.model);
        this.glTextureMappingBuffer = gl.createBuffer();
        this.shaderProgramName = getOrDefault(model.shaderProgramName, "rgba_color");
    }

    setImage(image) {
        this.image = image;
    }

    applyToShader(colorShader) {
        if (this.__isUsingRGBA()) {
            colorShader.setVertexColorsRGBA(this.colorRGBA);
        } else {
            this.__makeBuffer();
            colorShader.setVertexColors(this.glColorBuffer);
        }
        super.applyToShader(colorShader);
    }

    

    isValidColorBufferModel(model) {
        var result = true;
        result = result && model.array != undefined || model.rgba;

        if (!result) {
            console.error("Invalid Texture buffer model....");
            console.log(model.src);
        }
        return result;
    }

    __makeBuffer() {
        if (!this.glColorBuffer.wasSetup) {
            var data = WebGlDataTypeFactory.createArrayType("Float32Array", this.colorVertexAr);
            this.glColorBuffer.data = data;
            this.glColorBuffer.itemSize = 4;
            this.glColorBuffer.numItems = this.colorVertexAr.length / this.glColorBuffer.itemSize;
            this.glColorBuffer.wasSetup = true;
            this.glColorBuffer.bufferType = gl.ARRAY_BUFFER;
        }
    }

    __isUsingRGBA() {
        return this.colorVertexAr == undefined
            || this.colorVertexAr == null
            || this.colorVertexAr.length == 0;
    }
}