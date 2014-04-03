/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

SCMAP.Dijkstra = function ( systems ) {
   if ( ! ( typeof systems === 'object' && Array.isArray( systems ) ) ) {
      console.error( "No array specified to SCMAP.Dijkstra constructor!" );
      return;
   }

   // First build a list of all nodes in the graph and
   // map them by system.id so they can be found quickly
   this._nodes = [];
   this._mapping = {}; // system.id to _nodes map
   i = systems.length;
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

   buildGraph: function( parameters ) {
      var nodes, i, distance, system, currentNode, jumpPoint,
         otherNode, endTime, startTime = new Date();

      if ( typeof parameters !== "object" ) { throw "No parameters object given"; }
      if ( !parameters.source instanceof SCMAP.System ) { throw "No source given"; }
      if ( parameters.destination !== undefined && !parameters.destination instanceof SCMAP.System ) { throw "Invalid destination given"; }

      // This model allows for two priorities, time or fuel ... can't think
      // of any others which make sense (distance is really irrelevant for
      // gameplay purposes).
      // There will be other parameters to work out the route as well, but
      // this decides the main "cost" algorithm for the graph.
      if ( typeof priority !== 'string' || priority !== 'fuel' ) {
         priority = 'time';
      }

      if ( !( parameters.source instanceof SCMAP.System ) ) { return; }

      // TODO: expiry, map may have changed
      if ( this._result.source instanceof SCMAP.System && this._result.source === parameters.source && this._result.priority === priority ) {
         console.log( 'Reusing generated graph starting at', parameters.source.name );
         if ( parameters.destination instanceof SCMAP.System ) {
            this._result.destination = parameters.destination;
         }
         return;
      }

      if ( parameters.destination instanceof SCMAP.System ) {
         console.log( 'Building graph, starting at', parameters.source.name, 'and ending at', parameters.destination.name );
      } else {
         console.log( 'Building graph, starting at', parameters.source.name );
      }

      this.destroyGraph();
      this._result.source = parameters.source;
      this._result.destination = parameters.destination;

      // Created using http://en.wikipedia.org/wiki/Dijkstra%27s_algorithm#Pseudocode

      for ( i = 0; i < this._nodes.length; i++ ) {
         this._nodes[ i ].distance = Number.POSITIVE_INFINITY;
         this._nodes[ i ].previous = null;
      }

      currentNode = this._mapping[ parameters.source.id ];
      currentNode.distance = 0; // distance from source to source
      currentNode.previous = null;

      nodes = SCMAP.Dijkstra.quickSort( this._nodes );

var distAU;

      while ( nodes.length )
      {
         currentNode = nodes[0];
         // Remove currentNode (the first node) from set
         nodes.splice( 0, 1 );
         //delete this._mapping[ currentNode.system.id ];

         // Don't bother with this node if it's not reachable
         if ( isInfinite( currentNode.distance ) ) {
            break;
         }

//console.log( "Working on node", currentNode.system.name, ', ', currentNode.system.jumpPoints.length, 'jumppoints to test' );

         for ( i = 0; i < currentNode.system.jumpPoints.length; i++ )
         {
            jumpPoint = currentNode.system.jumpPoints[i];
            otherNode = this._mapping[ jumpPoint.destination.id ];

            if ( jumpPoint.isUnconfirmed() && localStorage && localStorage['route.avoidUnknownJumppoints'] === '1' ) {
               continue;
            }

            // Don't go into "hostile" nodes, unless we already are in one
            if ( localStorage && localStorage['route.avoidHostile'] === '1' && !currentNode.system.faction.isHostileTo( SCMAP.usersFaction() ) && otherNode.system.faction.isHostileTo( SCMAP.usersFaction() ) ) {
               continue;
            }
            if ( localStorage && localStorage['route.avoidOffLimits'] === '1' && currentNode.system.isOffLimits() ) {
               continue;
            }

//console.log( "  JP to", otherNode.system.name );

            if ( priority === 'time' )
            {
               // cost = half time to JP + JP time + half time from JP
               // TODO: at start and end this can be from start and to dest rather than half
               //distance = currentNode.distance + jumpPoint.length();
               distance = currentNode.distance + jumpPoint.jumpTime();
               if ( currentNode.previous === null ) {
distance += SCMAP.travelTimeAU( 0.35 ); // FIXME
                  //distance += SCMAP.travelTimeAU( jumpPoint.entryAU.length() ); // FIXME
                  //console.log( '    Flight time to JP entrance is', SCMAP.travelTimeAU( distAU ), 's' );
               }
               else
               {
//                  distance += SCMAP.travelTimeAU( currentNode.previous.system.jumpPointTo( currentNode.system ).entryAU.length() );
                  distance += SCMAP.travelTimeAU( 0.7 );
                  //distAU = currentNode.previous.system.jumpPointTo( currentNode.system ).entryAU.length();
                  //console.log( '    AU from', currentNode.previous.system.name, 'to', currentNode.system.name, 'is', distAU.toFixed(2) );
                  //console.log( "would add", SCMAP.travelTimeAU( currentNode.previous.system.jumpPointTo( currentNode.system ).entryAU.length() ).toFixed( 1 ) );
               }
            }
            else // priority == 'fuel'
            {
               // cost = half fuel to JP +         + half fuel from JP
               // TODO: at start and end this can be from start and to dest rather than half
               distance = currentNode.distance + jumpPoint.length();
            }

            // Get out of "never" nodes asap by increasing the cost massively
            if ( localStorage && localStorage['route.avoidHostile'] === '1' && otherNode.system.faction.isHostileTo( SCMAP.usersFaction() ) ) {
               distance *= 15;
            }

            if ( distance < otherNode.distance ) {
               otherNode.distance = distance;
               otherNode.previous = currentNode;
               nodes = SCMAP.Dijkstra.quickSort( nodes );
            }
         }
      }

      this._result.nodes = nodes;
      this._result.priority = priority;
      endTime = new Date();
      console.log( 'Graph building took ' + (endTime.getTime() - startTime.getTime()) + ' msec' );
   },

   source: function() {
      var source = this._result.source;
      if ( source instanceof SCMAP.System ) {
         return source;
      }
   },

   destination: function() {
      var destination = this._result.destination;
      if ( destination instanceof SCMAP.System ) {
         return destination;
      }
   },

   rebuildGraph: function() {
      var source = this._result.source;
      var destination = this._result.destination;

      //console.log( "rebuildGraph from", source, 'to', destination );
      this.destroyGraph();

      if ( source instanceof SCMAP.System ) {
         this.buildGraph({
            source: source,
            destination: destination,
         });
         return true;
      }
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

      this.buildGraph({
         source: from,
         destination: to,
      });

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

