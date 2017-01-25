/// <reference path="DrawShader.js" />
/// <reference path="Shader.js" />
/// <reference path="../Buffers/TextureBuffer.js" />
class TextureShader extends DrawShader{
    constructor(model, onCompiled) {
        super(model, onCompiled);

        this.textureBufferPtr = null;
        this.textureAttributeName = model.shaderClass.textureAttributeName;
    }

    onProgramLinked(program) {
        super.onProgramLinked(program);
        this.textureBufferPtr = gl.getAttribLocation(program.glProgram, this.textureAttributeName);
        gl.enableVertexAttribArray(this.textureBufferPtr);
    }

    setTexture(mapping, glTextureObj, image) {
        gl.enableVertexAttribArray(this.textureBufferPtr);

        gl.bindBuffer(gl.ARRAY_BUFFER, mapping);
        gl.vertexAttribPointer(this.textureBufferPtr,
            2, // Num elements 
            gl.FLOAT, gl.FALSE,
            2 * Float32Array.BYTES_PER_ELEMENT, 0);

        gl.bindTexture(gl.TEXTURE_2D, glTextureObj)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        gl.bindTexture(gl.TEXTURE_2D, glTextureObj)
        gl.activeTexture(gl.TEXTURE0);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

    }


}