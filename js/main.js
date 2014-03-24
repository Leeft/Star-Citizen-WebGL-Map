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
   var container, renderModel, effectCopy, effectBloom, width, height, i;

   if ( hasLocalStorage() ) {
      localStorage = window.localStorage;
   }

   dpr = 1;
   if ( window.devicePixelRatio !== undefined ) {
      dpr = window.devicePixelRatio;
   }

   container = document.createElement( 'div' );
   container.id = 'webgl-container';
   container.className = 'noselect webgl-container-noedit';
   document.body.appendChild( container );
   width = window.innerWidth || 2;
   height = window.innerHeight || 2;

   camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 10, 800 );

   camera.position.x = cameraDefaults.x;
   camera.position.y = cameraDefaults.y;
   camera.position.z = cameraDefaults.z;
   camera.setViewOffset( width, height, -( $('#map_ui').width() / 2 ), - ( height / 4 ), width, height );

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
   controls.maxDistance = 500;
   controls.keyPanSpeed = 25;
   controls.addEventListener( 'change', render );

   scene = new THREE.Scene();

   renderer = new THREE.WebGLRenderer( { clearColor: 0x000000, clearAlpha: 1, antialias: true } );
   renderer.setSize( window.innerWidth, window.innerHeight );
   renderer.autoClear = false;
   container.appendChild( renderer.domElement );

   map = new SCMAP.Map( scene, SCMAP.data.map );
   controls.map = map;

   var arr = []; for ( var system in SCMAP.data.systems ) { arr.push( system ); }
   var arr2 = arr.humanSort();
   for ( i = 0; i < arr2.length; i++ ) {
      system = SCMAP.data.systems[ arr[i] ];
      var $li = $('<li><a data-system="'+system.id+'" href="#system='+encodeURI(system.name)+'"><i class="fa-li fa fa-sm fa-crosshairs"></i>'+system.name+'</a></li>');
      $li.find('a').css( 'color', system.faction.color.getStyle() );
      $('#system-list ul').append( $li );
   }

   $('#system-list ul a').bind( 'click', function() {
      var $this = $(this);
      var system = SCMAP.System.getById( $this.data('system') );
      system.displayInfo();
      controls.moveTo( system );
   } );

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
   camera.setViewOffset( width, height, -( $('#map_ui').width() / 2 ), - ( height / 4 ), width, height );
   camera.updateProjectionMatrix();
   effectFXAA.uniforms.resolution.value.set( 1 / (width * dpr), 1 / (height * dpr) );
   renderer.setSize( width, height );
   composer.reset();
}

function onDocumentMouseUpAndDown( event ) {
   var vector, projector, raycaster, intersects, clickedOut;
   vector = new THREE.Vector3( (event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5 );
   projector = new THREE.Projector();
   projector.unprojectVector( vector, camera );
   raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
   intersects = raycaster.intersectObjects( map.interactables );
   map.handleSelection( event, intersects[0] );
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

   position = { x: ( initialState === '3d' ) ? 100 : 0.5 };

   tweenTo2d = new TWEEN.Tween( position )
      .to( { x: 0.5, rotate: 0 }, 1000 )
      .easing( TWEEN.Easing.Cubic.InOut )
      .onUpdate( function () {
            //var target = map.selectedTarget;
            //map.deselect();
            map._graph.destroyRoute();
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
            //map.updateRoute( target );
      } );

   tweenTo3d = new TWEEN.Tween( position )
      .to( { x: 100, rotate: 90 }, 1000 )
      .easing( TWEEN.Easing.Cubic.InOut )
      .onUpdate( function () {
            //var target = map.selectedTarget;
            //map.deselect();
            map._graph.destroyRoute();
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
            //map.updateRoute( target );
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

Array.prototype.humanSort = function( ) {
   return this.sort( function( a, b ) {
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
   });
};

// End of file

