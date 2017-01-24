


function makeSphere(radius, numParallels, numMeridians)
{
    var index = 0;
    var grid = [];
    var vertecies = [];
    var normals = [];
    var texture = [];
    var faces = [];


    for (var p = 0; p < numParallels+1; p++)
    {
        var row = [];
        var parallel = Math.PI * (p + 1) / numParallels
        for (var m = 0; m < numMeridians+1; m++) {
            var meridian = 2.0 * Math.PI * m / numMeridians
            var cartesian = sphericalToCartesian(radius, meridian, parallel);
            
            vertecies.push(cartesian);
            normals.push(vec3.normalize(vec3.create(cartesian)));

            //UV
            //var normal = vec3.normalize(vec3.create(cartesian));
            //var u = Math.atan2(n[0], n[2] / (2 * Math.PI));

            texture.push(meridian, parallel);
            row.push(index++);
        }
        grid.push(row);
    }
        

    for (var p = 0; p < (numParallels ); p++) {
        for (var m = 0; m < numMeridians; m++) {

            if (p != numParallels) {
                var p1 = grid[p][m];
                var p2 = grid[p + 1][m];
                var p3 = grid[p][m + 1];
                faces.push(p1, p2, p3, grid[p + 1][m + 1]);
            } else {
                var p1 = grid[p][m];
                var p2 = grid[0][m];
                var p3 = grid[p][m + 1];
                faces.push(p1, p2, p3, grid[0][m + 1]);
            }
            
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



