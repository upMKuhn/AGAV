/// <reference path="VertexDebugger.js" />
class TextureDebugger extends VertexDebugger {
    constructor(itemSize, originalData)
    {
        super(itemSize, originalData);
        this.UTextbox = $('#u_input')[0];
        this.VTextbox = $('#v_input')[0];
    }

    __applyNextItem() {
        super.__applyNextItem();
    }

}