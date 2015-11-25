/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

import settings from './settings';
import { hasLocalStorage, hasSessionStorage } from './functions';

class Renderer {
  constructor () {
    this.map = map;

    this.composer = null;
    this.FXAA = null;
    this.camera = null;

    this.textureManager = new window.threeSpriteAtlasTextureManager(1024);

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.resize  = this._resize.bind( this );
    this.animate = this._animate.bind( this );
    this.render  = this._render.bind( this );

    this.dpr = 1;
    if ( window.devicePixelRatio !== undefined ) {
      this.dpr = window.devicePixelRatio;
    }

    let container = $('#sc-map-webgl-container')[0];

    this.camera = new THREE.PerspectiveCamera( 45, this.width / this.height, 10, 1600 );
    this.camera.position.copy( settings.camera.camera );
    this.camera.setViewOffset( this.width, this.height, -( $('#sc-map-interface .sc-map-ui-padding').width() / 2 ), 0, this.width, this.height );

    this.controls = new SCMAP.OrbitControls( this, container );
    this.controls.target.copy( settings.camera.target );
    this.controls.rotateSpeed = $('#sc-map-configuration').data('rotateSpeed');
    this.controls.zoomSpeed = $('#sc-map-configuration').data('zoomSpeed');
    this.controls.panSpeed = $('#sc-map-configuration').data('panSpeed');
    this.controls.noRotate = settings.control.rotationLocked;

    this.threeRenderer = new THREE.WebGLRenderer( { antialias: true } );
    if ( ! settings.effect.Antialias ) {
      this.threeRenderer.autoClear = false;
    }

    this.threeRenderer.setClearColor( 0x000000, 1 );
    this.threeRenderer.setSize( this.width, this.height );

    container.appendChild( this.threeRenderer.domElement );

    let renderer = this;

    // Stats

    this.stats = new Stats();
    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.top = '0px';
    this.stats.domElement.style.right = '0px';
    this.stats.domElement.style.display = 'none';
    this.stats.domElement.style.zIndex = '100';
    container.appendChild( this.stats.domElement );
    if ( settings.renderer.Stats ) {
      $('#stats').show();
    }

    if ( hasLocalStorage() ) {
      storage = window.localStorage;
    } else if ( hasSessionStorage() ) {
      storage = window.sessionStorage;
    }

    // Event handlers

    window.addEventListener( 'resize', this.resize, false );
    document.addEventListener( 'change', this.render, false );

    if ( ! settings.effect.Antialias )
    {
      let renderModel = new THREE.RenderPass( this.map.scene, this.camera );

      this.FXAA = new THREE.ShaderPass( THREE.FXAAShader );
      this.FXAA.uniforms.resolution.value.set( 1 / (this.width * this.dpr), 1 / (this.height * this.dpr) );
      this.FXAA.enabled = settings.effect.FXAA;

      let effectBloom = new THREE.BloomPass( 0.6 );
      effectBloom.enabled = settings.effect.Bloom;

      let effectCopy = new THREE.ShaderPass( THREE.CopyShader );
      effectCopy.renderToScreen = true;

      this.composer = new THREE.EffectComposer( this.threeRenderer );
      this.composer.setSize( this.width * this.dpr, this.height * this.dpr );
      this.composer.addPass( renderModel );
      this.composer.addPass( this.FXAA );
      this.composer.addPass( effectBloom );
      this.composer.addPass( effectCopy );
    }

    this.animate();
  }

  cameraRotationMatrix () {
    let euler = new THREE.Euler( this.camera.userData.phi + Math.PI / 2, this.camera.userData.theta, 0, 'YXZ' );
    return new THREE.Matrix4().makeRotationFromEuler( euler );
  }

  _resize () {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.setViewOffset( this.width, this.height, -( $('#sc-map-interface .sc-map-ui-padding').width() / 2 ), 0, this.width, this.height );
    this.camera.updateProjectionMatrix();

    if ( this.FXAA ) {
      this.FXAA.uniforms.resolution.value.set( 1 / (this.width * this.dpr), 1 / (this.height * this.dpr) );
    }

    this.threeRenderer.setSize( this.width, this.height );
    if ( this.composer ) {
      this.composer.reset();
    }

    window.ui.updateHeight();
  }

  _animate () {
    requestAnimationFrame( this.animate );
    TWEEN.update();
    this.controls.update();
    //if ( editor !== undefined ) {
    //   editor.update();
    //}
    this.map.animate();
    this.stats.update();
    this.render();
  }

  _render () {
    if ( this.composer ) {
      this.threeRenderer.clear();
      this.composer.render();
    } else {
      this.threeRenderer.render( this.map.scene, this.camera );
    }
  }
}

export default Renderer;
