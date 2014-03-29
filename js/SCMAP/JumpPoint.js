/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

SCMAP.JumpPoint = function ( data ) {
   this.name = typeof data.name === 'string' && data.name.length > 1 ? data.name : undefined;
   this.source = data.source instanceof SCMAP.System ? data.source : undefined;
   this.destination = data.destination instanceof SCMAP.System ? data.destination : undefined;
   this.is_valid = false;
   this.drawn = false;
   this.typeId = ( typeof data.typeId === 'number' ) ? data.typeId : 4;
   this.entryAU = new THREE.Vector3(
      (typeof data.entryAU[ 0 ] === 'number') ? data.entryAU[ 0 ] : 0,
      (typeof data.entryAU[ 1 ] === 'number') ? data.entryAU[ 1 ] : 0,
      (typeof data.entryAU[ 2 ] === 'number') ? data.entryAU[ 2 ] : 0
   );

   if ( this.source === undefined || this.destination === undefined || this.source === this.destination ) {
      console.error( "Invalid route created" );
   } else {
      this.is_valid = true;
      if ( this.name === undefined || this.name === '' ) {
         this.name = "[" + this.source.name + " to " + this.destination.name + "]";
      }
   }
};

SCMAP.JumpPoint.prototype = {
   constructor: SCMAP.JumpPoint,

   length: function() {
      if ( !this.is_valid ) { return; }
      return this.source.position.distanceTo( this.destination.position );
   },

   buildSceneObject: function() {
      var i, jumppoint, geometry, midColour;
      if ( this.drawn ) {
         return;
      }

      // Check if the opposite jumppoint has already been drawn
      for ( i = 0; i < this.destination.jumpPoints.length; i++ ) {
         jumppoint = this.destination.jumpPoints[i];
         if ( jumppoint.destination == this.source ) {
            if ( jumppoint.drawn ) {
               return;
            }
         }
      }

      geometry = new THREE.Geometry();
      //geometry.dynamic = true;
      geometry.colors.push( this.source.faction.lineColor );
      geometry.vertices.push( this.source.sceneObject.position );
      geometry.colors.push( this.destination.faction.lineColor );
      geometry.vertices.push( this.destination.sceneObject.position );

      this.setDrawn();

      // set the opposite jumppoint as drawn
      for ( i = 0; i < this.destination.jumpPoints.length; i++ ) {
         jumppoint = this.destination.jumpPoints[i];
         if ( jumppoint.destination == this.source ) {
            jumppoint.setDrawn();
         }
      }

      geometry.computeLineDistances();
      return new THREE.Line( geometry, this.getMaterial(), THREE.LinePieces );
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
