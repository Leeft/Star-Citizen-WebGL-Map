/**
* @author LiannaEeftinck / https://github.com/Leeft
*/

SCMAP.Map = function ( scene, mapdata ) {
   this.name = "Star Citizen 'Verse";
   this.scene = scene;
   this.mapdata = typeof mapdata === 'object' ? mapdata : {};
   this.route = undefined;
   this.graph = new SCMAP.Dijkstra( this );

   this.systemsByName = {};
   this.systems = [];
   this.territories = {};
   this.selector = this.createSelector();
   this.selected = undefined;
   this.targetSelected = undefined;
   this.target = undefined;
   this.scene.add( this.selector );
   this.group = undefined;
   this.interactables = [];

   if ( Object.keys( mapdata ).length ) {
      this.populateScene();
   }
};

SCMAP.Map.prototype = {
   constructor: SCMAP.Map,

   createSelector: function () {
      var material = new THREE.MeshBasicMaterial( { color: 0xCCCCCC } );
      material.transparent = true;
      material.blending = THREE.AdditiveBlending;
      var mesh = new THREE.Mesh( SCMAP.SelectedSystemGeometry, material );
      mesh.scale.set( 15, 15, 15 );
      mesh.visible = false;
      return mesh;
   },

   system: function ( name ) {
      return this.systemsByName[ name ];
   },

   select: function ( name ) {
      if ( typeof this.systemsByName[ name ] === 'object' ) {
         this.selector.position = this.systemsByName[ name ].position;
         this.selector.visible = true;
      } else {
         this.selector.visible = false;
      }
      $('#routelist').empty();
   },

   deselect: function ( ) {
      this.selector.visible = false;
   },

   animateSelector: function ( ) {
      if ( this.selector.visible ) {
         this.selector.rotation.y = THREE.Math.degToRad( Date.now() * 0.00025 ) * 200;
      }
   },

   locked: function ( ) {
      return ( $('input#locked:checked').length ) ? true : false;
   },

   handleSelection: function ( event, intersect ) {
      if ( typeof intersect !== 'object' ) {
         return;
      }

      var modifierPressed = ( event.shiftKey || event.ctrlKey ) ? true : false;

      if ( event.type === 'mouseup' )
      {
         if ( ! this.locked() && ! modifierPressed )
         {
            if ( typeof this.selected === 'object' && typeof this.selected.object.system === 'object' && typeof intersect.object.system === 'object' ) {
               if ( intersect.object.system === this.selected.object.system ) {
                  if ( $('#systemname').text() != intersect.object.system.name ) {
                     this.select( intersect.object.system.name );
                     intersect.object.system.displayInfo();
                  }
               }
            }
         }
         else
         {
            this.updateRoute( intersect.object.system );
         }
      }
      else if ( event.type === 'mousedown' )
      {
         if ( this.locked() || modifierPressed ) {
            this.targetSelected = intersect;
         } else {
            this.selected = intersect;
         }
      }
   },

   currentRoute: function () {
      if ( this.targetSelected instanceof SCMAP.System ) {
         return this.graph.routeArray( this.targetSelected );
      }
      return [];
   },

   updateRoute: function ( destination ) {
      this.graph.destroyRoute;
      this.graph.buildGraph( this.selected.object.system );
      this.targetSelected = destination;
      var route = this.graph.routeArray( destination );

      var material = new THREE.LineBasicMaterial( { color: 0xFFCC33, linewidth: 1 } );
      var group = this.graph.createRouteObject(); // all the parts of the route together in a single geometry group
      for ( var i = 0; i < route.length - 1; i++ ) {
         var mesh = this.createRouteMesh( route[i+0], route[i+1] );
         var line = new THREE.Line( mesh, material );
         line.position = route[i+0].position;
         line.lookAt( route[i+1].position );
         group.add( line );
      }

      this.scene.add( group );

      $('#routelist').empty();
      $('#routelist').append('<p>The shortest route from '+route[0].name+' to '
         +route[route.length-1].name+' along <strong>' + (route.length - 1)
         + '</strong> jump points:</p>').append( '<ol class="routelist"></ol>' );

      for ( var i = 0; i < route.length; i++ ) {
         var from_system = route[i+0];
         var $entry = $( '<li></li>' ).append( from_system.createLink() );
         $('#routelist ol').append( $entry );
         $('#map_ui').tabs( 'option', 'active', 1 );
      }
   },

   createRouteMesh: function ( source, destination ) {
      var step = 2 * Math.PI / 8;
      var zstep = 5;
      var radius = 3;
      // create the lines from the center to the outside
      var geometry = new THREE.Geometry();
      var z = 0;
      var distance = new THREE.Vector3();
      distance.subVectors( source.position, destination.position );
      distance = distance.length();
      for ( var theta = 0; z < distance; theta += step )
      {
         var x = radius * Math.cos( theta );
         var y = 0 - radius * Math.sin( theta );
         geometry.vertices.push( new THREE.Vector3( x, y, z ) );
         z += zstep;
      }
      return geometry;
   },

   populateScene: function ( mapdata ) {
      var territory, territoryName, starMaterial, routeMaterial, system, systemName,
         source, destinations, destination, geometry,
         data, systemObject, systemLabel, jumpPoint;

      // TODO: clean up the existing scene and mapdata when populating with
      // new dataa

      this.mapdata = typeof mapdata === 'object' ? mapdata : this.mapdata;
      this.territories = {};
      this.systems = [];
      this.systemsByName = {};
      this.group = new THREE.Object3D(); // all the labels are together in a single geometry group

      // First we go through the data to build the basic systems so
      // the routes can be built as well

      for ( territoryName in this.mapdata )
      {
         territory = this.mapdata[ territoryName ];

         this.territories[ territoryName ] = [];

         starMaterial = new THREE.MeshBasicMaterial({ color: territory.color });

         for ( systemName in territory.systems )
         {
            data = territory.systems[ systemName ];

            system = new SCMAP.System({
               name: systemName,
               position: new THREE.Vector3( data.coords[0], data.coords[1], data.coords[2] ),
               territory: territory,
               scale: data.scale
            });
            systemInfo = window.sc_system_info[ systemName ];
            if ( typeof systemInfo === 'object' ) {
               system.setValues({
                  'have_info': true,
                  'source': systemInfo['source'],
                  'ownership': systemInfo['ownership'],
                  'planets': systemInfo['planets'],
                  'import': systemInfo['import'],
                  'export': systemInfo['export'],
                  'crime_status': systemInfo['crime_status'],
                  'black_market': systemInfo['black_market'],
                  'blob': systemInfo['blob'],
                  'planetary_rotation': systemInfo['planetary_rotation'],
                  'uee_strategic_value': systemInfo['uee_strategic_value']
               });
            }

            this.systemsByName[ systemName ] = system;
            this.systems.push( system );
            this.territories[ territoryName ].push( system );

            systemObject = system.createObject( starMaterial );
            systemLabel = system.createLabel();
            this.scene.add( systemObject );
            this.group.add( systemLabel );
            this.interactables.push( systemObject );
            //this.interactables.push( systemLabel );
         }
      }

      this.scene.add( this.group );

      // Then we go through again and add the routes

      for ( territoryName in this.mapdata )
      {
         territory = this.mapdata[ territoryName ];

         routeMaterial = new THREE.LineBasicMaterial({ color: territory.color, linewidth: 1 });

         for ( systemName in territory.known_routes )
         {
            if ( this.system( systemName ) === undefined ) {
               console.log( "Territory '"+territoryName+"' space route: can't find the source system '"+systemName+"'" );
               continue;
            }

            source = this.system( systemName );

            destinations = territory.known_routes[ systemName ];

            for ( i = 0; i < destinations.length; i++ )
            {
               destination = this.system( destinations[i] );
               if ( destination === undefined ) {
                  console.log( territoryName+" space route from "+systemName+" can't find the destination system '"+destinations[i]+"'" );
                  continue;
               }

               jumpPoint = new SCMAP.JumpPoint( source, destination );
               this.scene.add( new THREE.Line( jumpPoint.geometry(), routeMaterial ) );
               source.jumppoints.push( jumpPoint );
               // for now, add another route the other way as well (we're making
               // the crude assumption that jumppoints are bi-directional
               destination.jumppoints.push( new SCMAP.JumpPoint( destination, source ) );
            }
         }
      }

      this.buildReferencePlane();
   },

   buildReferencePlane: function() {
      var ringWidth = 52.5, // plane circle scaling to match the map
         rings = 18, // number of circles we'll create
         segments = 36, // radial segments
         radius = rings * ringWidth,
         material, referencePlane, geometry,
         step = 2 * Math.PI / segments,
         theta, x, z, i, point, color, distance, strength;

      material = new THREE.LineBasicMaterial( { color: 0xA0A0A0, linewidth: 1, vertexColors: true, opacity: 0.6 } ),
      geometry = new THREE.CylinderGeometry( radius, 0, 0, segments, rings, false );

      // create the lines from the center to the outside
      for ( theta = 0; theta < 2 * Math.PI; theta += step )
      {
         x = radius * Math.cos( theta );
         z = 0 - radius * Math.sin( theta );
         geometry.vertices.push( new THREE.Vector3( x, 0, z ) );
         geometry.vertices.push( new THREE.Vector3( 0, 0, 0 ) );
      }

      // assign colors to vertices based on their distance
      for ( var i = 0; i < geometry.vertices.length; i++ ) 
      {
         point = geometry.vertices[ i ];
         color = new THREE.Color( 0x000000 );
         strength = ( radius - point.length() ) / ( radius );
         color.setRGB( 0, strength * 0.8, 0 );
         geometry.colors[i] = color;
      }

      // and create the ground reference plane
      referencePlane = new THREE.Line( geometry, material ),
      referencePlane.overdraw = false;
      scene.add( referencePlane );
   }
};

