/**
* @author LiannaEeftinck / https://github.com/Leeft
*/
// TODO: this is currently hardcoded, data should come from elsewhere ... very low priority for me though
SCMAP.Faction = function ( data ) {
   this.name = 'Unclaimed';
   this.isRealFaction = false;
   this.color = new THREE.Color( 0xFFFFFF );
   this.dark = new THREE.Color( 0x000000 );
   this.setValues( data );

   // Internals
   this.owns = [];
   this.material = undefined;
};

SCMAP.Faction.prototype = {
   constructor: SCMAP.Faction,

   // TODO: this might need some way of dealing with ownership changing
   claim: function ( system ) {
      if ( ! system instanceof SCMAP.System ) {
         new Error( "A faction can only claim ownership over a system" );
         return;
      }
      //system.setOwnership( this );
      this.owns.push( system );
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
            console.log( 'SCMAP.Faction: "' + key + '" parameter is undefined for "'+this.name+'"' );
            continue;
         }

         if ( key in this )
         {
            var currentValue = this[ key ];
            if ( currentValue instanceof THREE.Color ) {
               if ( newValue instanceof THREE.Color ) {
                  this[ key ] = newValue;
               } else {
                  this[ key ] = new THREE.Color( newValue );
               }
            } else {
               this[ key ] = newValue;
            }
         }
      }
   }
};

SCMAP.Faction.FACTIONS = {
   "UEE": new SCMAP.Faction({ name: 'United Empire of Earth', color: 0x90ABD9, dark: 0x000011, isRealFaction: true }),
   "VANDUUL": new SCMAP.Faction({ name: 'Vanduul', color: 0xF9B29C, dark: 0x110000, isRealFaction: true }),
   "XIAN": new SCMAP.Faction({ name: "Xi'An", color: 0xA4D49C, dark: 0x001100, isRealFaction: true }),
   "BANU": new SCMAP.Faction({ name: "Banu", color: 0xFFED9B, dark: 0x111100, isRealFaction: true }),
   "NONE": new SCMAP.Faction({ name: "Unclaimed", color: 0x666666, dark: 0x000000 }),
   "OTHER": new SCMAP.Faction({ name: "(Other)", color: 0xD1A4D0, dark: 0x110011 })
};

SCMAP.Faction.getByName = function ( name ) {
   var mapped;
   if ( name instanceof SCMAP.Faction ) {
      return name;
   }

   switch ( name.toUpperCase() )
   {
      case 'UNITED EMPIRE OF EARTH':
         mapped = 'UEE';
         break;
      case "XI'AN":
         mapped = 'XIAN';
         break;
      case "UNCLAIMED":
         mapped = 'NONE';
         break;

      default:
         mapped = name.toUpperCase();
   }

   var faction;
   if ( SCMAP.Faction.FACTIONS[ mapped ] instanceof SCMAP.Faction ) {
      faction = SCMAP.Faction.FACTIONS[ mapped ];
   } else {
      faction = SCMAP.Faction.FACTIONS.OTHER;
   }
   if ( typeof faction.material === 'undefined' ) {
      var newColor = faction.dark.clone();
      //newColor.multiplyScalar( 0.3 );
      faction.material = new THREE.MeshBasicMaterial({ color: newColor, vertexColors: false });
   }
   return faction;
};

// EOF

