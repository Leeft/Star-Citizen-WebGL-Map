/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

import config from './config';
import settings from './settings';
import OrbitControls from './orbit-controls';
import UI from './ui';
import { PerspectiveCamera, WebGLRenderer, Euler, Matrix4 } from './three';
import { degToRad } from './three/math';

import TextureManager from 'leeft/three-sprite-texture-atlas-manager';
import TWEEN from 'tween.js';
import Stats from 'stats.js';

class Renderer {
  constructor ( map ) {
    this.map = map;

    this.composer = null;
    this.FXAA = null;
    this.camera = null;

    if ( config.debug ) {
      console.info( 'Additional debugging enabled' );
    }

    if ( config.quality === 'low' ) {
      console.info( 'Low quality mode enabled' );
    }

    this.textureManager = new TextureManager( ( config.quality === 'low' ) ? 1024 : 2048 );
    //this.textureManager.debug = ( config.debug ) ? true : false;

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.dpr = 1;
    if ( window.devicePixelRatio !== undefined ) {
      this.dpr = window.devicePixelRatio;
    }

    this.container = document.getElementById('sc-map-webgl-container');

    this.camera = new PerspectiveCamera( 45, this.width / this.height, 10, 1600 );
    this.camera.position.copy( settings.camera.camera );
    this.camera.setViewOffset( this.width, this.height, -( UI.sidePanelWidth() / 2 ), 0, this.width, this.height );

    this.controls = new OrbitControls( this );
    this.controls.target.copy( settings.camera.target );
    this.controls.rotateSpeed = config.rotateSpeed;
    this.controls.zoomSpeed = config.zoomSpeed;
    this.controls.panSpeed = config.panSpeed;
    this.controls.enableRotate = ! settings.control.rotationLocked;
    this.controls.enableDamping = true;
    this.controls.damingFactor = 0.5;
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = degToRad( 85 );
    this.controls.minDistance = 20;
    this.controls.maxDistance = 800;
    this.controls.keyPanSpeed = 40;

    this.threeRenderer = new WebGLRenderer( { antialias: ( config.quality !== 'low' ) } );
    this.threeRenderer.shadowMap.enabled = false;

    if ( config.debug ) {
      console.info( `SCMAP renderer:`, this );
      console.info( `THREE renderer:`, this.threeRenderer );
    }

    if ( ! settings.effect.Antialias ) {
      this.threeRenderer.autoClear = false;
    }

    this.threeRenderer.setClearColor( 0x000000, 1 );
    this.threeRenderer.setSize( this.width, this.height );

    this.container.appendChild( this.threeRenderer.domElement );

    // Stats

    this.stats = new Stats();

    // Event handlers

    window.addEventListener( 'resize', this.resize.bind(this), false );
    document.addEventListener( 'change', this.render.bind(this), false );

    // FIXME: Bring in these classes again, re-enable the feature?
    //if ( ! settings.effect.Antialias )
    //{
    //  let renderModel = new THREE.RenderPass( map.scene, this.camera );

    //  this.FXAA = new THREE.ShaderPass( THREE.FXAAShader );
    //  this.FXAA.uniforms.resolution.value.set( 1 / (this.width * this.dpr), 1 / (this.height * this.dpr) );
    //  this.FXAA.enabled = settings.effect.FXAA;

    //  let effectBloom = new THREE.BloomPass( 0.6 );
    //  effectBloom.enabled = settings.effect.Bloom;

    //  let effectCopy = new THREE.ShaderPass( THREE.CopyShader );
    //  effectCopy.renderToScreen = true;

    //  this.composer = new THREE.EffectComposer( this.threeRenderer );
    //  this.composer.setSize( this.width * this.dpr, this.height * this.dpr );
    //  this.composer.addPass( renderModel );
    //  this.composer.addPass( this.FXAA );
    //  this.composer.addPass( effectBloom );
    //  this.composer.addPass( effectCopy );
    //}
  }

  get stats () {
    return this._stats;
  }

  set stats ( stats ) {
    this._stats = stats;
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    stats.domElement.style.right = '0px';
    stats.domElement.style.display = ( settings.renderer.Stats ) ? 'block' : 'none';
    stats.domElement.style.zIndex = '100';
    this.container.appendChild( stats.domElement );
  }


  cameraRotationMatrix () {
    let euler = new Euler( this.controls.getPolarAngle() + Math.PI / 2, this.controls.getAzimuthalAngle(), 0, 'YXZ' );
    return new Matrix4().makeRotationFromEuler( euler );
  }

  resize () {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.setViewOffset( this.width, this.height, -( UI.sidePanelWidth() / 2 ), 0, this.width, this.height );
    this.camera.updateProjectionMatrix();

    if ( this.FXAA ) {
      this.FXAA.uniforms.resolution.value.set( 1 / (this.width * this.dpr), 1 / (this.height * this.dpr) );
    }

    this.threeRenderer.setSize( this.width, this.height );

    if ( this.composer ) {
      this.composer.reset();
    }

    UI.jScrollPane().reinitialise();
  }

  render () {
    this.controls.update();
    this.map.animate();

    TWEEN.update();

    if ( config.debug ) {
      UI.debugRenderer( this.threeRenderer.info );
    }

    this.stats.update();

    if ( this.composer ) {
      this.threeRenderer.clear();
      this.composer.render();
    } else {
      this.threeRenderer.render( this.map.scene, this.camera );
    }
  }
}

export default Renderer;
