﻿/// <reference path="DrawShader.js" />
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

    enableVertexColors() {
        gl.enableVertexAttribArray(this.colorBufferPtr);
    }

    disableVertexColors() {
        gl.disableVertexAttribArray(this.colorBufferPtr);
    }
    
}