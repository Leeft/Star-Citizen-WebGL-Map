/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/
/*
 * Manages the texture canvas(es) for the system labels using the SCMAP.Knapsack class
 */

SCMAP.TextureManager = function () {
   var canvas = document.createElement('canvas');
   canvas.width = 2048;
   canvas.height = canvas.width;
   this.knapsacks = [ new SCMAP.Knapsack( canvas ) ];
};

SCMAP.TextureManager.prototype = {
   constructor: SCMAP.TextureManager,

   allocateTextureNode: function allocateTextureNode( width, height ) {
      var knapsack, node, canvas, j;

      for ( j = 0; j < this.knapsacks.length; j++ )
      {
         knapsack = this.knapsacks[j];
         node = knapsack.insert({ width: width, height: height });
         if ( node ) {
            return node;
         }
      }

      if ( width < knapsack.canvas.width ) {

         // Didn't get a node but it should fit, so get a new canvas
         canvas = document.createElement('canvas');
         canvas.width = this.knapsacks[0].canvas.width;
         canvas.height = canvas.width;
         knapsack = new SCMAP.Knapsack( canvas );
         this.knapsacks.push( knapsack );
         node = knapsack.insert({ width: width, height: height });
         if ( node ) {
            return node;
         }
      } 

      return null;
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
