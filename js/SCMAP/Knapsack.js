/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/
/*
 * Helper classes to generate a texture map for the text labels
 *
 * Based on: http://www.blackpawn.com/texts/lightmaps/default.html
 */

SCMAP.Knapsack = function ( canvas ) {
   this.canvas = canvas;
   this.rootNode = new SCMAP.Knapsack.Node( this );
   this.rootNode.rectangle = new SCMAP.Knapsack.Rectangle( 0, 0, canvas.width - 1, canvas.height - 1 );
};

SCMAP.Knapsack.prototype = {
   constructor: SCMAP.Knapsack,

   insert: function insert( image ) {
      var node = this.rootNode.insert( image );

      if ( node !== null ) {
         node.claim();
         //var context = this.canvas.getContext('2d');
         //context.lineWidth = 2.0;
         //context.strokeStyle = 'rgba(0,0,255,1)';
         //context.strokeRect( node.rectangle.left + 0.5, node.rectangle.top + 0.5,
         //   node.rectangle.width() - 1, node.rectangle.height() - 1 );
      }

      return node;
   }
};


SCMAP.Knapsack.Rectangle = function ( left, top, right, bottom ) {
   this.left = ( typeof left === 'number' ) ? Math.floor( left ) : 0;
   this.top = ( typeof top === 'number' ) ? Math.floor( top ) : 0;
   this.right = ( typeof right === 'number' ) ? Math.floor( right ) : 0;
   this.bottom = ( typeof bottom === 'number' ) ? Math.floor( bottom ) : 0;
};

SCMAP.Knapsack.Rectangle.prototype = {
   constructor: SCMAP.Knapsack.Node,

   Xcentre: function Xcentre() {
      return Math.floor( ( ( this.right - this.left ) / 2 ) + this.left ) - 0.5;
   },

   Ycentre: function Ycentre() {
      return Math.floor( ( ( this.bottom - this.top ) / 2 ) + this.top ) - 0.5;
   },

   width: function width() {
      return( this.right - this.left );
   },

   height: function height() {
      return( this.bottom - this.top );
   }
};


SCMAP.Knapsack.Node = function ( knapsack ) {
   this.knapsack = knapsack;
   this.canvas = knapsack.canvas;
   this.leftChild = null;
   this.rightChild = null;
   this.rectangle = null;
   this.imageID = null;
   this.texture = null;

   this.generateUUID = function generateUUID() {
      return THREE.Math.generateUUID();
   };
};

SCMAP.Knapsack.Node.prototype = {

   constructor: SCMAP.Knapsack.Node,

   claim: function claim( image ) {
      this.imageID = this.generateUUID();
   },

   release: function release() {
      if ( this.leftChild || this.rightChild ) {
         throw new Error( "Can't release tree nodes" );
      }

      this.imageID = null;
      this.clear();
      return;
   },

   clear: function clear() {
      var ctx = this.canvas.getContext('2d');
      ctx.clearRect( this.rectangle.left, this.rectangle.top, this.rectangle.width() - 1, this.rectangle.height() - 1 );
   },

   clipContext: function clipContext() {
      var ctx = this.canvas.getContext('2d');
      ctx.save();
      ctx.beginPath();
      ctx.rect( this.rectangle.left + 1, this.rectangle.top + 1, this.rectangle.width() - 2, this.rectangle.height() - 2 );
      ctx.clip();
      ctx.translate( this.rectangle.Xcentre(), this.rectangle.Ycentre() );
      return ctx;
   },
   restoreContext: function restoreContext() {
      var ctx = this.canvas.getContext('2d');
      ctx.restore();
   },

   setUV: function setUV() {
      var uvExtremes = this.uvCoordinates();
      this.texture.offset.x = uvExtremes[ 0 ];
      this.texture.offset.y = uvExtremes[ 1 ];
      this.texture.repeat.x = ( uvExtremes[ 2 ] - uvExtremes[ 0 ] );
      this.texture.repeat.y = ( uvExtremes[ 3 ] - uvExtremes[ 1 ] );
   },

   uvCoordinates: function uvCoordinates() {
      return [
         this.rectangle.left / this.canvas.width,
         1 - ( this.rectangle.bottom / this.canvas.height ),
         this.rectangle.right / this.canvas.width,
         1 - ( this.rectangle.top / this.canvas.height ),
      ];
   },

   insert: function insert( image ) {
      // if we're not a leaf then
      if ( this.leftChild || this.rightChild )
      {
         // (try inserting into first child)
         var newNode = this.leftChild.insert( image );
         if ( newNode instanceof SCMAP.Knapsack.Node ) {
            return newNode;
         }
         // (no room, insert into second)
         return this.rightChild.insert( image );
      }
      else
      {
         // (if there's already an image here, return)
         if ( this.imageID ) {
            return null;
         }

         // (if we're too small, return)
         if ( ( image.width > this.rectangle.width() ) || ( image.height > this.rectangle.height() ) ) {
            return null;
         }

         // (if we're just right, accept)
         if ( image.width === this.rectangle.width() && image.height === this.rectangle.height() ) {
            return this;
         }
        
         // (otherwise, gotta split this node and create some kids)
         this.leftChild = new SCMAP.Knapsack.Node( this );
         this.rightChild = new SCMAP.Knapsack.Node( this );

         // (decide which way to split)
         var dw = this.rectangle.width() - image.width;
         var dh = this.rectangle.height() - image.height;

         if ( dw > dh )
         {
            this.leftChild.rectangle = new SCMAP.Knapsack.Rectangle(
               this.rectangle.left, this.rectangle.top, this.rectangle.left + image.width, this.rectangle.bottom
            );

            this.rightChild.rectangle = new SCMAP.Knapsack.Rectangle(
               this.rectangle.left + image.width, this.rectangle.top, this.rectangle.right, this.rectangle.bottom
            );
         }
         else
         {
            this.leftChild.rectangle = new SCMAP.Knapsack.Rectangle(
               this.rectangle.left, this.rectangle.top, this.rectangle.right, this.rectangle.top + image.height
            );

            this.rightChild.rectangle = new SCMAP.Knapsack.Rectangle(
               this.rectangle.left, this.rectangle.top + image.height, this.rectangle.right, this.rectangle.bottom
            );
         }

         //var context = this.canvas.getContext('2d');
         //context.lineWidth = 1.0;
         //context.strokeStyle = 'rgba(255,0,0,1)';
         //context.strokeRect( this.leftChild.rectangle.left, this.leftChild.rectangle.top, this.leftChild.rectangle.width(), this.leftChild.rectangle.height() );

         //context.lineWidth = 1.0;
         //context.strokeStyle = 'rgba(0,255,0,1)';
         //context.strokeRect( this.rightChild.rectangle.left, this.rightChild.rectangle.top, this.rightChild.rectangle.width(), this.rightChild.rectangle.height() );

         // Recurse into first child we created
         return this.leftChild.insert( image );
      }
   }
};

// EOF
