﻿class Shader {
    constructor(model, onCompiled){
        this.type = "";
        this.model = model;
        this.glShader = null;
        this.sourceCode = "";
        this.ShaderType = "GENERIC";
        this.name = model.shaderName

        
        this.onCompiled = getOrDefault(onCompiled, function () { });
    }

    setOnCompiled() { this.onCompiled = func; }
    raiseCompiled() { this.onCompiled(this); }
    setSourceCodeAndCompile(src)
    {
        this.sourceCode = src;
        this.Compile();
    }

    Compile()
    {
        if (this.sourceCode == "")
            return;

        var glShaderFlag = this.model.shaderType == "FRAGMENT" ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER;
        var shaderObj = gl.createShader(glShaderFlag)
        gl.shaderSource(shaderObj, this.sourceCode);
        gl.compileShader(shaderObj);
        this.glShader = shaderObj;

        if (!this.__logCompileErrors())
            this.raiseCompiled();
    }

    onProgramLinked() {

    }

    
    __logCompileErrors() {
        if (!gl.getShaderParameter(this.glShader, gl.COMPILE_STATUS)) {
            alert("Shader compile error");
            console.log(this.modelFilePath);
            console.log(gl.getShaderInfoLog(this.glShader));
            return true;
        }
        return false;
    }


}

