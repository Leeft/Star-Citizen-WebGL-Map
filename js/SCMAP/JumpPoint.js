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
      if ( this.drawn ) {
         return;
      }
      for ( var i = 0; i < this.destination.jumppoints.length; i++ ) {
         var jumppoint = this.destination.jumppoints[i];
         if ( jumppoint.destination == this.source ) {
            if ( jumppoint.drawn ) {
               return;
            }
         }
      }

      var startColour = new THREE.Color( this.source.color );
      var endColour = new THREE.Color( this.destination.color );
      var factor = 1.0;

      var length = this.source.position.clone().sub( this.destination.position ).length();

      var geometry = new THREE.Geometry();
      geometry.vertices.push( this.source.position );
      geometry.vertices.push( this.destination.position );
      startColour.setRGB( startColour.r * factor, startColour.g * factor, startColour.b * factor )
      endColour.setRGB( endColour.r * factor, endColour.g * factor, endColour.b * factor )
      var midColour = startColour.clone().lerp( endColour, 0.5 );

      geometry.colors[0] = midColour; //startColour;
      geometry.colors[1] = midColour; //endColour;
      this.setDrawn();
      for ( var i = 0; i < this.destination.jumppoints.length; i++ ) {
         var jumppoint = this.destination.jumppoints[i];
         if ( jumppoint.destination == this.source ) {
            jumppoint.setDrawn();
         }
      }
      return new THREE.Line( geometry, SCMAP.JumpPoint.lineMaterial );
   },

   setDrawn: function() {
      this.drawn = true;
   }
};

SCMAP.JumpPoint.lineMaterial = new THREE.LineBasicMaterial({ color: 0xCCCCCC, linewidth: 1, vertexColors: true });

