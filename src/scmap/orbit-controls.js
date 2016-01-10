// jscs:disable
// Wrapped as an ES6 module by Lianna Eeftinck - https://github.com/Leeft/

import StarSystem from './star-system';
import settings from './settings';
import UI from './ui';
import toggleFullScreen from '../helpers/toggle-full-screen';

import THREE from 'three';
import TWEEN from 'tween.js';
import StateMachine from 'javascript-state-machine';

const startEvent = { type: 'start' };
const changeEvent = { type: 'change' };
const endEvent = { type: 'end' };

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one finger move
//    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
//    Pan - right mouse, or arrow keys / touch: three finter swipe

THREE.OrbitControls = function ( object, domElement ) {

  this.object = object;

  this.domElement = ( domElement !== undefined ) ? domElement : document;

  // Set to false to disable this control
  this.enabled = true;

  // "target" sets the location of focus, where the object orbits around
  this.target = new THREE.Vector3();

  // How far you can dolly in and out ( PerspectiveCamera only )
  this.minDistance = 0;
  this.maxDistance = Infinity;

  // How far you can zoom in and out ( OrthographicCamera only )
  this.minZoom = 0;
  this.maxZoom = Infinity;

  // How far you can orbit vertically, upper and lower limits.
  // Range is 0 to Math.PI radians.
  this.minPolarAngle = 0; // radians
  this.maxPolarAngle = Math.PI; // radians

  // How far you can orbit horizontally, upper and lower limits.
  // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
  this.minAzimuthAngle = - Infinity; // radians
  this.maxAzimuthAngle = Infinity; // radians

  // Set to true to enable damping (inertia)
  // If damping is enabled, you must call controls.update() in your animation loop
  this.enableDamping = false;
  this.dampingFactor = 0.25;

  // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
  // Set to false to disable zooming
  this.enableZoom = true;
  this.zoomSpeed = 1.0;

  // Set to false to disable rotating
  this.enableRotate = true;
  this.rotateSpeed = 1.0;

  // Set to false to disable panning
  this.enablePan = true;
  this.keyPanSpeed = 7.0; // pixels moved per arrow key push

  // Set to true to automatically rotate around the target
  // If auto-rotate is enabled, you must call controls.update() in your animation loop
  this.autoRotate = false;
  this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

  // Set to false to disable use of the keys
  this.enableKeys = true;

  // The four arrow keys
  this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

  // Mouse buttons
  this.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };

  // for reset
  this.target0 = this.target.clone();
  this.position0 = this.object.position.clone();
  this.zoom0 = this.object.zoom;

  //
  // public methods
  //

  this.getPolarAngle = function () {

    return phi;

  };

  this.getAzimuthalAngle = function () {

    return theta;

  };

  this.reset = function () {

    scope.target.copy( scope.target0 );
    scope.object.position.copy( scope.position0 );
    scope.object.zoom = scope.zoom0;

    scope.object.updateProjectionMatrix();
    scope.dispatchEvent( changeEvent );

    scope.update();

    state = STATE.NONE;

  };

  // this method is exposed, but perhaps it would be better if we can make it private...
  this.update = function() {

    var offset = new THREE.Vector3();

    // so camera.up is the orbit axis
    var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
    var quatInverse = quat.clone().inverse();

    var lastPosition = new THREE.Vector3();
    var lastQuaternion = new THREE.Quaternion();

    return function () {

      var position = scope.object.position;

      offset.copy( position ).sub( scope.target );

      // rotate offset to "y-axis-is-up" space
      offset.applyQuaternion( quat );

      // angle from z-axis around y-axis

      theta = Math.atan2( offset.x, offset.z );

      // angle from y-axis

      phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

      if ( scope.autoRotate && state === STATE.NONE ) {

        rotateLeft( getAutoRotationAngle() );

      }

      theta += thetaDelta;
      phi += phiDelta;

      // restrict theta to be between desired limits
      theta = Math.max( scope.minAzimuthAngle, Math.min( scope.maxAzimuthAngle, theta ) );

      // restrict phi to be between desired limits
      phi = Math.max( scope.minPolarAngle, Math.min( scope.maxPolarAngle, phi ) );

      // restrict phi to be betwee EPS and PI-EPS
      phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

      var radius = offset.length() * scale;

      // restrict radius to be between desired limits
      radius = Math.max( scope.minDistance, Math.min( scope.maxDistance, radius ) );

      // move target to panned location
      scope.target.add( panOffset );

      offset.x = radius * Math.sin( phi ) * Math.sin( theta );
      offset.y = radius * Math.cos( phi );
      offset.z = radius * Math.sin( phi ) * Math.cos( theta );

      // rotate offset back to "camera-up-vector-is-up" space
      offset.applyQuaternion( quatInverse );

      position.copy( scope.target ).add( offset );

      scope.object.lookAt( scope.target );

      if ( scope.enableDamping === true ) {

        thetaDelta *= ( 1 - scope.dampingFactor );
        phiDelta *= ( 1 - scope.dampingFactor );

      } else {

        thetaDelta = 0;
        phiDelta = 0;

      }

      scale = 1;
      panOffset.set( 0, 0, 0 );

      // update condition is:
      // min(camera displacement, camera rotation in radians)^2 > EPS
      // using small-angle approximation cos(x/2) = 1 - x^2 / 8

      if ( zoomChanged ||
        lastPosition.distanceToSquared( scope.object.position ) > EPS ||
        8 * ( 1 - lastQuaternion.dot( scope.object.quaternion ) ) > EPS ) {

          scope.dispatchEvent( changeEvent );

          lastPosition.copy( scope.object.position );
          lastQuaternion.copy( scope.object.quaternion );
          zoomChanged = false;

          return true;

        }

      return false;

    };

  }();

  this.dispose = function() {

    scope.domElement.removeEventListener( 'contextmenu', onContextMenu, false );
    scope.domElement.removeEventListener( 'mousedown', onMouseDown, false );
    scope.domElement.removeEventListener( 'mousewheel', onMouseWheel, false );
    scope.domElement.removeEventListener( 'MozMousePixelScroll', onMouseWheel, false ); // firefox

    scope.domElement.removeEventListener( 'touchstart', onTouchStart, false );
    scope.domElement.removeEventListener( 'touchend', onTouchEnd, false );
    scope.domElement.removeEventListener( 'touchmove', onTouchMove, false );

    document.removeEventListener( 'mousemove', onMouseMove, false );
    document.removeEventListener( 'mouseup', onMouseUp, false );
    document.removeEventListener( 'mouseout', onMouseUp, false );

    window.removeEventListener( 'keydown', onKeyDown, false );

    //scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?

  };

  //
  // internals
  //

  var scope = this;

  /*
  var changeEvent = { type: 'change' };
  var startEvent = { type: 'start' };
  var endEvent = { type: 'end' };
  */

  var STATE = { NONE : - 1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

  STATE.DRAGROUTE = 6; // Leeft addition
  STATE.PAN_XY = 7; // Leeft addition
  STATE.TOUCH_PAN_XY = 8; // Leeft addition

  var state = STATE.NONE;

  var EPS = 0.000001;

  // current position in spherical coordinates
  var theta;
  var phi;

  var phiDelta = 0;
  var thetaDelta = 0;
  var scale = 1;
  var panOffset = new THREE.Vector3();
  var zoomChanged = false;

  var rotateStart = new THREE.Vector2();
  var rotateEnd = new THREE.Vector2();
  var rotateDelta = new THREE.Vector2();

  var panStart = new THREE.Vector2();
  var panEnd = new THREE.Vector2();
  var panDelta = new THREE.Vector2();

  var dollyStart = new THREE.Vector2();
  var dollyEnd = new THREE.Vector2();
  var dollyDelta = new THREE.Vector2();

  function getAutoRotationAngle() {

    return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

  }

  function getZoomScale() {

    return Math.pow( 0.95, scope.zoomSpeed );

  }

  function rotateLeft( angle ) {

    thetaDelta -= angle;

  }

  function rotateUp( angle ) {

    phiDelta -= angle;

  }

  var panLeft = function() {

    var v = new THREE.Vector3();

    return function panLeft( distance, objectMatrix ) {

      var te = objectMatrix.elements;

      // get X column of objectMatrix
      v.set( te[ 0 ], te[ 1 ], te[ 2 ] );

      v.multiplyScalar( - distance );

      panOffset.add( v );

    };

  }();

  var panUp = function() {

    var v = new THREE.Vector3();

    return function panUp( distance, objectMatrix ) {

      var te = objectMatrix.elements;

      // get Y column of objectMatrix
      v.set( te[ 4 ], te[ 5 ], te[ 6 ] );

      v.multiplyScalar( distance );

      panOffset.add( v );

    };

  }();

  //
  // Leeft addition: pan across grid rather than x/y screen coordinates
  //
  const orgPanUp = panUp;

  panUp = () => {

    return ( distance ) => {
      const sameLevelTarget = this.target.clone().setY( this.object.position.y );
      const v = this.object.position.clone().sub( sameLevelTarget ).negate().setLength( distance );
      panOffset.add( v );
    };

  }();
  //
  // End Leeft addition
  //

  // deltaX and deltaY are in pixels; right and down are positive
  var pan = function() {

    var offset = new THREE.Vector3();

    return function( deltaX, deltaY ) {

      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      if ( scope.object instanceof THREE.PerspectiveCamera ) {

        // perspective
        var position = scope.object.position;
        offset.copy( position ).sub( scope.target );
        var targetDistance = offset.length();

        // half of the fov is center to top of screen
        targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

        // we actually don't use screenWidth, since perspective camera is fixed to screen height
        panLeft( 2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix );
        // Leeft modifications start
        if ( state === STATE.PAN_XY || state === STATE.TOUCH_PAN_XY ) {
          orgPanUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );
        } else {
          panUp( 2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix );
        }
        // Leeft modifications end

      } else if ( scope.object instanceof THREE.OrthographicCamera ) {

        // orthographic
        panLeft( deltaX * ( scope.object.right - scope.object.left ) / element.clientWidth, scope.object.matrix );
        panUp( deltaY * ( scope.object.top - scope.object.bottom ) / element.clientHeight, scope.object.matrix );

      } else {

        // camera neither orthographic nor perspective
        console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );
        scope.enablePan = false;

      }

    };

  }();

  function dollyIn( dollyScale ) {

    if ( scope.object instanceof THREE.PerspectiveCamera ) {

      scale /= dollyScale;

    } else if ( scope.object instanceof THREE.OrthographicCamera ) {

      scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom * dollyScale ) );
      scope.object.updateProjectionMatrix();
      zoomChanged = true;

    } else {

      console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
      scope.enableZoom = false;

    }

  }

  function dollyOut( dollyScale ) {

    if ( scope.object instanceof THREE.PerspectiveCamera ) {

      scale *= dollyScale;

    } else if ( scope.object instanceof THREE.OrthographicCamera ) {

      scope.object.zoom = Math.max( scope.minZoom, Math.min( scope.maxZoom, scope.object.zoom / dollyScale ) );
      scope.object.updateProjectionMatrix();
      zoomChanged = true;

    } else {

      console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
      scope.enableZoom = false;

    }

  }

  //
  // event callbacks - update the object state
  //

  function handleMouseDownRotate( event ) {

    //console.log( 'handleMouseDownRotate' );

    rotateStart.set( event.clientX, event.clientY );

  }

  function handleMouseDownDolly( event ) {

    //console.log( 'handleMouseDownDolly' );

    dollyStart.set( event.clientX, event.clientY );

  }

  function handleMouseDownPan( event ) {

    //console.log( 'handleMouseDownPan' );

    panStart.set( event.clientX, event.clientY );

  }

  function handleMouseMoveRotate( event ) {

    //console.log( 'handleMouseMoveRotate' );

    rotateEnd.set( event.clientX, event.clientY );
    rotateDelta.subVectors( rotateEnd, rotateStart );

    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

    // rotating across whole screen goes 360 degrees around
    rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

    // rotating up and down along whole screen attempts to go 360, but limited to 180
    rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

    rotateStart.copy( rotateEnd );

    scope.update();

  }

  function handleMouseMoveDolly( event ) {

    //console.log( 'handleMouseMoveDolly' );

    dollyEnd.set( event.clientX, event.clientY );

    dollyDelta.subVectors( dollyEnd, dollyStart );

    if ( dollyDelta.y > 0 ) {

      dollyIn( getZoomScale() );

    } else if ( dollyDelta.y < 0 ) {

      dollyOut( getZoomScale() );

    }

    dollyStart.copy( dollyEnd );

    scope.update();

  }

  function handleMouseMovePan( event ) {

    //console.log( 'handleMouseMovePan' );

    panEnd.set( event.clientX, event.clientY );

    panDelta.subVectors( panEnd, panStart );

    pan( panDelta.x, panDelta.y );

    panStart.copy( panEnd );

    scope.update();

  }

  function handleMouseUp( event ) {

    //console.log( 'handleMouseUp' );

    // Leeft addition start
    if ( state === STATE.DRAGROUTE )
    {
      const system = systemIndicated( event );
      if ( system ) {
        scope.endObject = system;
        if ( system !== scope.startObject ) {
          const route = scope.map.route();
          if ( route.isSet() && scope.startObject !== scope.endObject ) {
            route.update( scope.endObject );
            route.storeToSession()
            UI.toTab( 'route' );
          }
        } else if ( system === scope.startObject ) {
          scope.map.setSelectionTo( system );
          UI.displayInfoOn( system );
        }
      }
    }

    scope.dispatchEvent( changeEvent );

    // Leeft addition end

    }

    function handleMouseWheel( event ) {

      //console.log( 'handleMouseWheel' );

      var delta = 0;

      if ( event.wheelDelta !== undefined ) {

        // WebKit / Opera / Explorer 9

      delta = event.wheelDelta;

    } else if ( event.detail !== undefined ) {

      // Firefox

      delta = - event.detail;

    }

    if ( delta > 0 ) {

      dollyOut( getZoomScale() );

    } else if ( delta < 0 ) {

      dollyIn( getZoomScale() );

    }

    scope.update();

  }

  function handleKeyDown( event ) {

    //console.log( 'handleKeyDown' );

    switch ( event.keyCode ) {

      case scope.keys.UP:
        pan( 0, scope.keyPanSpeed );
        scope.update();
        break;

      case scope.keys.BOTTOM:
        pan( 0, - scope.keyPanSpeed );
        scope.update();
        break;

      case scope.keys.LEFT:
        pan( scope.keyPanSpeed, 0 );
        scope.update();
        break;

      case scope.keys.RIGHT:
        pan( - scope.keyPanSpeed, 0 );
        scope.update();
        break;

      //
      // Leeft additions ..
      //

      case scope.keys.ESCAPE: // Deselect selected
        scope.map.deselect();
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

      case scope.keys.ENTER: // Full screen
        toggleFullScreen();
        break;

      case scope.keys['2']: // 2D mode
        scope.enableRotate = false;
        UI.rotationLocked();
        scope.map.displayState.to2d();
        scope.rotateTo( 0, 0, 180 );
        break;

      case scope.keys['3']: // 3D mode
        scope.enableRotate = true;
        scope.map.displayState.to3d();
        UI.rotationUnlocked();
        scope.rotateTo(
          settings.cameraDefaults.orientation.theta,
          settings.cameraDefaults.orientation.phi,
          settings.cameraDefaults.orientation.radius
        );
        break;

      case scope.keys.L: // Lock/unlock rotation
        if ( ! event.ctrlKey ) {
          UI.rotationLockToggle();
        }
        break;

      //
      // End of Leeft additions
      //
    }

  }

  function handleTouchStartRotate( event ) {

    //console.log( 'handleTouchStartRotate' );

    rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

  }

  function handleTouchStartDolly( event ) {

    //console.log( 'handleTouchStartDolly' );

    var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
    var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

    var distance = Math.sqrt( dx * dx + dy * dy );

    dollyStart.set( 0, distance );

  }

  function handleTouchStartPan( event ) {

    //console.log( 'handleTouchStartPan' );

    panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

  }

  function handleTouchMoveRotate( event ) {

    //console.log( 'handleTouchMoveRotate' );

    rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
    rotateDelta.subVectors( rotateEnd, rotateStart );

    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

    // rotating across whole screen goes 360 degrees around
    rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

    // rotating up and down along whole screen attempts to go 360, but limited to 180
    rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

    rotateStart.copy( rotateEnd );

    scope.update();

  }

  function handleTouchMoveDolly( event ) {

    //console.log( 'handleTouchMoveDolly' );

    var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
    var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;

    var distance = Math.sqrt( dx * dx + dy * dy );

    dollyEnd.set( 0, distance );

    dollyDelta.subVectors( dollyEnd, dollyStart );

    if ( dollyDelta.y > 0 ) {

      dollyOut( getZoomScale() );

    } else if ( dollyDelta.y < 0 ) {

      dollyIn( getZoomScale() );

    }

    dollyStart.copy( dollyEnd );

    scope.update();

  }

  function handleTouchMovePan( event ) {

    //console.log( 'handleTouchMovePan' );

    panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

    panDelta.subVectors( panEnd, panStart );

    pan( panDelta.x, panDelta.y );

    panStart.copy( panEnd );

    scope.update();

  }

  function handleTouchEnd( event ) {

    //console.log( 'handleTouchEnd' );

    // Leeft addition start
    if ( state === STATE.DRAGROUTE )
    {
      const system = systemIndicated( event );
      if ( system ) {
        scope.endObject = system;
        if ( system !== scope.startObject ) {
          const route = scope.map.route();
          if ( route.isSet() && scope.startObject !== scope.endObject ) {
            route.update( scope.endObject );
            route.storeToSession()
            UI.toTab( 'route' );
          }
        } else if ( system === scope.startObject ) {
          scope.map.setSelectionTo( system );
          UI.displayInfoOn( system );
        }
      }
    }

    scope.dispatchEvent( changeEvent );

    // Leeft addition end

  }

  //
  // Leeft additions
  //
  this.moveTo = ( destination ) => {
    // method assumes mapMode for now
    // FIXME: destination should be only a vector, not a system
    let destinationVector;

    // makes sure the destination is at the same xz plane
    if ( destination instanceof StarSystem ) {
      destinationVector = destination.position.clone();
    } else if ( destination instanceof THREE.Vector3 ) {
      destinationVector = destination.clone();
    } else {
      return;
    }

    if ( this.targetTween ) {
      this.targetTween.stop();
    }

    if ( destination instanceof StarSystem ) {
      this.map.setSelectionTo( destination );
    }

    const vec = new THREE.Vector3( 0, 0, 0 );

    this.targetTween = new TWEEN.Tween( this.target.clone() )
      .to( { x: destinationVector.x, y: destinationVector.y, z: destinationVector.z }, 750 )
      .easing( TWEEN.Easing.Cubic.InOut )
      .onUpdate( function () {
        vec.set( this.x, this.y, this.z );
        scope.goTo( vec );
        //this.isMoving = true; // FIXME
      });

    this.targetTween.onComplete( () => {
      this.map.syncCamera();
      this.targetTween = undefined;
    });

    this.targetTween.start();
  };

  // assumes mapMode for now
  this.goTo = ( vector ) => {
    // make sure the given vector is at the same xz plane
    vector = vector.clone();
    vector.sub( this.target );
    panOffset.add( vector );
  };

  this.rotateTo = ( left, up, radius ) => {
    if ( this.rotationTween ) {
      this.rotationTween.stop();
    }

    const offset = this.object.position.clone().sub( this.target );

    const from = {
      left:   this.getAzimuthalAngle(),
      up:     this.getPolarAngle(),
      radius: offset.length(),
    };

    const to = {
      left:   Number.isFinite( left )   ? left   : this.getAzimuthalAngle(),
      up:     Number.isFinite( up )     ? up     : this.getPolarAngle(),
      radius: Number.isFinite( radius ) ? radius : offset.length(),
    };

    this.rotationTween = new TWEEN.Tween( from )
      .to( to, 800 )
      .easing( TWEEN.Easing.Cubic.InOut )
      .onUpdate( function () {
        if ( Number.isFinite( left ) ) {
          rotateLeft( scope.getAzimuthalAngle() - this.left );
        }
        if ( Number.isFinite( up ) ) {
          rotateUp( scope.getPolarAngle() - this.up );
        }
        if ( Number.isFinite( radius ) ) {
          const offset = scope.object.position.clone().sub( scope.target ).length();
          scale = this.radius / offset;
        }
        scope.map.syncCamera();
      });

    this.rotationTween.onComplete( () => {
      this.rotationTween  = undefined;
      this.map.syncCamera();
    });

    this.dispatchEvent( startEvent );
    this.rotationTween.start();
  };

  this.cameraTo = ( target, theta, phi, radius ) => {
    this.rotateTo( theta, phi, radius );
    this.moveTo( target );
  };

  this.rememberPosition = () => {
    settings.camera.camera = this.object.position;
    settings.camera.target = this.target;
    settings.save( 'camera' );
  };

  function systemIndicated( event ) {
    const intersect = scope.map.getIntersect( event );
    if ( intersect && intersect.object.userData.system ) {
      return intersect.object.userData.system;
    }
    return;
  }

  function handleMouseMoveDrag( event ) {
    const system = systemIndicated( event );

    //UI.endHoverOverStarSystem(); // FIXME

    if ( system ) {

      //UI.startHoverOverStarSystem(); // FIXME

      if ( scope.startObject !== system && scope.endObject !== system ) {

        scope.endObject = system;

        const route = scope.map.route();

        if ( !route.isSet() )
        {
            route.start = scope.startObject;
            route.waypoints = [ scope.endObject ];
            route.update();
            route.storeToSession();
            //if ( scope.debug ) {
            //  console.log( 'Intermediate object while dragging is "' + endObject.name + '"' );
            //}
        }
        else
        {
            route.moveWaypoint( scope.startObject, scope.endObject );
            if ( scope.startObject !== scope.endObject ) {
              route.update();
              route.storeToSession()
            }
            scope.startObject = scope.endObject;
            //console.log( 'In-route mode -- intermediate object while dragging is "' + endObject.name + '"' );
        }

      }
    }
  }

  //
  // End of Leeft additions
  //

  //
  // event handlers - FSM: listen for events and reset state
  //

  function onMouseDown( event ) {
    if ( scope.enabled === false ) return;

    event.preventDefault();

    if ( event.button === scope.mouseButtons.ORBIT ) {

      // Leeft additions and modification
      const system = systemIndicated( event );

      if ( system ) {

        scope.startObject = system;
        scope.endObject = undefined;

        if ( scope.enableRouting === false ) return;

        state = STATE.DRAGROUTE;
      }
      else
      {

        if ( scope.enableRotate === false ) return;

        handleMouseDownRotate( event );

        state = STATE.ROTATE;

      }
      // End Leeft additions and modification

    } else if ( event.button === scope.mouseButtons.ZOOM ) {

      if ( scope.enableZoom === false ) return;

      handleMouseDownDolly( event );

      state = STATE.DOLLY;

    } else if ( event.button === scope.mouseButtons.PAN ) {

      if ( scope.enablePan === false ) return;

      handleMouseDownPan( event );

      // Leeft additions and modification
      if ( event.altKey ) {
        state = STATE.PAN_XY;
      } else {
        state = STATE.PAN;
      }
      // End Leeft additions and modification

    }

    if ( state !== STATE.NONE ) {

      document.addEventListener( 'mousemove', onMouseMove, false );
      document.addEventListener( 'mouseup', onMouseUp, false );
      document.addEventListener( 'mouseout', onMouseUp, false );

      scope.dispatchEvent( startEvent );

    }

  }

  function onMouseMove( event ) {

    if ( scope.enabled === false ) return;

    event.preventDefault();

    if ( state === STATE.ROTATE ) {

      if ( scope.enableRotate === false ) return;

      handleMouseMoveRotate( event );

      scope.map.syncCamera();

    } else if ( state === STATE.DOLLY ) {

      if ( scope.enableZoom === false ) return;

      handleMouseMoveDolly( event );

    } else if ( state === STATE.PAN ) {

      if ( scope.enablePan === false ) return;

      handleMouseMovePan( event );

    // Leeft addition

    } else if ( state === STATE.PAN_XY ) {

      if ( scope.enablePan === false ) return;

      handleMouseMovePan( event );

    } else if ( state === STATE.DRAGROUTE ) {

      if ( scope.enableRouting === false ) return;

      handleMouseMoveDrag( event );

    // End Leeft addition

    }

  }

  function onMouseUp( event ) {

    if ( scope.enabled === false ) return;

    handleMouseUp( event );

    document.removeEventListener( 'mousemove', onMouseMove, false );
    document.removeEventListener( 'mouseup', onMouseUp, false );
    document.removeEventListener( 'mouseout', onMouseUp, false );

    scope.dispatchEvent( endEvent );

    state = STATE.NONE;

  }

  function onMouseWheel( event ) {

    if ( scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE ) return;

    event.preventDefault();
    event.stopPropagation();

    handleMouseWheel( event );

    scope.dispatchEvent( startEvent ); // not sure why these are here...
    scope.dispatchEvent( endEvent );

  }

  function onKeyDown( event ) {

    if ( scope.enabled === false || scope.enableKeys === false || scope.enablePan === false ) return;

    handleKeyDown( event );

  }

  function onTouchStart( event ) {

    if ( scope.enabled === false ) return;

    switch ( event.touches.length ) {

      case 1:  // one-fingered touch: rotate

        // Leeft additions and modification
        const system = systemIndicated( event );

        if ( system ) {

          scope.startObject = system;
          scope.endObject = undefined;

          if ( scope.enableRouting === false ) return;

          state = STATE.DRAGROUTE;
        }
        else
        {

          if ( scope.enableRotate === false ) return;

          handleTouchStartRotate( event );

          state = STATE.TOUCH_ROTATE;

        }
        // End Leeft additions and modification

        break;

      case 2:  // two-fingered touch: dolly

        if ( scope.enableZoom === false ) return;

        handleTouchStartDolly( event );

        state = STATE.TOUCH_DOLLY;

        break;

      case 3: // three-fingered touch: pan

        if ( scope.enablePan === false ) return;

        handleTouchStartPan( event );

        state = STATE.TOUCH_PAN;

        break;

      // Leeft

      case 4: // four-fingered touch: pan

        if ( scope.enablePan === false ) return;

        handleTouchStartPan( event );

        state = STATE.TOUCH_PAN_XY;

        break;

      // End leeft

      default:

        state = STATE.NONE;

    }

    if ( state !== STATE.NONE ) {

      scope.dispatchEvent( startEvent );

    }

  }

  function onTouchMove( event ) {

    if ( scope.enabled === false ) return;

    event.preventDefault();
    event.stopPropagation();

    switch ( event.touches.length ) {

      case 1: // one-fingered touch: rotate

        // Leeft addition and modification

        if ( state === STATE.DRAGROUTE ) {

          if ( scope.enableRouting === false ) return;

          handleMouseMoveDrag( event );

        } else {

          if ( scope.enableRotate === false ) return;
          if ( state !== STATE.TOUCH_ROTATE ) return; // is this needed?...

          handleTouchMoveRotate( event );

          scope.map.syncCamera();

        }

        // End Leeft addition and modification

        break;

      case 2: // two-fingered touch: dolly

        if ( scope.enableZoom === false ) return;
        if ( state !== STATE.TOUCH_DOLLY ) return; // is this needed?...

        handleTouchMoveDolly( event );

        break;

      case 3: // three-fingered touch: pan

        if ( scope.enablePan === false ) return;
        if ( state !== STATE.TOUCH_PAN ) return; // is this needed?...

        handleTouchMovePan( event );

        break;

      // Leeft

      case 4: // four-fingered touch: pan

        if ( scope.enablePan === false ) return;
        if ( state !== STATE.TOUCH_PAN_XY ) return; // is this needed?...

        handleTouchMovePan( event );

        break;

      // End leeft

      default:

        state = STATE.NONE;

    }

  }

  function onTouchEnd( event ) {

    if ( scope.enabled === false ) return;

    handleTouchEnd( event );

    scope.dispatchEvent( endEvent );

    state = STATE.NONE;

  }

  function onContextMenu( event ) {

    event.preventDefault();

  }

  //

  scope.domElement.addEventListener( 'contextmenu', onContextMenu, false );

  scope.domElement.addEventListener( 'mousedown', onMouseDown, false );
  scope.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
  scope.domElement.addEventListener( 'MozMousePixelScroll', onMouseWheel, false ); // firefox

  scope.domElement.addEventListener( 'touchstart', onTouchStart, false );
  scope.domElement.addEventListener( 'touchend', onTouchEnd, false );
  scope.domElement.addEventListener( 'touchmove', onTouchMove, false );

  window.addEventListener( 'keydown', onKeyDown, false );

  // force an update at start

  this.update();

};

