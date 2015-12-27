// jscs:disable
/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 * @author Leeft / https://github.com/Leeft
 */
/*global THREE, console */

import SCMAP from '../scmap';
import StarSystem from './star-system';
import settings from './settings';
import config from './config';
import { ui, renderer, scene, map } from '../starcitizen-webgl-map';

import $ from 'jquery';
import THREE from 'three';
import TWEEN from 'tween.js';
import StateMachine from 'javascript-state-machine';

// This set of controls performs orbiting, dollying (zooming), and panning. It maintains
// the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
// supported.
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe
//
// This is a drop-in replacement for (most) TrackballControls used in examples.
// That is, include this js file and wherever you see:
//       controls = new THREE.TrackballControls( camera );
//      controls.target.z = 150;
// Simple substitute "OrbitControls" and the control should work as-is.

// Heavily modified version of OrbitControls.js (by Leeft) with a finite
// state machine for dealing with the user's input (I needed more than
// just basic control).

var OrbitControls = function ( renderer, domElement ) {

   this.object     = renderer.camera;
   this.domElement = ( domElement !== undefined ) ? domElement : document;

   this.map        = renderer.map;

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
   this.keyPanSpeed = 40; // pixels moved per arrow key push
   this.mapMode = true; // map mode pans on x,z

   // How far you can orbit vertically, upper and lower limits.
   // Range is 0 to Math.PI radians.
   this.minPolarAngle = 0; // radians
   this.maxPolarAngle = THREE.Math.degToRad( 85 ); // radians

   // Set to true to disable use of the keys
   this.noKeys = false;

   // The keys
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

   ////////////
   // internals

   var scope = this;

   var EPS = 0.000001;

   var rotateStart = new THREE.Vector2();
   var rotateEnd = new THREE.Vector2();
   var rotateDelta = new THREE.Vector2();

   var panStart = new THREE.Vector2();
   var panEnd = new THREE.Vector2();
   var panDelta = new THREE.Vector2();
   var panOffset = new THREE.Vector3();

   var dollyStart = new THREE.Vector2();
   var dollyEnd = new THREE.Vector2();
   var dollyDelta = new THREE.Vector2();

   var mousePrevious = new THREE.Vector2(); // FIXME

   var phiDelta = 0;
   var thetaDelta = 0;
   var scale = 1;
   var pan = new THREE.Vector3();

   var lastPosition = new THREE.Vector3();
   var lastQuaternion = new THREE.Quaternion();

   this.debug = false; // TODO unset

   var startObject; // drag start
   var endObject;   // drag end

   var mouseOver; // where the mouse is at // TODO fixme

   // for reset

   this.target0 = this.target.clone();
   this.position0 = this.object.position.clone();

   // so camera.up is the orbit axis

   var quat = new THREE.Quaternion().setFromUnitVectors( this.object.up, new THREE.Vector3( 0, 1, 0 ) );
   var quatInverse = quat.clone().inverse();

   // events

   var changeEvent = { type: 'change' };
   var startEvent = { type: 'start' };
   var endEvent = { type: 'end' };

   var state = StateMachine.create({
      initial: { state: 'loading', event: 'init', defer: true },

      events: [
         { name: 'startup', from: 'loading', to: 'idle' },

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

         onenterstate: function( stateEvent, from, to ) {
            scope.showState( to );
         },

         onentertouch: function( stateEvent, from, to, event ) {
            if ( scope.enabled === false ) { return; }
            event.preventDefault();
            if ( scope.debug ) {
               console.log( stateEvent, ': entered state', to, 'from', from );
            }

            var intersect;

            if ( event.button === 0 ) { // left mouse

               // If the click starts on an object, we're dragging from
               // that object (possibly to another object) so we take
               // note of that object and switch to the drag state
               intersect = scope.map.getIntersect( event );
               if ( intersect && intersect.object.userData.system ) {
                  startObject = intersect.object.userData.system;
                  if ( scope.debug ) {
                     console.log( `Click at "${ intersect.object.userData.system.name }"` );
                  }
                  map.setSelectionTo( startObject );
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
               console.log( stateEvent, `: entered state`, to, `from`, from );
            }
         },

         onenteridle: function( stateEvent, from, to, event ) {
            if ( scope.debug ) {
               console.log( stateEvent, `: idling after`, from );
            }

            if ( from === 'drag' ) {

               var intersect = scope.map.getIntersect( event );
               if ( intersect && intersect.object.userData.system )
               {
                  endObject = intersect.object.userData.system;
                  if ( scope.debug ) {
                     console.log( 'Ended dragging at "' + endObject.toString() + '"' );
                  }

                  if ( endObject === startObject ) {
                     endObject.displayInfo();
                  }
                  else
                  {
                     if ( map.selected() === endObject ) {
                     }
                     var route = map.route();
                     if ( route.isSet() && startObject !== endObject ) {
                        route.update( endObject );
                        route.storeToSession();
                        ui.toTab( 'route' );
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

      error: function( eventName, from, to, args, errorCode, errorMessage ) {
         if ( scope.debug ) {
            console.log( 'event ' + eventName + ' was naughty : ' + errorMessage );
         }
      }
   });

   var targetTween;
   var rotationTween;
   var rotationLeft;
   var rotationUp;
   var rotationRadius;

   var isMoving = false;

   this.stateMachine = function () {
      return state;
   };

   this.showState = function ( to ) {
      if ( $('#debug-state') ) {
         $('#debug-state').text( 'State: ' + to );
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

      var te = this.object.matrix.elements;

      // get X column of matrix
      panOffset.set( te[0], te[1], te[2] );
      panOffset.multiplyScalar( - distance );

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

      var controls = this;
      var traverse = this.target.clone();
      var destinationVector;

      // makes sure the destination is at the same xz plane
      if ( destination instanceof StarSystem ) {
         destinationVector = destination.position.clone().setY( this.target.y );
      } else if ( destination instanceof THREE.Vector3 ) {
         destinationVector = destination.clone().setY( this.target.y );
      } else {
         return;
      }

      if ( destination instanceof StarSystem ) {
         map.setSelectionTo( destination );
      }

      if ( targetTween ) {
         targetTween.stop();
      }

      targetTween = new TWEEN.Tween( traverse )
         .to( { x: destinationVector.x, y: destinationVector.y, z: destinationVector.z }, 750 )
         .easing( TWEEN.Easing.Cubic.InOut )
         .onUpdate( function () {
            var vec = new THREE.Vector3( this.x, this.y, this.z );
            controls.goTo( vec );
            isMoving = true;
         } );

      targetTween.onComplete( function() {
         targetTween = undefined;
      });

      targetTween.start();
   };

   this.rememberPosition = function rememberPosition() {
      settings.camera.camera = this.object.position;
      settings.camera.target = this.target;
      settings.save( 'camera' );
   };

   // assumes mapMode for now
   this.rotateTo = function ( left, up, radius ) {

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

      //rotateLeft = rotate.left;
      //rotateUp   = rotate.up;

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
            isMoving = true;
            scope.dispatchEvent( changeEvent );
         });

      rotationTween.onComplete( function() {
         rotationTween  = undefined;
         rotationLeft   = undefined;
         rotationUp     = undefined;
         rotationRadius = undefined;
         scope.dispatchEvent( endEvent );
      });

      scope.dispatchEvent( startEvent );
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
   this.pan = function ( deltaX, deltaY ) {

      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      if ( scope.object.fov !== undefined ) {

         // perspective
         var position = scope.object.position;
         var offset = position.clone().sub( scope.target );
         var targetDistance = offset.length();

         // half of the fov is center to top of screen
         targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

         // we actually don't use screenWidth, since perspective camera is fixed to screen height
         scope.panLeft( 2 * deltaX * targetDistance / element.clientHeight );
         scope.panUp( 2 * deltaY * targetDistance / element.clientHeight );

      } else if ( scope.object.top !== undefined ) {

         // orthographic
         scope.panLeft( deltaX * (scope.object.right - scope.object.left) / element.clientWidth );
         scope.panUp( deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight );

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
      isMoving = true;

   };

   this.dollyOut = function ( dollyScale ) {

      if ( dollyScale === undefined ) {
         dollyScale = getZoomScale();
      }

      scale *= dollyScale;
      isMoving = true;

   };

   this.objectVectorToTarget = function () {
      return this.object.position.clone().sub( this.target );
   };

   this.currentState = function currentState() {
      return state.current;
   };

   this.cameraIsMoving = function cameraIsMoving() {
      return(
         (state.current === 'pan') ||
         (state.current === 'dolly') ||
         (state.current === 'rotate') ||
         (state.current === 'loading') ||
         !dollyStart.equals( dollyEnd ) ||
         isMoving
      );
   };

   this.throttledEventListener = (function() {

      var callbacks = {}, running = false;

      // fired on events
      function throttled() {

         if ( !running ) {
            running = true;

            if ( window.requestAnimationFrame ) {
               window.requestAnimationFrame( runCallbacks );
            } else {
               setTimeout( runCallbacks, 66 );
            }
         }

      }

      // run the actual callbacks
      function runCallbacks() {
         /*jshint -W083 */
         for ( var type in callbacks ) {
            if ( callbacks.hasOwnProperty( type ) ) {
               callbacks[ type ].forEach( function( callback ) {
                  callback();
               });
            }
         }
         running = false;
      }

      // adds callback to loop
      function addCallback( type, callback) {
         if ( type && callback ) {
            if ( ! ( type in callbacks ) ) {
               callbacks[ type ] = [];
            }
            callbacks[ type ].push( callback );
         }
      }

      return {
         // initalize resize event listener
         init: function( type, callback ) {
            renderer.controls.addEventListener( type, throttled );
            addCallback( type, callback );
         },

         // public method to add additional callback
         add: function( type, callback ) {
            addCallback( type, callback );
         }
      };
   }());

   this.update = function update() {

      if ( (state.current === 'idle') && (pan.length() === 0.0) && !isMoving ) {
         return;
      }

      isMoving = true;

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

      this.object.userData.phi = phi;
      this.object.userData.theta = theta;

      var radius = offset.length() * scale;
      if ( rotationRadius !== undefined ) {
         radius = rotationRadius;
      }

      if ( config.debug ) {
        $('#debug-angle').html(
         'Camera heading: '+THREE.Math.radToDeg( theta ).toFixed(1)+'&deg; ('+theta.toFixed(2)+')<br>'+
         'Camera tilt: '+THREE.Math.radToDeg( phi ).toFixed(1)+'&deg; ('+phi.toFixed(2)+')<br>'+
         'Camera distance: '+radius.toFixed(1)
        );
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

      // update condition is:
      // min(camera displacement, camera rotation in radians)^2 > EPS
      // using small-angle approximation cos(x/2) = 1 - x^2 / 8

      if ( lastPosition.distanceToSquared( this.object.position ) > EPS ||
          8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS ) {

         this.dispatchEvent( changeEvent );

         lastPosition.copy( this.object.position );
         lastQuaternion.copy( this.object.quaternion );

      }

      isMoving = false;

   };

   function getAutoRotationAngle() {

      return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

   }

   function getZoomScale() {

      return Math.pow( 0.95, scope.zoomSpeed );

   }

   function onMouseDown( event ) {

      if ( scope.enabled === false ) { return; }
      event.preventDefault();

      state.starttouch( event );

      document.addEventListener( 'mousemove', onMouseMove, false );
      document.addEventListener( 'mouseup', onMouseUp, false );
      scope.dispatchEvent( startEvent );
   }

   function onMouseMove( event ) {

      if ( scope.enabled === false ) return;

      event.preventDefault();

      var intersect;
      var route;
      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      // Mouse move handling: highlighting systems, dragging waypoints on route

      if ( ! scope.cameraIsMoving() )
      {
         if ( event.clientX !== mousePrevious.x && event.clientY !== mousePrevious.y ) {
            intersect = scope.map.getIntersect( event );
            if ( intersect && intersect.object.userData.system && intersect.object.userData.system !== mouseOver ) {
               mouseOver = intersect.object.userData.system;
               map._mouseOverObject.position.copy( mouseOver.position );
               map._mouseOverObject.visible = true;
            } else {
               if ( !intersect || !intersect.object.userData.system ) {
                  if ( mouseOver !== undefined ) {
                     map._mouseOverObject.position.set( 0, 0, 0 );
                     map._mouseOverObject.visible = false;
                  }
                  mouseOver = undefined;
               }
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

            if ( intersect && intersect.object.userData.system && intersect.object.userData.system !== startObject ) {

               if ( !endObject || endObject !== intersect.object.userData.system ) {

                  endObject = intersect.object.userData.system;
                  route = map.route();

                  if ( !route.isSet() )
                  {
                     route.start = startObject;
                     route.waypoints = [ endObject ];
                     route.update();
                     route.storeToSession();
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

         scope.pan( panDelta.x, panDelta.y );

         panStart.copy( panEnd );

      }

      scope.update();

   }

   function onMouseUp( event ) {

      if ( scope.enabled === false ) return;

      document.removeEventListener( 'mousemove', onMouseMove, false );
      document.removeEventListener( 'mouseup', onMouseUp, false );
      scope.dispatchEvent( endEvent );
      state.idle( event );

   }

   function onMouseWheel( event ) {

      if ( scope.enabled === false || scope.noZoom === true ) return;

      event.preventDefault();
      event.stopPropagation();

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

      } else if ( delta < 0 ) {

         scope.dollyIn();

      }

      scope.update();
      scope.dispatchEvent( startEvent );
      scope.dispatchEvent( endEvent );
   }

   function onKeyDown( event ) {

      if ( scope.enabled === false || scope.noKeys === true || scope.noPan === true ) return;

      // TODO: allow modifiers at all?
      if ( event.altKey === true || event.shiftKey === true || event.ctrlKey === true || event.metaKey === true ) return;

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
            event.preventDefault();
            scope.pan( 0, scope.keyPanSpeed );
            needUpdate = true;
            break;
         case scope.keys.BOTTOM:
            event.preventDefault();
            scope.pan( 0, - scope.keyPanSpeed );
            needUpdate = true;
            break;
         case scope.keys.LEFT:
            event.preventDefault();
            scope.pan( scope.keyPanSpeed, 0 );
            needUpdate = true;
            break;
         case scope.keys.RIGHT:
            event.preventDefault();
            scope.pan( - scope.keyPanSpeed, 0 );
            needUpdate = true;
            break;
         case scope.keys.ESCAPE: // Deselect selected
            map.deselect();
            break;
         case scope.keys.TAB: // Tab through route
            // TODO
            break;
         case scope.keys.R: // Reset orientation
            scope.rotateTo( 0, undefined, undefined );
            break;
         case scope.keys.C: // Center on default
            scope.moveTo( settings.cameraDefaults.target );
            break;
         case scope.keys.T: // Top view
            scope.rotateTo( 0, 0, 200 );
            break;
         case scope.keys['2']: // 2D mode
            scope.noRotate = true;
            $('#sc-map-lock-rotation').prop( 'checked', true );
            scope.map.displayState.to2d();
            scope.rotateTo( 0, 0, 180 );
            break;
         case scope.keys['3']: // 3D mode
            scope.map.displayState.to3d();
            scope.rotateTo(
               settings.cameraDefaults.orientation.theta,
               settings.cameraDefaults.orientation.phi,
               settings.cameraDefaults.orientation.radius
            );
            break;
         case scope.keys.L: // Lock/unlock rotation
            $('#sc-map-lock-rotation').click();
            break;
         default:
            //console.log( "onkeydown", event.keyCode );
            break;
      }

      if ( needUpdate ) {
         scope.dispatchEvent( startEvent );
         scope.dispatchEvent( endEvent );
         isMoving = true;
         scope.update();
      }
   }

   function touchstart( event ) {

      if ( scope.enabled === false ) { return; }

      //switch ( event.touches.length ) {

      //   case 1:  // one-fingered touch: rotate

      //      if ( scope.noRotate === true ) return;

      //      state = STATE.TOUCH_ROTATE;

      //      rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
      //      break;

      //   case 2:  // two-fingered touch: dolly

      //      if ( scope.noZoom === true ) return;

      //      state = STATE.TOUCH_DOLLY;

      //      var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
      //      var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
      //      var distance = Math.sqrt( dx * dx + dy * dy );
      //      dollyStart.set( 0, distance );
      //      break;

      //   case 3: // three-fingered touch: pan

      //      if ( scope.noPan === true ) return;

      //      state = STATE.TOUCH_PAN;

      //      panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
      //      break;

      //   default:

      //      state = STATE.NONE;

      //}

      scope.dispatchEvent( startEvent );

   }

   function touchmove( event ) {

      if ( scope.enabled === false ) { return; }

      event.preventDefault();
      event.stopPropagation();

      //var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      //switch ( event.touches.length ) {

      //   case 1: // one-fingered touch: rotate

      //      if ( scope.noRotate === true ) return;
      //      if ( state !== STATE.TOUCH_ROTATE ) return;

      //      rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
      //      rotateDelta.subVectors( rotateEnd, rotateStart );

      //      // rotating across whole screen goes 360 degrees around
      //      scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );
      //      // rotating up and down along whole screen attempts to go 360, but limited to 180
      //      scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

      //      rotateStart.copy( rotateEnd );

      //      scope.update();
      //      break;

      //   case 2: // two-fingered touch: dolly

      //      if ( scope.noZoom === true ) return;
      //      if ( state !== STATE.TOUCH_DOLLY ) return;

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

      //      scope.update();
      //      break;

      //   case 3: // three-fingered touch: pan

      //      if ( scope.noPan === true ) return;
      //      if ( state !== STATE.TOUCH_PAN ) return;

      //      panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
      //      panDelta.subVectors( panEnd, panStart );

      //      scope.pan( panDelta.x, panDelta.y );

      //      panStart.copy( panEnd );

      //      scope.update();
      //      break;

      //   default:

      //      state = STATE.NONE;

      //}

   }

   function touchend ( event ) {

      if ( scope.enabled === false ) { return; }

      scope.dispatchEvent( endEvent );
      state.idle( event );

   }

   this.idle = function idle() {
      state.idle();
   };

   state.init();

   this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
   this.domElement.addEventListener( 'mousedown', onMouseDown, false );
   this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
   this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

   this.domElement.addEventListener( 'touchstart', touchstart, false );
   this.domElement.addEventListener( 'touchend', touchend, false );
   this.domElement.addEventListener( 'touchmove', touchmove, false );

   window.addEventListener( 'keydown', onKeyDown, false );

   this.domElement.addEventListener( 'mousemove', onMouseMove, false );

   // force an update at start
   this.update();

};

OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );

export default OrbitControls;
