var effectFXAA, camera, scene, renderer, composer, map, dpr,
   shift, ctrl, alt, controls, editor, stats, displayState, ui,
   storage;

$(function() {
   if ( ! Detector.webgl ) {
      Detector.addGetWebGLMessage();
   }

   init();
   animate();
});

function init()
{
   var container, renderModel, effectCopy, effectBloom;
   var width = window.innerWidth;
   var height = window.innerHeight;

   if ( hasLocalStorage() ) {
      storage = window.localStorage;
   }

   dpr = 1;
   if ( window.devicePixelRatio !== undefined ) {
      dpr = window.devicePixelRatio;
   }

   container = document.getElementById( 'webgl-container' );

   camera = new THREE.PerspectiveCamera( 45, width / height, 10, 1600 );
   camera.position.copy( SCMAP.settings.camera.camera );
   camera.setViewOffset( width, height, -( $('#map_ui').width() / 2 ), 0, width, height );

   controls = new SCMAP.OrbitControls( camera, container );
   controls.target.copy( SCMAP.settings.camera.target );
   controls.rotateSpeed = $('#gl-info').data('rotateSpeed');
   controls.zoomSpeed = $('#gl-info').data('zoomSpeed');
   controls.panSpeed = $('#gl-info').data('panSpeed');
   controls.addEventListener( 'change', render );
   controls.noRotate = SCMAP.settings.control.rotationLocked;

   scene = new THREE.Scene();

   renderer = new THREE.WebGLRenderer( { antialias: true } );
   if ( ! SCMAP.settings.effect.Antialias ) {
      renderer.autoClear = false;
   }
   renderer.setClearColor( 0x000000, 1 );
   renderer.setSize( window.innerWidth, window.innerHeight );

   container.appendChild( renderer.domElement );

   map = new SCMAP.Map( scene );
   map.populateScene();
   scene.add( map.buildReferenceGrid() );

   ui = new SCMAP.UI();

   // Stats

   stats = new Stats();
   stats.domElement.style.position = 'absolute';
   stats.domElement.style.top = '0px';
   stats.domElement.style.right = '0px';
   stats.domElement.style.display = 'none';
   stats.domElement.style.zIndex = '100';
   container.appendChild( stats.domElement );
   if ( SCMAP.settings.renderer.Stats ) {
      $('#stats').show();
   }

   // Event handlers

   window.addEventListener( 'resize', onWindowResize, false );
   document.addEventListener( 'change', render );

   // Rendering

   if ( ! SCMAP.settings.effect.Antialias )
   {
      renderModel = new THREE.RenderPass( scene, camera );

      effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
      effectFXAA.uniforms.resolution.value.set( 1 / (width * dpr), 1 / (height * dpr) );
      effectFXAA.enabled = SCMAP.settings.effect.FXAA;

      effectBloom = new THREE.BloomPass( 0.6 );
      effectBloom.enabled = SCMAP.settings.effect.Bloom;

      effectCopy = new THREE.ShaderPass( THREE.CopyShader );
      effectCopy.renderToScreen = true;

      composer = new THREE.EffectComposer( renderer );
      composer.setSize( width * dpr, height * dpr );
      composer.addPass( renderModel );
      composer.addPass( effectFXAA );
      composer.addPass( effectBloom );
      composer.addPass( effectCopy );
   }

   displayState = buildDisplayModeFSM( SCMAP.settings.mode );
}

