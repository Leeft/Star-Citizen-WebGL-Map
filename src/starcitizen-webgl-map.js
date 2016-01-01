import Detector from './three/detector';
import UI from './scmap/ui';
import Map from './scmap/map';
import Renderer from './scmap/renderer';

import THREE from 'three';
window.THREE = THREE;

import jQuery from 'jquery';

let scene, map, ui, renderer;

jQuery( function() {

  if ( ! Detector.webgl ) {
    Detector.addGetWebGLMessage();
  }

  map      = new Map();
  renderer = new Renderer( map );
  ui       = new UI( map );
  scene    = map.scene;

  const animate = function () {
    requestAnimationFrame( animate );
    renderer.render();
  }

  animate();

});

export { scene, map, ui, renderer };
