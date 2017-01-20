
var AssetLoadQueue = function (successCallback, errorCallback, doneCallback)
{
    this.toLoad = [];
    this.successCallback = getOrDefault(successCallback, function () { });
    this.errorCallback = getOrDefault(errorCallback, function () { });
    this.doneCallback = getOrDefault(doneCallback, function () { });

    this.checkLoadedIntervall = null;
}

AssetLoadQueue.prototype.enqueue = function (assetLoadingHandler, hasSubLoads)
{

    assetLoadingHandler.loaded = false;
    this.toLoad.push(assetLoadingHandler);
}

AssetLoadQueue.prototype.start = function ()
{
    for (var i = 0; i < this.toLoad.length; i++)
        this.toLoad[i].loadAsync();

    if (this.checkLoadedIntervall == null)
        this.checkLoadedIntervall = setInterval(makeCallback(this, this.__checkIfDoneLoop), 50);
}

AssetLoadQueue.prototype.__checkIfDoneLoop = function ()
{
    var allLoaded = true;
    for (var i = 0; i < this.toLoad.length; i++) {
        allLoaded = allLoaded && this.toLoad[i].isDone()
        this.__startLoadingIfNot(this.toLoad[i]);
    }

    if (allLoaded)
        this.__onAllDone();
}

AssetLoadQueue.prototype.__startLoadingIfNot = function (queueItem)
{
    if (!queueItem.isDone() && !queueItem.isLoading())
        queueItem.loadAsync();
}

AssetLoadQueue.prototype.__onAllDone = function ()
{
    var errors = false;
    for (var i = 0; i < this.toLoad.length; i++)
    {
        errors = errors || this.toLoad[i].hadErrors();
    }

    clearInterval(this.checkLoadedIntervall);
    this.checkLoadedIntervall = null;

    if (errors)
        this.errorCallback();
    else
        this.successCallback();
    this.doneCallback();

}



