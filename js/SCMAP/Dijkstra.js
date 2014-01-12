/**
* @author LiannaEeftinck / https://github.com/Leeft
*/

function isInfinite ( num ) {
   return !isFinite( num );
}

SCMAP.Dijkstra = function ( map ) {
   if ( ! ( map instanceof SCMAP.Map ) ) {
      console.error( "No map specified to SCMAP.Dijkstra constructor!" );
      return;
   }

   this.scene = map.scene;
   this.results = [];
   this.object = undefined;
   this.source = undefined;
   this.destination = undefined;
};

SCMAP.Dijkstra.prototype = {
   constructor: SCMAP.Dijkstra,

   createRouteObject: function() {
      this.destroyRoute();
      this.object = new THREE.Object3D();
      return this.object;
   },

   destroyRoute: function() {
      if ( this.object instanceof THREE.Object3D ) {
         this.scene.remove( this.object );
         this.object = undefined;
      }
   },

   destroyGraph: function() {
      this.destroyRoute();
      this.results = [];
      this.source = undefined;
      this.destination = undefined;
   },

   buildGraph: function( initialNode ) {
      var endTime, startTime = new Date();

      this.source = initialNode;
      console.log( 'Building graph starting at ' + initialNode.name + ' ...' );

      // Built using:
      // http://en.wikipedia.org/wiki/Dijkstra%27s_algorithm#Pseudocode

      for ( var k = 0; k < map.systems.length; k++ ) {
         map.systems[k].distance = Number.POSITIVE_INFINITY;
         map.systems[k].parent = null;
      }

      var currentSystem = initialNode;
      currentSystem.distance = 0;
      currentSystem.parent = null;

      var unvisited = map.systems.slice(0); // Make a copy
      unvisited = SCMAP.Dijkstra.quickSort( unvisited );

      //var distance = 0;
      var currentIndex = 0;

      while ( unvisited.length >= 1 )
      {
         currentSystem = unvisited[0];
         // Remove currentSystem from unvisited set
         unvisited.splice( 0, 1 );

         if ( isInfinite( currentSystem.distance ) ) {
            break;
         }

         for ( var i = 0; i < currentSystem.jumppoints.length; i++ )
         {
            var alt = currentSystem.distance + currentSystem.jumppoints[i].length();

            if ( alt < currentSystem.jumppoints[i].destination.distance ) {
               currentSystem.jumppoints[i].destination.distance = alt;
               currentSystem.jumppoints[i].destination.parent = currentSystem;
               unvisited = SCMAP.Dijkstra.quickSort( unvisited );
            }
         }
      }

      this.results = map.systems;
      endTime = new Date();
      console.log( "Graph building took " + (endTime.getTime() - startTime.getTime()) + " msec" );
   },

   routeArray: function( target ) {
      if ( ! ( target instanceof SCMAP.System ) ) {
         console.error( 'No or invalid target specified.' );
         return ;
      }
      if ( this.results.length > 0 ) {
         this.destination = target;
         // Get path and print it out, we're traversing backwards through the optimal path for the target
         var route = [];
         var currentNode = target;
         var visited = [];
         var x = currentNode;
         var seen = {};
         while ( x !== null ) {
            seen[ x.name ] = true;
            visited.push( x );
            x = x.parent;
         }
         visited.reverse();
         return visited;
      }
   }
};

SCMAP.Dijkstra.quickSort = function ( systems ) {
   var array = systems.slice(0); // makes a copy, prevents overwriting

   if ( array.length <= 1 ) {
      return array;
   }

   var lhs = [];
   var rhs = [];
   var pivot = Math.ceil( array.length / 2 ) - 1;

   pivot = array.splice( pivot, 1 )[0];

   for ( var i = 0; i < array.length; i++ ) {
      if ( array[i].distance <= pivot.distance ) {
         lhs.push( array[i] );
      } else {
         rhs.push( array[i] );
      }
   }

   var t1 = SCMAP.Dijkstra.quickSort( lhs );
   var t2 = SCMAP.Dijkstra.quickSort( rhs );

   t1.push( pivot );
   return t1.concat( t2 );
};

// End of file

