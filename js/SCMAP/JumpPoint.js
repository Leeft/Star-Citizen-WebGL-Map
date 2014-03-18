/**
* @author LiannaEeftinck / https://github.com/Leeft
*/

SCMAP.JumpPoint = function ( source, destination, name ) {
   this.name = typeof name === 'string' && name.length > 1 ? name : undefined;
   this.source = source instanceof SCMAP.System ? source : undefined;
   this.destination = destination instanceof SCMAP.System ? destination : undefined;
   this.is_valid = false;
   this.drawn = false;
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
      if ( !this.is_valid ) {
         return;
      }
      var vec = new THREE.Vector3();
      vec.subVectors( this.source.position, this.destination.position );
      return vec.length();
   },

   sceneObject: function() {
      var i, jumppoint, startColour, endColour, factor, length, geometry, midColour, routeObject;
      if ( this.drawn ) {
         return;
      }
      for ( i = 0; i < this.destination.jumppoints.length; i++ ) {
         jumppoint = this.destination.jumppoints[i];
         if ( jumppoint.destination == this.source ) {
            if ( jumppoint.drawn ) {
               return;
            }
         }
      }

      startColour = new THREE.Color( this.source.color );
      endColour = new THREE.Color( this.destination.color );
      factor = 1.0;

      length = this.source.position.clone().sub( this.destination.position ).length();

      geometry = new THREE.Geometry();
      geometry.dynamic = true;
      geometry.vertices.push( this.source.scenePosition );
      geometry.vertices.push( this.destination.scenePosition );
      startColour.setRGB( startColour.r * factor, startColour.g * factor, startColour.b * factor );
      endColour.setRGB( endColour.r * factor, endColour.g * factor, endColour.b * factor );
      midColour = startColour.clone().lerp( endColour, 0.5 );

      geometry.colors[0] = midColour; //startColour;
      geometry.colors[1] = midColour; //endColour;
      this.setDrawn();

      for ( i = 0; i < this.destination.jumppoints.length; i++ ) {
         jumppoint = this.destination.jumppoints[i];
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

SCMAP.JumpPoint.lineMaterial = new THREE.LineBasicMaterial({ color: 0xCCCCCC, linewidth: 1, vertexColors: true });

