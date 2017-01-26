
class Sphere extends RenderModel {
    constructor(objectName, radius, numParallels, numMeridians)
    {
        var mesh = new SphereMesh(radius, numParallels, numMeridians);
        var sphereMesh = {};

        sphereMesh = {
            "class": "TextureBuffer",
            "shaderProgramName": "texture",
            "RenderOptions": {
                "drawShape": "TRIANGLE_STRIP",
            },
        };
        sphereMesh.position = {
            array: [].concat.apply([], mesh.vertecies),
            "itemSize": 3,
        }
        sphereMesh.indices = {
            array: mesh.faces,
            "itemSize": 1,
        }
        sphereMesh.color = {
            array: []
        }
        sphereMesh.texture = {
            array: mesh.texture,
            "src": "Assets/Textures/earth.jpg",
        }

        var buffer = Factory(sphereMesh.class, [sphereMesh]);
        var renderObjModel = {
            "ObjectName": objectName,
            "objectPosition": [0, 0, 0, -1.45, 0, 0],
            "Mesh": [sphereMesh]
        }
        super(renderObjModel, buffer);
        //this.generateRGBA(sphereModel);

    }

    generateRGBA(model) {
        var faces = model.indices.array;
        var cmodel = model.color;
        var colors = cmodel.array;
        for (var i = 0; i < faces.length; i += 3) {
            var r = this.random(2);
            var g = this.random(2);
            var b = this.random(2);


            colors.push(r, g, b, 1);
            colors.push(r, g, b, 1);
            colors.push(r, g, b, 1);

        }
    }

    random(decimal) {
        var factor = 10 * decimal;
        return Math.floor(Math.random() * factor) / factor;
    }

   
}
