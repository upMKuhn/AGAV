# AGAV

OOP Webgl rendering framework for Applied Computer Graphics And  Vision   
No Documentation? - It's a coursework with a thight deadline and many others. TBF I give a brief overview below  
No Unit tests?  I gave my best to decouple everything to make it testable, but visual studio makes Javascript unit testing very time consuming.
  
  
#Documentation
Code is in the Scripts folder  
Engine - Generic framework  
Scene.js is a good example. How to use the framework. It contains Loading assets, scene creation and rendering.  
  
The Scene.Js is the consumer of the framework and feeds all releavent information into the framework  
The Engine/Core folder contains the heart, with the foundation.js file beeing the heart muscle gluing everything into place.  
  
Shader classes know how to communicate with the glShader code. There are currently three types of shaders:  
     1. Vertex Shader (DrawShader)
     2. Color Shader
     3. Texture shader  
Further expansion will be lighting shaders.... 
  
Buffers are the counterpart to the shaders. They know what shader they need, and what model they represent. Ergo they apply them selfs onto the shaders.   
  
The RenderModel represents a 3D model. While a SceneObject wraps around a 3D model and contains model behaviour and world properties. This is a one to many relation.  
  
Shader prorgrams are made from one fragment shader and one Vertex shader. There will be a few of them to swicth between different shaders to apply light, drawing, color and textures.  
  
The renderer will know how to set the right shaderPrograms active. It is a generic way of drawing Scene objects. Additionally it is a commodity in Game engines. E.g. RenderQueues ect. 

The IO folder contains a bunch of input output utillity stuff. This would be the asset management, which load them and allow dynamic wiring of objects.  
The input class is a generic user input handler. It detects patterns of input, that consumers can subscribe to. E.g. Key combinations with mouse movement. It is important to wire the class up after the creation. MyCanvas.js is a very good exmaple of that. It know all about the canvas DOM object, but very little of key combinations and such.  
  
The MeshGen folder contains Gemotric classes. E.g. Construction of primitives and the 3D model implementations for them.
