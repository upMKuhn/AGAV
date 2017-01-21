class ShaderProgram {

    constructor()
    {
        this.shaderList = {};
        this.glProgram = gl.createProgram();
        this.defaultShader = null;
        this.onProgramLinked = Factory("EventHandlerCollection");
    }


    addShader(shader){
        this.shaderList[shader.name] = shader;
        gl.attachShader(this.glProgram, shader.glShader);
        if (!shader.name.includes("IGNORE"))
            this.defaultShader = shader;
    }

    subscripeOnProgramLinked(callback) {
        this.onProgramLinked.add(callback);
    }

    getDefaultShader() { return this.defaultShader; }

    linkAndActivateGlProgram(onSuccessCallback, onErrorCallBack)
    {
        gl.linkProgram(this.glProgram);
        if (!this.__hadLinkerErrors()) {
            gl.useProgram(this.glProgram);
            this.onProgramLinked.raise(this.glProgram);
            getOrDefault(onSuccessCallback, function () { })();
        } else {
            getOrDefault(onErrorCallBack, function () { })();
        }
    }

    __hadLinkerErrors() {
        return !gl.getProgramParameter(this.glProgram, gl.LINK_STATUS);
    }

}


