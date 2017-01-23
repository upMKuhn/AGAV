class ShaderProgram {

    constructor(name)
    {
        this.name = name;
        this.glProgram = gl.createProgram();
        this.vertexShader = null;
        this.fragShader = null;
        this.isLinked = false;
        this.onProgramLinked = Factory("EventHandlerCollection");
    }

    getShader() { return this.vertexShader; }

    activate() { gl.useProgram(this.glProgram)}

    addShader(shader){
        gl.attachShader(this.glProgram, shader.glShader);
        if (shader.type.toUpperCase().includes("VERTEX"))
            this.vertexShader = shader;
        else
            this.fragShader = shader;

        if (this.vertexShader != null && this.fragShader != null)
            this.linkGlProgram();
    }

    subscripeOnProgramLinked(callback) {
        this.onProgramLinked.add(callback);
    }

    linkGlProgram(onSuccessCallback, onErrorCallBack)
    {
        gl.linkProgram(this.glProgram);
        if (!this.__hadLinkerErrors()) {
            gl.useProgram(this.glProgram)
            this.isLinked = true;
            this.onProgramLinked.raise(this);
            getOrDefault(onSuccessCallback, function () { })();
        } else {
            getOrDefault(onErrorCallBack, function () {
                alert("Shader program: "+this.name + " had linking issues");
            })();
        }
    }

    __hadLinkerErrors() {
        return !gl.getProgramParameter(this.glProgram, gl.LINK_STATUS);
    }

}


