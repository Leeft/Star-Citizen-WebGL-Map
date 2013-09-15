if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var effectFXAA,
    yRotation = 0,
    camera, scene, renderer, composer,
    starSystems = {},
    selectedSystemObject,
    orientationNull, 

    // raycasting helper vars
    interactableObjects = [],
    clickedOn,

   // some flavor text, not got the proper content yet
    rikerIndex = 0,
    rikerIpsum = [
   "What? We're not at all alike! For an android with no feelings, he sure managed to evoke them in others. I've had twelve years to think about it. And if I had it to do over again, I would have grabbed the phaser and pointed it at you instead of them. Did you come here for something in particular or just general Riker-bashing? Flair is what marks the difference between artistry and mere competence. I guess it's better to be lucky than good. When has justice ever been as simple as a rule book? Worf, It's better than music. It's jazz. We have a saboteur aboard.",
   "They were just sucked into space. Fear is the true enemy, the only enemy. I've had twelve years to think about it. And if I had it to do over again, I would have grabbed the phaser and pointed it at you instead of them. Maybe if we felt any human loss as keenly as we feel one of those close to us, human history would be far less bloody. Yesterday I did not know how to eat gagh. Mr. Worf, you sound like a man who's asking his friend if he can start dating his sister. Wait a minute - you've been declared dead. You can't give orders around here.",
   "I think you've let your personal feelings cloud your judgement. The look in your eyes, I recognize it. You used to have it for me. Commander William Riker of the Starship Enterprise. I guess it's better to be lucky than good. Our neural pathways have become accustomed to your sensory input patterns.",
   "We know you're dealing in stolen ore. But I wanna talk about the assassination attempt on Lieutenant Worf. Could someone survive inside a transporter buffer for 75 years? Why don't we just give everybody a promotion and call it a night - 'Commander'? Damage report! I can't. As much as I care about you, my first duty is to the ship. What? We're not at all alike! This should be interesting. Your head is not an artifact! Worf, It's better than music. It's jazz. Congratulations - you just destroyed the Enterprise. Our neural pathways have become accustomed to your sensory input patterns. What's a knock-out like you doing in a computer-generated gin joint like this? Captain, why are we out here chasing comets?"
];

init();
animate();

function init()
{
   var i, container, renderModel, effectCopy, effectBloom, width, height;

   container = document.createElement( 'div' );
   document.body.appendChild( container );
   width = window.innerWidth || 2;
   height = window.innerHeight || 2;

   camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 10000 );
   camera.position.z = 600;

   controls = new THREE.TrackballControls( camera );
   controls.rotateSpeed = 1.0;
   controls.zoomSpeed = 1.2;
   controls.panSpeed = 0.8;
   controls.noZoom = false;
   controls.noPan = true;
   controls.staticMoving = true;
   controls.dynamicDampingFactor = 0.3;
   controls.keys = [ 65, 83, 68 ];
   controls.addEventListener( 'change', render );

   scene = new THREE.Scene();
   scene.fog = new THREE.FogExp2( 0x000000, 0.0010 );

   renderer = new THREE.WebGLRenderer( { clearColor: 0x000000, clearAlpha: 1, antialias: true } );
   renderer.setSize( window.innerWidth, window.innerHeight );
   renderer.autoClear = false;
   container.appendChild( renderer.domElement );

   buildStarCitizenSystems();
   buildReferencePlane();
   buildOrientationNull()
   loadSelectedSystemObject();

   // Stats

   stats = new Stats();
   stats.domElement.style.position = 'absolute';
   stats.domElement.style.top = '0px';
   container.appendChild( stats.domElement );

   // Event handlers

   window.addEventListener( 'resize', onWindowResize, false );
   renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
   renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );

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

