class DebuggerNullObject {
    constructor(ignore, originalData)
    {
        this.originalBuffer = [];
        this.debugbuffer = [];
        this.saveAsOriginal(originalData);
    }

    isDebugMode() {
        return false;
    }


    saveAsOriginal(array) {
        this.originalBuffer = array;
    }

    getBuffer() {
        return this.originalBuffer;
    }

    onRenderCallMe() {

    }
    setTextureMap() { }



}