/// <reference path="Shader.js" />

class DrawShader extends Shader {
    constructor(model, onCompiled){
        super(model, onCompiled);

        this.vertexPositionBufferPtr = null;
        this.viewMatrixPtr = null;
        this.worldMatrixPtr = null;
        this.normalPtr = null;
        this.projectionMatrixPtr = null;
    }


    onProgramLinked(program)
    { 
        var shaderClass = this.model.shaderClass;
        this.vertexPositionBufferPtr = gl.getAttribLocation(program.glProgram, shaderClass.vertexAttributeName);
        this.normalPtr = gl.getAttribLocation(program.glProgram, shaderClass.normalName);
        this.viewMatrixPtr = gl.getUniformLocation(program.glProgram, shaderClass.viewMatrixName);
        this.worldMatrixPtr = gl.getUniformLocation(program.glProgram, shaderClass.worldMatrixName);
        this.projectionMatrixPtr = gl.getUniformLocation(program.glProgram, shaderClass.projectionMatrixName);

        console.log("normal buffer: " + this.normalPtr);

        gl.enableVertexAttribArray(this.vertexPositionBufferPtr);
    }


    bindPositionBuffer(glBuffer)
    {
        gl.bindBuffer(glBuffer.bufferType, glBuffer);
        gl.bufferData(glBuffer.bufferType, glBuffer.data, gl.STATIC_DRAW)
        gl.vertexAttribPointer(this.vertexPositionBufferPtr, glBuffer.itemSize, gl.FLOAT, false, 0, 0);
    }

    setWorldMatrix(mat4) {
        gl.uniformMatrix4fv(this.worldMatrixPtr, false, mat4);
    }

    setViewMatrix(mat4)
    {
        gl.uniformMatrix4fv(this.viewMatrixPtr, false, mat4);
    }
     
    setProjectionMatrix(mat4) {
        gl.uniformMatrix4fv(this.projectionMatrixPtr, false, mat4);
    }

    setNormals(glBuffer) {
        gl.bindBuffer(glBuffer.bufferType, glBuffer);
        gl.bufferData(glBuffer.bufferType, glBuffer.data, gl.STATIC_DRAW)
        gl.vertexAttribPointer(this.normalPtr, 3, gl.FLOAT, gl.TRUE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
    }

    draw(vertexBuffer) {
        var glBuffers = vertexBuffer.getBuffers();
        var renderOptions = vertexBuffer.getRenderOptions();
        if (vertexBuffer.usesIndecies()) {
            gl.bindBuffer(glBuffers[2].bufferType, glBuffers[2]);
            gl.drawElements(renderOptions.drawShape, glBuffers[2].numItems, gl.UNSIGNED_SHORT, 0);
        } else {
            gl.drawArrays(renderOptions.drawShape, 0, glBuffers[1].numItems);
        }
    }

}



