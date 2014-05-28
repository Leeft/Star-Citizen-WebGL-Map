/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 * @author Leeft / https://github.com/Leeft
 */
/*global THREE, console */

// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
// supported.
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe

// Heavily modified version of OrbitControls.js (by Leeft) with a finite
// state machine for dealing with the user's input (I needed more than
// just basic control).

SCMAP.OrbitControls = function ( object, domElement ) {

   this.object = object;
   this.domElement = ( domElement !== undefined ) ? domElement : document;

   // API

   // Set to false to disable this control
   this.enabled = true;

   // "target" sets the location of focus, where the control orbits around
   // and where it pans with respect to.
   this.target = new THREE.Vector3();
   // center is old, deprecated; use "target" instead
   this.center = this.target;

   // This option actually enables dollying in and out; left as "zoom" for
   // backwards compatibility
   this.noZoom = false;
   this.zoomSpeed = 1.0;
   // Limits to how far you can dolly in and out
   this.minDistance = 20;
   this.maxDistance = 800;

   // Set to true to disable this control
   this.noRotate = false;
   this.rotateSpeed = 1.0;

   // Set to true to disable this control
   this.noPan = false;
   this.keyPanSpeed = 25; // pixels moved per arrow key push
   this.mapMode = true; // map mode pans on x,z
   this.requireAlt = false; // to allow soft-disable of this control temporarily

   // How far you can orbit vertically, upper and lower limits.
   // Range is 0 to Math.PI radians.
   this.minPolarAngle = 0; // radians
   this.maxPolarAngle = THREE.Math.degToRad( 85 ); // radians

   // Set to true to disable use of the keys
   this.noKeys = false;
   // The four arrow keys
   this.keys = {
      LEFT: 37,
      UP: 38,
      RIGHT: 39,
      BOTTOM: 40,
      ESCAPE: 27,
      R: 82,
      C: 67,
      T: 84,
      2: 50,
      3: 51,
      L: 76,
      SPACE: 32,
      TAB: 9
   };

   this.debug = false; // TODO unset

   ////////////
   // internals

   //var STATE = { NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };
   //var state = STATE.NONE;

   var startObject; // drag start
   var endObject;   // drag end

   var mouseOver; // where the mouse is at

   var scope = this;
   var labelScale = '15.0';

   var state = StateMachine.create({
      initial: { state: 'idle', event: 'init', defer: true },

      events: [
         // Start events
         { name: 'starttouch',  from: 'idle',   to: 'touch'  },
            { name: 'touchtodrag',   from: 'touch',  to: 'drag'   }, // LMB; Dragging with initial target
            { name: 'touchtorotate', from: 'touch',  to: 'rotate' }, // LMB; Dragging without initial target
            { name: 'touchtodolly',  from: 'touch',  to: 'dolly'  }, // MMB; Dollying (zooming)
            { name: 'touchtopan',    from: 'touch',  to: 'pan'    }, // RMB; Panning

         { name: 'startdolly',  from: 'idle',   to: 'dolly'  },
         { name: 'startpan',    from: 'idle',   to: 'pan' },

         // Stop events
         { name: 'idle', from: ['*'], to: 'idle' }

      ],

      callbacks: {

         onentertouch: function( stateEvent, from, to, event ) {
            if ( scope.enabled === false ) { return; }
            if ( scope.requireAlt === true && event.altKey === false ) { return; }
            event.preventDefault();
            if ( scope.debug ) {
               console.log( stateEvent, ": entered state", to, "from", from );
            }

            var intersect;

            if ( event.button === 0 ) { // left mouse

               // If the click starts on an object, we're dragging from
               // that object (possibly to another object) so we take
               // note of that object and switch to the drag state
               intersect = scope.getIntersect( event );
               if ( intersect && intersect.object.parent.userData.system ) {
                  startObject = intersect.object.parent.userData.system;
                  if ( scope.debug ) {
                     console.log( 'Click at "' + intersect.object.parent.userData.system.name + '"' );
                  }
                  window.map.setSelectionTo( startObject );
                  startObject.displayInfo( 'doNotSwitch' );
                  this.touchtodrag( event );
               }
               else if ( ! scope.noRotate )
               {
                  // If the click starts in empty space, we're just going to
                  // the mode for rotating the camera around the scene as
                  // that is the easiest thing to do
                  if ( scope.noRotate === true ) { return; }
                  rotateStart.set( event.clientX, event.clientY );
                  this.touchtorotate( event );
               }

            } else if ( event.button === 1 ) { // middle mouse

               if ( scope.noZoom === true ) { return; }
               dollyStart.set( event.clientX, event.clientY );
               this.touchtodolly( event );

            }

            if ( event.button === 2 || (scope.noRotate && ! intersect) ) { // right mouse

               if ( scope.noPan === true ) { return; }
               panStart.set( event.clientX, event.clientY );
               this.touchtopan( event );

            }
         },

         onenterdrag: function( stateEvent, from, to, event ) {
            if ( scope.enabled === false ) { return; }
            if ( scope.debug ) {
               console.log( stateEvent, ": entered state", to, "from", from );
            }
         },

         onenteridle: function( stateEvent, from, to, event ) {
            if ( scope.debug ) {
               console.log( stateEvent, ": idling after", from );
            }

            if ( from === 'drag' ) {

               var intersect = scope.getIntersect( event );
               if ( intersect && intersect.object.parent.userData.system )
               {
                  endObject = intersect.object.parent.userData.system;
                  if ( scope.debug ) {
                     console.log( 'Ended dragging at "' + endObject.toString() + '"' );
                  }

                  if ( endObject === startObject ) {
                     $('#map_ui').tabs( 'option', 'active', 2 );
                     endObject.displayInfo();
                  }
                  else
                  {
                     if ( window.map.selected() === endObject ) {
                     }
                     var route = window.map.route();
                     if ( route.isSet() && startObject !== endObject ) {
                        route.update( endObject );
                        $('#map_ui').tabs( 'option', 'active', 3 );
                     }
                  }
               }
            }

            startObject = undefined;
            endObject = undefined;

            if ( scope.debug ) {
               console.log( 'idling ...' );
            }
         },

      },

      //error: function( eventName, from, to, args, errorCode, errorMessage ) {
      //   scope.debug && console.log( 'event ' + eventName + ' was naughty : ' + errorMessage );
      //}
   });

   var EPS = 0.000001;

   var rotateStart = new THREE.Vector2();
   var rotateEnd = new THREE.Vector2();
   var rotateDelta = new THREE.Vector2();

   var panStart = new THREE.Vector2();
   var panEnd = new THREE.Vector2();
   var panDelta = new THREE.Vector2();

   var dollyStart = new THREE.Vector2();
   var dollyEnd = new THREE.Vector2();
   var dollyDelta = new THREE.Vector2();

   var mousePrevious = new THREE.Vector2();

   var phiDelta = 0;
   var thetaDelta = 0;
   var scale = 1;
   var pan = new THREE.Vector3();

   var lastPosition = new THREE.Vector3();
   var targetTween;
   var rotationTween;
   var rotationLeft;
   var rotationUp;
   var rotationRadius;

   // events

   var changeEvent = { type: 'change' };

   this.stateMachine = function () {
      return state;
   };

   this.showState = function () {
      if ( window.jQuery && window.jQuery('#debug-state') ) {
         window.jQuery('#debug-state').text( 'State: ' + state.current );
      }
   };

   this.rotateLeft = function ( angle ) {
      if ( angle === undefined ) {
         angle = getAutoRotationAngle();
      }
      thetaDelta -= angle;
   };

   this.rotateUp = function ( angle ) {
      if ( angle === undefined ) {
         angle = getAutoRotationAngle();
      }
      phiDelta -= angle;
   };

   // pass in distance in world space to move left
   this.panLeft = function ( distance ) {

      var panOffset = new THREE.Vector3();
      var te = this.object.matrix.elements;
      // get X column of matrix
      panOffset.set( te[0], te[1], te[2] );
      panOffset.multiplyScalar(-distance);

      pan.add( panOffset );
   };

   // pass in distance in world space to move up
   this.panUp = function ( distance ) {

      if ( this.mapMode ) {
         return this.panBack( distance );
      }
      var panOffset = new THREE.Vector3();
      var te = this.object.matrix.elements;
      // get Y column of matrix
      panOffset.set( te[4], te[5], te[6] );
      panOffset.multiplyScalar(distance);

      pan.add( panOffset );
   };

   // pass in distance in world space to move forward
   this.panBack = function ( distance ) {

      var sameLevelTarget = this.target.clone().setY( this.object.position.y );
      var vectorBack = this.object.position.clone().sub( sameLevelTarget ).negate().setLength( distance );

      pan.add( vectorBack );
   };

   // assumes mapMode for now
   this.moveTo = function ( destination ) {

      var _this = this;
      var traverse = this.target.clone();
      var destinationVector;

      // makes sure the destination is at the same xz plane
      if ( destination instanceof SCMAP.System ) {
         destinationVector = destination.position.clone().setY( this.target.y );
      } else if ( destination instanceof THREE.Vector3 ) {
         destinationVector = destination.clone().setY( this.target.y );
      } else {
         return;
      }

      if ( destination instanceof SCMAP.System ) {
         window.map.setSelectionTo( destination );
      }

      if ( targetTween ) {
         targetTween.stop();
      }

      targetTween = new TWEEN.Tween( traverse )
         .to( { x: destinationVector.x, y: destinationVector.y, z: destinationVector.z }, 750 )
         .easing( TWEEN.Easing.Cubic.InOut )
         .onUpdate( function () {
            var vec = new THREE.Vector3( this.x, this.y, this.z );
            _this.goTo( vec );
         } );

      targetTween.onComplete( function() {
         targetTween = undefined;
      });

      targetTween.start();
   };

   this.rememberPosition = function rememberPosition() {
      SCMAP.settings.camera.camera = this.object.position;
      SCMAP.settings.camera.target = this.target;
      SCMAP.settings.save( 'camera' );
   };

   // assumes mapMode for now
   this.rotateTo = function ( left, up, radius ) {

      var _this = this;
      var offset = this.objectVectorToTarget();
      // angle from z-axis around y-axis
      var theta = Math.atan2( offset.x, offset.z );
      // angle from y-axis
      var phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );
      var rotate = {
         left: theta,
         up: phi,
         radius: offset.length()
      };

      rotateLeft = rotate.left;
      rotateUp   = rotate.up;

      if ( rotationTween ) {
         rotationTween.stop();
      }

      rotationTween = new TWEEN.Tween( rotate )
         .to( { left: left, up: up, radius: radius }, 1000 )
         .easing( TWEEN.Easing.Cubic.InOut )
         .onUpdate( function () {
            rotationLeft   = this.left;
            rotationUp     = this.up;
            rotationRadius = this.radius;
         });

      rotationTween.onComplete( function() {
         rotationTween  = undefined;
         rotationLeft   = undefined;
         rotationUp     = undefined;
         rotationRadius = undefined;
      });

      rotationTween.start();
   };

   this.cameraTo = function ( target, theta, phi, radius ) {
      this.rotateTo( theta, phi, radius );
      this.moveTo( target );
   };


   // assumes mapMode for now
   this.goTo = function ( vector ) {

      // make sure the given vector is at the same xz plane
      vector = vector.clone().setY( this.target.y );
      vector.sub( this.target );
      pan.add( vector );
   };

   // main entry point; pass in Vector2 of change desired in pixel space,
   // right and down are positive
   this.pan = function ( delta ) {

      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      if ( scope.object.fov !== undefined ) {

         // perspective
         var targetDistance = scope.objectVectorToTarget().length();
         var yDistance;

         // half of the fov is center to top of screen
         targetDistance *= Math.tan( (scope.object.fov/2) * Math.PI / 180.0 );
         // we actually don't use screenWidth, since perspective camera is fixed to screen height
         scope.panLeft( 2 * delta.x * targetDistance / element.clientHeight );
         scope.panUp( 2 * delta.y * targetDistance / element.clientHeight );

      } else if ( scope.object.top !== undefined ) {

         // orthographic
         scope.panLeft( delta.x * (scope.object.right - scope.object.left) / element.clientWidth );
         scope.panUp( delta.y * (scope.object.top - scope.object.bottom) / element.clientHeight );

      } else {

         // camera neither orthographic or perspective - warn user
         console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );

      }

   };

   this.dollyIn = function ( dollyScale ) {
      if ( dollyScale === undefined ) {
         dollyScale = getZoomScale();
      }

      scale /= dollyScale;
   };

   this.dollyOut = function ( dollyScale ) {
      if ( dollyScale === undefined ) {
         dollyScale = getZoomScale();
      }

      scale *= dollyScale;
   };

   // TODO: Move to map
   this.getIntersect = function ( event ) {
      if ( !window.map.interactables() ) { return; }
      var vector, projector, raycaster, intersects;
      vector = new THREE.Vector3( (event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5 );
      projector = new THREE.Projector();
      projector.unprojectVector( vector, scope.object );
      raycaster = new THREE.Raycaster( scope.object.position, vector.sub( scope.object.position ).normalize() );
      intersects = raycaster.intersectObjects( window.map.interactables() );
      return intersects[0];
   };

   this.objectVectorToTarget = function () {
      return this.object.position.clone().sub( this.target );
   };

   this.update = function () {

      var offset = this.objectVectorToTarget();

      // move target to panned location
      this.target.add( pan );

      // angle from z-axis around y-axis
      var theta = Math.atan2( offset.x, offset.z );

      // angle from y-axis
      var phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

      theta += thetaDelta;
      phi += phiDelta;

      if ( rotationLeft !== undefined ) {
         theta = rotationLeft;
      }
      if ( rotationUp !== undefined ) {
         phi = rotationUp;
      }

      // restrict phi to be between desired limits
      phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

      // restrict phi to be between EPS and PI-EPS
      phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

      var radius = offset.length() * scale;
      if ( rotationRadius !== undefined ) {
         radius = rotationRadius;
      }

      $('#debug-angle').html(
         'Camera heading: '+THREE.Math.radToDeg( theta ).toFixed(1)+'&deg;<br>'+
         'Camera tilt: '+THREE.Math.radToDeg( phi ).toFixed(1)+'&deg;<br>'+
         'Camera distance: '+radius.toFixed(1)
      );

      var newLabelScale = radius - 20;
      newLabelScale /= 10;
      if ( newLabelScale < 17 ) {
         newLabelScale = 17;
      } else if ( newLabelScale > 22 ) {
         newLabelScale = 22;
      }
      if ( newLabelScale.toFixed(1) !== labelScale ) {
         window.map.setAllLabelSizes( new THREE.Vector3( newLabelScale, newLabelScale, 1 ) );
         labelScale = newLabelScale.toFixed(1);
      }

      // restrict radius to be between desired limits
      radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

      offset.x = radius * Math.sin( phi ) * Math.sin( theta );
      offset.y = radius * Math.cos( phi );
      offset.z = radius * Math.sin( phi ) * Math.cos( theta );

      this.object.position.copy( this.target ).add( offset );

      this.object.lookAt( this.target );

      thetaDelta = 0;
      phiDelta = 0;
      scale = 1;
      pan.set( 0, 0, 0 );

      if ( lastPosition.distanceTo( this.object.position ) > 0 ) {
         this.dispatchEvent( changeEvent );
         lastPosition.copy( this.object.position );
      }

      this.showState();
      this.rememberPosition();
   };

   function getZoomScale() {
      return Math.pow( 0.95, scope.zoomSpeed );
   }

   function onMouseDown( event ) {
      if ( scope.enabled === false ) { return; }
      if ( scope.requireAlt === true && event.altKey === false ) { return; }
      event.preventDefault();
      state.starttouch( event );
      //scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
      scope.domElement.addEventListener( 'mouseup', onMouseUp, false );
   }

   function onMouseMove( event ) {
      if ( scope.enabled === false ) return;
      if ( scope.requireAlt === true && event.altKey === false ) { return; }
      event.preventDefault();

      var intersect;
      var route;
      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      // Mouse move handling: highlighting systems, dragging waypoints on route

      if ( event.clientX !== mousePrevious.x && event.clientY !== mousePrevious.y ) {
         intersect = scope.getIntersect( event );
         if ( intersect && intersect.object.parent.userData.system && intersect.object.parent.userData.system !== mouseOver ) {
            mouseOver = intersect.object.parent.userData.system;
            window.map._mouseOverObject.position.copy( mouseOver.sceneObject.position );
            window.map._mouseOverObject.visible = true;
         } else {
            if ( !intersect || !intersect.object.parent.userData.system ) {
               if ( mouseOver !== undefined ) {
                  window.map._mouseOverObject.position.set( 0, 0, 0 );
                  window.map._mouseOverObject.visible = false;
               }
               mouseOver = undefined;
            }
         }
      }

      mousePrevious.set( event.clientX, event.clientY );


      if ( state.current === 'touch' ) {

         if ( event.button === 0 ) { // left mouse
            state.touchtorotate( event );
         } else if ( event.button === 1 ) { // middle mouse
            state.touchtodolly( event );
         } else if ( event.button === 2 ) { // right mouse
            state.touchtopan( event );
         }

      } else if ( state.current === 'drag' ) {

         if ( startObject ) {

            if ( intersect && intersect.object.parent.userData.system && intersect.object.parent.userData.system !== startObject ) {

               if ( !endObject || endObject !== intersect.object.parent.userData.system ) {

                  endObject = intersect.object.parent.userData.system;
                  route = window.map.route();

                  if ( !route.isSet() )
                  {
                     route.start = startObject;
                     route.waypoints = [ endObject ];
                     route.update( endObject );
                     if ( scope.debug ) {
                        console.log( 'Intermediate object while dragging is "' + endObject.name + '"' );
                     }
                  }
                  else
                  {
                     route.moveWaypoint( startObject, endObject );
                     if ( startObject !== endObject ) {
                        route.update();
                     }
                     startObject = endObject;

                     console.log( 'In-route mode -- intermediate object while dragging is "' + endObject.name + '"' );
                  }

               } else {

                  endObject = undefined;

               }
            }
         }

      } else if ( state.current === 'rotate' ) {

         if ( scope.noRotate === true ) return;

         rotateEnd.set( event.clientX, event.clientY );
         rotateDelta.subVectors( rotateEnd, rotateStart );

         // rotating across whole screen goes 360 degrees around
         scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );
         // rotating up and down along whole screen attempts to go 360, but limited to 180
         scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

         rotateStart.copy( rotateEnd );

      } else if ( state.current === 'dolly' ) {

         if ( scope.noZoom === true ) return;

         dollyEnd.set( event.clientX, event.clientY );
         dollyDelta.subVectors( dollyEnd, dollyStart );

         if ( dollyDelta.y > 0 ) {
            scope.dollyIn();
         } else {
            scope.dollyOut();
         }

         dollyStart.copy( dollyEnd );

      } else if ( state.current === 'pan' ) {

         if ( scope.noPan === true ) return;

         panEnd.set( event.clientX, event.clientY );
         panDelta.subVectors( panEnd, panStart );
         scope.pan( panDelta );
         panStart.copy( panEnd );

      }

      scope.update();

   }

   function onMouseUp( event ) {
      if ( scope.enabled === false ) return;
      if ( scope.requireAlt === true && event.altKey === false ) { return; }

      //scope.domElement.removeEventListener( 'mousemove', onMouseMove, false );
      scope.domElement.removeEventListener( 'mouseup', onMouseUp, false );

      state.idle( event );
   }

   function onMouseWheel( event ) {
      if ( scope.enabled === false || scope.noZoom === true ) return;
      if ( scope.requireAlt === true && event.altKey === false ) { return; }

      // This doesn't need the state machine, as there's no conflict between
      // various possible actions here

      var delta = 0;

      if ( event.deltaY ) { // jquery-mousewheel
         delta = event.deltaY;
      } else if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9
         delta = event.wheelDelta;
      } else if ( event.detail ) { // Firefox
         delta = - event.detail;
      }

      if ( delta > 0 ) {
         scope.dollyOut();
      } else {
         scope.dollyIn();
      }
   }

   function onKeyDown( event ) {
      if ( scope.enabled === false ) { return; }
      if ( scope.noKeys === true ) { return; }
      if ( scope.noPan === true ) { return; }
      if ( scope.requireAlt === true && event.altKey === false ) { return; }
      // TODO: allow modifiers at all?
      if ( event.altKey === true || event.shiftKey === true || event.ctrlKey === true || event.metaKey === true ) { return; }

      var $activeElement = $( document.activeElement );
      if ( $activeElement.attr( 'id' ) === 'comments' ) {
         if ( event.keyCode == scope.keys.ESCAPE || event.keyCode == scope.keys.TAB ) {
            $activeElement.blur();
         }
         return;
      }

      // This doesn't need the state machine, as there's no conflict between
      // various possible actions here

      // pan a pixel - I guess for precise positioning?
      var needUpdate = false;
      switch ( event.keyCode ) {
         case scope.keys.UP:
            scope.pan( new THREE.Vector2( 0, scope.keyPanSpeed ) );
            needUpdate = true;
            break;
         case scope.keys.BOTTOM:
            scope.pan( new THREE.Vector2( 0, -scope.keyPanSpeed ) );
            needUpdate = true;
            break;
         case scope.keys.LEFT:
            scope.pan( new THREE.Vector2( scope.keyPanSpeed, 0 ) );
            needUpdate = true;
            break;
         case scope.keys.RIGHT:
            scope.pan( new THREE.Vector2( -scope.keyPanSpeed, 0 ) );
            needUpdate = true;
            break;
         case scope.keys.ESCAPE: // Deselect selected
            window.map.deselect();
            break;
         case scope.keys.TAB: // Tab through route
            // TODO
            break;
         case scope.keys.R: // Reset orientation
            scope.rotateTo( 0, undefined, undefined );
            break;
         case scope.keys.C: // Center on default
            scope.moveTo( SCMAP.settings.camera.target );
            break;
         case scope.keys.T: // Top view
            scope.rotateTo( 0, 0, 200 );
            break;
         case scope.keys['2']: // 2D mode
            scope.noRotate = true;
            $('#lock-rotation').prop( 'checked', true );
            displayState.to2d();
            scope.rotateTo( 0, 0, 180 );
            break;
         case scope.keys['3']: // 3D mode
            displayState.to3d();
            scope.rotateTo(
               SCMAP.settings.cameraDefaults.orientation.theta,
               SCMAP.settings.cameraDefaults.orientation.phi,
               SCMAP.settings.cameraDefaults.orientation.radius
            );
            break;
         case scope.keys.L: // Lock/unlock rotation
            $('#lock-rotation').click();
            break;
         default:
            //console.log( "onkeydown", event.keyCode );
            break;
      }

      if ( needUpdate ) {
         scope.update();
      }
   }

   function touchstart( event ) {
      if ( scope.enabled === false ) { return; }
      if ( scope.requireAlt === true && event.altKey === false ) { return; }

      //switch ( event.touches.length ) {

      //   case 1:  // one-fingered touch: rotate
      //      if ( scope.noRotate === true ) { return; }

      //      state = STATE.TOUCH_ROTATE;

      //      rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
      //      break;

      //   case 2:  // two-fingered touch: dolly
      //      if ( scope.noZoom === true ) { return; }

      //      state = STATE.TOUCH_DOLLY;

      //      var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
      //      var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
      //      var distance = Math.sqrt( dx * dx + dy * dy );
      //      dollyStart.set( 0, distance );
      //      break;

      //   case 3: // three-fingered touch: pan
      //      if ( scope.noPan === true ) { return; }

      //      state = STATE.TOUCH_PAN;

      //      panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
      //      break;

      //   default:
      //      state = STATE.NONE;
      //}
   }

   function touchmove( event ) {

      if ( scope.enabled === false ) { return; }
      if ( scope.requireAlt === true && event.altKey === false ) { return; }

      event.preventDefault();
      event.stopPropagation();

      //var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      //switch ( event.touches.length ) {

      //   case 1: // one-fingered touch: rotate
      //      if ( scope.noRotate === true ) { return; }
      //      if ( state !== STATE.TOUCH_ROTATE ) { return; }

      //      rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
      //      rotateDelta.subVectors( rotateEnd, rotateStart );

      //      // rotating across whole screen goes 360 degrees around
      //      scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );
      //      // rotating up and down along whole screen attempts to go 360, but limited to 180
      //      scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

      //      rotateStart.copy( rotateEnd );
      //      break;

      //   case 2: // two-fingered touch: dolly
      //      if ( scope.noZoom === true ) { return; }
      //      if ( state !== STATE.TOUCH_DOLLY ) { return; }

      //      var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
      //      var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
      //      var distance = Math.sqrt( dx * dx + dy * dy );

      //      dollyEnd.set( 0, distance );
      //      dollyDelta.subVectors( dollyEnd, dollyStart );

      //      if ( dollyDelta.y > 0 ) {

      //         scope.dollyOut();

      //      } else {

      //         scope.dollyIn();

      //      }

      //      dollyStart.copy( dollyEnd );
      //      break;

      //   case 3: // three-fingered touch: pan
      //      if ( scope.noPan === true ) { return; }
      //      if ( state !== STATE.TOUCH_PAN ) { return; }

      //      panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
      //      panDelta.subVectors( panEnd, panStart );

      //      scope.pan( panDelta );

      //      panStart.copy( panEnd );
      //      break;

      //   default:
      //      state = STATE.NONE;

      //}

   }

   function touchend ( event ) {
      if ( scope.enabled === false ) { return; }
      state.idle( event );
   }

   state.init();

   this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
   this.domElement.addEventListener( 'mousedown', onMouseDown, false );
   this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
   this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

   // We need to trigger jquery-mousewheel explicitly, or the WebGL view doesn't
   // get any mousewheel events
   $( this.domElement ).on( 'mousewheel', onMouseWheel );
   $( this.domElement ).on( 'mouseenter', function ( event ) { state.idle( event ); });

   //this.domElement.addEventListener( 'keydown', onKeyDown, false );
   window.addEventListener( 'keydown', onKeyDown, false );
   //$( this.domElement ).on( 'keydown', onKeyDown );

   this.domElement.addEventListener( 'touchstart', touchstart, false );
   this.domElement.addEventListener( 'touchend', touchend, false );
   this.domElement.addEventListener( 'touchmove', touchmove, false );

   this.domElement.addEventListener( 'mousemove', onMouseMove, false );
};

SCMAP.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
