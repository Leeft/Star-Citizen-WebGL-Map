/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

SCMAP.Dijkstra = function ( systems, start, end ) {
   if ( ! ( typeof systems === 'object' && Array.isArray( systems ) ) ) {
      console.error( "No array specified to SCMAP.Dijkstra constructor!" );
      return;
   }

   this.start = ( start instanceof SCMAP.System ) ? start : null;
   this.end = ( this.start && end instanceof SCMAP.System ) ? end : null;

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

   buildGraph: function buildGraph( priority, forceUpdate ) {
      var nodes, i, distance, system, currentNode, jumpPoint,
         otherNode, endTime, startTime = new Date();

      if ( !( this.start instanceof SCMAP.System ) ) { throw new Error( "No source given" ); }
      if ( !( this.end instanceof SCMAP.System )   ) { throw new Error( "No or invalid destination given" ); }

      // This model allows for two priorities, time or fuel ... can't think
      // of any others which make sense (distance is really irrelevant for
      // gameplay purposes).
      // There will be other parameters to work out the route as well, but
      // this decides the main "cost" algorithm for the graph.
      if ( typeof priority !== 'string' || priority !== 'fuel' ) {
         priority = 'time';
      }

      this._result.destination = this.end;
      // TODO: expiry, map may have changed
      if ( !forceUpdate && this._result.source instanceof SCMAP.System && this._result.source === this.start && this._result.priority === priority ) {
         //console.log( 'Reusing generated graph starting at', this._result.source.name );
         /////this._result.destination = this.end;
         return;
      }

      this.destroyGraph();
      this._result.source = this.start;
      this._result.destination = this.end;
      this._result.priority = priority;

      // Created using http://en.wikipedia.org/wiki/Dijkstra%27s_algorithm#Pseudocode

      for ( i = 0; i < this._nodes.length; i++ ) {
         this._nodes[ i ].distance = Number.POSITIVE_INFINITY;
         this._nodes[ i ].previous = null;
      }

      currentNode = this._mapping[ this.start.id ];
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

            // Don't take "unknown" and "undiscovered" jump points
            if ( jumpPoint.isUnconfirmed() && SCMAP.settings.route.avoidUnknownJumppoints ) {
               continue;
            }

            // These checks are only done if not an explicit part of the route we're building
            if ( !this.isStartOrEnd( otherNode.system ) )
            {
               // Don't go into "hostile" nodes, unless we already are in one
               if ( SCMAP.settings.route.avoidHostile && !currentNode.system.faction.isHostileTo( SCMAP.usersFaction() ) && otherNode.system.faction.isHostileTo( SCMAP.usersFaction() ) ) {
                  continue;
               }

               // Don't go into "off limits" nodes
               if ( SCMAP.settings.route.avoidOffLimits && otherNode.system.isOffLimits() ) {
                  continue;
               }

               // Don't go into "avoid" nodes, unless we already are in one
               if ( !currentNode.system.isToBeAvoided() && otherNode.system.isToBeAvoided() ) {
                  continue;
               }
            }

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

            // Get out of "never" nodes asap by increasing the cost massively
            if ( SCMAP.settings.route.avoidHostile && otherNode.system.faction.isHostileTo( SCMAP.usersFaction() ) ) {
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

   isStartOrEnd: function isStartOrEnd( system ) {
      if ( !( system instanceof SCMAP.System ) ) {
         return false;
      }
      return( system === this.start || system === this.end );
   },

   firstNode: function firstNode() {
      var routeArray = this.routeArray();
      return routeArray[ 0 ];
   },

   lastNode: function firstNode() {
      var routeArray = this.routeArray();
      return routeArray[ routeArray.length - 1 ];
   },

   source: function source() {
      if ( this.start instanceof SCMAP.System ) {
         return this.start;
      }
   },

   destination: function destination() {
      if ( this.end instanceof SCMAP.System ) {
         return this.end;
      }
   },

   rebuildGraph: function rebuildGraph() {
      //console.log( "rebuildGraph from", source, 'to', destination );
      this.destroyGraph();

      if ( this.start instanceof SCMAP.System ) {
         this.buildGraph( 'time', true );
         return true;
      }
   },

   destroyGraph: function destroyGraph() {
      this._result = {};
   },

   routeArray: function routeArray( destination ) {
      if ( ! ( destination instanceof SCMAP.System ) ) {
         if ( ! ( this._result.destination instanceof SCMAP.System ) ) {
            console.error( 'No or invalid destination specified.' );
            return;
         }
         destination = this._result.destination;
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
   }
};

SCMAP.Dijkstra.quickSort = function quickSort( nodes ) {
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

