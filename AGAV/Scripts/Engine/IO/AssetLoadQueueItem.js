
var AssetLoadQueueItem = function (filePath, onSuccess) {
    this.filePath = filePath;
    this.done = false;
    this.error = false;
    this.loading = false;
    this.onSuccess = onSuccess;
}

AssetLoadQueueItem.prototype.loadAsync = function () {
    if (typeof this.filePath != "string")
        return this.onAssetLoadError("Invalid filepath")
    var this_ = this;
    $.ajax({
        url: this.filePath,
        cache: false,
        success: makeCallback(this, this.__onAjaxSuccess),
        error: makeCallback(this, this.onAssetLoadError)
    });
    this.loading = true;
}

//overideable
AssetLoadQueueItem.prototype.onAssetLoadError = function (ex) {
    console.log("Asset failed to load :(");
    console.error(ex);
    this.done = true;
    this.error = true;
    this.loading = false;
}

AssetLoadQueueItem.prototype.__onAjaxSuccess = function (data)
{
    if(this.onSuccess != undefined)
        this.onSuccess(data)
    this.done = true;
    this.loading = false;
}

AssetLoadQueueItem.prototype.isDone = function () {
    return this.done;
}

AssetLoadQueueItem.prototype.isLoading = function () {
    return this.loading;
}

AssetLoadQueueItem.prototype.hadErrors = function () {
    return this.error;
}



