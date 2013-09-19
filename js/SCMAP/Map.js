/**
* @author LiannaEeftinck / https://github.com/Leeft
*/

SCMAP.Map = function ( scene, mapdata ) {
   this.name = "Star Citizen 'Verse";
   this.scene = scene;
   this.mapdata = typeof mapdata === 'object' ? mapdata : {};

   this.systems = {};
   this.territories = {};
   this.selector = this.createSelector();
   this.selected = undefined;
   this.scene.add( this.selector );
   this.group = undefined;
   this.interactables = [];

   if ( Object.keys( mapdata ).length ) {
      this.populateScene();
   }
};

SCMAP.Map.prototype = {
   constructor: SCMAP.Map,

   createSelector: function () {
      var material = new THREE.MeshBasicMaterial( { color: 0xCCCCCC } );
      material.transparent = true;
      material.blending = THREE.AdditiveBlending;
      var mesh = new THREE.Mesh( SCMAP.SelectedSystemGeometry, material );
      mesh.scale.set( 15, 15, 15 );
      mesh.visible = false;
      return mesh;
   },

   system: function ( name ) {
      return this.systems[ name ];
   },

   select: function ( name ) {
      if ( typeof this.systems[ name ] === 'object' ) {
         this.selector.position = this.systems[ name ].position;
         this.selector.visible = true;
      } else {
         this.selector.visible = false;
      }
   },

   deselect: function ( ) {
      this.selector.visible = false;
   },

   animateSelector: function ( ) {
      if ( this.selector.visible ) {
         this.selector.rotation.y = THREE.Math.degToRad( Date.now() * 0.00025 ) * 200;
      }
   },

   handleSelection: function ( event, intersect ) {
      if ( typeof intersect !== 'object' ) {
         return;
      }

      if ( event.type === 'mouseup' ) {
         if ( typeof this.selected === 'object' && typeof this.selected.object.system === 'object' && typeof intersect.object.system === 'object' ) {
            if ( intersect.object.system === this.selected.object.system ) {
               if ( $('#systemname').text() != intersect.object.system.name ) {
                  displaySystemInfo( intersect.object.system.name );
                  this.select( intersect.object.system.name );
               }
            }
         }
      }
      else if ( event.type === 'mousedown' ) {
         this.selected = intersect;
      }
   },

   populateScene: function ( mapdata ) {
      var territory, territoryName, starMaterial, routeMaterial, system, systemName,
         source, destinations, destination, geometry,
         route, data, systemObject, systemLabel;

      // TODO: clean up the existing scene and mapdata when populating with
      // new dataa

      this.mapdata = typeof mapdata === 'object' ? mapdata : this.mapdata;
      this.territories = {};
      this.systems = {};
      this.group = new THREE.Object3D(); // all the labels are together in a single geometry group

      // First we go through the data to build the basic systems so
      // the routes can be built as well

      for ( territoryName in this.mapdata )
      {
         territory = this.mapdata[ territoryName ];

         this.territories[ territoryName ] = [];

         starMaterial = new THREE.MeshBasicMaterial({ color: territory.color });

         for ( systemName in territory.systems )
         {
            data = territory.systems[ systemName ];

            system = new SCMAP.System({
               name: systemName,
               position: new THREE.Vector3( data.coords[0], data.coords[1], data.coords[2] ),
               territory: territory,
               scale: data.scale
            });
            systemInfo = window.sc_system_info[ systemName ];
            if ( typeof systemInfo === 'object' ) {
               system.setValues({
                  'source': systemInfo['source'],
                  'ownership': systemInfo['ownership'],
                  'planets': systemInfo['planets'],
                  'import': systemInfo['import'],
                  'export': systemInfo['export'],
                  'crime_status': systemInfo['crime_status'],
                  'black_market': systemInfo['black_market'],
                  'blob': systemInfo['blob'],
                  'planetary_rotation': systemInfo['planetary_rotation'],
                  'uee_strategic_value': systemInfo['uee_strategic_value']
               });
            }

            this.systems[ systemName ] = system;
            this.territories[ territoryName ].push( system );

            systemObject = system.createObject( starMaterial );
            systemLabel = system.createLabel();
            this.scene.add( systemObject );
            this.group.add( systemLabel );
            this.interactables.push( systemObject );
            //this.interactables.push( systemLabel );
         }
      }

      this.scene.add( this.group );

      // Then we go through again and add the routes

      for ( territoryName in this.mapdata )
      {
         territory = this.mapdata[ territoryName ];

         routeMaterial = new THREE.LineBasicMaterial({ color: territory.color, linewidth: 1 });

         for ( systemName in territory.known_routes )
         {
            if ( this.system( systemName ) === undefined ) {
               console.log( "Territory '"+territoryName+"' space route: can't find the source system '"+systemName+"'" );
               continue;
            }

            source = this.system( systemName );

            destinations = territory.known_routes[ systemName ];

            for ( i = 0; i < destinations.length; i++ )
            {
               destination = this.system( destinations[i] );
               if ( destination === undefined ) {
                  console.log( territoryName+" space route from "+systemName+" can't find the destination system '"+destinations[i]+"'" );
                  continue;
               }

               geometry = new THREE.Geometry();
               geometry.vertices.push( source.position );
               geometry.vertices.push( destination.position );
               geometry.computeBoundingSphere();
               route = new THREE.Line( geometry, routeMaterial );
               this.scene.add( route );

               source.routesTo.push( destination );
               destination.routesFrom.push( source );
            }
         }
      }
   }
};

