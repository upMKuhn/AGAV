# AGAV

OOP Webgl rendering framework for Applied Computer Graphics And  Vision   
No Documentation? - It's a coursework with a thight deadline and many others. TBF I give a brief overview below  
No Unit tests?  I gave my best to decouple everything to make it testable  
  
  
#Documentation
Code is in the Scripts folder  
The Scene.Js is the consumer of the framework and feeds all releavent information into the framework  
The Core folder holds the heart, with the foundation.js file beeing the constructor gluing everything into place.  
Shader classes know how to communicate with the glShader code. There are three types of shaders:  
     1. Vertex Shader (DrawShader)
     2. Color Shader
     3. Texture shader  
Further expansion could be lighting shaders.... 
  
Buffers are the counterpart to the shaders. They know what shader they need, and what model they represent. Ergo they apply them selfs onto the shaders.   
  
The RenderObject represents a 3D model. Ideally there will be a SceneObject that wraps around a 3D model. This would be a one to many relation.  
  
Shader prorgrams are made from one fragment shader and one Vertex shader. There will be a few of them to swicth between different shaders to apply light, drawing and color.  
  
The renderer will know how to set the right shaderPrograms active and is a generic way of drawing RenderObjects. I have it put in, because it is a commodity in Game engines. E.g. RenderQueues ect. 

