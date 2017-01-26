class TextureBuffer extends VertexBuffer {
    constructor(model)
    {
        super(model);
        this.image = null;
        this.model = model.texture;
        this.src = model.texture.src;
        this.glTexture = gl.createTexture();
        this.glTextureMappingBuffer = gl.createBuffer();
        this.shaderProgramName = getOrDefault(model.shaderProgramName, "texture");


        this.isValidTextureBufferModel(this.model);
        this.debugger.setTextureMap(this.model.array, this.usesIndecies(), this);
    }

    getGlTexture() { return this.glTexture; }
    getImage() { return this.image}
    setImage(image) {
        this.image = image;
    }

    isValidTextureBufferModel(model) {
        var result = true;
        result = result && model.array != undefined;

        if (!result) {
            console.error("Invalid Texture buffer model....");
            console.log(model.src);
        }
        return result;
    }

    applyToShader(textureShader) {
        super.applyToShader(textureShader);
        this.model.array = this.debugger.getArray();
        textureShader.setTexture(this.getMapping(), this.getGlTexture(), this.getImage());

    }

    getMapping()
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.glTextureMappingBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.model.array), gl.STATIC_DRAW);
        return this.glTextureMappingBuffer
    }

    __setupVertexDebugger() {
        if (this.indexBuffer.array.length > 0)
            this.debugger = new TextureDebugger(1 * 3, this.indexBuffer.array);
        else
            this.debugger = new TextureDebugger(3 * 3, this.positionBuffer.array);
        this.__applyDebugger();
    }
    

}