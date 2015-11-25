import UI from './scmap/ui';
import Map from './scmap/map';
import Renderer from './scmap/renderer';
import { hasLocalStorage, hasSessionStorage } from './scmap/functions';

let scene, map, ui, storage, renderer;

$( function() {

  if ( ! Detector.webgl ) {
    Detector.addGetWebGLMessage();
  }

  if ( hasLocalStorage() ) {
    storage = window.localStorage;
  } else if ( hasSessionStorage() ) {
    storage = window.sessionStorage;
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

Object.values = function (obj ) {
  let vals = [];
  for ( let key in obj ) {
    if ( obj.hasOwnProperty(key) ) {
      vals.push( obj[key] );
    }
  }
  return vals;
};

jQuery.fn.outerHtml = function() {
  return jQuery('<div />').append(this.eq(0).clone()).html();
};

String.prototype.toHMM = function () {
  let sec_num = parseInt(this, 10);
  let hours   = Math.floor(sec_num / 3600);
  let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  if (minutes < 10) { minutes = '0' + minutes; }
  let time    = hours + ':' + minutes;
  return time;
};

Number.prototype.toHMM = function () {
  let sec_num = parseInt(this, 10);
  let hours   = Math.floor(sec_num / 3600);
  let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  if (minutes < 10) { minutes = '0' + minutes; }
  let time    = hours + ':' + minutes;
  return time;
};

export { scene, map, ui, storage, renderer };
