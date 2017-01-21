/// <reference path="DrawShader.js" />
/// <reference path="Shader.js" />
class ColorShader extends DrawShader {
    constructor(model, onCompiled)
    {
        super(model, onCompiled);
        this.colorBufferPtr = null;
        this.colorAttributeName = model.shaderClass.colorAttributeName;
    }


    onProgramLinked(glProgram) {
        super.onProgramLinked(glProgram);
        this.colorBufferPtr = gl.getAttribLocation(glProgram, this.colorAttributeName);
        gl.enableVertexAttribArray(this.colorBufferPtr);
    }


    setVertexColorsRGBA(rgbaArray) {
        this.disableVertexColors()
        gl.vertexAttrib4f(this.colorBufferPtr, rgbaArray[0], rgbaArray[1], rgbaArray[2], rgbaArray[3]);
    }

    setVertexColors(glBuffer) {
        this.enableVertexColors()
        gl.bindBuffer(glBuffer.bufferType, glBuffer);
        gl.bufferData(glBuffer.bufferType, glBuffer.data, gl.STATIC_DRAW)
        gl.vertexAttribPointer(this.colorBufferPtr, glBuffer.itemSize,
            gl.FLOAT, gl.FALSE, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
    }



    enableVertexColors() {
        gl.enableVertexAttribArray(this.colorBufferPtr);
    }

    disableVertexColors() {
        gl.disableVertexAttribArray(this.colorBufferPtr);
    }
    
}