/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/
/*
 * Manages the texture canvas(es) for the system labels using the SCMAP.Knapsack class
 */

SCMAP.TextureManager = function () {
   var canvas = document.createElement('canvas');
   canvas.width = 256 * 2;
   canvas.height = canvas.width; // * 0.4;
   //if ( window.jQuery ) {
   //   $('#debug-canvases').append( canvas );
   //}
   console.log( "SCMAP.TextureManager: Allocated "+canvas.width+"px texture map #1" );
   this.knapsacks = [ new SCMAP.Knapsack( canvas ) ];
   this.textures = [ new THREE.Texture( canvas, THREE.UVMapping ) ];
};

SCMAP.TextureManager.prototype = {
   constructor: SCMAP.TextureManager,

   allocateTextureNode: function allocateTextureNode( width, height ) {
      var knapsack, node, texture, canvas, i;

      for ( i = 0; i < this.knapsacks.length; i++ )
      {
         knapsack = this.knapsacks[ i ];
         node = knapsack.insert({ width: width, height: height });
         if ( node ) {
            node.texture = this.textures[ i ].clone();
            node.texture.needsUpdate = true;
            node.setUV();
            return node;
         }
      }

      if ( width < knapsack.canvas.width ) {

         // Didn't get a node but it *should* fit, so get a new canvas
         canvas = document.createElement('canvas');
         canvas.width = this.knapsacks[0].canvas.width;
         canvas.height = this.knapsacks[0].canvas.height;
         //if ( window.jQuery ) {
         //   $('#debug-canvases').append( canvas );
         //}
         knapsack = new SCMAP.Knapsack( canvas );
         texture = new THREE.Texture( canvas, THREE.UVMapping );
         this.knapsacks.push( knapsack );
         this.textures.push( texture );
         console.log( "SCMAP.TextureManager: Allocated "+canvas.width+"px texture map #"+(this.knapsacks.length) );
         node = knapsack.insert({ width: width, height: height });
         if ( node ) {
            node.texture = texture.clone();
            node.texture.needsUpdate = true;
            node.setUV();
            return node;
         }
      } 

      return null;
   },

   freeTextureNode: function freeTextureNode( node ) {
      if ( !node || !node.imageID ) {
         return;
      }

      node.release();
   },

   getCanvases: function getCanvases() {
      var canvases = [];
      for ( var i = 0; i < this.knapsacks.length; i += 1 ) {
         canvases.push( this.knapsacks[ i ].canvas );
      }
      return canvases;
   }
};

// EOF