THREE.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;

Object.defineProperties( THREE.OrbitControls.prototype, {

  center: {

    get: function () {

      console.warn( 'THREE.OrbitControls: .center has been renamed to .target' );
      return this.target;

    }

  },

  // backward compatibility

  noZoom: {

    get: function () {

      console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
      return ! this.enableZoom;

    },

    set: function ( value ) {

      console.warn( 'THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.' );
      this.enableZoom = ! value;

    }

  },

  noRotate: {

    get: function () {

      console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
      return ! this.enableRotate;

    },

    set: function ( value ) {

      console.warn( 'THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.' );
      this.enableRotate = ! value;

    }

  },

  noPan: {

    get: function () {

      console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
      return ! this.enablePan;

    },

    set: function ( value ) {

      console.warn( 'THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.' );
      this.enablePan = ! value;

    }

  },

  noKeys: {

    get: function () {

      console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
      return ! this.enableKeys;

    },

    set: function ( value ) {

      console.warn( 'THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.' );
      this.enableKeys = ! value;

    }

  },

  staticMoving : {

    get: function () {

      console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
      return ! this.constraint.enableDamping;

    },

    set: function ( value ) {

      console.warn( 'THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.' );
      this.constraint.enableDamping = ! value;

    }

  },

  dynamicDampingFactor : {

    get: function () {

      console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
      return this.constraint.dampingFactor;

    },

    set: function ( value ) {

      console.warn( 'THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.' );
      this.constraint.dampingFactor = value;

    }

  }

} );

// Leeft additions, done here as far as possible to make OrbitControls updates easier
class OrbitControls extends THREE.OrbitControls {
  constructor ( renderer ) {
    // My own constructor takes different arguments, so make them compatible
    // without having to modify the base class
    super( renderer.camera, renderer.container );

    this.map = renderer.map;
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
        TAB: 9,
        ENTER: 13,
    };

    this.targetTween = undefined;
    this.rotationTween = undefined;
    this.enableRouting = true;
  }

  //this.cameraIsMoving = function cameraIsMoving() {
  //  return(
  //    (state.current === 'pan') ||
  //    (state.current === 'dolly') ||
  //    (state.current === 'rotate') ||
  //    (state.current === 'loading') ||
  //    !dollyStart.equals( dollyEnd ) ||
  //    isMoving
  //  );
  //}
}

export default OrbitControls;
