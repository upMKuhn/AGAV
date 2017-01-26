

function getOrDefault(value, defaultVal)
{
    return value == null || value == undefined ? defaultVal : value;
}

function makeCallback(this_, func)
{
    if (func == undefined)
        console.error("Can't make a call back without a function");

    var template = function () {
        var args = Array.prototype.slice.call(arguments, 0);
        func.apply(this_, args);
    }
    template.bind({ func: func, this_: this_ });
    return template;
}


function reverseArray(ar)
{
    other = [];
    for (var i = ar.length; i >= 0; i--)
    {
        other.push(ar[i])
    }
    return other;
}

function jsonHelper(obj)
{
    return JSON.stringify(obj, function (k, v) {
        if (v instanceof Array)
            return JSON.stringify(v);
        return v;
    }, 2);
}


function sphericalToCartesian(radius, azimuth, elevation) {
    var x = radius * Math.sin(elevation) * Math.cos(azimuth)
    var y = radius * Math.sin(elevation) * Math.sin(azimuth)
    var z = radius * Math.cos(elevation)
    return [x, y, z];
}

