/// <reference path="Shader.js" />

class DrawShader extends Shader {
    constructor(model, onCompiled){
        super(model, onCompiled);

        this.vertexPositionBufferPtr = null;
        this.vertexPositionBufferPtr = null;
        this.colorBufferPtr = null;
        this.viewModelMatrixPtr = null;
        this.projectionMatrixPtr = null;
    }


    onProgramLinked(glProgram)
    { 
        var shaderClass = this.model.shaderClass;
        this.vertexPositionBufferPtr = gl.getAttribLocation(glProgram, shaderClass.vertexAttributeName);
        this.colorBufferPtr = gl.getAttribLocation(glProgram, shaderClass.colorAttributeName);
        this.viewModelMatrixPtr = gl.getUniformLocation(glProgram, shaderClass.viewModelMatrixName);
        this.projectionMatrixPtr = gl.getUniformLocation(glProgram, shaderClass.projectionMatrixName);

        gl.enableVertexAttribArray(this.vertexPositionBufferPtr);
        gl.enableVertexAttribArray(this.colorBufferPtr);
    }


    bindPositionBuffer(glBuffer)
    {
        gl.bindBuffer(glBuffer.bufferType, glBuffer);
        gl.vertexAttribPointer(this.vertexPositionBufferPtr, glBuffer.itemSize, gl.FLOAT, false, 0, 0);
    }

    setVertexColorsRGBA(rgbaArray) {
        this.disableVertexColors()
        gl.vertexAttrib4f(this.colorBufferPtr, rgbaArray[0], rgbaArray[1], rgbaArray[2], rgbaArray[3]);
    }

    setViewModelMatrix(mat4)
    {
        gl.uniformMatrix4fv(this.viewModelMatrixPtr, false, mat4);
    }
     
    setProjectionMatrix(mat4) {
        gl.uniformMatrix4fv(this.projectionMatrixPtr, false, mat4);
    }

    enableVertexColors() {
        gl.enableVertexAttribArray(this.colorBufferPtr);
    }

    disableVertexColors() {
        gl.disableVertexAttribArray(this.colorBufferPtr);
    }




    draw(glBuffers, renderOptions) {
        if (glBuffers[1] != undefined) {
            gl.bindBuffer(glBuffers[1].bufferType, glBuffers[1]);
            gl.drawElements(renderOptions.drawShape, glBuffers[1].numItems, gl.UNSIGNED_SHORT, 0);
        } else {
            gl.drawArrays(renderOptions.drawShape, 0, glBuffers[0].numItems);
        }
    }


    dontCallMe() {
        gl.enableVertexAttribArray("don't call me ");
        gl.glDisableVertexAttribArray("don't call me ");
    }

}



