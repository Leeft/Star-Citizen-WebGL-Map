/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

SCMAP.Route = function ( start, waypoints ) {
   this.start = ( start instanceof SCMAP.System ) ? start : null;
   this.waypoints = [];

   this._graphs = [];
   this._routeObject = undefined;

   if ( waypoints instanceof SCMAP.System ) {
      this.waypoints = [ waypoints ];
   } else if ( Array.isArray( waypoints ) ) {
      for ( var i = 0; i < waypoints.length; i += 1 ) {
         if ( waypoints[i] instanceof SCMAP.System ) {
            this.waypoints.push( waypoints[i] );
         }
      }
   }

   this.__syncGraphs();
};

SCMAP.Route.prototype = {
   constructor: SCMAP.Route,

   // Find the first matching graph or pair of graphs for the given
   // waypoint. Returns two graphs if the waypoint lies on the end
   // of one and the start of another
   __findGraphs: function __findGraphs( waypoint ) {
      var graphs = [];
      var seen = {};

      for ( var i = 0; i < this._graphs.length; i += 1 )
      {
         var route = [];
         try {
            route = this._graphs[i].routeArray();
         } catch ( e ) {
            console.error( "Error getting route array: "+e.message );
         }

         if ( graphs.length ) {
            if ( route[0].system.id === waypoint.id ) {
               graphs.push( this._graphs[i] );
               return graphs;
            }
         }

         for ( var j = 0; j < route.length; j += 1 ) {
            if ( route[j].system === waypoint && !(seen[ route[j].system.id ]) ) {
               seen[ route[j].system.id ] = true;
               graphs.push( this._graphs[i] );
            }
         }
      }

      return graphs;
   },

   //__findWaypoints: function __findWaypoints( waypoint ) {
   //   var indexes = [];
   //   var seen = {};

   //   for ( var i = 0; i < this._graphs.length; i += 1 )
   //   {
   //      var route = [];
   //      try {
   //         route = this._graphs[i].routeArray();
   //      } catch ( e ) {
   //         console.error( "Error getting route array: "+e.message );
   //      }

   //      if ( graphs.length ) {
   //         if ( route[0].system.id === waypoint.id ) {
   //            indexes.push( i );
   //            return graphs;
   //         }
   //      }

   //      for ( var j = 0; j < route.length; j += 1 ) {
   //         if ( route[j].system === waypoint && !(seen[ route[j].system.id ]) ) {
   //            seen[ route[j].system.id ] = true;
   //            graphs.push( this._graphs[i] );
   //         }
   //      }
   //   }

   //   return graphs;
   //},

   splitAt: function splitAt( waypoint ) {
      var graphs = this.__findGraphs( waypoint );
      if ( graphs.length > 1 ) {
         console.error( "Can't split at '"+waypoint.name+"', graphs are already split" );
         return false;
      }
      if ( graphs.length !== 1 ) {
         console.error( "Couldn't find graph for waypoint '"+waypoint.name+"'" );
         return false;
      }
      var graph = graphs[0];
      var routeArray = graph.routeArray();
      var oldEnd = graph.lastNode().system;
      graph.end = waypoint; // set end of graph to wp
      for ( var i = 0; i < this._graphs.length; i += 1 ) {
         if ( this._graphs[i] === graph ) {
            // insert new graph at wp, starting at wp, ending at oldEnd
            this._graphs.splice( i + 1, 0, new SCMAP.Dijkstra( SCMAP.System.List, waypoint, oldEnd ) );
            for ( var j = 0; j < this.waypoints.length; j += 1 ) {
               if ( this.waypoints[j] === oldEnd ) {
                  this.waypoints.splice( j, 0, waypoint );
                  break;
               }
            }
            this.__syncGraphs();
            return true;
         }
      }
      console.error( "Couldn't match graph to split" );
   },

   removeWaypoint: function removeWaypoint( waypoint ) {
      var graphs = this.__findGraphs( waypoint );
      if ( graphs.length !== 2 ) {
         console.error( "Can't remove waypoint '"+waypoint.name+"', it is not a waypoint" );
         return false;
      }
      var graphOne = graphs[0];
      var graphTwo = graphs[1];
      graphOne.end = graphTwo.start;
      // And now delete graphTwo
      for ( var i = 0; i < this._graphs.length; i += 1 ) {
         if ( this._graphs[i] === graphTwo ) {
            console.log( "Matched "+graphTwo+" starting at index "+i );
            console.log( this._graphs );
            // remove the graph
            this._graphs.splice( i, 1 );
            console.log( this._graphs );
            for ( var j = 0; j < this.waypoints.length; j += 1 ) {
               if ( this.waypoints[j] === waypoint ) {
                  console.log( "Matched "+waypoint+" at index "+j );
                  console.log( this.waypoints );
                  this.waypoints.splice( j, 1 );
                  console.log( this.waypoints );
                  break;
               }
            }
            this.__syncGraphs();
            return true;
         }
      }
   },

   moveWaypoint: function moveWaypoint( waypoint, destination ) {
      var index;

      // Easy case, moving start: update start and sync
      if ( waypoint === this.start ) {
         this.start = destination;
         this.__syncGraphs();
         return true;
      }

      // Slightly more difficult, moving any waypoint: update waypoint and sync
      index = this.waypoints.indexOf( waypoint );
      if ( index > -1 ) {
         this.waypoints[ index ] = destination;
         this.__syncGraphs();
         return true;
      }

      // Advanced case: split graphs at waypoint, then update waypoint and sync
      if ( this.splitAt( waypoint ) ) {
         index = this.waypoints.indexOf( waypoint );
         if ( index > -1 ) {
            this.waypoints[ index ] = destination;
            this.__syncGraphs();
            return true;
         }
      }

      console.error( "Couldn't find waypoint '"+waypoint.name+"'" );
      return false;
   },

   setRoute: function setRoute() {
      var args = Array.prototype.slice.call( arguments );
      var i;
      this.start = args.shift();
      this.start = ( this.start instanceof SCMAP.System ) ? this.start : null;
      this.waypoints = [];
      if ( this.start ) {
         for ( i = 0; i < args.length; i += 1 ) {
            if ( args[i] instanceof SCMAP.System ) {
               this.waypoints.push( args[i] );
            }
         }

         for ( i = 0; i < this.waypoints.length; i += 1 ) {
            this.waypoints[i] = ( this.waypoints[i] instanceof SCMAP.System ) ? this.waypoints[i] : null;
         }
      }
   },

   // Updates the graphs to match the current waypoints, and recalculates
   // the graphs where needed
   __syncGraphs: function __syncGraphs() {
      var newGraphs = [];
      for ( var i = 0; i < this.waypoints.length; i += 1 ) {
         var start = ( i === 0 ) ? this.start : this.waypoints[i - 1];
         var end   = this.waypoints[i];
         var graph;
         if ( this._graphs[i] instanceof SCMAP.Dijkstra ) {
            graph = this._graphs[i];
            this._graphs[i].start = start;
            this._graphs[i].end   = end;
         } else {
            graph = new SCMAP.Dijkstra( SCMAP.System.List, start, end );
         }

         try {
            console.log( "Building graph from", start.name, "to", end.name );
            graph.buildGraph( 'time', true );
         } catch ( e ) {
            console.error( "Error building graph: " + e.message );
         }

         newGraphs.push( graph );
      }
      this._graphs = newGraphs;
      console.log( "Synced and built all graphs" );
   },

   currentRoute: function currentRoute() {
      var route = [];
      for ( var i = 0; i < this._graphs.length; i += 1 ) {
         if ( this.waypoints[i] instanceof SCMAP.System ) {
            this._graphs[i].rebuildGraph();
            var routePart = this._graphs[i].routeArray( this.waypoints[i] );
            for ( var j = 0; j < routePart.length; j += 1 ) {
               route.push( routePart[j] );
            }
         }
      }
      return route;
   },

   indexOfCurrentRoute: function ( system ) {
      if ( ! system instanceof SCMAP.System ) {
         return;
      }

      var currentStep;
      var currentRoute = this.currentRoute();

      if ( currentRoute.length ) {
         for ( var i = 0; i < currentRoute.length; i++ ) {
            if ( currentRoute[i].system === system ) {
               currentStep = i;
               break;
            }
         }
      }

      return currentStep;
   },

   rebuildCurrentRoute: function rebuildCurrentRoute() {
      this.removeFromScene();
      for ( var i = 0; i < this._graphs.length; i++ ) {
         if ( this._graphs[i].rebuildGraph() ) {
            var destination = this._graphs[i].destination();
            if ( destination ) {
               console.log( "Have existing destination, updating route" );
               this.update( destination );
            }
         }
      }
   },

   destroy: function () {
      this.remove();
      this.start = null;
      this.waypoints = [];
   },

   removeFromScene: function () {
      if ( this._routeObject ) {
         scene.remove( this._routeObject );
      }
      $('#routelist').empty();
   },

   update: function update( destination ) {
      var _this = this, i, route, material, system, $entry;

      if ( !( destination instanceof SCMAP.System ) ) {
         var numWaypoints = this.waypoints.length;
         destination = this.waypoints[numWaypoints-1];
      }

      material = new THREE.MeshBasicMaterial( { color: 0xDD3322 } );
      material.opacity = 0.8;
      material.transparent = true;

      this.removeFromScene();

      this._routeObject = new THREE.Object3D();

      // building all the parts of the route together in a single geometry group
      var entireRoute = this.currentRoute();

      for ( i = 0; i < ( entireRoute.length - 1 ); i++ ) {
         var from = entireRoute[i].system;
         var to = entireRoute[i+1].system;
         var geometry = this.createRouteGeometry( from, to );
         if ( geometry ) {
            var mesh = new THREE.Mesh( geometry, material );
            mesh.position = from.sceneObject.position.clone();
            mesh.lookAt( to.sceneObject.position );
            this._routeObject.add( mesh );
         }
      }

      scene.add( this._routeObject );

      $('#routelist').empty();

      if ( entireRoute.length > 1 )
      {
         $('#routelist')
            .append(
               '<p>The shortest route from '+
               entireRoute[0].system.createInfoLink( true ).outerHtml()+' to ' +
               entireRoute[entireRoute.length-1].system.createInfoLink( true ).outerHtml() +
               ' along <strong class="route-count">' + (entireRoute.length - 1) +
               '</strong> jump points:</p>' )
            .append( '<ol class="routelist"></ol>' );

         var routeCount = 0;

         for ( i = 0; i < entireRoute.length; i += 1 )
         {
            system = entireRoute[i].system;

            if ( i > 0 && system.id === entireRoute[i-1].system.id ) {
               $('#routelist li').last().addClass('waypoint').css( 'font-weight', 'bold' )
                  .find('i.fa').first().addClass('fa-lg').addClass('fa-times')
                                       .addClass('text-danger').prop('title','Remove waypoint');

               continue;
            }

            routeCount += 1;
            $entry = $(
               '<li><a class="remove-waypoint" data-remove-waypoint="" href="#"><i class="fa fa-fw fa-lg"></a></i>&nbsp;' +
               system.createInfoLink().outerHtml()+'</li>'
            );

            if ( i === 0 ) {
               $entry.addClass('waypoint').addClass('start').find('i.fa').first().addClass('fa-flag').prop('title','Start');
            } else if ( i === ( entireRoute.length - 1 ) ) {
               $entry.addClass('waypoint').addClass('end').find('i.fa').first().addClass('fa-flag-checkered').prop('title','Destination');
            }

            $('#routelist ol').append( $entry );
         }

         $('#routelist .route-count').text( routeCount );
      }
      else
      {
         $('#routelist').append(
            '<p class="impossible">No route available to '+
            route[0].system.createInfoLink( true ).outerHtml() +
            ' with your current settings</p>'
         );
      }

      $('#map_ui').tabs( 'option', 'active', 3 );
   },

   createRouteGeometry: function createRouteGeometry( source, destination ) {
      if ( !source.sceneObject ) { return; }
      if ( !destination.sceneObject ) { return; }
      var distance = source.sceneObject.position.distanceTo( destination.sceneObject.position );
      var geometry = new THREE.CylinderGeometry( 0.6, 0.6, distance, 8, 1, true );
      geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, distance / 2, 0 ) );
      geometry.applyMatrix( new THREE.Matrix4().makeRotationX( THREE.Math.degToRad( 90 ) ) );
      return geometry;
   }
};

// EOF
