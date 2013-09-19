/**
* @author LiannaEeftinck / https://github.com/Leeft
*/

SCMAP.System = function ( data ) {
   this.name = '';
   this.position = new THREE.Vector3();
   this.ownership = '';
   this.scale = 1.0;
   this.routesFrom = [];
   this.routesTo = [];

   this.source = undefined;
   this.planets = 0;
   this.planetary_rotation = [];
   this.import = [];
   this.export = [];
   this.crime_status = [];
   this.black_market = [];
   this.description = [];
   this.uue_strategic_value = undefined;
   this.blob = [];

   this.sceneObject = undefined;
   this.setValues( data );
};

SCMAP.System.prototype = {
   constructor: SCMAP.System,

   createObject: function ( material ) {
      var object = new THREE.Mesh( SCMAP.System.mesh, material );
      object.scale.set( this.scale, this.scale, this.scale );
      object.position = this.position;
      object.system = this;
      this.sceneObject = object;
      return object;
   },

   createLabel: function ( groupObject ) {
      var canvas, context, texture, scaling = 0.24, material, sprite; //systemNameWidth,

      canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 64;
      context = canvas.getContext('2d');
      context.font = "36pt Electrolize";
      context.textAlign = 'center';
      context.fillStyle = "rgba(255,255,255,0.95)";
      //systemNameWidth = context.measureText( this.name ).width;
      context.fillText( this.name, canvas.width / 2, 38 );

      texture = new THREE.Texture( canvas ) ;
      texture.needsUpdate = true;
      material = new THREE.SpriteMaterial({ map: texture, useScreenCoordinates: false });

      sprite = new THREE.Sprite( material );
      sprite.position.set( this.position.x, this.position.y + 12, this.position.z );
      sprite.scale.set( scaling * canvas.width, scaling * canvas.height, 1 );
      sprite.system = this;
      return sprite;
   },

   getValue: function ( key ) {
      if ( key === undefined ) {
         return;
      }
      var value = this[ key ];
      return value;
   },

   setValues: function ( values ) {
      if ( values === undefined ) {
         return;
      }

      for ( var key in values ) {
         var newValue = values[ key ];
         if ( newValue === undefined ) {
            console.warn( 'SCMAP.System: \'' + key + '\' parameter is undefined.' );
            continue;
         }

         if ( key in this ) {
            var currentValue = this[ key ];
            if ( currentValue instanceof THREE.Color ) {
               currentValue.set( newValue );
            } else if ( currentValue instanceof THREE.Vector3 && newValue instanceof THREE.Vector3 ) {
               currentValue.copy( newValue );
            } else {
               this[ key ] = newValue;
            }
         }
      }
   }
};

SCMAP.System.mesh = new THREE.SphereGeometry( 5, 12, 12 );
