var effectFXAA, camera, scene, renderer, composer, map, dpr,
   shift, ctrl, alt, controls, editor, stats, displayState,
   localStorage, cameraDefaults = {
      x: 0,
      y: 80,
      z: 100,
      target: new THREE.Vector3( 0, 10, 0 ),
      theta: 0,
      phi: THREE.Math.degToRad( 55.1 ),
      radius: 122.2
   };

$(function() {
   //$( "#map_ui menubar" ).on( 'click', function ( event ) { event.preventDefault(); } );
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
            if ( clicked_on === '#info' && map.selected() instanceof SCMAP.System ) {
               map.selected().displayInfo();
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
   var container, renderModel, effectCopy, effectBloom, width, height, i;

   if ( hasLocalStorage() ) {
      localStorage = window.localStorage;
   }

   dpr = 1;
   if ( window.devicePixelRatio !== undefined ) {
      dpr = window.devicePixelRatio;
   }

   SCMAP.settings.glow = ( localStorage && localStorage['settings.Glow'] === '0' ) ? false : true;
   SCMAP.settings.labels = ( localStorage && localStorage['settings.Labels'] === '0' ) ? false : true;
   SCMAP.settings.labelIcons = ( localStorage && localStorage['settings.LabelIcons'] === '0' ) ? false : true;
   $('#toggle-glow').prop( 'checked', SCMAP.settings.glow );
   $('#toggle-labels').prop( 'checked', SCMAP.settings.labels );
   $('#toggle-label-icons').prop( 'checked', SCMAP.settings.labelIcons );

   container = document.createElement( 'div' );
   container.id = 'webgl-container';
   container.className = 'noselect webgl-container-noedit';
   document.body.appendChild( container );
   width = window.innerWidth || 2;
   height = window.innerHeight || 2;

   camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 10, 1600 );

   camera.position.x = cameraDefaults.x;
   camera.position.y = cameraDefaults.y;
   camera.position.z = cameraDefaults.z;
   camera.setViewOffset( width, height, -( $('#map_ui').width() / 2 ), 0, width, height );

   controls = new THREE.OrbitControlsFSM( camera, $('#webgl-container')[0] );
	controls.target = cameraDefaults.target.clone();
   controls.restoreOldPosition();
   controls.minPolarAngle = 0;
   controls.maxPolarAngle = THREE.Math.degToRad( 85 );
   controls.rotateSpeed = $('#gl-info').data('rotateSpeed');
   controls.zoomSpeed = $('#gl-info').data('zoomSpeed');
   controls.panSpeed = $('#gl-info').data('panSpeed');
   controls.noZoom = false;
   controls.noPan = false;
   controls.mapMode = true;
   controls.minDistance = 20;
   controls.maxDistance = 800;
   controls.keyPanSpeed = 25;
   controls.addEventListener( 'change', render );

   scene = new THREE.Scene();

   renderer = new THREE.WebGLRenderer( { clearColor: 0x000000, clearAlpha: 1, antialias: true } );
   renderer.setSize( window.innerWidth, window.innerHeight );
   renderer.autoClear = false;
   container.appendChild( renderer.domElement );

   map = new SCMAP.Map( scene );
   controls.map = map;

   var arr = []; for ( var system in SCMAP.data.systems ) { arr.push( system ); }
   var arr2 = arr.sort( humanSort );
   var $li;
   for ( i = 0; i < arr2.length; i++ ) {
      system = SCMAP.data.systems[ arr[i] ];
      $li = $('<li><a data-system="'+system.id+'" href="#system='+encodeURI(system.name)+'"><i class="fa-li fa fa-sm fa-crosshairs"></i>'+system.name+'</a></li>');
      $li.find('a').css( 'color', system.faction.color.getStyle() );
      $('#system-list ul').append( $li );
   }

   $('#system-list ul a').bind( 'click', function() {
      var $this = $(this);
      var system = SCMAP.System.getById( $this.data('system') );
      system.displayInfo();
      controls.moveTo( system );
   } );

   for ( var icon in SCMAP.Symbols ) {
      icon = SCMAP.Symbols[ icon ];
      console.log( icon );
      $li = $('<li><i class="fa-li fa '+icon.faClass+'"></i>'+icon.description+'</li>' );
      $li.css( 'color', icon.color );
      $('#map_ui ul.legend').append( $li );
   }

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

   // Rendering

   renderModel = new THREE.RenderPass( scene, camera );
   effectBloom = new THREE.BloomPass( 0.75 );

   effectCopy = new THREE.ShaderPass( THREE.CopyShader );
   effectCopy.renderToScreen = true;

   effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
   effectFXAA.uniforms.resolution.value.set( 1 / (width * dpr), 1 / (height * dpr) );

   effectFXAA.enabled  = ( localStorage && localStorage['effect.FXAA'] === '1' ) ? true : false;
   effectBloom.enabled = ( localStorage && localStorage['effect.Bloom'] === '1' ) ? true : false;
   $('#toggle-fxaa').prop( 'checked', effectFXAA.enabled );
   $('#toggle-bloom').prop( 'checked', effectBloom.enabled );

   composer = new THREE.EffectComposer( renderer );
   composer.setSize( width * dpr, height * dpr );
   composer.addPass( renderModel );
   composer.addPass( effectFXAA );
   composer.addPass( effectBloom );
   composer.addPass( effectCopy );

   displayState = buildDisplayModeFSM( ( localStorage && localStorage.mode ) ? localStorage.mode : '2d' );
   $('#3d-mode').prop( 'checked', localStorage && localStorage.mode === '3d' );

//var smokeParticles = new THREE.Geometry();
//for (i = 0; i < 25; i++) {
//    var particle = new THREE.Vector3( Math.random() * 8, Math.random() * 10 + 5, Math.random() * 8 );
//    smokeParticles.vertices.push( particle );
//}
//var smokeTexture = THREE.ImageUtils.loadTexture('images/smoke.png');
//var smokeMaterial = new THREE.ParticleBasicMaterial({
//   map: smokeTexture,
//   transparent: true,
//   blending: THREE.AdditiveBlending,
//   size: 25,
//   color: 0x111111
//});
//
//var smoke = new THREE.ParticleSystem(smokeParticles, smokeMaterial);
//smoke.sortParticles = true;
//smoke.position.x = 10;
//
//scene.add(smoke);

   // Some simple UI stuff

   $('#lock-rotation').prop( 'checked', localStorage && localStorage['control.rotationLocked'] === '1' );
   controls.noRotate = localStorage && localStorage['control.rotationLocked'] === '1';

   $('#3d-mode').on( 'change', function() { if ( this.checked ) displayState.to3d(); else displayState.to2d(); });

   $('#lock-rotation').on( 'change', function() {
      controls.noRotate = this.checked;
      if ( localStorage ) { localStorage['control.rotationLocked'] = ( this.checked ) ? 1 : 0; }
   });
   $('#toggle-fxaa').on( 'change', function() {
      effectFXAA.enabled = this.checked;
      if ( localStorage ) { localStorage['effect.FXAA'] = ( this.checked ) ? 1 : 0; }
   });
   $('#toggle-bloom').on( 'change', function() {
      effectBloom.enabled = this.checked;
      if ( localStorage ) { localStorage['effect.Bloom'] = ( this.checked ) ? 1 : 0; }
   });

   $('#toggle-glow').on( 'change', function() {
      SCMAP.settings.glow = this.checked;
      map.updateSystems();
      if ( localStorage ) { localStorage['settings.Glow'] = ( this.checked ) ? 1 : 0; }
   });
   $('#toggle-labels').on( 'change', function() {
      SCMAP.settings.labels = this.checked;
      map.updateSystems();
      if ( localStorage ) { localStorage['settings.Labels'] = ( this.checked ) ? 1 : 0; }
   });
   $('#toggle-label-icons').on( 'change', function() {
      SCMAP.settings.labelIcons = this.checked;
      map.updateSystems();
      if ( localStorage ) { localStorage['settings.LabelIcons'] = ( this.checked ) ? 1 : 0; }
   });

   $('#resetCamera').on( 'click', function() {
      controls.cameraTo( cameraDefaults.target, cameraDefaults.theta, cameraDefaults.phi, cameraDefaults.radius );
   });
   $('#centreCamera').on( 'click', function() {
      controls.moveTo( cameraDefaults.target );
   });
   $('#northCamera').on( 'click', function() {
      controls.rotateTo( 0, undefined, undefined );
   });
   $('#topCamera').on( 'click', function() {
      controls.rotateTo( 0, 0, 180 );
   });
   $('#top2D').on( 'click', function() {
      controls.noRotate = true;
      $('#lock-rotation').prop( 'checked', true );
      displayState.to2d();
      controls.rotateTo( 0, 0, 180 );
   });
   $('.quick-button.with-checkbox').on( 'click', function ( event ) {
      var $this = $(this);
      $this.find('input[type=checkbox]').click();
   });
   $('#keyboard-shortcuts').on( 'click', function ( event ) {
      var $this = $(this);
      //$.toggle(!$('#keyboard-shortcuts dl').is(':visible')); // or:
      $('#keyboard-shortcuts dl').toggle();
      if ( $('#keyboard-shortcuts dl').is(':visible') ) {
         $('#keyboard-shortcuts > a > i').removeClass('fa-caret-right').addClass('fa-caret-down');
      } else {
         $('#keyboard-shortcuts > a > i').addClass('fa-caret-right').removeClass('fa-caret-down');
      }
   });

   $('#map_ui').on( 'click', "a[data-goto='system']", function() {
      var $this = $(this);
      var system = SCMAP.data.systemsById[ $this.data('system') ];
      system.displayInfo();
      controls.moveTo( system );
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
   var width = window.innerWidth || 2;
   var height = window.innerHeight || 2;
   camera.aspect = width / height;
   camera.setViewOffset( width, height, -( $('#map_ui').width() / 2 ), 0, width, height );
   camera.updateProjectionMatrix();
   effectFXAA.uniforms.resolution.value.set( 1 / (width * dpr), 1 / (height * dpr) );
   renderer.setSize( width, height );
   composer.reset();
}

function makeSafeForCSS( name ) {
   if ( typeof name !== 'string' ) {
      return;
   }
   return name.replace( /[^a-zA-Z0-9]/g, function(s) {
      var c = s.charCodeAt(0);
      if (c == 32) return '-';
      if (c >= 65 && c <= 90) return '_' + s.toLowerCase();
      return (c.toString(16)).slice(-4);
   });
}

function buildDisplayModeFSM ( initialState )
{
   var tweenTo2d, tweenTo3d, position, fsm;

   position = { y: ( initialState === '3d' ) ? 100 : 0.5 };

   tweenTo2d = new TWEEN.Tween( position )
      .to( { y: 0.5 }, 1000 )
      .easing( TWEEN.Easing.Cubic.InOut )
      .onUpdate( function () {
            map.destroyCurrentRoute(); // TODO: find a way to update
            for ( var i = 0; i < scene.children.length; i++ ) {
               var child = scene.children[i];
               if ( typeof child.scaleY === 'function' ) {
                  child.scaleY( this.y );
               }
            }
      } );

   tweenTo3d = new TWEEN.Tween( position )
      .to( { y: 100.0 }, 1000 )
      .easing( TWEEN.Easing.Cubic.InOut )
      .onUpdate( function () {
            map.destroyCurrentRoute(); // TODO: find a way to update
            for ( var i = 0; i < scene.children.length; i++ ) {
               var child = scene.children[i];
               if ( typeof child.scaleY === 'function' ) {
                  child.scaleY( this.y );
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
            if ( localStorage ) { localStorage.mode = '2d'; }
         },

         onenter3d: function() {
            $('#3d-mode').prop( 'checked', true );
            if ( localStorage ) { localStorage.mode = '3d'; }
         },

         onleave2d: function() {
            tweenTo3d.onComplete( function() {
               fsm.transition();
            });
            tweenTo3d.start();
            return StateMachine.ASYNC;
         },

         onleave3d: function() {
            tweenTo2d.onComplete( function() {
               fsm.transition();
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
   map.animateSelector();
   renderer.clear();
   composer.render();
}

function hasLocalStorage() {
   try {
      return 'localStorage' in window && window.localStorage !== null;
   } catch (e) {
      return false;
   }
}

jQuery.fn.outerHtml = function() {
     return jQuery('<div />').append(this.eq(0).clone()).html();
};

function humanSort( a, b ) {
   var x, cmp1, cmp2;
   var aa = a.split(/(\d+)/);
   var bb = b.split(/(\d+)/);

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

