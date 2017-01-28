class ModelDimension
{
    constructor(height, width, depth, topLeft, bottomRight)
    {
        this.height = null;
        this.width = null;
        this.depth = null;

        this.bottomRight = null;
        this.topLeft = null;
        this.update(height, width, depth, topLeft, bottomRight);
    }

    update(height, width, depth, topLeft, bottomRight) {
        this.height = getOrDefault(height, 0);
        this.width = getOrDefault(width,0);
        this.depth = getOrDefault(depth,0);

        this.topLeft = getOrDefault(topLeft, [0,0,0]);
        this.bottomRight = getOrDefault(bottomRight, [0,0,0]);
    }

    clone() {
        return Factory("ModelDimension", [this.height, this.width,
            this.depth, this.topLeft, this.bottomRight]);
    }

    getDimensionWithAdjustedPosition(positioWithRotation) {
        return Factory("ModelDimension", [this.height, this.width, this.depth,
            this.__getAppliedPositionOnPoint(positioWithRotation, this.topLeft),
            this.__getAppliedPositionOnPoint(positioWithRotation, this.bottomRight)
        ]);
    }

    __getAppliedPositionOnPoint(position, point) {
        var newPoint = [0, 0, 0];
        newPoint[0] = point[0] + position[0];
        newPoint[1] = point[1] + position[1];
        newPoint[2] = point[2] + position[2];

        this.__rotateX(newPoint, position[3]);
        this.__rotateY(newPoint, position[4]);
        this.__rotateZ(newPoint, position[5]);

        return newPoint;
    }


    __rotateX(xyz, angle) {
        var sin = Math.sin(angle);
        var cos = Math.cos(angle);

        xyz[0] = xyz[0];
        xyz[1] = xyz[1] * cos - xyz[2] * sin;
        xyz[2] = xyz[1] * sin + xyz[2] * cos;
        return xyz; //return xyz reference
    }

    __rotateY(xyz, angle) {
        var sin = Math.sin(angle);
        var cos = Math.cos(angle);

        xyz[0] = xyz[0] * cos + xyz[2] * sin;
        xyz[1] = xyz[1];
        xyz[2] = -xyz[0] * sin + xyz[2] * cos;
        return xyz; //return xyz reference
    }

    __rotateZ(xyz, angle) {
        var sin = Math.sin(angle);
        var cos = Math.cos(angle);

        xyz[0] = xyz[0] * cos - xyz[1] * sin;
        xyz[1] = xyz[0] * sin + xyz[1] * cos;
        xyz[2] = xyz[2];
        return xyz; //return xyz reference
    }


}