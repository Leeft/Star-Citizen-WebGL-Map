/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

SCMAP.Map = function ( scene ) {
   this.name = "Star Citizen 'Verse";
   this.scene = scene;
   this.goods = {};

   this._selected = undefined;
   this._destination = undefined;
   this.group = undefined;
   this._interactables = [];
   this.referencePlane = undefined;

   this._selectorObject = this.createSelectorObject();
   this.scene.add( this._selectorObject );

   // No editing available for the moment (doesn't work yet)
   this.canEdit = false;
   $('#map_ui li.editor').hide();

   this.populateScene();
   this._graph = new SCMAP.Dijkstra( SCMAP.System.List );
   this._routeObject = undefined;
};

SCMAP.Map.prototype = {
   constructor: SCMAP.Map,

   createSelectorObject: function () {
      var mesh = new THREE.Mesh( SCMAP.SelectedSystemGeometry, new THREE.MeshBasicMaterial({
         color: 0xCCCCCC,
         transparent: true,
         blending: THREE.AdditiveBlending
      }) );
      mesh.scale.set( 4.2, 4.2, 4.2 );
      mesh.visible = false;
      mesh.systemPosition = new THREE.Vector3( 0, 0, 0 );
      // 2d/3d tween callback
      mesh.scaleY = function ( scalar ) {
         var wantedY = this.systemPosition.y * ( scalar / 100 );
         this.translateY( wantedY - this.position.y );
      };
      return mesh;
   },
   updateSelectorObject: function ( system ) {
      if ( system instanceof SCMAP.System ) {
         this._selectorObject.visible = true;
         this._selectorObject.systemPosition.copy( system.position );
         //this._selectorObject.position.copy( system.sceneObject.position );
         this.moveSelectorTo( system );
         this._selected = system;
      } else {
         this._selectorObject.visible = false;
         this._selected = undefined;
      }
   },

   system: function ( name ) {
      return SCMAP.System.getByName( name );
   },

   selected: function () {
      return this._selected;
   },

   interactables: function () {
      return this._interactables;
   },

   deselect: function ( ) {
      this._selectorObject.visible = false;
      this._selected = undefined;
   },

   animateSelector: function ( ) {
      if ( this._selectorObject.visible ) {
         this._selectorObject.rotation.y = THREE.Math.degToRad( Date.now() * 0.00025 ) * 200;
      }
   },

   updateSystems: function ( ) {
      for ( var i = 0; i < SCMAP.System.List.length; i++ ) {
         SCMAP.System.List[i].updateSceneObject( this.scene );
      }
   },

   moveSelectorTo: function ( system ) {
      var tween, newPosition, position, _this = this, poi;

      if ( !(_this._selectorObject.visible) || !(_this._selected instanceof SCMAP.System) ) {
         _this._selectorObject.systemPosition.copy( system.position );
         _this._selectorObject.position.copy( system.sceneObject.position );
         _this._selectorObject.visible = true;
         _this._selected = system;
         return;
      }

      newPosition = system.sceneObject.position.clone();
      var graph = new SCMAP.Dijkstra( SCMAP.System.List );
      graph.buildGraph( _this._selected );
      var route = graph.routeArray( system );

      if ( route.length <= 1 ) {
         _this._selectorObject.systemPosition.copy( system.position );
         _this._selectorObject.position.copy( system.sceneObject.position );
         _this._selectorObject.visible = true;
         _this._selected = system;
         return;
      }

      _this._selectorObject.position.copy( _this._selectorObject.position );

      position = {
         x: _this._selectorObject.position.x,
         y: _this._selectorObject.position.y,
         z: _this._selectorObject.position.z
      };

      var tweens = [];

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
               _this._selectorObject.position.setX( this.x );
               _this._selectorObject.position.setY( this.y );
               _this._selectorObject.position.setZ( this.z );
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
               _this._selectorObject.systemPosition.copy( poi.position );
               _this._selectorObject.position.copy( poi.sceneObject.position );
               _this._selected = system;
            } );
         }

         tweens.push( tween );
      }
      /* jshint ignore:end */

      tweens[0].start();

   },

   // TODO: move to control class
   handleSelection: function ( event, intersect ) {

      if ( typeof intersect !== 'object' ) {
         return;
      }

      var modifierPressed = ( event.shiftKey || event.ctrlKey ) ? true : false;

      if ( event.type === 'mousedown' )
      {
         //if ( window.editor.enabled )
         //{
         //   if ( ! event.altKey && typeof intersect.object.parent.system === 'object' ) {

         //      // if in edit mode, and the targeted object is already selected, start dragging
         //      // otherwise, select it
         //      if ( this._selected instanceof SCMAP.System &&
         //           intersect.object.parent.system instanceof SCMAP.System &&
         //           this._selected == intersect.object.parent.system
         //      ) {
         //         window.controls.editDrag = true;
         //      } else {
         //         this.updateSelectorObject( intersect.object.parent.system );
         //         window.controls.editDrag = false;
         //      }
         //   }
         //}
         //else
         {
            if ( modifierPressed ) {
               this._destination = intersect.object.parent.system;
            } else {
               this.moveSelectorTo( intersect.object.parent.system );
            }
         }
      }
      else if ( event.type === 'mouseup' )
      {
         if ( ! window.editor.enabled )
         {
            if ( ! modifierPressed )
            {
               if ( this._selected instanceof SCMAP.System && intersect.object.parent.system instanceof SCMAP.System ) {
                  if ( intersect.object.parent.system === this._selected ) {
                     //if ( $('#systemname').text() != intersect.object.parent.system.name ) {
                        this.updateSelectorObject( intersect.object.parent.system );
                        intersect.object.parent.system.displayInfo();
                     //}
                  }
               }
            }
            else
            {
               this.updateRoute( intersect.object.parent.system );
            }
         }
      }
   },

   currentRoute: function () {
      if ( this._destination instanceof SCMAP.System ) {
         return this._graph.routeArray( this._destination );
      }
      return [];
   },

   // TODO: separate Route class
   indexOfCurrentRoute: function ( system ) {
      if ( ! system instanceof SCMAP.System ) {
         return;
      }

      var currentStep;
      var currentRoute = this.currentRoute();

      if ( currentRoute.length ) {
         for ( i = 0; i < currentRoute.length; i++ ) {
            if ( currentRoute[i].system === system ) {
               currentStep = i;
               break;
            }
         }
      }

      return currentStep;
   },

   destroyCurrentRoute: function () {
      if ( this._routeObject ) {
         scene.remove( this._routeObject );
      }
   },

   updateRoute: function ( destination ) {
      var _this = this, i, route, material, system, $entry;

      material = new THREE.LineBasicMaterial( { color: 0xFF00FF, linewidth: 2.5 } );

      this.destroyCurrentRoute();

      // building all the parts of the route together in a single geometry group
      // the constructRouteObject method will iterate for us here with the callback
      this._routeObject = _this._graph.constructRouteObject( _this._selected, destination, function ( from, to ) {
         var mesh = _this.createRouteMesh( from, to );
         var line = new THREE.Line( mesh, material );
         line.position = from.sceneObject.position.clone();
         line.lookAt( to.sceneObject.position );
         return line;
      });
      if ( this._routeObject ) {
         this.scene.add( this._routeObject );
         this._destination = destination;
         route = this._graph.routeArray( destination );

         $('#routelist').empty();
         $('#routelist').append('<p>The shortest route from '+route[0].system.createInfoLink().outerHtml()+' to ' +
            route[route.length-1].system.createInfoLink().outerHtml()+' along <strong>' + (route.length - 1) +
            '</strong> jump points:</p>').append( '<ol class="routelist"></ol>' );

         for ( i = 0; i < route.length; i++ ) {
            system = route[i+0].system;
            $entry = $('<li></li>').append( system.createInfoLink() );
            $('#routelist ol').append( $entry );
         }

         $('#map_ui').tabs( 'option', 'active', 3 );
      }
   },

   createRouteMesh: function ( source, destination ) {
      var step = 2 * Math.PI / 16,
          zstep = 0.5,
          radius = 0.5,
          geometry = new THREE.Geometry(),
          distance = source.sceneObject.position.distanceTo( destination.sceneObject.position ),
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

   populateScene: function () {
      var territory, territoryName, routeMaterial, system, systemName,
         source, destinations, destination, geometry,
         data, jumpPoint, jumpPointObject, faction, systemObject,
         endTime, startTime, systemCount = 0, good,
         i, systems, exports, black_markets, systemInfo, imports;

      endTime = startTime = new Date();

      // TODO: clean up the existing scene and map data when populating with
      // new data

      SCMAP.Faction.preprocessFactions();
      SCMAP.Goods.preprocessGoods();
      SCMAP.System.preprocessSystems();

      // First we go through the data to build the basic systems so
      // the routes can be built as well

      for ( systemName in SCMAP.data.systems )
      {

         system = SCMAP.System.getByName( systemName );
         sceneObject = system.buildSceneObject();
         this.scene.add( sceneObject );
         this._interactables.push( sceneObject.children[0] );
         //this._interactables.push( sceneObject.children[1] ); // Glow too big for now, disabled
         //this._interactables.push( sceneObject.children[2] ); // Even a properly sized label is too big :(

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

      this.buildReferencePlane();
      //this.referencePlaneSolidColor( new THREE.Color( 0x000000 ) );
      //this.referencePlaneTerritoryColor();
   },

   closestPOI: function ( vector ) {
      var closest = Infinity, closestPOI, system, length, systemname, xd, zd;

      for ( systemname in SCMAP.data.systems ) {
         system = SCMAP.System.getByName( systemname );
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

   closestFromArray: function ( vector, systems ) {
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

   withinApproxDistance: function ( vector, distance ) {
      var systems = [];
      for ( var systemname in SCMAP.data.systems ) {
         system = SCMAP.System.getByName( systemname );
         if ( system.position.x < ( vector.x - distance ) ) { continue; }
         if ( system.position.x > ( vector.x + distance ) ) { continue; }
         if ( system.position.z < ( vector.z - distance ) ) { continue; }
         if ( system.position.z > ( vector.z + distance ) ) { continue; }
         systems.push( system );
      }
      return systems;
   },

   furthestPOI: function ( vector ) {
      var furthest = 0, furthestPOI, system, length, systemname, xd, zd;

      for ( systemname in SCMAP.data.systems ) {
         system = SCMAP.System.getByName[ systemname ];
         xd = vector.x - system.position.x;
         zd = vector.z - system.position.z;
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

   referencePlaneTerritoryColourMesh: function( material, prevTheta, nextTheta, innerRadius, outerRadius )
   {
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

   buildReferencePlane: function()
   {
      var segmentWidth = 10.0, i, position, systemname,
         minX = 0, minZ = 0, maxX = 0, maxZ = 0,
         endTime, startTime;

      endTime = startTime = new Date();

      for ( systemname in SCMAP.data.systems ) {
         position = SCMAP.System.getByName( systemname ).position;
         if ( position.x < minX ) { minX = position.x; }
         if ( position.x > maxX ) { maxX = position.x; }
         if ( position.z < minZ ) { minZ = position.z; }
         if ( position.z > maxZ ) { maxZ = position.z; }
      }
      minX -= segmentWidth * 4;
      minZ -= segmentWidth * 4;
      maxX += segmentWidth * 4;
      maxZ += segmentWidth * 4;
      minX = Math.floor( minX / segmentWidth ) * segmentWidth;
      minZ = Math.floor( minZ / segmentWidth ) * segmentWidth;
      maxX = Math.floor( maxX / segmentWidth ) * segmentWidth;
      maxZ = Math.floor( maxZ / segmentWidth ) * segmentWidth;

      var startX = Math.floor( minX / segmentWidth );
      var startZ = Math.floor( minZ / segmentWidth );
      var gridX = Math.floor( maxX / segmentWidth );
      var gridZ = Math.floor( maxZ / segmentWidth );

      var geo = new THREE.Geometry();

var redcolor = new THREE.Color( 0x000000 );
var color;
      //var plane = new THREE.Object3D();
      var lineMaterial = new THREE.LineBasicMaterial({
         //color: 0x6060A0,
         linewidth: 1.5,
         wireframe: true,
         vertexColors: THREE.VertexColors
      });

      for ( var iz = startZ; iz <= gridZ; iz ++ ) {

         var z1 = iz * segmentWidth;
         var z2 = ( iz + 1 ) * segmentWidth;

         for ( var ix = startX; ix <= gridX; ix ++ ) {

            var x1 = ix * segmentWidth;
            var x2 = ( ix + 1 ) * segmentWidth;

            var vec1 = new THREE.Vector3( x1, 0, z1 );
            var vec2 = new THREE.Vector3( x2, 0, z1 );
            var vec3 = new THREE.Vector3( x2, 0, z2 );

            geo.vertices.push( vec1 );
            geo.vertices.push( vec2 );
            geo.vertices.push( vec2 );
            geo.vertices.push( vec3 );

            var systems = this.withinApproxDistance( vec2, 55 );

var arr = this.closestFromArray( vec1, systems );
if ( arr[0] <= 45 && arr[1] ) {
   color = arr[1].faction.planeColor.clone();
   if ( arr[0] >= 40 ) {
      color.multiplyScalar( 0.5 );
   } else if ( arr[0] >= 30 ) {
      color.multiplyScalar( 0.8 );
   }
} else {
   color = redcolor;
}
geo.colors.push( color );

arr = this.closestFromArray( vec2, systems );
if ( arr[0] <= 45 && arr[1] ) {
   color = arr[1].faction.planeColor.clone();
   if ( arr[0] >= 40 ) {
      color.multiplyScalar( 0.5 );
   } else if ( arr[0] >= 30 ) {
      color.multiplyScalar( 0.8 );
   }
} else {
   color = redcolor;
}
            geo.colors.push( color, color );

arr = this.closestFromArray( vec3, systems );
if ( arr[0] <= 45 && arr[1] ) {
   color = arr[1].faction.planeColor.clone();
   if ( arr[0] >= 40 ) {
      color.multiplyScalar( 0.5 );
   } else if ( arr[0] >= 30 ) {
      color.multiplyScalar( 0.8 );
   }
} else {
   color = redcolor;
}
            geo.colors.push( color );
         }

      }

      // and create the ground reference plane
      var referenceLines = new THREE.Line( geo, lineMaterial, THREE.LinePieces );
      scene.add( referenceLines );

      endTime = new Date();
      console.log( "Building the territory reference plane took " +
         (endTime.getTime() - startTime.getTime()) + " msec" );
   },

   buildOldReferencePlane: function()
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

