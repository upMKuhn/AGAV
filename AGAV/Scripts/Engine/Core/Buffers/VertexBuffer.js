class VertexBuffer{

    constructor(data)
    {
        this.normals = {};
        this.positionBuffer = null;
        this.indexBuffer = null;
        this.RenderOptions = null;


        this.glVertexBuffer = gl.createBuffer();
        this.glIndexBuffer = gl.createBuffer();
        this.glNormalBuffer = gl.createBuffer();
        this.debugger = new DebuggerNullObject();

        this.dimensions = Factory("ModelDimension", [0, 0, 0, [0,0,0], [0,0,0]]);



        this.model = data;
        if (data != undefined)
            this.applyModel(data);
    }

    getDimensions() {
        return this.dimensions.copy();
    }

    getRenderOptions() { return this.RenderOptions; }

    usesIndecies() {
        return this.indexBuffer.array.length > 0;
    }

    applyToShader(drawShader) {
        var glBuffers = this.getBuffers();
        drawShader.bindPositionBuffer(glBuffers[1]);
        drawShader.setNormals(glBuffers[0]);
    }

    getBuffers()
    {
        var buffers = [];
        this.__applyDebugger();
        this.debugger.onRenderCallMe();
        if (this.positionBuffer.array.length > 0) {
            this.__makeBuffers(this.glVertexBuffer, this.positionBuffer, gl.ARRAY_BUFFER, "Float32Array");
            this.__makeBuffers(this.glNormalBuffer, this.normals, gl.ARRAY_BUFFER, "Float32Array");
            buffers.push(this.glNormalBuffer, this.glVertexBuffer)
        }

        if (this.indexBuffer.array.length > 0 && buffers.length > 0){
            this.__makeBuffers(this.glIndexBuffer, this.indexBuffer, gl.ELEMENT_ARRAY_BUFFER, "Uint16Array");
            buffers.push(this.glIndexBuffer);
        }

        return buffers;
    }

    applyModel(model) {
        if (this.__isValidVertexBufferModel(model)) {
            this.positionBuffer = model.position;
            this.indexBuffer = model.indices;
            this.RenderOptions = model.RenderOptions;
            this.RenderOptions.drawShape = WebGlDataTypeFactory.Enum(this.RenderOptions.drawShape);
            this.normals = {
                array: model.normals,
                itemSize: 3,
            }
            this.__generateNormals();
            this.__setupVertexDebugger();
            this.__updateDimensions();
        }
    }



    __setupVertexDebugger() {
        if (this.indexBuffer.array.length > 0) 
            this.debugger = new VertexDebugger(1*3, this.indexBuffer.array);
        else 
            this.debugger = new VertexDebugger(3 * 3, this.positionBuffer.array);
        this.__applyDebugger();
    }

    __applyDebugger() {
        if (this.indexBuffer.array.length > 0) 
            this.indexBuffer.array = this.debugger.getBuffer();
        else 
            this.positionBuffer.array = this.debugger.getBuffer();
    }

    __isValidVertexBufferModel(obj) {
        var result = true;
        result = result & obj.position != undefined;
        result = result & obj.position.array != undefined;
        result = result & obj.position.itemSize != undefined;


        result = result & obj.indices != undefined;
        result = result & obj.indices.array != undefined;
        result = result & obj.indices.itemSize != undefined;

        return result;
    }

    __makeBuffers(glBuffer, modelBuffer, bufferTypeEnum, dataTypeEnum)
    {
        if (glBuffer.wasSetup != true || this.debugger.isDebugMode()) {
            var data = WebGlDataTypeFactory.createArrayType(dataTypeEnum, modelBuffer.array);
            glBuffer.data = data;
            glBuffer.itemSize = modelBuffer.itemSize;
            glBuffer.numItems = modelBuffer.array.length / glBuffer.itemSize;
            glBuffer.wasSetup = true;
            glBuffer.bufferType = bufferTypeEnum;
        }
        gl.bindBuffer(glBuffer.bufferType, glBuffer);
        gl.bufferData(glBuffer.bufferType, glBuffer.data, gl.STATIC_DRAW)
    }

    __generateNormals() {
        if (this.normals.array != undefined) {
            return;
        } else if (this.indexBuffer == undefined || this.indexBuffer.array == undefined || (this.indexBuffer.array != undefined && this.indexBuffer.array.length == 0)) {
            this.__generateNormalsFromVertex();
        } else {
            this.__generateNormalsFromIndecies();
        }
        this.normals.itemSize = 3;
    }

    __generateNormalsFromIndecies() {
        var faces = this.indexBuffer.array;
        var vertecies = this.positionBuffer.array;
        var normals = [];
        var p1, p2, p3

        for (var i = 0; i < faces.length; i += 3) {
            p1 = vec3.create([vertecies[faces[i + 0]], vertecies[faces[i + 0] + 1], vertecies[faces[i + 0] + 2]])
            p2 = vec3.create([vertecies[faces[i + 1]], vertecies[faces[i + 1] + 1], vertecies[faces[i + 1] + 2]])
            p3 = vec3.create([vertecies[faces[i + 2]], vertecies[faces[i + 2] + 1], vertecies[faces[i + 2] + 2]])

            vec3.subtract(p2, p1, p2);
            vec3.subtract(p3, p1, p3);
            p1[0] = p2[0] * p3[0]
            p1[1] = p2[1] * p3[1]
            p1[2] = p2[2] * p3[2]

            var length = Math.sqrt(p1[0] * p1[0] + p1[1] * p1[1] + p1[2] * p1[2]);

            normals.push(p1[0] / length);
            normals.push(p1[1] / length);
            normals.push(p1[2] / length);
        }
        this.normals.array = normals;
    }

    __generateNormalsFromVertex() {
        var vertecies = this.positionBuffer.array;
        var normals = [];
        var p1, p2, p3;

        for (var i = 0; i < vertecies.length; i += 9) {
            p1 = vec3.create([vertecies[i + 0], vertecies[i + 1], vertecies[i + 2]])
            p2 = vec3.create([vertecies[i + 3], vertecies[i + 4], vertecies[i + 5]])
            p3 = vec3.create([vertecies[i + 6], vertecies[i + 7], vertecies[i + 8]])

            vec3.subtract(p2, p1, p2);
            vec3.subtract(p3, p1, p3);
            p1[0] = p2[0] * p3[0]
            p1[1] = p2[1] * p3[1]
            p1[2] = p2[2] * p3[2]

            var length = Math.sqrt(p1[0] * p1[0] + p1[1] * p1[1] + p1[2] * p1[2]);

            p1[0] = p1[0] / length;
            p1[1] = p1[2] / length;
            p1[2] = p1[2] / length;

            normals.push(!isNaN(p1[0]) ? p1[0] : 0);
            normals.push(!isNaN(p1[1]) ? p1[1] : 0);
            normals.push(!isNaN(p1[2]) ? p1[2] : 0);
            normals.push(!isNaN(p1[0]) ? p1[0] : 0);
            normals.push(!isNaN(p1[1]) ? p1[1] : 0);
            normals.push(!isNaN(p1[2]) ? p1[2] : 0);
            normals.push(!isNaN(p1[0]) ? p1[0] : 0);
            normals.push(!isNaN(p1[1]) ? p1[1] : 0);
            normals.push(!isNaN(p1[2]) ? p1[2] : 0);
        }
        this.normals.array = normals;
    }

    __updateDimensions()
    {
        var minx=0, miny=0, minz=0, maxx=0, maxy=0, maxz=0;
        var vertecies = this.positionBuffer.array;

        for(var i=0; i< vertecies.length; i+= 3)
        {
            var x = vertecies[i+0];
            var y = vertecies[i+1];
            var z = vertecies[i + 2];

            minx = x < minx ? x : minx;
            miny = y < miny ? y : miny;
            minz = z < minz ? z : minz;

            maxx = x > maxx ? x : maxx;
            maxy = y > maxy ? y : maxy;
            maxz = z > maxz ? z : maxz;
        }

        var height = Math.abs(maxy - miny);
        var width = Math.abs(maxx - minx);
        var depth = Math.abs(maxz - minz);

        var topLeft = [minx, maxy, maxz];
        var bottomRight = [maxx, miny, minz];

        this.dimensions.update(height, width, depth, topLeft, bottomRight);
    }

}

