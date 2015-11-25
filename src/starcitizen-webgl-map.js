var scene, map, ui, storage, renderer;

$(function() {
   if ( ! Detector.webgl ) {
      Detector.addGetWebGLMessage();
   }

   if ( hasLocalStorage() ) {
      storage = window.localStorage;
   }

   map      = new SCMAP.Map();
   renderer = new SCMAP.Renderer( map );
   ui       = new SCMAP.UI( map );
   scene    = map.scene;

   // Workaround for a Chrome (WebKit) issue where the
   // scrollable area can vanish when scrolling it
   if ( /webkit/i.test( navigator.userAgent ) ) {
      var elem = document.getElementById( 'sc-map-interface' );
      elem.addEventListener( 'scroll', function( event ) {
         var width = $('#sc-map-interface').width();
         $('#sc-map-interface').css( 'width', width + 0.1 );
      }, false );
   }

});

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

function hasLocalStorage() {
   try {
      return 'localStorage' in window && window.localStorage !== null;
   } catch(e) {
      return false;
   }
}

function hasSessionStorage() {
   try {
      return 'sessionStorage' in window && window.sessionStorage !== null;
   } catch(e) {
      return false;
   }
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

jQuery.fn.outerHtml = function() {
     return jQuery('<div />').append(this.eq(0).clone()).html();
};

String.prototype.toHMM = function () {
    var sec_num = parseInt(this, 10);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    if (minutes < 10) {minutes = "0"+minutes;}
    var time    = hours+':'+minutes;
    return time;
};

Number.prototype.toHMM = function () {
    var sec_num = parseInt(this, 10);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
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
