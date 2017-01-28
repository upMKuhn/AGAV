class CollisionBox {

    constructor(dimensionsArray, worldPosition)
    {
        this.largeColisionBoxDim = Factor("ModelDimension", []);

        this.worldPosition = getOrDefault(worldPosition, [0,0,0, 0,0,0]);
        this.dimensions = dimensionsArray;
    }

    updateWorldPosition(newPosition) {
        this.worldPosition = newPosition;
    }


    isColliding(collisionBox) {
        //future wise should this be true. The other dimensions should make it more accurate.
        //Since the distance to the object should be smaller. 
        var box1 = collisionBox.largeColisionBoxDim.getDimensionWithAdjustedPosition(collisionBox.worldPosition);
        var box2 = this.largeColisionBoxDim.getDimensionWithAdjustedPosition(this.worldPosition);
        return this.__areDimensionsColliding(box1, box2);
    }

    clone() { return Factory("CollisionBox", [this.dimensions]); }

    __calculateLargeColisionBox() {
        var maxLeftTop = [0, 0, 0]; //-x +Y -Z 
        var maxBottomRight = [0, 0, 0];

        var minX = 0, minY = 0, minZ = 0;
        var maxX = 0, maxY = 0, maxZ = 0;

        for (var i = 0; i < this.dimensions.length, i++;) {
            var dimension = this.dimensions[i];

            minX = Math.min(dimension.topLeft[0], minX);
            minY = Math.min(dimension.topLeft[1], minY);
            minZ = Math.min(dimension.topLeft[2], minZ);
            minX = Math.min(dimension.bottomRight[0], minX);
            minY = Math.min(dimension.bottomRight[1], minY);
            minZ = Math.min(dimension.bottomRight[2], minZ);

            maxX = Math.min(dimension.topLeft[0], maxX);
            maxY = Math.min(dimension.topLeft[1], maxY);
            maxZ = Math.min(dimension.topLeft[2], maxZ);
            maxX = Math.min(dimension.bottomRight[0], maxX);
            maxY = Math.min(dimension.bottomRight[1], maxY);
            maxZ = Math.min(dimension.bottomRight[2], maxZ);

        }

        var height = Math.abs(maxY - minY);
        var width = Math.abs(maxX - minX);
        var depth = Math.abs(maxZ - minZ);

        this.largeColisionBoxDim.update(height, width, depth,
            [minX-0.5, maxY+0.5, minZ-0.5], [maxX+0.5, minY-0.5, maxZ+0.5]);
    }

    __areDimensionsColliding(dim1, dim2) {
        //apply 

        var dim2InsideDim1 = dim1.leftTop[0] <= dim2.topLeft[0]
            && dim1.leftTop[1] >= dim2.topLeft[1]
            && dim1.leftTop[2] <= dim2.topLeft[2]
            && dim1.bottomRight[0] >= dim2.bottomRight[0]
            && dim1.bottomRight[1] <= dim2.bottomRight[1]
            && dim1.bottomRight[2] >= dim2.bottomRight[1];

        var dim1InsideDim2 = dim2.leftTop[0] <= dim1.topLeft[0]
            && dim2.leftTop[1] >= dim1.topLeft[1]
            && dim2.leftTop[2] <= dim1.topLeft[2]
            && dim2.bottomRight[0] >= dim1.bottomRight[0]
            && dim2.bottomRight[1] <= dim1.bottomRight[1]
            && dim2.bottomRight[2] >= dim1.bottomRight[1];
        return dim1InsideDim2 || dim2InsideDim1;
    }
}