function buildStarCitizenSystems ()
{
   var starMesh = new THREE.SphereGeometry( 5, 12, 12 ),
      territory, starMaterial, routeMaterial, system, coords, starObject,
      systemNameCanvas, systemNameContext, systemNameWidth,
      systemNameTexture, systemNameMaterial, systemNameMesh,
      destinations, destination, geometry, route;

   for ( territory_name in sc_map )
   {
      territory = sc_map[territory_name];
      starMaterial = new THREE.MeshBasicMaterial( { color: territory.color, fog: true } );

      for ( system_name in territory.systems )
      {
         system = territory.systems[system_name];
         coords = new THREE.Vector3( system.coords[0], system.coords[1], system.coords[2] );
         coords.multiplyScalar( 0.5 ); // starsystem coordinate scaling
         starObject = new THREE.Mesh( starMesh, starMaterial );
         starObject.scale.set( system.scale, system.scale, system.scale );
         starObject.starInfo = {
            "name": system_name,
            "location": coords
         };
         scene.add( starObject );
         starSystems[ system_name ] = starObject;
         interactableObjects.push( starObject );

         systemNameCanvas = document.createElement('canvas');
         systemNameContext = systemNameCanvas.getContext('2d');
         systemNameWidth = systemNameContext.measureText( system_name ).width;
         systemNameCanvas.height = 36;
         systemNameCanvas.width = 200;
         systemNameContext.font = "28pt Electrolize";
         systemNameContext.textAlign = 'center';
         systemNameContext.fillStyle = "rgba(255,255,255,0.95)";
         systemNameContext.fillText( system_name, systemNameCanvas.width / 2, 30 );
          
         systemNameTexture = new THREE.Texture( systemNameCanvas ) ;
         systemNameTexture.needsUpdate = true;
            
         systemNameMaterial = new THREE.MeshBasicMaterial({ map: systemNameTexture });
         systemNameMaterial.transparent = true;

         systemNameMesh = new THREE.Mesh(
           new THREE.PlaneGeometry( systemNameCanvas.width / 6, systemNameCanvas.height / 6 ),
           systemNameMaterial
         );
         systemNameMesh.position.set( system.coords[0], system.coords[1] + 20, system.coords[2] );
         systemNameMesh.is_billboard = true;
         systemNameMesh.starInfo = starObject.starInfo;
         systemNameMesh.starObject = starObject;
         scene.add( systemNameMesh );
         interactableObjects.push( systemNameMesh );
      }
   }

   for ( territory_name in sc_map )
   {
      territory = sc_map[territory_name];
      routeMaterial = new THREE.LineBasicMaterial( { color: territory.color, linewidth: 1, fog: true } );

      for ( system_name in territory.known_routes )
      {
         if ( starSystems[ system_name ] === undefined ) {
            console.log( territory_name+" space route: can't find the system '"+system_name+"'" );
            continue;
         }

         destinations = territory.known_routes[system_name];
         for ( i = 0; i < destinations.length; i++ )
         {
            destination = destinations[i];
            if ( starSystems[ destination ] === undefined ) {
               console.log( territory_name+" space route from "+system_name+" can't find the destination system '"+destination+"'" );
               continue;
            }

            geometry = new THREE.Geometry();
            geometry.vertices.push( starSystems[ system_name ].starInfo.location );
            geometry.vertices.push( starSystems[ destination ].starInfo.location );
            geometry.computeBoundingSphere();
            route = new THREE.Line( geometry, routeMaterial );
            scene.add( route );
         }
      }
   }
}

function buildReferencePlane()
{
    var radius = 1200, quantity = 16 * 3, referencePlaneMaterial,
      referencePlane, referencePlaneGeometry, step = 2 * Math.PI / 36;

   referencePlaneMaterial = new THREE.LineBasicMaterial( { color: 0x0CB01E, opacity: 0.8, linewidth: 1 } ),
   referencePlaneGeometry = new THREE.CylinderGeometry( radius, 0, 0, 36, quantity, false );

   for ( var theta = 0; theta < 2 * Math.PI; theta += step )
   {
      var x = radius * Math.cos( theta );
      var z = 0 - radius * Math.sin( theta );
      referencePlaneGeometry.vertices.push( new THREE.Vector3( x, 0, z ) );
      referencePlaneGeometry.vertices.push( new THREE.Vector3( 0, 0, 0 ) );
   }

   referencePlane = new THREE.Line( referencePlaneGeometry, referencePlaneMaterial ),
   referencePlane.overdraw = false;
   scene.add( referencePlane );
}

