/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

SCMAP.Settings = function () {
   this.storage = null;
   if ( hasLocalStorage() ) {
      this.storage = window.localStorage;
   }

   this.glow = ( this.storage && this.storage['settings.Glow'] === '0' ) ? false : true;
   this.labels = ( this.storage && this.storage['settings.Labels'] === '0' ) ? false : true;
   this.labelIcons = ( this.storage && this.storage['settings.LabelIcons'] === '0' ) ? false : true;

   this.camera = {
      camera: new THREE.Vector3( 0, 80, 100 ),
      target: new THREE.Vector3( 0, 10, 0 ),
      orientation: {
         theta: 0,
         phi: 0.9616764178488756,
         radius: 122.2
      }
   };
   this.cameraDefaults = JSON.parse( JSON.stringify( this.camera ) );
   this.cameraDefaults.camera = new THREE.Vector3();
   this.cameraDefaults.camera.copy( this.camera.camera );
   this.cameraDefaults.target = new THREE.Vector3();
   this.cameraDefaults.target.copy( this.camera.target );
   this.load( 'camera' );

   this.effect = {
      Antialias: true,
      FXAA: false,
      Bloom: false
   };
   this.load( 'effect' );

   this.control = {
      rotationLocked: ( this.storage && this.storage['control.rotationLocked'] === '1' ) ? true : false
   };

   this.renderer = {
      Stats: ( this.storage && this.storage['renderer.Stats'] === '1' ) ? true : false
   };

   this.route = {
      avoidHostile: false,
      avoidOffLimits: false,
      avoidUnknownJumppoints: false
   };
   if ( this.storage && 'route' in this.storage ) {
      this.load( 'route' );
   }

   this.mode = ( this.storage && this.storage.mode ) ? this.storage.mode : '3d';
};

SCMAP.Settings.prototype = {

   constructor: SCMAP.Settings,

   load: function save( key ) {
      if ( this.storage && ( key in this.storage ) ) {
         try {
            this[ key ] = JSON.parse( this.storage[ key ] );
         } catch ( e ) {
            console.error( "Error parsing 'localStorage." + key + "'; " + e.name + ": " + e.message );
         }
      }
   },

   save: function save( key ) {
      if ( this.storage && ( key in this ) ) {
         this.storage[ key ] = JSON.stringify( this[ key ] );
      }
   }

};

SCMAP.settings = new SCMAP.Settings();
