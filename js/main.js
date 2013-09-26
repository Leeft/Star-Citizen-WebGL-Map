if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var effectFXAA, camera, scene, renderer, composer, map,
   shift, ctrl, alt,

targetCross, fooCross,

   // some flavor text, not got the proper content yet
    rikerIndex = 0, rikerIpsum = [
   "What? We're not at all alike! For an android with no feelings, he sure managed to evoke them in others. I've had twelve years to think about it. And if I had it to do over again, I would have grabbed the phaser and pointed it at you instead of them. Did you come here for something in particular or just general Riker-bashing? Flair is what marks the difference between artistry and mere competence. I guess it's better to be lucky than good. When has justice ever been as simple as a rule book? Worf, It's better than music. It's jazz. We have a saboteur aboard.",
   "They were just sucked into space. Fear is the true enemy, the only enemy. I've had twelve years to think about it. And if I had it to do over again, I would have grabbed the phaser and pointed it at you instead of them. Maybe if we felt any human loss as keenly as we feel one of those close to us, human history would be far less bloody. Yesterday I did not know how to eat gagh. Mr. Worf, you sound like a man who's asking his friend if he can start dating his sister. Wait a minute - you've been declared dead. You can't give orders around here.",
   "I think you've let your personal feelings cloud your judgement. The look in your eyes, I recognize it. You used to have it for me. Commander William Riker of the Starship Enterprise. I guess it's better to be lucky than good. Our neural pathways have become accustomed to your sensory input patterns.",
   "We know you're dealing in stolen ore. But I wanna talk about the assassination attempt on Lieutenant Worf. Could someone survive inside a transporter buffer for 75 years? Why don't we just give everybody a promotion and call it a night - 'Commander'? Damage report! I can't. As much as I care about you, my first duty is to the ship. What? We're not at all alike! This should be interesting. Your head is not an artifact! Worf, It's better than music. It's jazz. Congratulations - you just destroyed the Enterprise. Our neural pathways have become accustomed to your sensory input patterns. What's a knock-out like you doing in a computer-generated gin joint like this? Captain, why are we out here chasing comets?"
];

$(function() {
   $( "#map_ui" ).tabs({ active: 0 });
});

init();
animate();

function init()
{
   var container, renderModel, effectCopy, effectBloom, width, height;

   container = document.createElement( 'div' );
   container.className = 'webgl-container';
   document.body.appendChild( container );
   width = window.innerWidth || 2;
   height = window.innerHeight || 2;

   camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );

   camera.position.y = 300;
   camera.position.z = 500;
   camera.setViewOffset( width, height, 0, - ( height / 8 ), width, height );

   controls = new THREE.OrbitControls( camera );
   controls.rotateSpeed = 0.4;
   controls.zoomSpeed = 1.0;
   controls.panSpeed = 0.6;
   controls.noZoom = false;
   controls.noPan = false;
   controls.noRoll = false;
   controls.mapMode = true;
   controls.minDistance = 200;
   controls.maxDistance = 1500;
   controls.keyPanSpeed = 25;
   //controls.staticMoving = true;

   controls.minPolarAngle = 0;
   controls.maxPolarAngle = THREE.Math.degToRad( 85 );

   controls.dynamicDampingFactor = 0.5;
   controls.addEventListener( 'change', render );

   scene = new THREE.Scene();

   renderer = new THREE.WebGLRenderer( { clearColor: 0x000000, clearAlpha: 1, antialias: true } );
   renderer.setSize( window.innerWidth, window.innerHeight );
   renderer.autoClear = false;
   container.appendChild( renderer.domElement );

   map = new SCMAP.Map( scene, sc_map );