function buildOrientationNull()
{
    var orientationNullMaterial = new THREE.LineBasicMaterial( { color: 0xffff00, opacity: 1, linewidth: 1 } ),
      orientationNullGeometry;

   orientationNullGeometry = new THREE.Geometry();
   //orientationNullGeometry.vertices.push( new THREE.Vector3( 0, 0, 0 ) );

   orientationNullGeometry.vertices.push( new THREE.Vector3( -10, 10, 0 ) );
   orientationNullGeometry.vertices.push( new THREE.Vector3( -10, -10, 0 ) );
   orientationNullGeometry.vertices.push( new THREE.Vector3( 10, -10, 0 ) );
   orientationNullGeometry.computeBoundingSphere();

   orientationNull = new THREE.Mesh( orientationNullGeometry, orientationNullMaterial );
   scene.add( orientationNull );
}

function loadSelectedSystemObject()
{
   var jsonLoader = new THREE.JSONLoader();
   jsonLoader.load( "js/objects/selected_system.js", function( geometry, materials ) {
      var material = new THREE.MeshBasicMaterial( { color: 0xCCCCCC, fog: false } );
      material.transparent = true;
      material.blending = THREE.AdditiveBlending; 
      var mesh = new THREE.Mesh( geometry, material );
      mesh.scale.set( 15, 15, 15 );
      mesh.visible = false;
      selectedSystemObject = mesh;
      scene.add( mesh );
   } );
}

function onWindowResize()
{
   camera.aspect = window.innerWidth / window.innerHeight;
   camera.updateProjectionMatrix();

   renderer.setSize( window.innerWidth, window.innerHeight );

   //effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );

   composer.reset();
}