function smokeTest () {
   var smokeParticles = new THREE.Geometry();
   for (i = 0; i < 25; i++) {
       var particle = new THREE.Vector3( Math.random() * 8, Math.random() * 10 + 5, Math.random() * 8 );
       smokeParticles.vertices.push( particle );
   }
   var smokeTexture = THREE.ImageUtils.loadTexture('images/smoke.png');
   var smokeMaterial = new THREE.ParticleBasicMaterial({
      map: smokeTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      size: 25,
      color: 0x111111
   });
   
   var smoke = new THREE.ParticleSystem(smokeParticles, smokeMaterial);
   smoke.sortParticles = true;
   smoke.position.x = 10;
   
   scene.add(smoke);
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

Object.values = function (obj ) {
    var vals = [];
    for ( var key in obj ) {
        if ( obj.hasOwnProperty(key) ) {
            vals.push( obj[key] );
        }
    }
    return vals;
};

function onWindowResize() {
   var width = window.innerWidth;
   var height = window.innerHeight;
   camera.aspect = width / height;
   camera.setViewOffset( width, height, -( $('#map_ui').width() / 2 ), 0, width, height );
   camera.updateProjectionMatrix();
   if ( effectFXAA ) {
      effectFXAA.uniforms.resolution.value.set( 1 / (width * dpr), 1 / (height * dpr) );
   }
   renderer.setSize( width, height );
   if ( composer ) {
      composer.reset();
   }
   $('#map_ui').data( 'jsp' ).reinitialise();
}

function buildDisplayModeFSM ( initialState )
{
   var tweenTo2d, tweenTo3d, position, fsm;

   position = { y: ( initialState === '3d' ) ? 100 : 0.5 };

   tweenTo2d = new TWEEN.Tween( position )
      .to( { y: 0.5 }, 1000 )
      .easing( TWEEN.Easing.Cubic.InOut )
      .onUpdate( function () {
         map.route().removeFromScene(); // TODO: find a way to animate
         for ( var i = 0; i < scene.children.length; i++ ) {
            var child = scene.children[i];
            if ( typeof child.userData.scaleY === 'function' ) {
               child.userData.scaleY( child, this.y );
            }
         }
      } );

   tweenTo3d = new TWEEN.Tween( position )
      .to( { y: 100.0 }, 1000 )
      .easing( TWEEN.Easing.Cubic.InOut )
      .onUpdate( function () {
         map.route().removeFromScene(); // TODO: find a way to animate
         for ( var i = 0; i < scene.children.length; i++ ) {
            var child = scene.children[i];
            if ( typeof child.userData.scaleY === 'function' ) {
               child.userData.scaleY( child, this.y );
            }
         }
      } );

   fsm = StateMachine.create({
      initial: initialState || '3d',

      events: [
         { name: 'to2d',  from: '3d', to: '2d' },
         { name: 'to3d', from: '2d', to: '3d' }
      ],

      callbacks: {
         onenter2d: function() {
            $('#3d-mode').prop( 'checked', false );
            if ( storage ) { storage.mode = '2d'; }
         },

         onenter3d: function() {
            $('#3d-mode').prop( 'checked', true );
            if ( storage ) { storage.mode = '3d'; }
         },

         onleave2d: function() {
            tweenTo3d.onComplete( function() {
               fsm.transition();
               map.route().update();
            });
            tweenTo3d.start();
            return StateMachine.ASYNC;
         },

         onleave3d: function() {
            tweenTo2d.onComplete( function() {
               fsm.transition();
               map.route().update();
            });
            tweenTo2d.start();
            return StateMachine.ASYNC;
         },
      },

      error: function( eventName, from, to, args, errorCode, errorMessage ) {
         console.log( 'event ' + eventName + ' was naughty : ' + errorMessage );
      }
   });

   return fsm;
}

//

function animate() {
   requestAnimationFrame( animate );
   TWEEN.update();
   if ( controls !== undefined ) {
      controls.update();
   }
   if ( editor !== undefined ) {
      editor.update();
   }
   stats.update();
   render();
}

function render() {

   if ( controls.cameraIsMoving() ) {
      scene.updateMatrixWorld();
      if ( window.jQuery && window.jQuery('#debug-camera-is-moving') ) {
         window.jQuery('#debug-camera-is-moving').text( 'Camera is moving' );
      }
      scene.traverse( function ( object ) {
         if ( object instanceof THREE.LOD ) {
            object.update( camera );
         }
         // Needed for the shader glow:
         //if ( object.userData.isGlow ) {
         //   object.material.uniforms.viewVector.value = new THREE.Vector3().subVectors( camera.position, object.parent.position );
         //}
      } );
   } else {
      if ( window.jQuery && window.jQuery('#debug-camera-is-moving') ) {
         window.jQuery('#debug-camera-is-moving').text( 'Camera is not moving' );
      }
   }

   map.animateSelector();

   if ( composer ) {
      renderer.clear();
      composer.render();
   } else {
      renderer.render( scene, camera );
   }
}

function hasLocalStorage() {
   try {
      return 'localStorage' in window && window.localStorage !== null;
   } catch(e) {
      return false;
   }
}

jQuery.fn.outerHtml = function() {
     return jQuery('<div />').append(this.eq(0).clone()).html();
};

String.prototype.toHMM = function () {
    var sec_num = parseInt(this, 10);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);

    //if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    var time    = hours+':'+minutes;
    return time;
};

Number.prototype.toHMM = function () {
    var sec_num = parseInt(this, 10);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);

    //if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    var time    = hours+':'+minutes;
    return time;
};

function humanSort( a, b ) {
   var x, cmp1, cmp2;
   var aa = a.name.split(/(\d+)/);
   var bb = b.name.split(/(\d+)/);

   for ( x = 0; x < Math.max( aa.length, bb.length ); x++ )
   {
      if ( aa[x] != bb[x] )
      {
         cmp1 = ( isNaN( parseInt( aa[x], 10 ) ) ) ? aa[x] : parseInt( aa[x], 10 );
         cmp2 = ( isNaN( parseInt( bb[x], 10 ) ) ) ? bb[x] : parseInt( bb[x], 10 );

         if ( cmp1 === undefined || cmp2 === undefined ) {
            return aa.length - bb.length;
         } else {
            return ( cmp1 < cmp2 ) ? -1 : 1;
         }
      }
   }

   return 0;
}

// End of file
