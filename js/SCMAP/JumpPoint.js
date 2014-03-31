/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

SCMAP.JumpPoint = function ( data ) {
   this.name = ( typeof data.name === 'string' && data.name.length > 1 ) ? data.name : undefined;
   this.source = ( data.source instanceof SCMAP.System ) ? data.source : undefined;
   this.destination = ( data.destination instanceof SCMAP.System ) ? data.destination : undefined;
   this.drawn = false;
   this.typeId = ( typeof data.typeId === 'number' ) ? data.typeId : 4;
   this.entryAU = new THREE.Vector3(
      (typeof data.entryAU[ 0 ] === 'number') ? data.entryAU[ 0 ] : 0,
      (typeof data.entryAU[ 1 ] === 'number') ? data.entryAU[ 1 ] : 0,
      (typeof data.entryAU[ 2 ] === 'number') ? data.entryAU[ 2 ] : 0
   );

   if ( !this.isValid() ) {
      console.error( "Invalid route created" );
   } else {
      if ( this.name === undefined || this.name === '' ) {
         this.name = "[" + this.source.name + " to " + this.destination.name + "]";
      }
   }
};

SCMAP.JumpPoint.prototype = {
   constructor: SCMAP.JumpPoint,

   length: function() {
      if ( !this.isValid() ) { return; }
      return this.source.position.distanceTo( this.destination.position );
   },

   jumpTime: function() {
      if ( !this.isValid() ) { return; }
      // TODO FIXME: This is a rough guesstimate on how long it will take
      // to travel a JP, and not based in any facts ... no word from devs
      // on this so far.
      return this.length() * 4; // 2 mins for 30LY, ~Sol to Vega (27LY)
   },

   fuelConsumption: function() {
      if ( !this.isValid() ) { return; }
      // TODO: Devs have stated that JP's don't consume fuel to traverse.
      // If that changes, this needs to be quantified and fixed.
      return 0;
   },

   buildSceneObject: function() {
      var oppositeJumppoint, geometry;

      if ( this.drawn ) {
         return;
      }

      // Check if the opposite jumppoint has already been drawn
      oppositeJumppoint = this.getOppositeJumppoint();
      if ( oppositeJumppoint instanceof SCMAP.JumpPoint && oppositeJumppoint.drawn ) {
         return;
      }

      geometry = new THREE.Geometry();
      geometry.colors.push( this.source.faction.lineColor );
      geometry.vertices.push( this.source.sceneObject.position );
      geometry.colors.push( this.destination.faction.lineColor );
      geometry.vertices.push( this.destination.sceneObject.position );

      // Set both the jumppoints as drawn
      this.setDrawn();
      if ( oppositeJumppoint instanceof SCMAP.JumpPoint ) {
         oppositeJumppoint.setDrawn();
      }

      // This is apparently needed for dashed lines
      geometry.computeLineDistances();
      return new THREE.Line( geometry, this.getMaterial(), THREE.LinePieces );
   },

   getOppositeJumppoint: function() {
      for ( var i = 0; i < this.destination.jumpPoints.length; i++ ) {
         var jumppoint = this.destination.jumpPoints[i];
         if ( jumppoint.destination == this.source ) {
            return jumppoint;
         }
      }
   },

   getMaterial: function() {
      if ( this.typeId === 2 ) {
         return SCMAP.JumpPoint.Material.Undiscovered;
      } else if ( this.typeId === 4 ) {
         return SCMAP.JumpPoint.Material.Possible;
      } else {
         return SCMAP.JumpPoint.Material.Regular;
      }
   },

   isValid: function() {
      return( this.source instanceof SCMAP.System &&
         this.destination instanceof SCMAP.System &&
         this.source !== this.destination );
   },

   isUnconfirmed: function() {
      return ( this.typeId === 2 || this.typeId === 4 );
   },

   setDrawn: function() {
      this.drawn = true;
   }
};

SCMAP.JumpPoint.Material = {};
SCMAP.JumpPoint.Material.Regular = new THREE.LineBasicMaterial({
   color: 0xFFFFFF,
   linewidth: 2,
   vertexColors: true
});
SCMAP.JumpPoint.Material.Undiscovered = new THREE.LineDashedMaterial({
   color: 0xFFFFFF,
   dashSize: 0.75,
   gapSize: 0.75,
   linewidth: 2,
   vertexColors: true
});
SCMAP.JumpPoint.Material.Possible = new THREE.LineDashedMaterial({
   color: 0xFFFFFF,
   dashSize: 2,
   gapSize: 2,
   linewidth: 2,
   vertexColors: true
});

// EOF
