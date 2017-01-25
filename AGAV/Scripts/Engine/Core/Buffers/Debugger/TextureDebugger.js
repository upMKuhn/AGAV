/// <reference path="VertexDebugger.js" />
class TextureDebugger extends VertexDebugger {
    constructor(itemSize, originalData)
    {
        super(itemSize, originalData);
        this.UTextbox1 = $('#u_input1')[0];
        this.VTextbox1 = $('#v_input1')[0];
        this.UTextbox2 = $('#u_input2')[0];
        this.VTextbox2 = $('#v_input2')[0];
        this.UTextbox3 = $('#u_input3')[0];
        this.VTextbox3 = $('#v_input3')[0];
        this.textureMap = null;

        this.userChanged = false;
        $("input").keydown('input', makeCallback(this, this.onUVValuesChanged));
    }

    getArray() { return this.textureMap.slice();}

    setTextureMap(array, usesIndecies, bufferObj) {
        this.textureMap = array;
        this.usesIndecies = usesIndecies;
        this.bufferObj = bufferObj;
    }

    onRenderCallMe() {
        super.onRenderCallMe();

        if (this.isDebugMode()) {
            this.displayUV();
        }
    }


    displayUV() {
        var u1, v1, u2, v2, u3, v3;
        var posAt = this.debugbuffer.length - this.bufferItemSize;

        if (this.usesIndecies && posAt > 3)
        {
            var p1 = this.debugbuffer[posAt+0];
            var p2 = this.debugbuffer[posAt - 1];
            var p3 = this.debugbuffer[posAt - 2];


            
            u1 = this.textureMap[p1 * 2];
            v1 = this.textureMap[(p1 * 2) + 1];

            u2 = this.textureMap[p2 * 2];
            v2 = this.textureMap[(p2 * 2) + 1];

            u3 = this.textureMap[p3 * 2];
            v3 = this.textureMap[(p3 * 2) + 1];

            if (this.userChanged) {

                this.textureMap[p1 * 2] = this.UTextbox1.value*1;
                this.textureMap[(p1 * 2) + 1] = this.VTextbox1.value*1;

                this.textureMap[p2 * 2] = this.UTextbox2.value*1;
                this.textureMap[(p2 * 2) + 1] = this.VTextbox2.value*1;

                this.textureMap[p3 * 2] = this.UTextbox3.value*1;
                this.textureMap[(p3 * 2) + 1] = this.VTextbox3.value*1;

                this.userChanged = false;
            } else {

                this.setUVValues(this.UTextbox1, this.VTextbox1, u1, v1);
                this.setUVValues(this.UTextbox2, this.VTextbox2, u2, v2);
                this.setUVValues(this.UTextbox3, this.VTextbox3, u3, v3);
            }

        }
    }

    setUVValues(uBox,vBox, u, v) {
        if (!this.userChanged) {
            if(uBox.value != u)
                uBox.value = u;
            if (vBox.value != v)
                vBox.value = v;
        }
        this.userChanged = false;
    }
     
    getUVValues() {
        this.userChanged = false;
        return [this.UTextbox.value, this.VTextbox.value];
    }

    onUVValuesChanged() {
        this.userChanged = true;
    }

}