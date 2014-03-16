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
   this.selector = this.createSelector();
   this.selected = undefined;
   this.selectedTarget = undefined;
   this.scene.add( this.selector );
   this.group = undefined;
   this.interactables = [];
   this.referencePlane = undefined;

   // No editing available for the moment (doesn't work yet)
   this.canEdit = false;
   $('#map_ui li.editor').hide();

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
      mesh.scale.set( 4, 4, 4 );
      mesh.visible = false;
      return mesh;
   },

   system: function ( name ) {
      return this.systemsByName[ name ];
   },

   select: function ( system ) {
      if ( system instanceof SCMAP.System ) {
         this.selector.position = system.position;
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

   handleSelection: function ( event, intersect ) {

      if ( typeof intersect !== 'object' ) {
         return;
      }

      var modifierPressed = ( event.shiftKey || event.ctrlKey ) ? true : false;

      if ( event.type === 'mouseup' )
      {
         if ( ! window.editor.enabled )
         {
            if ( ! modifierPressed )
            {
               if ( this.selected instanceof SCMAP.System && intersect.object.system instanceof SCMAP.System ) {
                  if ( intersect.object.system === this.selected ) {
                     //if ( $('#systemname').text() != intersect.object.system.name ) {
                        this.select( intersect.object.system );
                        intersect.object.system.displayInfo();
                     //}
                  }
               }
            }
            else
            {
               this.updateRoute( intersect.object.system );
            }
         }
      }
      else if ( event.type === 'mousedown' )
      {
         if ( window.editor.enabled )
         {
            if ( ! event.altKey && typeof intersect.object.system === 'object' ) {

               // if in edit mode, and the targeted object is already selected, start dragging
               // otherwise, select it
               if ( this.selected instanceof SCMAP.System &&
                    intersect.object.system instanceof SCMAP.System &&
                    this.selected == intersect.object.system
               ) {
                  window.controls.editDrag = true;
               } else {
                  this.selected = intersect.object.system;
                  this.select( intersect.object.system );
                  window.controls.editDrag = false;
               }
            }
         }
         else
         {
            if ( modifierPressed ) {
               this.selectedTarget = intersect.object.system;
            } else {
               this.selected = intersect.object.system;
            }
         }
      }
   },

   currentRoute: function () {
      if ( this.selectedTarget instanceof SCMAP.System ) {
         return this.graph.routeArray( this.selectedTarget );
      }
      return [];
   },

   updateRoute: function ( destination ) {
      var i, route, mesh, line, material, group, from_system, $entry;

      this.graph.destroyRoute();
      this.graph.buildGraph( this.selected );
      this.selectedTarget = destination;
      route = this.graph.routeArray( destination );

      material = new THREE.LineBasicMaterial( { color: 0xFF00FF, linewidth: 1 } );
      group = this.graph.createRouteObject(); // all the parts of the route together in a single geometry group
      for ( i = 0; i < route.length - 1; i++ ) {
         mesh = this.createRouteMesh( route[i+0], route[i+1] );
         line = new THREE.Line( mesh, material );
         line.position = route[i+0].position;
         line.lookAt( route[i+1].position );
         group.add( line );
      }

      this.scene.add( group );

      $('#routelist').empty();
      $('#routelist').append('<p>The shortest route from '+route[0].name+' to ' +
         route[route.length-1].name+' along <strong>' + (route.length - 1) +
         '</strong> jump points:</p>').append( '<ol class="routelist"></ol>' );

      for ( i = 0; i < route.length; i++ ) {
         from_system = route[i+0];
         $entry = $( '<li></li>' ).append( from_system.createLink() );
         $('#routelist ol').append( $entry );
         $('#map_ui').tabs( 'option', 'active', 1 );
      }
   },

   createRouteMesh: function ( source, destination ) {
      var step = 2 * Math.PI / 16,
          zstep = 0.5,
          radius = 0.5,
          geometry = new THREE.Geometry(),
          z = 0,
          distance = new THREE.Vector3(),
          theta, x, y;
      distance.subVectors( source.position, destination.position );
      distance = distance.length();
      for ( theta = 0; z < distance; theta += step )
      {
         x = radius * Math.cos( theta );
         y = 0 - radius * Math.sin( theta );
         geometry.vertices.push( new THREE.Vector3( x, y, z ) );
         z += zstep;
      }
      return geometry;
   },

   populateScene: function ( mapdata ) {
      var territory, territoryName, routeMaterial, system, systemName,
         source, destinations, destination, geometry,
         data, starSystemObject, jumpPoint, faction,
         i, systems, exports, black_markets, systemInfo, imports;

      // TODO: clean up the existing scene and mapdata when populating with
      // new data

      this.mapdata = typeof mapdata === 'object' ? mapdata : this.mapdata;
      this.systems = [];
      this.systemsByName = {};

      // First we go through the data to build the basic systems so
      // the routes can be built as well

      for ( territoryName in this.mapdata )
      {
         territory = this.mapdata[ territoryName ];

         faction = SCMAP.Faction.getByName( territoryName );

         for ( systemName in territory.systems )
         {
            data = territory.systems[ systemName ];
            if (typeof data.scale !== 'number' ) {
               data.scale = 1.0;
            }

            system = new SCMAP.System({
               name: systemName,
               position: new THREE.Vector3( data.coords[0], data.coords[1], data.coords[2] ),
               scale: data.scale,
               color: territory.color,
               ownership: faction
            });

            systemInfo = SCMAP.data.systems[ systemName ];
            if ( typeof systemInfo === 'object' ) {
               imports = [];
               exports = [];
               black_markets = [];
               for ( i = 0; i < systemInfo['import'].length; i++ ) {
                  imports.push( SCMAP.data.goods[ systemInfo.import[i] ] );
               }
               for ( i = 0; i < systemInfo['export'].length; i++ ) {
                  exports.push( SCMAP.data.goods[ systemInfo.export[i] ] );
               }
               for ( i = 0; i < systemInfo.black_market.length; i++ ) {
                  black_markets.push( SCMAP.data.goods[ systemInfo.black_market[i] ] );
               }
               system.setValues({
                  'nickname': systemInfo.nick,
                  'star_color': systemInfo.color,
                  'size': systemInfo.size,
                  'source': systemInfo.source,
                  'crime_status': SCMAP.data.crime_levels[ systemInfo.crime ].name,
                  'uee_strategic_value': SCMAP.data.uee_strategic_values[ systemInfo.uee_sv ].color,
                  'import': imports,
                  'export': exports,
                  'black_market': black_markets,
                  'blob': systemInfo.blob,
                  'planets': 0,
                  'planetary_rotation': [],
                  'have_info': true
               });
            }

            faction.claim( system ); // assign ownership to this faction

            this.systemsByName[ systemName ] = system;
            this.systems.push( system );

            starSystemObject = system.buildObject();
            this.scene.add( starSystemObject );
            this.interactables.push( system.sceneObjects.mesh );
         }
      }

      // Then we go through again and add the routes

      for ( territoryName in this.mapdata )
      {
         territory = this.mapdata[ territoryName ];

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
               var jumpObject = jumpPoint.sceneObject();
               if ( jumpObject instanceof THREE.Object3D ) {
                  this.scene.add( jumpObject );
               }
               source.jumppoints.push( jumpPoint );
               // for now, add another route the other way as well (we're making
               // the crude assumption that jumppoints are bi-directional
               destination.jumppoints.push( new SCMAP.JumpPoint( destination, source ) );
            }
         }
      }

      this.buildReferencePlane();
//this.referencePlaneSolidColor( new THREE.Color( 0x000000 ) );
this.referencePlaneTerritoryColor();
   },

   closestPOI: function ( vector ) {
      var closest = Infinity, closestPOI,
          copy = vector.clone().setY( 0 );
      for ( var systemname in this.systemsByName ) {
         var system = this.systemsByName[ systemname ];
         var length = system.position.clone().setY( 0 ).sub( copy ).length();
         if ( length < closest ) {
            closest = length;
            closestPOI = system;
         }
      }
      return [ closest, closestPOI ];
   },

   furthestPOI: function ( vector ) {
      var furthest = 0, furthestPOI,
          copy = vector.clone().setY( 0 );
      for ( var systemname in this.systemsByName ) {
         var system = this.systemsByName[ systemname ];
         var length = system.position.clone().setY( 0 ).sub( copy ).length();
         if ( length > furthest ) {
            furthest = length;
            furthestPOI = system;
         }
      }
      return [ furthest, furthestPOI ];
   },

   referencePlaneTerritoryColor: function() {
      if ( ! this.referencePlane instanceof THREE.Object3D ) {
         return;
      }
      var geometry = this.referencePlane.geometry,
         minDistance = 35;
      for ( var i = 0; i < geometry.vertices.length; i++ ) 
      {
         var point = geometry.vertices[ i ];
         var arr = this.closestPOI( point );
         var distance = arr[0], closest = arr[1];
         if ( distance > minDistance ) { distance = minDistance; }
         //color = closest.ownership.color.clone();
         var color = closest.ownership.color.clone();
         var strength = ( minDistance - distance ) / minDistance;
         color.setRGB( strength * color.r * 0.8, strength * color.g * 0.8, strength * color.b * 0.8 );
         //color.setRGB( strength * color.r, strength * color.g, strength * color.b );
         //color.setRGB( strength * color.r * 1.2, strength * color.g * 1.2, strength * color.b * 1.2 );
         geometry.colors[i] = color;
      }
   },

   referencePlaneSolidColor: function( color ) {
      if ( ! this.referencePlane instanceof THREE.Object3D ) {
         return;
      }
      var geometry = this.referencePlane.geometry;
      for ( var i = 0; i < geometry.vertices.length; i++ ) {
         var point = geometry.vertices[ i ];
         geometry.colors[i] = color;
      }
   },

   pointAtPlane: function( theta, radius, y ) {
      return new THREE.Vector3( radius * Math.cos( theta ), y, -radius * Math.sin( theta ) );
   },

   buildReferencePlane: function() {
      var ringWidth = 10.0, // plane circle scaling to match the map
         step = 2 * Math.PI / 36, // 36 radial segments
         radius, material, referencePlane, geometry,
         theta, xIn, zIn, xOut, zOut, xIn2, zIn2, xOut2, zOut2,
         distance, maxRadius, lastRadius = 0, arr,
         cos_theta, sin_theta, cos_theta_half, sin_theta_half,
         closestPointArray = {}, degrees,
         endTime, startTime,
         radiusStr, innerRadius, outerRadius, geo, tmpMesh, point,
         tmpMaterial, tmpObject, leftTheta, rightTheta, i;

      endTime = startTime = new Date();

      arr = this.furthestPOI( new THREE.Vector3() );
      maxRadius = arr[0] + 50;

      material = new THREE.LineBasicMaterial( { color: 0xA0A0A0, linewidth: 1, vertexColors: true, opacity: 0.6 } );
      geometry = new THREE.Geometry();

      tmpMaterial = new THREE.MeshBasicMaterial( { color: 0xA00000, vertexColors: false, opacity: 0.6 } );
      tmpObject = new THREE.Object3D();

      // around in a circle
      for ( theta = step / 2; theta < 2 * Math.PI; theta += step )
      {
         leftTheta = theta - step / 2;
         rightTheta = theta + step / 2;
         degrees = ''+THREE.Math.radToDeg( theta ).toFixed(0);
         cos_theta_half = Math.cos( theta );
         sin_theta_half = Math.sin( theta );
         closestPointArray[degrees] = {};

         // inside to out
         for ( radius = ringWidth / 2; radius < maxRadius; radius += ringWidth )
         {
            radiusStr = ''+radius.toFixed(0);

            arr = this.closestPOI( new THREE.Vector3( radius * cos_theta_half, 0, -radius * sin_theta_half ) );

            if ( arr[0] <= 35 ) {
               closestPointArray[degrees][radiusStr] = arr;

innerRadius = radius - ringWidth / 2;
outerRadius = radius + ringWidth / 2;
geo = new THREE.Geometry();
geo.vertices.push( this.pointAtPlane( leftTheta, innerRadius, -0.04 ) );
geo.vertices.push( this.pointAtPlane( rightTheta, innerRadius, -0.04 ) );
geo.vertices.push( this.pointAtPlane( rightTheta, outerRadius, -0.04 ) );
geo.vertices.push( this.pointAtPlane( leftTheta, outerRadius, -0.04 ) );
geo.faces.push( new THREE.Face3( 2, 1, 0 ) );
geo.faces.push( new THREE.Face3( 3, 2, 0 ) );
      //var minDistance = 35;
      //for ( var i = 0; i < geo.vertices.length; i++ ) 
      //{
      //   var distance = arr[0];
      //   if ( distance > minDistance ) { distance = minDistance; }
      //   var color = arr[1].ownership.material.color.clone();
      //   var strength = ( minDistance - distance ) / minDistance;
      //   color.setRGB( strength * color.r * 0.8, strength * color.g * 0.8, strength * color.b * 0.8 );
      //   //color.setRGB( strength * color.r, strength * color.g, strength * color.b );
      //   geo.colors[i] = color;
      //}

tmpMesh = new THREE.Mesh( geo, arr[1].ownership.material );
tmpObject.add( tmpMesh );

            } else {
               closestPointArray[degrees][radiusStr] = '-';
            }
         }
      }
//console.log( closestPointArray ); 

      // around in a circle
      for ( theta = 0; theta < 2 * Math.PI; theta += step )
      {
         cos_theta = Math.cos( theta );
         sin_theta = Math.sin( theta );
         cos_theta_half = Math.cos( theta + step / 2 );
         sin_theta_half = Math.sin( theta + step / 2 );

         // inside to out
         for ( radius = 0; radius < maxRadius; radius += ringWidth )
         {
            xIn = lastRadius * cos_theta;
            zIn = -lastRadius * sin_theta;
            arr = this.closestPOI( new THREE.Vector3( xIn, 0, zIn ) );
            distance = arr[0];

            if ( distance < 55 )
            {
               xOut = radius * cos_theta;
               zOut = -radius * sin_theta;
               geometry.vertices.push( new THREE.Vector3( xIn, 0, zIn ) );
               geometry.vertices.push( new THREE.Vector3( xOut, 0, zOut ) );

               if ( theta + step < 2 * Math.PI ) {
                  xIn2 = lastRadius * Math.cos( theta + step );
                  zIn2 = -lastRadius * Math.sin( theta + step );
                  geometry.vertices.push( new THREE.Vector3( xIn, 0, zIn ) );
                  geometry.vertices.push( new THREE.Vector3( xIn2, 0, zIn2 ) );
               }
            }

            lastRadius = radius;
         }
      }

      // set basic color
      for ( i = 0; i < geometry.vertices.length; i++ ) {
         point = geometry.vertices[ i ];
         geometry.colors[i] = material.color;
      }

      // and create the ground reference plane
      referencePlane = new THREE.Line( geometry, material, THREE.LinePieces );
      this.referencePlane = referencePlane;
      scene.add( referencePlane );

scene.add( tmpObject );

      endTime = new Date();
      console.log( "Building the reference plane took " + (endTime.getTime() - startTime.getTime()) + " msec" );
   }
};

