class SceneObject {

    constructor(name, _3DmodelName, worldCoords)
    {
        this.name = name;
        this.worldCoords = getOrDefault(worldCoords, [0,0,0, 0,0,0]);
        this.modelName = _3DmodelName;
        this.model = null;
    }

    setModel(model) {
        this.model = model;
    }

    //calls for animation
    onRendering() {
    }

    setPosition(x, y, z) {
        this.worldCoords[0] = getOrDefault(x, this.worldCoords[0]);
        this.worldCoords[1] = getOrDefault(y, this.worldCoords[1]);
        this.worldCoords[2] = getOrDefault(z, this.worldCoords[2]);
    }

    move(x, y, z) {
        this.worldCoords[0] += getOrDefault(x,0)
        this.worldCoords[1] += getOrDefault(y, 0)
        this.worldCoords[2] += getOrDefault(z, 0)
    }

    rotate(x, y, z) {
        this.worldCoords[3] += getOrDefault(x, 0)
        this.worldCoords[4] += getOrDefault(y, 0)
        this.worldCoords[5] += getOrDefault(z, 0)

        var maxRadiant = (Math.PI / 180) * 360

        if (this.worldCoords[3] > maxRadiant)
            this.worldCoords[3] -= maxRadiant;
        if (this.worldCoords[4] > maxRadiant)
            this.worldCoords[4] -= maxRadiant;
        if (this.worldCoords[5] > maxRadiant)
            this.worldCoords[5] -= maxRadiant;
    }

    setRotatation(x, y, z) {
        this.worldCoords[3] += getOrDefault(x, 0)
        this.worldCoords[4] += getOrDefault(y, 0)
        this.worldCoords[5] += getOrDefault(z, 0)

        var maxRadiant = (Math.PI / 180) * 360

        if (this.worldCoords[3] > maxRadiant)
            this.worldCoords[3] -= maxRadiant;
        if (this.worldCoords[4] > maxRadiant)
            this.worldCoords[4] -= maxRadiant;
        if (this.worldCoords[5] > maxRadiant)
            this.worldCoords[5] -= maxRadiant;
    }

    getVertexBuffers() {
        return this.model.getVertexBuffers();
    }

    getModelMatrix() {
        var modelMatrix = mat4.create();
        mat4.identity(modelMatrix);
        modelMatrix = this.applyModelMatrix(modelMatrix);
        return modelMatrix;
    }

    applyModelMatrix(modelMatrix) {
        var finalPosition = this.__getFinalPosition();
        var xyz = vec3.create([finalPosition[0], finalPosition[1], finalPosition[2]]);
        mat4.translate(modelMatrix, xyz, modelMatrix);
        mat4.rotateX(modelMatrix, finalPosition[3], modelMatrix);
        mat4.rotateY(modelMatrix, finalPosition[4]), modelMatrix;
        mat4.rotateZ(modelMatrix, finalPosition[5], modelMatrix);

        return modelMatrix;
    }


    __getFinalPosition() {

        var modelPos = this.model.objectPosition;
        var finalPosition = [this.worldCoords[0] + modelPos[0],
            this.worldCoords[1] + modelPos[1],
            this.worldCoords[2] + modelPos[2],
            this.worldCoords[3] + modelPos[3],
            this.worldCoords[4] + modelPos[4],
            this.worldCoords[5] + modelPos[5],
        ]
        return finalPosition;
    }
}