/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

SCMAP.Dijkstra = function ( systems ) {
   if ( ! ( typeof systems === 'object' && Array.isArray( systems ) ) ) {
      console.error( "No array specified to SCMAP.Dijkstra constructor!" );
      return;
   }

   // prebuild a node list
   this._nodes = [];
   this._mapping = {}; // system.id to _nodes map
   var i = systems.length;
   while( i-- ) {
      this._nodes[ i ] = {
         system:   systems[i],
         distance: Number.POSITIVE_INFINITY,
         previous: null
      };
      this._mapping[ systems[i].id ] = this._nodes[ i ];
   }
   this._result = {};
};

SCMAP.Dijkstra.prototype = {
   constructor: SCMAP.Dijkstra,

   buildGraph: function( source ) {
      var nodes, i, distance, system, currentNode, jumpPoint,
         endTime, startTime = new Date();

      if ( !( source instanceof SCMAP.System ) ) { return; }

      if ( this._result.source instanceof SCMAP.System && this._result.source === source ) {
         console.log( 'Reusing generated graph starting at', source.name );
         return;
      }

      this.destroyGraph();
      this._result.source = source;

      console.log( 'Building graph, starting at', source.name );

      // Created using http://en.wikipedia.org/wiki/Dijkstra%27s_algorithm#Pseudocode

      for ( i = 0; i < this._nodes.length; i++ ) {
         this._nodes[ i ].distance = Number.POSITIVE_INFINITY;
         this._nodes[ i ].previous = null;
      }

      currentNode = this._mapping[ source.id ];
      currentNode.distance = 0; // distance from source to source
      currentNode.previous = null;

      nodes = SCMAP.Dijkstra.quickSort( this._nodes );

      while ( nodes.length >= 1 )
      {
         currentNode = nodes[0];
         // Remove currentNode from set
         nodes.splice( 0, 1 );

         if ( isInfinite( currentNode.distance ) ) {
            break;
         }

         for ( i = 0; i < currentNode.system.jumpPoints.length; i++ )
         {
            jumpPoint = currentNode.system.jumpPoints[i];
            distance = currentNode.distance + jumpPoint.length();

            if ( distance < this._mapping[ jumpPoint.destination.id ].distance ) {
               this._mapping[ jumpPoint.destination.id ].distance = distance;
               this._mapping[ jumpPoint.destination.id ].previous = currentNode;
               nodes = SCMAP.Dijkstra.quickSort( nodes );
            }
         }
      }

      this._result.nodes = nodes;
      endTime = new Date();
      console.log( 'Graph building took ' + (endTime.getTime() - startTime.getTime()) + ' msec' );
   },

   destroyGraph: function() {
      this._result = {};
   },

   routeArray: function( destination ) {
      if ( ! ( destination instanceof SCMAP.System ) ) {
         console.error( 'No or invalid destination specified.' );
         return;
      }

      if ( this._result.nodes.length > 0 ) {
         // Get path and print it out, we're traversing backwards
         // through the optimal path for the destination
         var visited = [];
         var x = this._mapping[ destination.id ];
         var seen = {};
         while ( x !== null ) {
            seen[ x.system.name ] = true;
            visited.push( x );
            x = x.previous;
         }
         visited.reverse();
         return visited;
      }
   },

   constructRouteObject: function( from, to, callback ) {
      var routeArray, i, object;

      if ( !( from instanceof SCMAP.System ) || !( to instanceof SCMAP.System ) ) {
         return;
      }

      if ( typeof callback !== 'function' ) {
         console.error( "Callback not given or not a function" );
         return;
      }

      this.buildGraph( from );

      routeArray = this.routeArray( to );
      if ( typeof routeArray === 'object' && Array.isArray( routeArray ) ) {

         object = new THREE.Object3D();
         for ( i = 0; i < routeArray.length - 1; i++ ) {
            object.add( callback( routeArray[i+0].system, routeArray[i+1].system ) );
         }
         return object;

      }
   }
};

SCMAP.Dijkstra.quickSort = function ( nodes ) {
   // makes a copy, prevents overwriting
   var array = [];
   var i = nodes.length;
   while( i-- ) {
      array[i] = nodes[i];
   }

   if ( array.length <= 1 ) {
      return array;
   }

   var lhs = [];
   var rhs = [];
   var pivot = Math.ceil( array.length / 2 ) - 1;

   pivot = array.splice( pivot, 1 )[0];

   for ( i = 0; i < array.length; i++ ) {
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

function isInfinite ( num ) {
   return !isFinite( num );
}

// End of file

