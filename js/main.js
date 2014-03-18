var effectFXAA, camera, scene, renderer, composer, map,
   shift, ctrl, alt, controls, editor, stats, displayState;

$(function() {
   $( "#map_ui" ).tabs({
      active: 0,
      activate: function( event, ui ) {
         event.preventDefault();
         var clicked_on = ui.newTab.find('a').attr('href');
         if ( clicked_on === '#editor' && map.canEdit ) {
            $('#webgl-container').removeClass().addClass( 'noselect webgl-container-edit' );
            window.editor.enabled = true;
            window.controls.requireAlt = true;
         } else {
            $('#webgl-container').removeClass().addClass( 'noselect webgl-container-noedit' );
            window.editor.enabled = false;
            window.controls.requireAlt = false;
            if ( clicked_on === '#info' && typeof map.selected !== 'undefined' && typeof map.selected.object !== 'undefined' ) {
               map.selected.object.system.displayInfo();
            }
         }
         $('#map_ui').data( 'jsp' ).reinitialise();
      }
   });

   /* jScrollPane */
   $('#map_ui').jScrollPane({ showArrows: true });

   if ( ! Detector.webgl ) {
      Detector.addGetWebGLMessage();
   }

   init();
   animate();
});

function init()
{
   var container, renderModel, effectCopy, effectBloom, width, height;

   container = document.createElement( 'div' );
   container.id = 'webgl-container';
   container.className = 'noselect webgl-container-noedit';
   document.body.appendChild( container );
   width = window.innerWidth || 2;
   height = window.innerHeight || 2;

   camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );

   camera.position.y = 80;
   camera.position.z = 100;
   camera.setViewOffset( width, height, 0, - ( height / 6 ), width, height );

   controls = new THREE.OrbitControls( camera, $('#webgl-container')[0] );
   controls.rotateSpeed = $('#gl-info').data('rotateSpeed');
   controls.zoomSpeed = $('#gl-info').data('zoomSpeed');
   controls.panSpeed = $('#gl-info').data('panSpeed');
   controls.noZoom = false;
   controls.noPan = false;
   controls.mapMode = true;
   controls.minDistance = 20;
   controls.maxDistance = 500;
   controls.keyPanSpeed = 25;
   controls.minPolarAngle = 0;
   controls.maxPolarAngle = THREE.Math.degToRad( 85 );
	controls.target = new THREE.Vector3( 0, 10, 0 );
   controls.addEventListener( 'change', render );

   scene = new THREE.Scene();

   renderer = new THREE.WebGLRenderer( { clearColor: 0x000000, clearAlpha: 1, antialias: true } );
   renderer.setSize( window.innerWidth, window.innerHeight );
   renderer.autoClear = false;
   container.appendChild( renderer.domElement );

   map = new SCMAP.Map( scene, SCMAP.data.map );

   editor = new SCMAP.Editor( map, camera );
   editor.panSpeed = 0.6;
   document.addEventListener( 'change', render );

   // Stats

   stats = new Stats();
   stats.domElement.style.position = 'absolute';
   stats.domElement.style.top = '0px';
   stats.domElement.style.right = '0px';
   stats.domElement.style.display = 'none';
   stats.domElement.style.zIndex = '100';
   container.appendChild( stats.domElement );

   // Event handlers

   window.addEventListener( 'resize', onWindowResize, false );

   renderer.domElement.addEventListener( 'mousedown', onDocumentMouseUpAndDown, false );
   renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUpAndDown, false );

   // Rendering

   renderModel = new THREE.RenderPass( scene, camera );
   //effectBloom = new THREE.BloomPass( 1.3 );
   effectCopy = new THREE.ShaderPass( THREE.CopyShader );
   effectCopy.renderToScreen = true;

   //effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
   //effectFXAA.uniforms[ 'resolution' ].value.set( 1 / width, 1 / height );

   composer = new THREE.EffectComposer( renderer );
   composer.addPass( renderModel );
   //composer.addPass( effectFXAA );
   //composer.addPass( effectBloom );
   composer.addPass( effectCopy );

   displayState = buildDisplayModeFSM( '3d' ); // TODO get current state for user on load

   $('#3d-mode').on( 'change', function() {
      if ( this.checked ) {
         displayState.thick();
      } else {
         displayState.thin();
      }
   });

   $('#lock-heading').on( 'change', function() {
      controls.lockHeading = this.checked;
   });
}

function buildCross () {
   var material = new THREE.MeshBasicMaterial( { wireframe: true, color: 0xFF0000, linewidth: 1 } );
   var group = new THREE.Object3D();
   var geo = new THREE.Geometry();
   geo.vertices.push( new THREE.Vector3( -50, 1, 0 ) );
   geo.vertices.push( new THREE.Vector3( 50, 1, 0 ) );
   var cross = new THREE.Line( geo, material );
   group.add( cross );
   geo = new THREE.Geometry();
   var material2 = new THREE.MeshBasicMaterial( { wireframe: true, color: 0xF0F000, linewidth: 1 } );
   geo.vertices.push( new THREE.Vector3( 0, 1, -50 ) );
   geo.vertices.push( new THREE.Vector3( 0, 1, 50 ) );
   cross = new THREE.Line( geo, material2 );
   group.add( cross );
   var material3 = new THREE.MeshBasicMaterial( { wireframe: true, color: 0x0000F0, linewidth: 1 } );
   geo = new THREE.Geometry();
   geo.vertices.push( new THREE.Vector3( 0, -50, 0 ) );
   geo.vertices.push( new THREE.Vector3( 0, 50, 0 ) );
   cross = new THREE.Line( geo, material3 );
   group.add( cross );
   return group;
}

