/**
* @author LiannaEeftinck / https://github.com/Leeft
*/

SCMAP.System = function ( name, location, ownership, scale ) {
   this.name = name;
   this.mapCoordinates = location instanceof THREE.Vector3 ? location : new THREE.Vector3();
   this.ownership = typeof ownership === 'string' ? ownership : undefined;
   this.scale = typeof scale === 'number' ? scale : 1.0;

   this.routesFrom = [];
   this.routesTo = [];
   this.planets = [];
   this.import = [];
   this.export = [];
   this.crimeStatus = [];
   this.blackMarket = [];
   this.uueStrategicValue = undefined;
   this.description = [];
   this.source = undefined;

   this.sceneObject = undefined;

   SCMAP.systems[ name ] = this;
};

SCMAP.System.prototype = {
   constructor: SCMAP.System,

   createObject: function ( material ) {
      var object = new THREE.Mesh( SCMAP.System.mesh, material );
      this.position = this.mapCoordinates.clone();
      this.position.multiplyScalar( sc_map_scaling ); // starsystem coordinate scaling
      object.scale.set( this.scale, this.scale, this.scale );
      object.position = this.position;
      object.system = this;
      SCMAP.interactableObjects.push( object );
      return object;
   },

   createLabel: function ( groupObject ) {
      var systemNameCanvas, systemNameContext, //systemNameWidth,
          systemNameTexture, systemNameMesh, nameSpriteScaling = 0.24, 
          systemNameSpriteMaterial, systemNameSprite;

      systemNameCanvas = document.createElement('canvas');
      systemNameCanvas.width = 300;
      systemNameCanvas.height = 64;
      systemNameContext = systemNameCanvas.getContext('2d');
      systemNameContext.font = "36pt Electrolize";
      systemNameContext.textAlign = 'center';
      systemNameContext.fillStyle = "rgba(255,255,255,0.95)";
      //systemNameWidth = systemNameContext.measureText( this.name ).width;
      systemNameContext.fillText( this.name, systemNameCanvas.width / 2, 38 );

      systemNameTexture = new THREE.Texture( systemNameCanvas ) ;
      systemNameTexture.needsUpdate = true;

      systemNameSpriteMaterial = new THREE.SpriteMaterial({ map: systemNameTexture, useScreenCoordinates: false });

      systemNameSprite = new THREE.Sprite( systemNameSpriteMaterial );
      systemNameSprite.position.set( this.position.x, this.position.y + 12, this.position.z );
      systemNameSprite.scale.set( nameSpriteScaling * systemNameCanvas.width, nameSpriteScaling * systemNameCanvas.height, 1 );
      systemNameSprite.system = this;

      SCMAP.interactableObjects.push( systemNameSprite );
      return systemNameSprite;
   },

   populateInfo: function ( data ) {
      //var blurb = $('<div class="sc_system_info '+system+'"></div>');
      //blurb.append( '<dl></dl>' );
      //var worlds = 'No inhabitable worlds';
      //var _import = 'None';
      //var _export = 'None';
      //var black_market = 'None';
      //if ( systemInfo.planetary_rotation.length ) {
      //   worlds = systemInfo.planetary_rotation.join( ', ' );
      //}
      //if ( systemInfo.import.length ) {
      //   _import = systemInfo.import.join( ', ' );
      //}
      //if ( systemInfo.export.length ) {
      //   _export = systemInfo.export.join( ', ' );
      //}
      //if ( systemInfo.black_market.length ) {
      //   black_market = systemInfo.black_market.join( ', ' );
      //}
   }
};

SCMAP.System.mesh = new THREE.SphereGeometry( 5, 12, 12 );
