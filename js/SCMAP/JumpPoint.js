/**
* @author LiannaEeftinck / https://github.com/Leeft
*/

SCMAP.JumpPoint = function ( source, destination, name ) {
   this.name = typeof name === 'string' && name.length > 1 ? name : undefined;
   this.source = source instanceof SCMAP.System ? source : undefined;
   this.destination = destination instanceof SCMAP.System ? destination : undefined;
   this.sceneObject = undefined;
   this.is_valid = false;
   if ( this.source === undefined || this.destination === undefined || this.source === this.destination ) {
      console.error( "Invalid route created" );
   } else {
      this.is_valid = true;
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
   geometry: function() {
      var geometry = new THREE.Geometry();
      geometry.vertices.push( this.source.position );
      geometry.vertices.push( this.destination.position );
      geometry.computeBoundingSphere();
      return geometry;
   }
};

