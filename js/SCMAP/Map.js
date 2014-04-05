/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

SCMAP.Map = function ( scene ) {
   this.name = "Star Citizen Persistent Universe";
   this.scene = scene;

   // No editing available for the moment (doesn't work yet)
   this.canEdit = false;
   $('#map_ui li.editor').hide();

   this._interactables = [];
   this._route = null; // The main route the user can set

   this._selectorObject = this.__createSelectorObject( 0xCCCC99 );
   scene.add( this._selectorObject );

   this._mouseOverObject = this.__createSelectorObject( 0x8844FF );
   this._mouseOverObject.scale.set( 4.0, 4.0, 4.0 );
   scene.add( this._mouseOverObject );

   SCMAP.Faction.preprocessFactions();
   SCMAP.Goods.preprocessGoods();
   SCMAP.System.preprocessSystems();

   this.__currentlySelected = null;
};

SCMAP.Map.prototype = {
   constructor: SCMAP.Map,

   getSelected: function getSelected () {
      return this.__currentlySelected;
   },

   selected: function selected() {
      return this.getSelected();
   },

   setSelected: function setSelected ( system ) {
      if ( system !== null && !(system instanceof SCMAP.System) ) {
         throw new Error( system, "is not an instance of SCMAP.System" );
      }
      this.__currentlySelected = system;
      return system;
   },

   __createSelectorObject: function __createSelectorObject ( color ) {
      var mesh = new THREE.Mesh( SCMAP.SelectedSystemGeometry, new THREE.MeshBasicMaterial({ color: color }) );
      mesh.scale.set( 4.2, 4.2, 4.2 );
      mesh.visible = false;
      mesh.userData.systemPosition = new THREE.Vector3( 0, 0, 0 );
      // 2d/3d tween callback
      mesh.userData.scaleY = function ( object, scalar ) {
         var wantedY = object.userData.systemPosition.y * ( scalar / 100 );
         object.translateY( wantedY - object.position.y );
      };
      return mesh;
   },

   __updateSelectorObject: function __updateSelectorObject ( system ) {
      if ( system instanceof SCMAP.System ) {
         this._selectorObject.visible = true;
         this._selectorObject.userData.systemPosition.copy( system.position );
         //this._selectorObject.position.copy( system.sceneObject.position );
         this.moveSelectorTo( system );
         this.setSelected( system );
      } else {
         this._selectorObject.visible = false;
         this.setSelected( null );
      }
   },

   // Lazy builds the route
   route: function route () {
      if ( !( this._route instanceof SCMAP.Route ) ) {
         this._route = new SCMAP.Route();
         console.log( "Created new route", this._route );
      }
      return this._route;
   },

   setSelectionTo: function setSelectionTo ( system ) {
      return this.__updateSelectorObject( system );
   },

   clearSelection: function clearSelection () {
      return this.__updateSelectorObject();
   },

   getSystemByName: function getSystemByName ( name ) {
      return SCMAP.System.getByName( name );
   },

   interactables: function interactables () {
      return this._interactables;
   },

   deselect: function deselect () {
      this.clearSelection();
      $('#system-selected').hide();
      $('#system-not-selected').show();
   },

   animateSelector: function animateSelector () {
      if ( this._selectorObject.visible ) {
         this._selectorObject.rotation.y = THREE.Math.degToRad( Date.now() * 0.00025 ) * 200;
      }
      if ( this._mouseOverObject.visible ) {
         this._mouseOverObject.rotation.y = THREE.Math.degToRad( Date.now() * 0.00025 ) * 200;
      }
   },

   updateSystems: function updateSystems () {
      for ( var i = 0; i < SCMAP.System.List.length; i++ ) {
         SCMAP.System.List[i].updateSceneObject( this.scene );
      }
   },

   setAllLabelSizes: function setAllLabelSizes ( vector ) {
      for ( var i = 0; i < SCMAP.System.List.length; i++ ) {
         var system = SCMAP.System.List[i];
         SCMAP.System.List[i].setLabelScale( vector );
      }
   },

   moveSelectorTo: function moveSelectorTo ( system ) {
      var tween, newPosition, position, _this = this, poi, graph, route;
      var tweens = [];

      if ( !(_this._selectorObject.visible) || !(_this.getSelected() instanceof SCMAP.System) ) {
         _this._selectorObject.userData.systemPosition.copy( system.position );
         _this._selectorObject.position.copy( system.sceneObject.position );
         _this._selectorObject.visible = true;
         _this.getSelected( system );
         return;
      }

      newPosition = system.sceneObject.position.clone();
      graph = new SCMAP.Dijkstra( SCMAP.System.List );
      graph.buildGraph({
         source: _this.getSelected(),
         destination: system
      });

      route = graph.routeArray( system );
      if ( route.length <= 1 ) {
         _this._selectorObject.userData.systemPosition.copy( system.position );
         _this._selectorObject.position.copy( system.sceneObject.position );
         _this._selectorObject.visible = true;
         _this.setSelected( system );
         return;
      }

      position = {
         x: _this._selectorObject.position.x,
         y: _this._selectorObject.position.y,
         z: _this._selectorObject.position.z
      };

      /* jshint ignore:start */
      for ( i = 0; i < route.length - 1; i++ ) {
         poi = route[ i + 1 ].system;

         tween = new TWEEN.Tween( position )
            .to( {
               x: poi.sceneObject.position.x,
               y: poi.sceneObject.position.y,
               z: poi.sceneObject.position.z
            }, 800 / ( route.length - 1 ) )
            .easing( TWEEN.Easing.Linear.None )
            .onUpdate( function () {
               _this._selectorObject.position.set( this.x, this.y, this.z );
            } );

         if ( i == 0 ) {
            if ( route.length == 2 ) {
               tween.easing( TWEEN.Easing.Cubic.InOut );
            } else {
               tween.easing( TWEEN.Easing.Cubic.In );
            }
         }

         if ( i > 0 ) {
            tweens[ i - 1 ].chain( tween );
         }

         if ( i == route.length - 2 ) {
            tween.easing( TWEEN.Easing.Cubic.Out );
            tween.onComplete( function() {
               _this._selectorObject.userData.systemPosition.copy( poi.position );
               _this._selectorObject.position.copy( poi.sceneObject.position );
               _this.setSelected( system );
            } );
         }

         tweens.push( tween );
      }
      /* jshint ignore:end */

      tweens[0].start();

   },

   populateScene: function populateScene () {
      var territory, territoryName, routeMaterial, system, systemName,
         source, destinations, destination, geometry,
         data, jumpPoint, jumpPointObject, faction, systemObject,
         endTime, startTime, systemCount = 0, good,
         i, systems, exports, black_markets, systemInfo, imports;

      endTime = startTime = new Date();

      // TODO: clean up the existing scene and map data when populating with
      // new data

      // First we go through the data to build the basic systems so
      // the routes can be built as well

      for ( systemName in SCMAP.data.systems ) {
         system = SCMAP.System.getByName( systemName );
         sceneObject = system.buildSceneObject();
         this.scene.add( sceneObject );
         this._interactables.push( sceneObject.children[0] );
         systemCount++;
      }

      // Then we go through again and add the routes

      for ( systemName in SCMAP.data.systems )
      {

         system = SCMAP.System.getByName( systemName );

         for ( i = 0; i < system.jumpPoints.length; i ++ ) {

            jumpPoint = system.jumpPoints[ i ];
            jumpPointObject = jumpPoint.buildSceneObject();
            if ( jumpPointObject instanceof THREE.Object3D ) {
               system._routeObjects.push( jumpPointObject );
               this.scene.add( jumpPointObject );
            }

         }

      }

      endTime = new Date();
      console.log( "Populating the scene (without ref plane) took " +
         (endTime.getTime() - startTime.getTime()) + " msec" );

      $('#debug-systems').html( systemCount + ' systems loaded' );

      scene.add( this.buildReferenceGrid() );
   },

   closestPOI: function closestPOI ( vector ) {
      var closest = Infinity, _closestPOI, system, length, systemname, xd, zd;

      for ( systemname in SCMAP.data.systems ) {
         system = SCMAP.System.getByName( systemname );
         xd = vector.x - system.position.x;
         zd = vector.z - system.position.z;
         length = Math.sqrt( xd * xd + zd * zd );
         if ( length < closest ) {
            closest = length;
            _closestPOI = system;
         }
      }

      return [ closest, _closestPOI ];
   },

   closestFromArray: function closestFromArray ( vector, systems ) {
      var closest = Infinity, closestPOI, system, length, systemname, xd, zd;

      for ( var i = 0; i < systems.length; i++ ) {
         system = systems[i];
         xd = vector.x - system.position.x;
         zd = vector.z - system.position.z;
         length = Math.sqrt( xd * xd + zd * zd );
         if ( length < closest ) {
            closest = length;
            closestPOI = system;
         }
      }

      return [ closest, closestPOI ];
   },

   // Get a quick list of systems nearby (within a square)
   withinApproxDistance: function withinApproxDistance ( vector, distance ) {
      var systems = [];
      for ( var i = 0; i < SCMAP.System.List.length; i += 1 ) {
         var system = SCMAP.System.List[i];
         if ( system.position.x < ( vector.x - distance ) ) { continue; }
         if ( system.position.x > ( vector.x + distance ) ) { continue; }
         if ( system.position.z < ( vector.z - distance ) ) { continue; }
         if ( system.position.z > ( vector.z + distance ) ) { continue; }
         systems.push( system );
      }
      return systems;
   },

   furthestPOI: function furthestPOI ( vector ) {
      var furthest = 0, _furthestPOI, system, length, systemname, xd, zd;

      for ( systemname in SCMAP.data.systems ) {
         system = SCMAP.System.getByName[ systemname ];
         xd = vector.x - system.position.x;
         zd = vector.z - system.position.z;
         length = Math.sqrt( xd * xd + zd * zd );
         if ( length > furthest ) {
            furthest = length;
            _furthestPOI = system;
         }
      }
      return [ furthest, _furthestPOI ];
   },

   referencePlaneTerritoryColor: function referencePlaneTerritoryColor () {
      if ( ! this.referencePlane instanceof THREE.Object3D ) {
         return;
      }

      var geometry = this.referencePlane.geometry,
         minDistance = 55;

      for ( var i = 0; i < geometry.vertices.length; i++ )
      {
         var point = geometry.vertices[ i ];
         var arr = this.closestPOI( point );
         var distance = arr[0],
             closest = arr[1];
         if ( distance > minDistance ) { distance = minDistance; }
         var strength = ( minDistance - distance ) / minDistance;
         var color = closest.faction.planeColor.clone();
         color.multiplyScalar( strength * 0.8 );
         geometry.colors[i] = color;

         //var color = closest.faction.color.clone();
         //   var strength = ( minDistance - distance ) / minDistance;
         //   color.multiplyScalar( strength * 1.2 );
         //   geometry.colors[i] = color;
      }
   },

   referencePlaneSolidColor: function referencePlaneSolidColor( color ) {
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

   pointAtPlane: function pointAtPlane( theta, radius, y ) {
      return new THREE.Vector3( radius * Math.cos( theta ), y, -radius * Math.sin( theta ) );
   },

   referencePlaneTerritoryColourMesh: function referencePlaneTerritoryColourMesh( material, prevTheta, nextTheta, innerRadius, outerRadius ) {
      var geo, mesh;
      geo = new THREE.Geometry();
      geo.vertices.push( this.pointAtPlane( prevTheta, innerRadius, -0.04 ) );
      geo.vertices.push( this.pointAtPlane( nextTheta, innerRadius, -0.04 ) );
      geo.vertices.push( this.pointAtPlane( nextTheta, outerRadius, -0.04 ) );
      geo.vertices.push( this.pointAtPlane( prevTheta, outerRadius, -0.04 ) );
      geo.faces.push( new THREE.Face3( 2, 1, 0 ) );
      geo.faces.push( new THREE.Face3( 3, 2, 0 ) );
      mesh = new THREE.Mesh( geo, material );
      return mesh;
   },

   buildReferenceGrid: function buildReferenceGrid() {
      var segmentSize = 10, i, j, k, x, z, position;
      var minX = 0, minZ = 0, maxX = 0, maxZ = 0;
      var endTime, startTime;
      var uniqueColours = {};
      var left, right, above, below;
      var vertices, vertexColours;
      var geo = new THREE.Geometry();
      var color;
      var grid = {};
      var alongX = {};

      endTime = startTime = new Date();

      // First we compute rough outer bounds based on all the systems on the map
      // (plus a bit extra because we want to fade to black as well)
      for ( i = 0; i < SCMAP.System.List.length; i += 1 ) {
         position = SCMAP.System.List[i].position;
         if ( position.x < minX ) { minX = position.x - (  6 * 10 ); }
         if ( position.x > maxX ) { maxX = position.x + (  8 * 10 ); }
         if ( position.z < minZ ) { minZ = position.z - (  6 * 10 ); }
         if ( position.z > maxZ ) { maxZ = position.z + ( 10 * 10 ); }
      }

      // Now round those numbers to a multiple of segmentSize
      minX = Math.floor( minX / segmentSize ) * segmentSize;
      minZ = Math.floor( minZ / segmentSize ) * segmentSize;
      maxX = Math.floor( maxX / segmentSize ) * segmentSize;
      maxZ = Math.floor( maxZ / segmentSize ) * segmentSize;

      // With the boundaries established, go through each coordinate
      // on the map, and set the colour for each gridpoint on the
      // map with the nearest system's faction being used for that
      // colour. We also take note of each X coordinate visited.
      // There is a bit of room for optimisation left here; the
      // systems could be sorted by a X or Z coordinate, sort of like
      // in an octree, and could possibly be found quicker that way.
      for ( var iz = minZ; iz <= maxZ; iz += segmentSize ) {

         grid[ iz ] = {};

         for ( var ix = minX; ix <= maxX; ix += segmentSize ) {

            alongX[ ix ] = true;

            var vector = new THREE.Vector3( ix, 0, iz );
            var systems = this.withinApproxDistance( vector, 6.5 * segmentSize );

            color = this.colorForVector( vector, systems, segmentSize );

            if ( color !== SCMAP.Map.BLACK )
            {
               grid[ iz ][ ix ] = color.getHexString();
               if ( uniqueColours[ grid[iz][ix] ] === undefined ) {
                  uniqueColours[ grid[iz][ix] ] = color;
               }
            }
            else
            {
               grid[ iz ][ ix ] = null;
               uniqueColours[ null ] = SCMAP.Map.BLACK;
            }

         }

      }

      // Now for both X and Z we build a sorted list of each of
      // those coordinates seen, allowing for quick iteration.
      var alongX2 = []; for ( j in alongX ) { alongX2.push( j ); }
      alongX2.sort( function ( a, b ) { return a - b; } );
      alongX = alongX2;

      var alongZ = []; for ( j in grid ) { alongZ.push( j ); }
      alongZ.sort( function ( a, b ) { return a - b; } );

      // Now we got most data worked out, and we can start drawing
      // the horizontal lines. We draw a line from start vertex to
      // end vertex for each section where the colour doesn't
      // change. This gives us the fewest number of lines drawn.
      for ( i = 1; i < alongZ.length; i += 1 ) {
         z = alongZ[i];
         vertices = [];
         vertexColours = [];

         for ( j = 1; j < alongX.length; j += 1 ) {
            x = alongX[ j ];
            left = Math.floor( Number( x ) - segmentSize );
            right = Math.floor( Number( x ) + segmentSize );

            vertexColor = grid[ z ][ x ];

            if ( (vertexColor !== grid[z][left]  && grid[z][left] ) ||
                 (vertexColor !== grid[z][right] && grid[z][right])    ) {
               vertices.push( new THREE.Vector3( x, 0, z ) );
               vertexColours.push( uniqueColours[ vertexColor ] );
            }
         }

         for ( k = 0; k < vertices.length - 1; k++ ) {
            geo.vertices.push( vertices[k] );
            geo.colors.push( vertexColours[k] );
            geo.vertices.push( vertices[k+1] );
            geo.colors.push( vertexColours[k+1] );
         }
      }

      // And do the same for the vertical lines in a separate pass
      for ( i = 1; i < alongX.length; i += 1 ) {
         x = alongX[i];
         vertices = [];
         vertexColours = [];

         for ( j = 1; j < alongZ.length; j += 1 ) {
            z = alongZ[j];
            above = Math.floor( Number( z ) - segmentSize );
            below = Math.floor( Number( z ) + segmentSize );

            vertexColor = grid[ z ][ x ];

            if ( ( grid[above] && grid[above][x] && vertexColor !== grid[above][x] ) ||
                 ( grid[below] && grid[below][x] && vertexColor !== grid[below][x] )    ) {
               vertices.push( new THREE.Vector3( x, 0, z ) );
               vertexColours.push( uniqueColours[ vertexColor ] );
            }
         }

         for ( k = 0; k < vertices.length - 1; k++ ) {
            geo.vertices.push( vertices[k] );
            geo.colors.push( vertexColours[k] );
            geo.vertices.push( vertices[k+1] );
            geo.colors.push( vertexColours[k+1] );
         }
      }

      // Finally create the object with the geometry just built
      var referenceLines = new THREE.Line( geo, new THREE.LineBasicMaterial({
         linewidth: 1.5, wireframe: true, vertexColors: THREE.VertexColors
      }), THREE.LinePieces );

      endTime = new Date();
      console.log( "Building the grid reference plane took " +
         (endTime.getTime() - startTime.getTime()) + " msec" );

      return referenceLines;
   },

   colorForVector: function colorForVector( vector, systems, segmentSize ) {
      var color = SCMAP.Map.BLACK;
      var arr = this.closestFromArray( vector, systems );
      if ( arr[0] <= 4.5 * segmentSize && arr[1] ) {
         color = arr[1].faction.planeColor.clone();
         if ( arr[0] >= 4.0 * segmentSize ) {
            color.multiplyScalar( 0.5 );
         } else if ( arr[0] >= 3.0 * segmentSize ) {
            color.multiplyScalar( 0.8 );
         }
      }
      return color;
   },

   buildOldReferencePlane: function buildOldReferencePlane()
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
         color: 0x6060A0,
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
               //var mesh = this.referencePlaneTerritoryColourMesh(
               //   arr[1].faction.material(), prevTheta, nextTheta, insideRadius, outsideRadius
               //);
               //if ( mesh ) {
               //   referenceColours.add( mesh );
               //}
         //var point = geometry.vertices[ i ];
         //var arr = this.closestPOI( point );
         //var distance = arr[0],
         //    closest = arr[1];
         //if ( distance > minDistance ) { distance = minDistance; }
         //var strength = ( minDistance - distance ) / minDistance;
         //var color = closest.faction.planeColor.clone();
         //color.multiplyScalar( strength * 0.8 );
         //geometry.colors[i] = color;
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

SCMAP.Map.BLACK = new THREE.Color( 0x000000 );

// EOF
