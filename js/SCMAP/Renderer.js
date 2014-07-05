/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

SCMAP.Renderer = function ( map ) {
   this.map = map;

   this.composer = null;
   this.FXAA = null;
   this.camera = null;
   
   this.width = window.innerWidth;
   this.height = window.innerHeight;

   this.resize  = this._resize.bind( this );
   this.animate = this._animate.bind( this );
   this.render  = this._render.bind( this );

   this.dpr = 1;
   if ( window.devicePixelRatio !== undefined ) {
      this.dpr = window.devicePixelRatio;
   }

   var container = $('#sc-map-webgl-container')[0];

   this.camera = new THREE.PerspectiveCamera( 45, this.width / this.height, 10, 1600 );
   this.camera.position.copy( SCMAP.settings.camera.camera );
   this.camera.setViewOffset( this.width, this.height, -( $('#sc-map-interface').width() / 2 ), 0, this.width, this.height );

   this.controls = new SCMAP.OrbitControls( this, container );
   this.controls.target.copy( SCMAP.settings.camera.target );
   this.controls.rotateSpeed = $('#sc-map-configuration').data('rotateSpeed');
   this.controls.zoomSpeed = $('#sc-map-configuration').data('zoomSpeed');
   this.controls.panSpeed = $('#sc-map-configuration').data('panSpeed');
   this.controls.noRotate = SCMAP.settings.control.rotationLocked;

   this.threeRenderer = new THREE.WebGLRenderer( { antialias: true } );
   if ( ! SCMAP.settings.effect.Antialias ) {
      this.threeRenderer.autoClear = false;
   }
   this.threeRenderer.setClearColor( 0x000000, 1 );
   this.threeRenderer.setSize( this.width, this.height );

   container.appendChild( this.threeRenderer.domElement );

   var renderer = this;

   // Stats

   this.stats = new Stats();
   this.stats.domElement.style.position = 'absolute';
   this.stats.domElement.style.top = '0px';
   this.stats.domElement.style.right = '0px';
   this.stats.domElement.style.display = 'none';
   this.stats.domElement.style.zIndex = '100';
   container.appendChild( this.stats.domElement );
   if ( SCMAP.settings.renderer.Stats ) {
      $('#stats').show();
   }

   if ( hasLocalStorage() ) {
      storage = window.localStorage;
   }

   // Event handlers

   window.addEventListener( 'resize', this.resize, false );
   document.addEventListener( 'change', this.render, false );

   if ( ! SCMAP.settings.effect.Antialias )
   {
      var renderModel = new THREE.RenderPass( this.map.scene, this.camera );

      this.FXAA = new THREE.ShaderPass( THREE.FXAAShader );
      this.FXAA.uniforms.resolution.value.set( 1 / (this.width * this.dpr), 1 / (this.height * this.dpr) );
      this.FXAA.enabled = SCMAP.settings.effect.FXAA;

      var effectBloom = new THREE.BloomPass( 0.6 );
      effectBloom.enabled = SCMAP.settings.effect.Bloom;

      var effectCopy = new THREE.ShaderPass( THREE.CopyShader );
      effectCopy.renderToScreen = true;

      this.composer = new THREE.EffectComposer( this.threeRenderer );
      this.composer.setSize( this.width * this.dpr, this.height * this.dpr );
      this.composer.addPass( renderModel );
      this.composer.addPass( this.FXAA );
      this.composer.addPass( effectBloom );
      this.composer.addPass( effectCopy );
   }

   this.animate();
};

SCMAP.Renderer.prototype = {
   constructor: SCMAP.Renderer,

   _resize: function _resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.camera.aspect = this.width / this.height;
      this.camera.setViewOffset( this.width, this.height, -( $('#sc-map-interface').width() / 2 ), 0, this.width, this.height );
      this.camera.updateProjectionMatrix();

      if ( this.FXAA ) {
         this.FXAA.uniforms.resolution.value.set( 1 / (this.width * this.dpr), 1 / (this.height * this.dpr) );
      }

      this.threeRenderer.setSize( this.width, this.height );
      if ( this.composer ) {
         this.composer.reset();
      }
      //$('#sc-map-interface').data( 'jsp' ).reinitialise();
   },

   _animate: function _animate() {
      requestAnimationFrame( this.animate );
      TWEEN.update();
      this.controls.update();
      //if ( editor !== undefined ) {
      //   editor.update();
      //}
      this.map.animate();
      this.stats.update();
      this.render();
   },

   _render: function _render() {
      if ( this.controls.cameraIsMoving() ) {
         this.map.scene.updateMatrixWorld();
         if ( $('#debug-camera-is-moving') ) {
            $('#debug-camera-is-moving').text( 'Camera is moving' );
         }
         var camera = this.camera;
         this.map.scene.traverse( function ( object ) {
            if ( object instanceof THREE.LOD ) {
               object.update( camera );
            }
            // Needed for the shader glow:
            //if ( object.userData.isGlow ) {
            //   object.material.uniforms.viewVector.value = new THREE.Vector3().subVectors( camera.position, object.parent.position );
            //}
         } );
      } else {
         if ( $('#debug-camera-is-moving') ) {
            $('#debug-camera-is-moving').text( 'Camera is not moving' );
         }
      }

      if ( this.composer ) {
         this.threeRenderer.clear();
         this.composer.render();
      } else {
         this.threeRenderer.render( this.map.scene, this.camera );
      }
   }
};

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

//

// End of file
