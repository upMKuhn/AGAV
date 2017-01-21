class ColorBuffer extends VertexBuffer {
    constructor(model, image) {
        super(model);
        this.model = model.color;
        this.image = image;
        this.colorVertexAr = model.array;
        this.colorRGBA = this.model.rgba;
        this.isValidColorBufferModel(this.model);
        this.glTextureMappingBuffer = gl.createBuffer();
    }

    setImage(image) {
        this.image = image;
    }

    applyToShader(colorShader) {
        if (this.__isUsingRGBA()) {
            colorShader.setVertexColorsRGBA(this.colorRGBA);
        } else {
            console.error("color Vertex Arrrays not implemented yet");
            // to do .... lol 
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


    __isUsingRGBA() {
        return this.colorVertexAr == undefined
            || this.colorVertexAr == null
            || this.colorVertexAr.length == 0;
    }
}