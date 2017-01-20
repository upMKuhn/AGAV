﻿

function getOrDefault(value, defaultVal)
{
    return value == null || value == undefined ? defaultVal : value;
}

function makeCallback(this_, func)
{
    var template = function () {
        var args = Array.prototype.slice.call(arguments, 0);
        func.apply(this_, args);
    }
    template.bind({ func: func, this_: this_ });
    return template;
}


function jsonHelper(obj)
{
    return JSON.stringify(obj, function (k, v) {
        if (v instanceof Array)
            return JSON.stringify(v);
        return v;
    }, 2);
}