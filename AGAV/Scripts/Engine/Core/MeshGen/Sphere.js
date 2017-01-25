
class Sphere extends RenderObject {
    constructor(objectName, radius, numParallels, numMeridians)
    {
        var mesh = makeSphere(radius, numParallels, numMeridians)
        var sphereModel = {
            "class": "TextureBuffer",
            "shaderProgramName": "texture",
            "RenderOptions": {
                "drawShape": "TRIANGLE_STRIP",
            },
        };

        sphereModel.position = {
            array: [].concat.apply([], mesh.vertecies),
            "itemSize": 3,
            "numItems": mesh.vertecies.length
        }
        sphereModel.indices = {
            array: mesh.faces,
            "itemSize": 1,
            "numItems": mesh.faces.length
        }
        sphereModel.color = {
            array: []
        }
        sphereModel.texture = {
            array: mesh.texture,
            "src": "Assets/Textures/earth.jpg",
        }

        var buffer = Factory(sphereModel.class, [sphereModel]);
        var renderObjModel = {
            "ObjectName": objectName,
            "objectPosition": [0, 0, 0, 0.2, 3, 0],
            "Vertex": sphereModel
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
