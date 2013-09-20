/**
* @author LiannaEeftinck / https://github.com/Leeft
*/

SCMAP.Dijkstra = function ( map, initialNode, targetNode )
{
   // Let the node at which we are starting be called the initial node. Let
   // the distance of node Y be the distance from the initial node to
   // Y. Dijkstra's algorithm will assign some initial distance values and
   // will try to improve them step by step.

   // 1. Assign to every node a tentative distance value: set it to zero
   // for our initial node and to infinity for all other nodes.

   // 2. Mark all nodes unvisited. Set the initial node as current. Create
   // a set of the unvisited nodes called the unvisited set consisting of
   // all the nodes.

   var end, start;
   var INFINITY = Number.MAX_VALUE * 2;
   var unvisitedNodes = [];
   var currentNode = initialNode;

   start = new Date();
   console.log( 'Planning route from ' + initialNode.name + ' to ' + targetNode.name + ' ...' );

   for ( var i = 0; i < map.systems.length; i++ ) {
      var system = map.systems[ i ];
      system.distance = INFINITY;
      system.visited = false;
      system.previous = undefined;
      unvisitedNodes.push( system );
   }

   initialNode.distance = 0;
   initialNode.visited = true;

   while ( unvisitedNodes.length > 0 )
   {
      // 3. For the current node, consider all of its unvisited neighbors
      // and calculate their tentative distances. For example, if the current
      // node A is marked with a distance of 6, and the edge connecting it
      // with a neighbor B has length 2, then the distance to B (through A)
      // will be 6 + 2 = 8. If this distance is less than the previously
      // recorded tentative distance of B, then overwrite that distance. Even
      // though a neighbor has been examined, it is not marked as "visited"
      // at this time, and it remains in the unvisited set.

      for ( var i = 0; i < currentNode.jumppoints.length; i++ ) {
         var route = currentNode.jumppoints[ i ];
         var currentDistance = currentNode.distance;
         var newDistance = currentDistance + route.length();
         if ( newDistance < newDistance < route.destination.distance ) {
            route.destination.distance = newDistance;
            //console.log( "(3) is shorter", newDistance.toFixed(2), route );
         }
      }

      // 4. When we are done considering all of the neighbors of the current
      // node, mark the current node as visited and remove it from the unvisited
      // set. A visited node will never be checked again.

      currentNode.visited = true;
      for ( var i = unvisitedNodes.length - 1; i >= 0; i-- ) {
         if ( unvisitedNodes[i].name == currentNode.name ) {
            unvisitedNodes.splice( i, 1 );
            break;
         }
      }

      // 5. If the destination node has been marked visited (when planning
      // a route between two specific nodes) or if the smallest tentative
      // distance among the nodes in the unvisited set is infinity (when
      // planning a complete traversal), then stop. The algorithm has finished.

      if ( typeof targetNode === 'object' && targetNode.visited ) {
         console.log( "Reached the target node" );
         break;
      }

      unvisitedNodes = SCMAP.Dijkstra.quickSort( unvisitedNodes );
      var smallest = unvisitedNodes[0].distance;
      var smallestNode = unvisitedNodes[0];

      if ( !isFinite(smallest) || typeof smallestNode === 'undefined' ) {
         console.log( "Done with the algorithm" );
         break;
      }

      // 6. Select the unvisited node that is marked with the smallest tentative
      // distance, and set it as the new "current node" then go back to step 3.

      currentNode = smallestNode;
   }

   var systems = [];
   for ( var systemName in map.systems ) {
      var system = map.systems[ systemName ];
      if ( !isFinite(system.distance) || !system.visited ) {
         continue;
      }
      systems.push( system );
   }

   systems = SCMAP.Dijkstra.quickSort( systems );
   for ( var i = 0; i < systems.length; i++ ) {
      var system = systems[i];
      console.log( system.name, system.distance.toFixed(1), system );
   }

   end = new Date();
   console.log( "Route planning took " + (end.getTime() - start.getTime()) + " msec" );
};

SCMAP.Dijkstra.quickSort = function ( systems ) {
   var array = systems.slice(0); // makes a copy, prevents overwriting

   if ( array.length <= 1 ) {
      return array
   }

   var lhs = new Array();
   var rhs = new Array();
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

