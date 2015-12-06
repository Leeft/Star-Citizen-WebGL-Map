import Detector from './three/detector';
import UI from './scmap/ui';
import Map from './scmap/map';
import Renderer from './scmap/renderer';

import THREE from 'three';
import $ from 'jquery';

window.THREE = THREE;

let scene, map, ui, renderer;

// FIXME: does not belong here
$.fn.outerHtml = function() {
  return $('<div />').append(this.eq(0).clone()).html();
};

$( function() {

  if ( ! Detector.webgl ) {
    Detector.addGetWebGLMessage();
  }

  map      = new Map();
  renderer = new Renderer( map );
  ui       = new UI( map );
  scene    = map.scene;

  // Workaround for a Chrome (WebKit) issue where the
  // scrollable area can vanish when scrolling it
  if ( /webkit/i.test( navigator.userAgent ) ) {
    const elem = document.getElementById( 'sc-map-interface' );
    elem.addEventListener( 'scroll', function( event ) {
      const width = $('#sc-map-interface').width();
      $('#sc-map-interface').css( 'width', width + 0.1 );
    }, false );
  }

});

export { scene, map, ui, renderer };