function onWindowResize()
{
   var width = window.innerWidth || 2;
   var height = window.innerHeight || 2;
   camera.aspect = width / height;
   camera.setViewOffset( width, height, 0, - ( height / 8 ), width, height );
   camera.updateProjectionMatrix();

   renderer.setSize( window.innerWidth, window.innerHeight );

   //effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );

   composer.reset();
}

function onDocumentMouseUpAndDown( event )
{
   var vector, projector, raycaster, intersects, clickedOut;
   vector = new THREE.Vector3( (event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5 );
   projector = new THREE.Projector();
   projector.unprojectVector( vector, camera );
   raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
   intersects = raycaster.intersectObjects( map.interactables );
   map.handleSelection( event, intersects[0] );
}

function makeSafeForCSS( name ) {
   if ( typeof name !== 'string' ) {
      return;
   }
   return name.replace( /[^a-z0-9]/g, function(s) {
      var c = s.charCodeAt(0);
      if (c == 32) return '-';
      if (c >= 65 && c <= 90) return '_' + s.toLowerCase();
      return (c.toString(16)).slice(-4);
   });
}

function buildDisplayModeFSM ( initialState )
{
   var tweenTo2d, tweenTo3d, position, fsm;

   position = { x: 100 };

   tweenTo2d = new TWEEN.Tween( position )
      .to( { x: 0.5, rotate: 0 }, 2000 )
      .easing( TWEEN.Easing.Cubic.InOut )
      .onUpdate( function () {
            for ( var i = 0; i < scene.children.length; i++ ) {
               var child = scene.children[i];
               if ( child.system ) {
//child.system.rotateAroundAxis( new THREE.Vector3( 0, 1, 0 ), THREE.Math.degToRad( 45 ) );
                  var wantedY = child.system.position.y * ( this.x / 100 );
                  child.translateY( wantedY - child.position.y );
                  for ( var j = 0; j < child.system.routeObjects.length; j++ ) {
                     var routeObject = child.system.routeObjects[j];
                     routeObject.geometry.verticesNeedUpdate = true;
                  }
               }
            }
      } );

   tweenTo3d = new TWEEN.Tween( position )
      .to( { x: 100, rotate: 90 }, 2000 )
      .easing( TWEEN.Easing.Cubic.InOut )
      .onUpdate( function () {
            for ( var i = 0; i < scene.children.length; i++ ) {
               var child = scene.children[i];
               if ( child.system ) {
                  var wantedY = child.system.position.y * ( this.x / 100 );
                  child.translateY( wantedY - child.position.y );
                  for ( var j = 0; j < child.system.routeObjects.length; j++ ) {
                     var routeObject = child.system.routeObjects[j];
                     routeObject.geometry.verticesNeedUpdate = true;
                  }
               }
            }
      } );

   fsm = StateMachine.create({
      initial: initialState || '3d',

      events: [
         { name: 'thin',  from: '3d', to: '2d' },
         { name: 'thick', from: '2d', to: '3d' }
      ],

      callbacks: {
         onenter2d: function() {
            //tween.start();
            $('#3d-mode').prop( 'checked', false );
         },

         onenter3d: function() {
            //tweenBack.start();
            $('#3d-mode').prop( 'checked', true );
         },

         onleave2d: function() {
            tweenTo3d.onComplete( function() {
               fsm.transition();
            });
            tweenTo3d.start();
            return StateMachine.ASYNC; // tell StateMachine to defer next state until we call transition (in fadeOut callback above)
         },

         onleave3d: function() {
            tweenTo2d.onComplete( function() {
               fsm.transition();
            });
            tweenTo2d.start();
            return StateMachine.ASYNC; // tell StateMachine to defer next state until we call transition (in slideDown callback above)
         },

         error: function( eventName, from, to, args, errorCode, errorMessage ) {
            console.log( 'event ' + eventName + ' was naughty : ' + errorMessage );
         }
      }
   });

   return fsm;
}

//

function animate() {
   requestAnimationFrame( animate );
   if ( controls !== undefined ) {
      controls.update();
   }
   if ( editor !== undefined ) {
      editor.update();
   }
   stats.update();
   TWEEN.update();
   render();
}

function render() {
   map.animateSelector();

//var m = new THREE.Matrix4();
//m.extractRotation( camera.matrixWorldInverse );
//var v = new THREE.Vector3( 1, 0, 0 );
//v.applyMatrix4( m );
//var angle = Math.atan2( v.z, v.x );
//$('#debug-angle').html( 'Camera heading: ' + THREE.Math.radToDeg( angle ).toFixed(2) + '&deg; ' + angle.toFixed(3) );

//var m = new THREE.Matrix4();
//m.extractRotation( camera.matrixWorldInverse );
//var v = new THREE.Vector3( 0, 0, 1 );
//v.applyMatrix4( m );
//var angle = Math.atan2( v.z, v.y ) - 1.57079633;
//$('#debug-angle').html( 'Camera banking: ' + THREE.Math.radToDeg( angle ).toFixed(2) + '&deg; ' + angle.toFixed(3) );

   renderer.clear();
   composer.render();
}

// End of file

