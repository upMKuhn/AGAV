class VertexDebugger {
    constructor(itemSize, originalData)
    {
        this.debugSpeed = 2;
        this.debugCheckBox = $('#debugMode')[0];
        this.bufferItemSize = itemSize;
        this.posAt = 0;
        
        this.nthCall = 0;
        this.paused = false;

        this.originalBuffer = [];
        this.debugbuffer = [];
        this.saveAsOriginal(originalData);

        $("#backBtn").click(makeCallback(this, this.__backOneBtnPressed));
        $("#pauseBtn").click(makeCallback(this, this.__pauseToggle));
        $("#nextBtn").click(makeCallback(this, this.__onNextBtnPressed));
    }

    isDebugMode() {
        return this.debugCheckBox.checked;
    }


    saveAsOriginal(array) {
        this.originalBuffer = array;
    }

    getBuffer() {
        return this.isDebugMode() ? this.debugbuffer : this.originalBuffer;
    }

    onRenderCallMe() {
        if (!this.isDebugMode())
            return;

        this.__resetCallCounterIfNeeded();

        if (this.nthCall == 0) {
            this.__resetBufferIfNeeded();
            this.__applyNextItem();
        }

        this.nthCall++;
    }

    __applyNextItem() {
        if (!this.paused)
        {
            for (var i = 0; i < this.bufferItemSize; i++)
            {
                var original = this.originalBuffer[this.posAt++];
                this.debugbuffer.push(original);
            }
        }
    }
    
    __resetCallCounterIfNeeded() {
        if (this.nthCall >= this.debugSpeed)
            this.nthCall = 0;
    }

    __resetBufferIfNeeded()
    {
        if (this.posAt >= this.originalBuffer.length)
        {
            this.debugbuffer.length = 0;
            this.posAt = 0;
        }else if(this.posAt < 0)
        {
            this.posAt = this.originalBuffer.length - 1;
            this.debugbuffer.length = 0;
            for (var i = 0; i < this.originalBuffer.length; i++)
                this.debugbuffer.push(this.originalBuffer[i]);
                
        }
    }


    __backOneBtnPressed() {
        this.posAt -= 1 * this.bufferItemSize;
        if (this.debugbuffer.length > 0)
            this.debugbuffer.length -= 1 * this.bufferItemSize;
    }

    __pauseToggle() { this.paused = !this.paused; }

    __onNextBtnPressed() {
        var paused = this.paused;
        this.paused = false;
        this.__applyNextItem();
        this.paused = paused;
    }

}