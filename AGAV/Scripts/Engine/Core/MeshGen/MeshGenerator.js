


function makeSphere(radius, numParallels, numMeridians)
{
    var index = 0;
    var grid = [];
    var vertecies = [];
    var normals = [];
    var texture = [];
    var faces = [];


    for (var p = -1; p < numParallels; p++)
    {
        var row = [];
        var parallel = Math.PI * (p + 1) / numParallels
        for (var m = 0; m < numMeridians+1; m++) {
            var meridian = 2.0 * Math.PI * m / numMeridians
            var cartesian = sphericalToCartesian(radius, meridian, parallel);
            var vec3xyz = vec3.create(cartesian);
            vertecies.push(cartesian);

            //NORMALS
            vec3.normalize(vec3xyz, vec3xyz);
            normals.push(vec3xyz);


            x = vec3xyz[0] == 0 ? 0 : vec3xyz[0];
            y = vec3xyz[1] == 0 ? 0 : vec3xyz[1];
            z = vec3xyz[2] == 0 ? 0 : vec3xyz[2];
            //UV
            var u = Math.atan2(x, z) / (2 * Math.PI) + 0.5;
            var v = y * 0.5 + 0.5;
            
            if(u > 0.95)
            {
               // u = 0;
            }

            texture.push(u, v);
            row.push(index++);
        }
        grid.push(row);
    }
        
    for (var i = 0; i < texture.length;i+=2)
    {
        var u = texture[i];
        var v = texture[i+1];
        if (Math.abs(u-v) < 0.5)
        {
        }
    }


    for (var p = 0; p < (numParallels ); p++) {
        for (var m = 0; m < numMeridians; m++) {
            var p1 = grid[p][m];
            var p2 = grid[p + 1][m];
            var p3 = grid[p][m + 1];
            faces.push(p1, p2, p3, grid[p + 1][m + 1]);
        }
    }

    return {
        vertecies: vertecies,
        normals: normals,
        texture: texture,
        faces: faces
    }
}


function sphericalToCartesian(radius, azimuth, elevation)
{
    var x = radius * Math.sin(elevation) * Math.cos(azimuth)
    var y = radius * Math.sin(elevation) * Math.sin(azimuth)
    var z = radius * Math.cos(elevation)
    return [x , y , z];
}



