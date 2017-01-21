class TextureBuffer extends VertexBuffer {
    constructor(model, image)
    {
        super(model);
        this.model = model.texture;
        this.image = image;
        this.isValidTextureBufferModel(this.model);
        this.glTexture = gl.createTexture();
        this.glTextureMappingBuffer = gl.createBuffer();
    }

    getGlTexture() { return this.glTexture; }
    getImage() { return this.image}
    setImage(image) {
        var i = new Image();
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
        textureShader.setTexture(this.getMapping(), this.getGlTexture(), this.getImage());
        super.applyToShader(textureShader);
    }

    getMapping()
    {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.glTextureMappingBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.model.array), gl.STATIC_DRAW);
        return this.glTextureMappingBuffer
    }


    

}