function onDocumentMouseDown( event )
{
   var vector = new THREE.Vector3((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5);
   var projector = new THREE.Projector();
   projector.unprojectVector(vector, camera);
   
   var raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
   var intersects = raycaster.intersectObjects( interactableObjects );
   
   if ( intersects.length > 0 ) {
      var intersect = intersects[0];
      if ( intersect.object.starObject ) {
         clickedOn = intersect.object.starObject;
      } else if ( intersect.object.starInfo ) {
         clickedOn = intersect.object;
      }
   }
}

function onDocumentMouseUp( event )
{
   var vector, projector, raycaster, intersects, clickedOut;

   vector = new THREE.Vector3((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5);
   projector = new THREE.Projector();
   projector.unprojectVector(vector, camera);

   raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
   intersects = raycaster.intersectObjects( interactableObjects );
   
   if ( intersects.length > 0 )
   {
      var intersect = intersects[0];

      if ( intersect.object.starInfo )
      {
         if ( intersect.object.starObject ) {
            clickedOut = intersect.object.starObject;
         } else {
            clickedOut = intersect.object;
         }

         if ( intersect.object === clickedOn ) {
            if ( $('#systemname').text() != clickedOut.starInfo.name ) {
               displaySystemInfo( clickedOut.starInfo.name );
               selectedSystemObject.visible = true;
               selectedSystemObject.position = clickedOn.position;
            }
            clickedOn = undefined;
         }
      }
   }
}

function displaySystemInfo( system )
{
   $('#systemname').text( system + ' System' );
   if ( sc_system_info[ system ] )
   {
      var systemInfo = sc_system_info[ system ];
      var blurb = $('<div class="sc_system_info '+system+'"></div>');
      blurb.append( '<dl></dl>' );
      var worlds = 'No inhabitable worlds';
      var _import = 'None';
      var _export = 'None';
      var black_market = 'None';
      if ( systemInfo.planetary_rotation.length ) {
         worlds = systemInfo.planetary_rotation.join( ', ' );
      }
      if ( systemInfo.import.length ) {
         _import = systemInfo.import.join( ', ' );
      }
      if ( systemInfo.export.length ) {
         _export = systemInfo.export.join( ', ' );
      }
      if ( systemInfo.black_market.length ) {
         black_market = systemInfo.black_market.join( ', ' );
      }
      blurb.find('dl').append(
         '<dt class="ownership">Ownership</dt><dd class="ownership">'+systemInfo.ownership+'</dd>' +
         '<dt class="planets">Planets</dt><dd class="planets">'+systemInfo.planets+'</dd>' +
         '<dt class="rotation">Planetary rotation</dt><dd class="rotation">'+worlds+'</dd>' +
         '<dt class="import">Import</dt><dd class="import">'+_import+'</dd>' +
         '<dt class="export">Export</dt><dd class="export">'+_export+'</dd>' +
         '<dt class="crime_'+systemInfo.crime_status.toLowerCase()+'">Crime status</dt><dd class="crime">'+systemInfo.crime_status+'</dd>' +
         '<dt class="black_market">Black market</dt><dd class="crime">'+black_market+'</dd>' +
         '<dt class="strategic_'+systemInfo.uue_strategic_value.toLowerCase()+'">UEE strategic value</dt><dd class="strategic">'+systemInfo.uue_strategic_value+'</dd>'
      );

      for ( var i = 0; i < systemInfo.blob.length; i++ ) {
         var blob = systemInfo.blob[i];
         blurb.append( '<p>' + blob + '</p>' );
      }

      if ( systemInfo.source ) {
         blurb.append( '<p><a href="' + systemInfo.source + '" target="_blank">(source)</a></p>' );
      }

      $('#systemblurb').empty();
      $('#systemblurb').append( blurb );
   }
   else
   {
      $('#systemblurb').html( "<strong>No data available yet</strong><br>Placeholder RikerIpsum text "
         + ( rikerIndex + 1 ) + "/" + rikerIpsum.length + ":<br>" + rikerIpsum[ rikerIndex++ ] );
      if ( rikerIndex >= rikerIpsum.length ) {
         rikerIndex = 0;
      }
   }
}

//

function animate() {
   requestAnimationFrame( animate );
   controls.update();

   orientationNull.position.y = camera.position.y;
   orientationNull.lookAt( camera.position );

   stats.update();
   render();
}

function render()
{
   $('#rotation').text( ( ( camera.rotation.y * ( 180 / Math.PI ) ) % 360 ).toFixed(0) );

   var axis = new THREE.Vector3( 0, 1, 0 );
   var rotationMatrix = new THREE.Matrix4().makeRotationAxis( axis, 0 );

   // To make the billboards follow the vector of the orientationNull
   var angle = orientationNull.rotation.y;
   var orientationVector;
   // Todo: this may need work when the camera can move
   if ( camera.position.z >= 0 ) {
      orientationVector = axis;
   } else {
      orientationVector = new THREE.Vector3( 0, -1, 0 );
      angle += Math.PI;
   }
   var matrix = new THREE.Matrix4().makeRotationAxis( axis, angle );

   for ( var i = 0; i < scene.children.length; i ++ )
   {
      var object = scene.children[ i ];

      if ( object instanceof THREE.Mesh || object instanceof THREE.Line )
      {
         var objectMatrix = object.matrix;
         objectMatrix.identity();

         if ( object.starInfo !== undefined )
         {
            if ( object.is_billboard ) {
               var labelLocation = object.starInfo.location.clone().add( new THREE.Vector3( 0, 12, 0 ) ); 
               objectMatrix.setPosition( labelLocation );
            } else {
               objectMatrix.setPosition( object.starInfo.location );
            }
            object.applyMatrix( rotationMatrix );
         }

         if ( object.is_billboard ) {
            object.rotateOnAxis( orientationVector, angle );
         }
      }
   }

   //if ( selectedSystemObject !== undefined && selectedSystemObject.visible ) {
   //   selectedSystemObject.rotation.y = angle;
   //}

	var timer = Date.now() * 0.00025;
   if ( selectedSystemObject !== undefined ) {
      selectedSystemObject.rotation.y = THREE.Math.degToRad( timer ) * 200;
   }

   renderer.clear();
   composer.render();
}