//targetCross = buildCross();
//window.scene.add( targetCross );
//objectCross = buildCross();
//window.scene.add( objectCross );
//ref1Cross = buildCross();
//window.scene.add( ref1Cross );
//ref2Cross = buildCross();
//window.scene.add( ref2Cross );

   // Stats

   stats = new Stats();
   stats.domElement.style.position = 'absolute';
   stats.domElement.style.top = '0px';
   stats.domElement.style.right = '0px';
   stats.domElement.style.display = 'none';
   container.appendChild( stats.domElement );

   // Event handlers

   window.addEventListener( 'resize', onWindowResize, false );

   renderer.domElement.addEventListener( 'mousedown', onDocumentMouseUpAndDown, false );
   renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUpAndDown, false );

   // Rendering

   renderModel = new THREE.RenderPass( scene, camera );
   //effectBloom = new THREE.BloomPass( 1.3 );
   effectCopy = new THREE.ShaderPass( THREE.CopyShader );
   effectCopy.renderToScreen = true;

   //effectFXAA = new THREE.ShaderPass( THREE.FXAAShader );
   //effectFXAA.uniforms[ 'resolution' ].value.set( 1 / width, 1 / height );

   composer = new THREE.EffectComposer( renderer );
   composer.addPass( renderModel );
   //composer.addPass( effectFXAA );
   //composer.addPass( effectBloom );
   composer.addPass( effectCopy );
}

function buildCross () {
   var material = new THREE.MeshBasicMaterial( { wireframe: true, color: 0xFF0000, linewidth: 1 } );
   var group = new THREE.Object3D();
   var geo = new THREE.Geometry();
   geo.vertices.push( new THREE.Vector3( -50, 1, 0 ) );
   geo.vertices.push( new THREE.Vector3( 50, 1, 0 ) );
   var cross = new THREE.Line( geo, material );
   group.add( cross );
   var geo = new THREE.Geometry();
   var material2 = new THREE.MeshBasicMaterial( { wireframe: true, color: 0xF0F000, linewidth: 1 } );
   geo.vertices.push( new THREE.Vector3( 0, 1, -50 ) );
   geo.vertices.push( new THREE.Vector3( 0, 1, 50 ) );
   var cross = new THREE.Line( geo, material2 );
   group.add( cross );
   var material3 = new THREE.MeshBasicMaterial( { wireframe: true, color: 0x0000F0, linewidth: 1 } );
   var geo = new THREE.Geometry();
   geo.vertices.push( new THREE.Vector3( 0, -50, 0 ) );
   geo.vertices.push( new THREE.Vector3( 0, 50, 0 ) );
   var cross = new THREE.Line( geo, material3 );
   group.add( cross );
   return group;
}

function onWindowResize()
{
   var width = window.innerWidth || 2;
   var height = window.innerHeight || 2;
   camera.aspect = width / height;
   camera.setViewOffset( width, height, 0, - ( height / 8 ), width, height );
   camera.updateProjectionMatrix();

   renderer.setSize( window.innerWidth, window.innerHeight );

   //effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );

   composer.reset();
}

function onDocumentMouseUpAndDown( event )
{
   var vector, projector, raycaster, intersects, clickedOut;
   vector = new THREE.Vector3( (event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5 );
   projector = new THREE.Projector();
   projector.unprojectVector( vector, camera );
   raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
   intersects = raycaster.intersectObjects( map.interactables );
   map.handleSelection( event, intersects[0] );
}

function makeSafeForCSS( name ) {
   return name.replace( /[^a-z0-9]/g, function(s) {
      var c = s.charCodeAt(0);
      if (c == 32) return '-';
      if (c >= 65 && c <= 90) return '_' + s.toLowerCase();
      return (c.toString(16)).slice(-4);
   });
}

//

function animate() {
   requestAnimationFrame( animate );
   if ( controls !== undefined ) {
      controls.update();
   }
   stats.update();
   render();
}

function render() {
   map.animateSelector();

//var m = new THREE.Matrix4();
//m.extractRotation( camera.matrixWorldInverse );
//var v = new THREE.Vector3( 1, 0, 0 );
//v.applyMatrix4( m );
//var angle = Math.atan2( v.z, v.x );
//$('#debug-angle').html( 'Camera heading: ' + THREE.Math.radToDeg( angle ).toFixed(2) + '&deg; ' + angle.toFixed(3) );

//var m = new THREE.Matrix4();
//m.extractRotation( camera.matrixWorldInverse );
//var v = new THREE.Vector3( 0, 0, 1 );
//v.applyMatrix4( m );
//var angle = Math.atan2( v.z, v.y ) - 1.57079633;
//$('#debug-angle').html( 'Camera banking: ' + THREE.Math.radToDeg( angle ).toFixed(2) + '&deg; ' + angle.toFixed(3) );

   renderer.clear();
   composer.render();
}

// End of file

