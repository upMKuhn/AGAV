class AssetLoadQueueItem{
    constructor(filePath, onSuccess) {
        this.filePath = filePath;
        this.done = false;
        this.error = false;
        this.loading = false;
        this.onSuccess = onSuccess;
    }

    isDone() { return this.done; }
    isLoading() { return this.loading; }
    hadErrors() { return this.error; }

    loadAsync() {
        if (typeof this.filePath != "string")
            return this.onAssetLoadError("Invalid filepath.... must be of type string");
        var this_ = this;
        $.ajax({
            url: this.filePath,
            cache: false,
            success: makeCallback(this, this.__onLoadSuccess),
            error: makeCallback(this, this.onAssetLoadError)
        });
        this.loading = true;
    }

    onAssetLoadError(ex) {
        console.log("Asset failed to load :(");
        console.error(ex);
        this.done = true;
        this.error = true;
        this.loading = false;
    }


    __onLoadSuccess (data) {
        if (this.onSuccess != undefined)
            this.onSuccess(data)
        this.done = true;
        this.loading = false;
    }

    
}

