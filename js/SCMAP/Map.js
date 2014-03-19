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
         this.selector.position = system.sceneObject.position;
         this.selector.visible = true;
         this.selected = system;
      } else {
         this.selector.visible = false;
         this.selected = undefined;
      }
      $('#routelist').empty();
   },

   deselect: function ( ) {
      this.selector.visible = false;
      this.selected = undefined;
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

      material = new THREE.LineBasicMaterial( { color: 0xFF00FF, linewidth: 2.5 } );
      group = this.graph.createRouteObject(); // all the parts of the route together in a single geometry group
      for ( i = 0; i < route.length - 1; i++ ) {
         mesh = this.createRouteMesh( route[i+0], route[i+1] );
         line = new THREE.Line( mesh, material );
         line.position = route[i+0].sceneObject.position;
         line.lookAt( route[i+1].sceneObject.position );
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
          distance = source.position.distanceTo( destination.sceneObject.position ),
          z = 0, theta, x, y;

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
         endTime, startTime,
         i, systems, exports, black_markets, systemInfo, imports;

      endTime = startTime = new Date();

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
                  console.log( territoryName+" space route from "+systemName+
                     " can't find the destination system '"+destinations[i]+"'" );
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

      endTime = new Date();
      console.log( "Populating the scene (without ref plane) took " +
         (endTime.getTime() - startTime.getTime()) + " msec" );

      this.buildReferencePlane();
      //this.referencePlaneSolidColor( new THREE.Color( 0x000000 ) );
      this.referencePlaneTerritoryColor();
   },

   closestPOI: function ( vector ) {
      var closest = Infinity, closestPOI, system, length, systemname, xd, zd;

      for ( systemname in this.systemsByName ) {
         system = this.systemsByName[ systemname ];
         xd = vector.x - system.sceneObject.position.x;
         zd = vector.z - system.sceneObject.position.z;
         length = Math.sqrt( xd * xd + zd * zd );
         if ( length < closest ) {
            closest = length;
            closestPOI = system;
         }
      }

      return [ closest, closestPOI ];
   },

   furthestPOI: function ( vector ) {
      var furthest = 0, furthestPOI, system, length, systemname, xd, zd;

      for ( systemname in this.systemsByName ) {
         system = this.systemsByName[ systemname ];
         xd = vector.x - system.sceneObject.position.x;
         zd = vector.z - system.sceneObject.position.z;
         length = Math.sqrt( xd * xd + zd * zd );
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
      var geometry = this.referencePlane.geometry,
         i, point;
      if ( ! this.referencePlane instanceof THREE.Object3D ) {
         return;
      }
      for ( i = 0; i < geometry.vertices.length; i++ ) {
         point = geometry.vertices[ i ];
         geometry.colors[i] = color;
      }
   },

   pointAtPlane: function( theta, radius, y ) {
      return new THREE.Vector3( radius * Math.cos( theta ), y, -radius * Math.sin( theta ) );
   },

   referencePlaneTerritoryColourMesh: function( ownership, prevTheta, nextTheta, innerRadius, outerRadius )
   {
      var geo, mesh;
      geo = new THREE.Geometry();
      geo.vertices.push( this.pointAtPlane( prevTheta, innerRadius, -0.04 ) );
      geo.vertices.push( this.pointAtPlane( nextTheta, innerRadius, -0.04 ) );
      geo.vertices.push( this.pointAtPlane( nextTheta, outerRadius, -0.04 ) );
      geo.vertices.push( this.pointAtPlane( prevTheta, outerRadius, -0.04 ) );
      geo.faces.push( new THREE.Face3( 2, 1, 0 ) );
      geo.faces.push( new THREE.Face3( 3, 2, 0 ) );
      mesh = new THREE.Mesh( geo, ownership.material );
      return mesh;
   },

   buildReferencePlane: function()
   {
      var ringWidth = 10.0, // plane circle scaling factor to match the map video
         step = 2 * Math.PI / 36, // 36 radial segments
         radius, insideRadius, outsideRadius,
         lineMaterial, referenceLines, lineGeometry,
         centerTheta, cosPrevTheta, sinPrevTheta, cosCenterTheta, sinCenterTheta,
         xInside, zInside, xOutside, zOutside, zInside2, xOutside2, zOutside2,
         maxRadius, arr,
         endTime, startTime,
         referenceColours = new THREE.Object3D(), prevTheta, nextTheta, i;

      endTime = startTime = new Date();

      // Work out how far away the furtest system is
      // so that we can stop drawing just beyond that
      // point
      arr = this.furthestPOI( new THREE.Vector3() );
      maxRadius = arr[0] + 50;

      lineMaterial = new THREE.LineBasicMaterial({
         color: 0xA0A0A0,
         linewidth: 1.5,
         vertexColors: true,
         opacity: 0.6
      } );
      lineGeometry = new THREE.Geometry();

      // Around in a circle, processing each center point of the
      // squares we'll be drawing (dividing our step by 2 makes it
      // the center point)
      var theta;
      for ( centerTheta = step / 2; centerTheta < 2 * Math.PI; centerTheta += step )
      {
         cosCenterTheta = Math.cos( centerTheta );
         sinCenterTheta = Math.sin( centerTheta );

         prevTheta = centerTheta - step / 2;
         nextTheta = centerTheta + step / 2;
         cosPrevTheta = Math.cos( prevTheta );
         sinPrevTheta = Math.sin( prevTheta );

         // inside to out, stop at furthest out
         for ( radius = ringWidth / 2; radius < maxRadius; radius += ringWidth )
         {
            insideRadius  = radius - ringWidth / 2;
            outsideRadius = radius + ringWidth / 2;
            arr = this.closestPOI( new THREE.Vector3( radius * cosCenterTheta, 0, -radius * sinCenterTheta ) );

            if ( arr[0] <= 35 )
            {
               referenceColours.add(
                  this.referencePlaneTerritoryColourMesh(
                     arr[1].ownership, prevTheta, nextTheta, insideRadius, outsideRadius
                  )
               );
            }

            if ( arr[0] < 55 )
            {
               xInside  =  insideRadius  * cosPrevTheta;
               zInside  = -insideRadius  * sinPrevTheta;
               xOutside =  outsideRadius * cosPrevTheta;
               zOutside = -outsideRadius * sinPrevTheta;
               lineGeometry.vertices.push( new THREE.Vector3( xInside,  0, zInside  ) );
               lineGeometry.vertices.push( new THREE.Vector3( xOutside, 0, zOutside ) );
               lineGeometry.vertices.push( new THREE.Vector3( xInside,  0, zInside  ) );
               lineGeometry.vertices.push( new THREE.Vector3(
                  insideRadius * Math.cos( nextTheta ), 0, -insideRadius * Math.sin( nextTheta )
               ) );
            }
         }
      }

      // set basic color
      for ( i = 0; i < lineGeometry.vertices.length; i++ ) {
         lineGeometry.colors[i] = lineMaterial.color;
      }

      // and create the ground reference plane
      referenceLines = new THREE.Line( lineGeometry, lineMaterial, THREE.LinePieces );
      this.referencePlane = referenceLines;
      scene.add( referenceLines );

      scene.add( referenceColours );

      endTime = new Date();
      console.log( "Building the territory reference plane took " +
         (endTime.getTime() - startTime.getTime()) + " msec" );
   }
};

