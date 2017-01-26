/// <reference path="Engine/Core/SceneObject.js" />
//.so means secene object
class Earth extends SceneObject{

    constructor(name, _3DmodelName, worldCoords)
    {
        super(name, _3DmodelName, worldCoords);
    }

    onRendering() {
        super.rotate(0, 0, 0.01);
    }

}