/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

SCMAP.Route = function ( start, end ) {
   this.start = ( start instanceof SCMAP.System ) ? start : null;
   this.end = ( this.start && end instanceof SCMAP.System ) ? end : null;
   //this.waypoints = [];

   this._graph = new SCMAP.Dijkstra( SCMAP.System.List );
   this._routeObject = undefined;
};

SCMAP.Route.prototype = {
   constructor: SCMAP.Route,

   currentRoute: function () {
      if ( this.end instanceof SCMAP.System ) {
         return this._graph.routeArray( this.end );
      }
      return [];
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

   rebuildCurrentRoute: function () {
      var destination;
      this.destroy();
      if ( this._graph.rebuildGraph() ) {
         console.log( "Have new graph" );
         destination = this._graph.destination();
         if ( destination ) {
            console.log( "Have existing destination, updating route" );
            this.update( destination );
         }
      }
   },

   destroy: function () {
      if ( this._routeObject ) {
         scene.remove( this._routeObject );
      }
      $('#routelist').empty();
   },

   update: function update( destination ) {
      var _this = this, i, route, material, system, $entry;

      if ( !( destination instanceof SCMAP.System ) ) {
         destination = this.end;
      }

      material = new THREE.MeshBasicMaterial( { color: 0xDD3322 } );
      material.opacity = 0.8;
      material.transparent = true;

      this.destroy();

      // building all the parts of the route together in a single geometry group
      // the constructRouteObject method will iterate for us here with the callback
      this._routeObject = _this._graph.constructRouteObject( _this.start, destination, function ( from, to ) {
         var mesh = _this.createRouteGeometry( from, to );
         var line = new THREE.Mesh( mesh, material );
         line.position = from.sceneObject.position.clone();
         line.lookAt( to.sceneObject.position );
         return line;
      });

      if ( this._routeObject ) {
         scene.add( this._routeObject );
         this.end = destination;
         route = this._graph.routeArray( destination );
         $('#routelist').empty();
         if ( route.length > 1 )
         {
            $('#routelist').append('<p>The shortest route from '+route[0].system.createInfoLink( true ).outerHtml()+' to ' +
               route[route.length-1].system.createInfoLink( true ).outerHtml()+' along <strong>' + (route.length - 1) +
               '</strong> jump points:</p>').append( '<ol class="routelist"></ol>' );

            for ( i = 0; i < route.length; i++ ) {
               system = route[i+0].system;
               $entry = $('<li></li>').append( system.createInfoLink() );
               $('#routelist ol').append( $entry );
            }
         }
         else
         {
            $('#routelist').append('<p class="impossible">No route available to '+
               route[0].system.createInfoLink( true ).outerHtml()+' with your current settings</p>');
         }

         $('#map_ui').tabs( 'option', 'active', 3 );
      }
   },

   createRouteGeometry: function ( source, destination ) {
      var distance = source.sceneObject.position.distanceTo( destination.sceneObject.position );
      var geometry = new THREE.CylinderGeometry( 0.6, 0.6, distance, 8, 1, true );
      geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, distance / 2, 0 ) );
      geometry.applyMatrix( new THREE.Matrix4().makeRotationX( THREE.Math.degToRad( 90 ) ) );
      return geometry;
   }
};

// EOF
