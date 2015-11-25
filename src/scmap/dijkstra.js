/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import SCMAP, { travelTimeAu } from '../scmap';
import System from './system';
import settings from './settings';

class Dijkstra {
  constructor( systems, start, end ) {
    if ( ! ( typeof systems === 'object' && Array.isArray( systems ) ) ) {
      console.error( `No array specified to Dijkstra constructor!` );
      return;
    }

    this.start = ( start instanceof System ) ? start : null;
    this.end = ( this.start && end instanceof System ) ? end : null;

    // First build a list of all nodes in the graph and
    // map them by system.id so they can be found quickly
    this._nodes = [];
    this._mapping = {}; // system.id to _nodes map

    let i = systems.length;
    while( i-- ) {
      this._nodes[ i ] = {
        system:   systems[ i ],
        distance: Number.POSITIVE_INFINITY,
        previous: null
      };
      this._mapping[ systems[ i ].id ] = this._nodes[ i ];
    }

    this._result = {};
  }

  buildGraph ( priority, forceUpdate ) {
    let nodes, i, distance, system, currentNode, jumpPoint,
        otherNode, endTime, startTime = new Date();
    let distAU;

    if ( ! ( this.start instanceof System ) ) { throw new Error( `No source given` ); }
    if ( ! ( this.end instanceof System )   ) { throw new Error( `No or invalid destination given` ); }

    this._result.destination = this.end;
    // TODO: expiry, map may have changed
    if ( ! forceUpdate && this._result.source instanceof System && this._result.source === this.start && this._result.priority === priority ) {
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

    nodes = Dijkstra.quickSort( this._nodes );

    while ( nodes.length )
    {
      currentNode = nodes[0];

      // "If we are only interested in a shortest path between vertices source and
      //  target, we can terminate the search at line 13 if u = target."
      if ( currentNode.system === this.end ) {
        break;
      }

      // Remove currentNode (the first node) from set
      nodes.splice( 0, 1 );

      // Don't bother with th current node if it's not reachable
      if ( Dijkstra.isInfinite( currentNode.distance ) ) {
        break;
      }

      //console.log( `Working on node ${ currentNode.system.name }, ${ currentNode.system.jumpPoints.length } jumppoints to test` );

      for ( i = 0; i < currentNode.system.jumpPoints.length; i++ )
      {
        jumpPoint = currentNode.system.jumpPoints[i];
        otherNode = this._mapping[ jumpPoint.destination.id ];

        // Don't take "unknown" and "undiscovered" jump points
        if ( jumpPoint.isUnconfirmed() && settings.route.avoidUnknownJumppoints ) {
          continue;
        }

        // These checks are only done if they're not an explicit part of the route we're building
        // (which is essentially the user overriding the route)
        if ( !this.isStartOrEnd( otherNode.system ) )
        {
          // Don't go into "hostile" nodes, unless we already are in one
          if ( settings.route.avoidHostile &&
            ! currentNode.system.faction.isHostileTo( SCMAP.usersFaction() ) &&
            otherNode.system.faction.isHostileTo( SCMAP.usersFaction() )
          ) {
            continue;
          }

          // Don't go into "off limits" nodes
          if ( settings.route.avoidOffLimits && otherNode.system.isOffLimits ) {
            continue;
          }

          // Don't go into "avoid" nodes, unless we already are in one
          if ( !currentNode.system.isToBeAvoided() && otherNode.system.isToBeAvoided() ) {
            continue;
          }
        }

        // cost = half time to JP + JP time + half time from JP
        // TODO: at start and end this can be from start and to dest rather than half
        distance = currentNode.distance + jumpPoint.jumpTime();

        if ( currentNode.previous === null ) {
          distance += travelTimeAU( 0.35 ); // FIXME
          //distance += travelTimeAU( jumpPoint.entryAU.length() ); // FIXME
          //console.log( '    Flight time to JP entrance is', travelTimeAU( distAU ), 's' );
        }
        else
        {
          distance += travelTimeAU( 0.7 );
          //distAU = currentNode.previous.system.jumpPointTo( currentNode.system ).entryAU.length();
          //console.log( '    AU from', currentNode.previous.system.name, 'to', currentNode.system.name, 'is', distAU.toFixed(2) );
          //console.log( `would add ${ travelTimeAU( currentNode.previous.system.jumpPointTo( currentNode.system ).entryAU.length() ).toFixed( 1 ) }` );
        }

        // Get out of "never" nodes asap by increasing the cost massively
        if ( settings.route.avoidHostile && otherNode.system.faction.isHostileTo( SCMAP.usersFaction() ) ) {
          distance *= 15;
        }

        if ( distance < otherNode.distance ) {
          otherNode.distance = distance;
          otherNode.previous = currentNode;
          nodes = Dijkstra.quickSort( nodes );
        }
      }
    }

    this._result.nodes = nodes;
    this._result.priority = priority;
    endTime = new Date();
    //console.log( 'Graph building took ' + (endTime.getTime() - startTime.getTime()) + ' msec' );
  }

  isStartOrEnd ( system ) {
    if ( ! ( system instanceof System ) ) {
      return false;
    }

    return( system === this.start || system === this.end );
  }

  firstNode () {
    let routeArray = this.routeArray();
    return routeArray[ 0 ];
  }

  lastNode () {
    let routeArray = this.routeArray();
    return routeArray[ routeArray.length - 1 ];
  }

  source () {
    if ( this.start instanceof System ) {
      return this.start;
    }
  }

  destination () {
    if ( this.end instanceof System ) {
      return this.end;
    }
  }

  rebuildGraph () {
    //console.log( 'rebuildGraph from', source, 'to', destination );
    this.destroyGraph();

    if ( this.start instanceof System ) {
      this.buildGraph( 'time', true );
      return true;
    }
  }

  destroyGraph () {
    this._result = {};
  }

  routeArray ( destination ) {
    if ( ! ( destination instanceof System ) ) {
      if ( ! ( this._result.destination instanceof System ) ) {
        console.error( 'No or invalid destination specified.' );
        return;
      }
      destination = this._result.destination;
    }

    if ( this._result.nodes.length > 0 ) {
      // Get path and print it out, we're traversing backwards
      // through the optimal path for the destination
      let visited = [];
      let x = this._mapping[ destination.id ];
      let seen = {};
      while ( x !== null ) {
        seen[ x.system.name ] = true;
        visited.push( x );
        x = x.previous;
      }
      visited.reverse();
      return visited;
    }
  }

  static quickSort ( nodes ) {
    // makes a copy, prevents overwriting
    let array = [];
    let i = nodes.length;
    while( i-- ) {
      array[ i ] = nodes[ i ];
    }

    if ( array.length <= 1 ) {
      return array;
    }

    let lhs = [];
    let rhs = [];
    let pivot = Math.ceil( array.length / 2 ) - 1;

    pivot = array.splice( pivot, 1 )[ 0 ];

    for ( i = 0; i < array.length; i++ ) {
      if ( array[ i ].distance <= pivot.distance ) {
        lhs.push( array[ i ] );
      } else {
        rhs.push( array[ i ] );
      }
    }

    let t1 = Dijkstra.quickSort( lhs );
    let t2 = Dijkstra.quickSort( rhs );

    t1.push( pivot );
    return t1.concat( t2 );
  }

  static isInfinite ( num ) {
    return !isFinite( num );
  }
}

export default Dijkstra;
