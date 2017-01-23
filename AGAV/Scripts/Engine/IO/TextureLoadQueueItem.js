/// <reference path="AssetLoadQueueItem.js" />
class TextureLoadQueueItem extends AssetLoadQueueItem{

    constructor(filePath, onSuccess) {
        super(filePath, onSuccess);
        this.image = null;
    }

    loadAsync() {
        if (typeof this.filePath != "string")
            return this.onAssetLoadError("Invalid filepath.... must be of type string");

        this.$img = $('<img id="dynamic">')
        this.$img.hide();
        this.$img.on('load', makeCallback(this, this.__onLoaded));
        this.$img.attr('src', this.filePath);
        $("body").append(this.$img);
        this.loading = true;
    }

    __onLoaded() {
        this.__onLoadSuccess(this.$img[0]);
    }
}