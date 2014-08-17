/**
* @author Lianna Eeftinck / https://github.com/Leeft
* A very basic Entity System to see what improvements can be made
* to the logic and performance of the map app
*/

SCMAP.EntitySystem = function () {
   this.componentNodes = {
      MapPosition: [],
   };
   this.entityComponents = {
      System: [
         'MapPosition'
      ],
      Selector: [
         'MapPosition'
      ]
   };
};

SCMAP.EntitySystem.prototype = {
   constructor: SCMAP.EntitySystem,

   createEntity: function createEntity( uuid, type ) {
      if ( !(type in this.entityComponents) ) {
         throw new Error( "Unknown type "+type );
      }
      if ( (uuid === null) || (typeof uuid === 'undefined') ) {
         uuid = THREE.Math.generateUUID();
      }

      var args = Array.prototype.slice.call( arguments, SCMAP.EntitySystem.prototype.createEntity.length );
      var components = this.entityComponents[ type ];
         //console.log( components );
         //console.log( args );
      for ( var i = 0; i < components.length; i += 1 ) {
         var compClass = components[i];
         //console.log( SCMAP.Components[compClass] );
         //console.log( SCMAP.Components[compClass].prototype );
         console.log( 'constructor', SCMAP.Components[compClass].constructor );
         //console.log( SCMAP.Components[compClass].constructor );
         var entity = SCMAP.Components[compClass].constructor.apply( args );
         console.log( 'entity', entity );
      }
   },

   removeEntity: function removeEntity() {
   }
};

SCMAP.NodeList = function () {
   this._node = {
      entity: null,
      prev: null,
      next: null
   };
};
SCMAP.NodeList.prototype = {
   constructor: SCMAP.NodeList
};

SCMAP.Components = {};
SCMAP.Systems = {};

SCMAP.Components.MapPosition = function ( position ) {
   SCMAP.NodeList.call( this );
   this.x = position.x;
   this.y = position.y;
   this.z = position.z;
};
SCMAP.Components.MapPosition.prototype = Object.create( SCMAP.NodeList.prototype );

