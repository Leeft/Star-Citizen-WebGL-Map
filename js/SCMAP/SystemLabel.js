/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

SCMAP.SystemLabel = function ( system ) {
   this.node = null;
   this.system = system;

   this.textsize = 58; // px
   this.textVerticalOffset = 12.5; // number of scale 1.0 unit the text is shifted by
   this.symbolVerticalOffset = -22.5; // number of scale 1.0 units the symbols are shifted by
   this.paddingX = 6; // number of scale 1.0 units to add to the width
   this.paddingY = 36.5; // number of scale 1.0 units to add to the height

   this.symbolSize = 24;
   this.symbolSpacing = 2;
   this.outline = 2.0;

   this._width = null; // computed and cached width
   this._height = null; // computed and cached height

   // Governing label scale, can be used to shrink or enlarge the rendering
   this.scale = 1.2;
   if ( this.system.isUnknown() ) {
      this.scale = 0.8;
   }
};
SCMAP.SystemLabel.prototype = {
   constructor: SCMAP.SystemLabel,

   clear: function clear() {
      if ( ! this.node ) {
         return;
      }
      var context = this.node.canvas.getContext('2d');
      context.clearRect( this.node.rectangle.left, this.node.rectangle.top, this.node.rectangle.width(), this.node.rectangle.height() );
   },

   uvCoordinates: function uvCoordinates() {
      if ( ! this.node ) {
         return null;
      }
      return this.node.uvCoordinates();
   },

   getNode: function getNode( knapsack ) {
      if ( this.node ) {
         return this.node;
      }
      var context = knapsack.canvas.getContext('2d');
      this.node = knapsack.insert({ width: Math.floor( this.width( context ) ) - 1, height: Math.floor( this.height( context ) ) - 1 });
      return this.node;
   },

   drawText: function drawText() {
      if ( ! this.node ) {
         return false;
      }
      var ctx = this.node.clipContext();
      ctx.scale( this.scale, this.scale );
      ctx.font = 'bold '+this.textsize+'px Electrolize, Calibri, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgb(140,166,205)'; // TODO
      ctx.strokeStyle = 'rgb(0,0,0)';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.lineWidth = 1;
      ctx.fillText( this.system.name, 0, this.textVerticalOffset );
      ctx.lineWidth = this.outline;
      ctx.strokeText( this.system.name, 0, this.textVerticalOffset );
      this.node.restoreContext();
      return true;
   },

   // Draws the icon(s) on a canvas context
   drawSymbols: function drawSymbols() {
      var symbols = this.system.getSymbols();
      var x = - ( this.symbolsWidth( symbols ) / 2 );
      var i, symbol;
      var offX, offY;

      if ( ! this.node ) {
         return false;
      }

      var ctx = this.node.clipContext();
      ctx.scale( this.scale, this.scale );

      for ( i = 0; i < symbols.length; i++ )
      {
         symbol = symbols[ i ];

         //ctx.beginPath();
         //ctx.rect( x, y - this.symbolSize - 1, this.symbolSize + 2, this.symbolSize + 2 );
         //ctx.lineWidth = 3;
         //ctx.strokeStyle = 'green';
         //ctx.stroke();

         offX = 0;
         offY = 0;
         if ( symbol.offset ) {
            offX = symbol.offset.x;
            offY = symbol.offset.y;
         }

         ctx.font = ( this.symbolSize * symbol.scale ).toFixed(2) + 'px FontAwesome';
         ctx.strokeStyle = 'rgba(0,0,0,1.0)';
         ctx.textAlign = 'center';
         ctx.lineWidth = 4;
         ctx.strokeText( symbol.code, x + offX + ( this.symbolSize / 2 ), this.symbolVerticalOffset + offY );

         ctx.fillStyle = symbol.color;
         ctx.fillText( symbol.code, x + offX + ( this.symbolSize / 2 ), this.symbolVerticalOffset + offY );

         x += this.symbolSize + this.symbolSpacing;
      }

      this.node.restoreContext();
   },

   symbolsWidth: function symbolsWidth( symbols ) {
      return ( ( this.symbolSize * symbols.length ) + ( this.symbolSpacing * ( symbols.length - 1 ) ) );
   },

   width: function width( context ) {
      var tmpWidth;
      var symbolsWidth;
      var canvas;
      if ( this._width ) {
         return this._width;
      }
      if ( !context ) {
         canvas = document.createElement( 'canvas' );
         canvas.width = 256;
         canvas.height = 100;
         context = canvas.getContext('2d');
      }
      context.font = 'bold '+this.textsize+'px Electrolize, Calibri, sans-serif';
      context.textBaseline = 'bottom';
      context.lineWidth = this.outline;
      tmpWidth = context.measureText( this.system.name ).width + this.paddingX;
      symbolsWidth = this.symbolsWidth( this.system.getSymbols() );
      if ( tmpWidth < symbolsWidth ) {
         tmpWidth = symbolsWidth + ( 4 * this.paddingX );
      }
      this._width = Math.floor( tmpWidth * this.scale );
      return this._width;
   },

   height: function height() {
      if ( this._height ) {
         return this._height;
      }
      this._height = Math.floor( ( this.textsize + this.paddingY ) * this.scale );
      return this._height;
   }
};

// EOF
