﻿/// <reference path="Shader.js" />

class DrawShader extends Shader {
    constructor(model, onCompiled){
        super(model, onCompiled);

        this.aNormalPtr= null;
    }


    onProgramLinked(program)
    { 
        var shaderClass = this.model.shaderClass;
        this.vertexPositionBufferPtr = gl.getAttribLocation(program.glProgram, shaderClass.vertexAttributeName);

        gl.enableVertexAttribArray(this.vertexPositionBufferPtr);
    }


    bindPositionBuffer(glBuffer)
    {
        gl.bindBuffer(glBuffer.bufferType, glBuffer);
        gl.bufferData(glBuffer.bufferType, glBuffer.data, gl.STATIC_DRAW)
        gl.bindBuffer(glBuffer.bufferType, glBuffer);
        gl.vertexAttribPointer(this.vertexPositionBufferPtr, glBuffer.itemSize, gl.FLOAT, false, 0, 0);
    }

    setViewMatrix(mat4)
    {
        gl.uniformMatrix4fv(this.viewModelMatrixPtr, false, mat4);
    }
     
    setProjectionMatrix(mat4) {
        gl.uniformMatrix4fv(this.projectionMatrixPtr, false, mat4);
    }


    draw(vertexBuffer) {
        var glBuffers = vertexBuffer.getBuffers();
        var renderOptions = vertexBuffer.getRenderOptions();
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



