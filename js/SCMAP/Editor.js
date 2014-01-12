/**
 * @author Leeft / https://github.com/Leeft
 */
/* Used OrbitControls.js as a template - But it doesn't do the same thing! */
/*global THREE, console, window */

SCMAP.Editor = function ( map, camera, domElement ) {

   this.map = map;
   this.camera = camera; // used to find our directions
   this.domElement = ( domElement !== undefined ) ? domElement : document;

   ///////////
   // API

   // Set to true to enable the editor while in edit mode
   this.enabled = false;

   ////////////
   // internals

   var scope = this;

   var moveStart = new THREE.Vector2();
   var moveEnd   = new THREE.Vector2();
   var moveDelta = new THREE.Vector2();

   var move = new THREE.Vector3();

   var lastPosition = new THREE.Vector3();

   var STATE = { NONE : -1, MOVE_XZ : 0, MOVE_Y : 1 };
   var state = STATE.NONE;

   // events

   var changeEvent = { type: 'change' };

   // pass in distance in world space to move left
   this.moveLeft = function ( distance ) {
      var sameLevelTarget = window.controls.target.clone().setY( this.camera.position.y );
      var vectorBack = this.camera.position.clone().sub( sameLevelTarget ).negate().setLength( distance );
      var axis = new THREE.Vector3( 0, 1, 0 );
      vectorBack.applyAxisAngle( axis, THREE.Math.degToRad( 90 ) );
      move.add( vectorBack );
   };

   // pass in distance in world space to move up
   this.moveUp = function ( distance ) {
      var moveOffset = new THREE.Vector3();
      var te = this.map.selected.object.matrix.elements;
      // get Y column of matrix
      moveOffset.set( te[4], te[5], te[6] );
      moveOffset.multiplyScalar(distance);
      move.add( moveOffset );
   };

   // pass in distance in world space to move forward
   this.moveBack = function ( distance ) {
      var sameLevelTarget = window.controls.target.clone().setY( this.camera.position.y );
      var vectorBack = this.camera.position.clone().sub( sameLevelTarget ).negate().setLength( distance );
      move.add( vectorBack );
   };

   // main entry point; pass in Vector2 of change desired in pixel space,
   // right and down are positive
   this.move = function ( delta ) {
      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
      var offset = scope.map.selected.object.position.clone().sub( scope.camera.position );
      var targetDistance = offset.length();

      // half of the fov is center to top of screen
      targetDistance *= Math.tan( (scope.camera.fov/2) * Math.PI / 180.0 );
      // we actually don't use screenWidth, since perspective camera is fixed to screen height
      if ( state === STATE.MOVE_Y ) {
         scope.moveUp( 2 * delta.y * targetDistance / element.clientHeight );
      } else {
         scope.moveLeft( 2 * delta.x * targetDistance / element.clientHeight );
         scope.moveBack( 2 * delta.y * targetDistance / element.clientHeight );
      }
      //if ( this.mapMode ) {
      //} else {
         //scope.moveUp( 2 * delta.y * targetDistance / element.clientHeight );
      //}
   };

   this.update = function () {
      if ( scope.enabled === false ) { return; }
      if ( this.map.selected === undefined ) { return; }

      // move target to new location
      this.map.selected.object.position.sub( move );
      if ( this.map.selected.object.system.labelObject !== undefined ) {
         this.map.selected.object.system.labelObject.position.sub( move );
      }
      for ( var i = 0; i < this.map.selected.object.system.routeObjects.length; i++ ) {
         var routeObject = this.map.selected.object.system.routeObjects[i];
         routeObject.geometry.verticesNeedUpdate = true;
      }
      //for ( var i = 0; i < this.map.selected.object.system.jumppoints.length; i++ ) {
      //   var destination = this.map.selected.object.system.jumppoints[i].destination;
      //   for ( var i = 0; i < destination.routeObjects.length; i++ ) {
      //      var routeObject = destination.routeObjects[i];
      //      routeObject.geometry.verticesNeedUpdate = true;
      //   }
      //}

      move.set( 0, 0, 0 );

      if ( lastPosition.distanceTo( this.map.selected.object.position ) > 0 ) {
         this.dispatchEvent( changeEvent );
         lastPosition.copy( this.map.selected.object.position );
      }
   };

   function onMouseDown( event ) {
      if ( scope.enabled === false ) { return; }
      if ( scope.map.selected === undefined ) return;
      if ( event.altKey ) { return; }

      event.preventDefault();

      if ( event.button === 0 ) {
         state = STATE.MOVE_XZ;
      } else if ( event.button === 2 ) {
         state = STATE.MOVE_Y;
      }

      moveStart.set( event.clientX, event.clientY );

      scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
      scope.domElement.addEventListener( 'mouseup', onMouseUp, false );
   }

   function onMouseMove( event ) {
      if ( scope.enabled === false ) return;
      if ( scope.map.selected === undefined ) return;
      if ( event.altKey ) { return; }

      event.preventDefault();

      if ( state === STATE.MOVE_XZ || state === STATE.MOVE_Y ) {
         moveEnd.set( event.clientX, event.clientY );
         moveDelta.subVectors( moveEnd, moveStart );
         scope.move( moveDelta );
         moveStart.copy( moveEnd );
      }

      scope.update();

   }

   function onMouseUp( event ) {
      if ( scope.enabled === false ) return;
      if ( event.altKey ) { return; }

      scope.domElement.removeEventListener( 'mousemove', onMouseMove, false );
      scope.domElement.removeEventListener( 'mouseup', onMouseUp, false );

      state = STATE.NONE;
   }

   this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
   this.domElement.addEventListener( 'mousedown', onMouseDown, false );
};

SCMAP.Editor.prototype = Object.create( THREE.EventDispatcher.prototype );
