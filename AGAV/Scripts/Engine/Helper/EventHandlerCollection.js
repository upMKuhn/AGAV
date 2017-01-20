var EventHandlerCollection = function ()
{
    this.handler = [];
}

EventHandlerCollection.prototype.raise = function()
{
    var args = Array.prototype.slice.call(arguments, 0);

    for (var i = 0; i < this.handler.length; i++)
    {
        this.handler[i].apply(window, args);
    }
}

EventHandlerCollection.prototype.add = function (callback)
{
    this.handler.push(callback);
}