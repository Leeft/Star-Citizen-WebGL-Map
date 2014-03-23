/**
* @author LiannaEeftinck / https://github.com/Leeft
*/

SCMAP.JumpPoint = function ( source, destination, name ) {
   this.name = typeof name === 'string' && name.length > 1 ? name : undefined;
   this.source = source instanceof SCMAP.System ? source : undefined;
   this.destination = destination instanceof SCMAP.System ? destination : undefined;
   this.is_valid = false;
   this.drawn = false;
   this.type_id = undefined;
   this.entryAU = new THREE.Vector3( 0, 0, 0 );

   if ( this.source === undefined || this.destination === undefined || this.source === this.destination ) {
      console.error( "Invalid route created" );
   } else {
      this.is_valid = true;
      if ( this.name === undefined ) {
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
      var i, jumppoint, geometry, midColour, routeObject;
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
      geometry.dynamic = true;
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

      routeObject = new THREE.Line( geometry, SCMAP.JumpPoint.lineMaterial );
      this.source.routeObjects.push( routeObject );
      return routeObject;
   },

   setDrawn: function() {
      this.drawn = true;
   }
};

SCMAP.JumpPoint.lineMaterial = new THREE.LineBasicMaterial({
   color: 0xCCCCCC,
   linewidth: 1.5,
   vertexColors: true
});
