class SphereMesh {
    constructor(radius, numParallels, numMeridians) {
        this.grid = [];
        this.vertecies = [];
        this.faces = [];
        this.texture = [];
        this.normals = [];

        this.makeSphere(radius, numParallels, numMeridians);
    }

    makeSphere(radius, numParallels, numMeridians) {
        var index = 0;
        var grid = [];

        for (var p = -1; p < numParallels; p+=1) {
            var row = [];
            var parallel = Math.PI * (p + 1) / numParallels
            for (var m = -1; m < numMeridians; m+=1) {
                var meridian = 2.0 * Math.PI * m / numMeridians
                var cartesian = sphericalToCartesian(radius, meridian, parallel);
                var vec3xyz = vec3.create(cartesian);
                this.vertecies.push(cartesian);

                //NORMALS
                vec3.normalize(vec3xyz, vec3xyz);
                this.normals.push(vec3xyz);


                var x = vec3xyz[0] == 0 ? 0 : vec3xyz[0];
                var y = vec3xyz[1] == 0 ? 0 : vec3xyz[1];
                var z = vec3xyz[2] == 0 ? 0 : vec3xyz[2];
                //UV

                var u = (Math.atan2(x, z) / (2 * Math.PI) + 0.5);
                var v = y * 0.5 + 0.5;



                this.texture.push((m/numMeridians), 1-(p/numParallels));
                row.push(index++);
            }
            this.grid.push(row);
        }

        for (var p = 0; p < (numParallels) ; p++) {
            for (var m = 0; m < numMeridians; m++) {

                if (m < numMeridians) {
                    var p1 = this.grid[p][m];
                    var p2 = this.grid[p + 1][m];
                    var p3 = this.grid[p][m + 1];
                    this.faces.push(p1, p3, p2, this.grid[p + 1][m + 1]);
                    //this.UVfix(this.faces.length-4);
                }
            }
        }
    }

    UVfix(faceIndex) {
        var uvs = this.fecthUVForSquare(faceIndex);
        for (var j = 0; j < uvs.length; j++) {
            for (var i = 0; i < uvs.length - 1; i++) {
                if (this.isUDistanceToLarge(uvs[j][0], uvs[i][0])) {
                    this.correctUDistance(faceIndex + j, faceIndex + i);
                    uvs = this.fecthUVForSquare(faceIndex);
                }
            }
        }
    }

    getUVByIndex(index) {
        return [this.texture[(index * 2)], this.texture[(index * 2)+1]]
    }

    isUDistanceToLarge(u1, u2) {
        return Math.abs(u1 - u2) > 0.80;
    }

    correctUDistance(index1, index2) {
        var u1 = this.getUVByIndex(this.faces[index1]);
        var u2 = this.getUVByIndex(this.faces[index2]);
        
        if (u1[0] < u2[0]) {
            this.replaceUVValue(index1, [1-u1[0], u1[1]]);
        }
        if (u1[0] > u2[0]) {
            this.replaceUVValue(index2, [1-u2[0], u2[1]]);
        }


    }

    fecthUVForSquare(faceIndex) {
        return [this.getUVByIndex(this.faces[faceIndex]), this.getUVByIndex(this.faces[faceIndex+1]),
        this.getUVByIndex(this.faces[faceIndex+2]), this.getUVByIndex(this.faces[faceIndex+3])];
    }

    replaceUVValue(faceIndex, uv) {
        var oldPositionIndex = this.faces[faceIndex];

        this.texture.push(uv[0], uv[1])
        this.texture[oldPositionIndex * 2] = 1 - uv[0];
        this.vertecies.push(this.vertecies[oldPositionIndex]);
        this.faces[faceIndex] = this.vertecies.length - 1;
    }
}

