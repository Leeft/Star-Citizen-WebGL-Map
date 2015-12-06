/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import SCMAP from '../scmap';
import System from './system';
import THREE from 'three';

class Faction {
  constructor ( data ) {
    this.id = undefined;
    this.name = 'Unclaimed';
    this.isRealFaction = false;
    this.color = new THREE.Color( 0xFFFFFF );
    this.planeColor = new THREE.Color( 0xFF0000 );
    this.lineColor = new THREE.Color( 0xFFFF00 );
    this.parentFaction = null;

    this.setValues( data );

    // Internals
    this._claimed = {
      systems: {}
    };

    this._darkMaterial = undefined;
  }

  claim ( system ) {
    if ( ! system instanceof System ) {
      throw new Error( `A faction can only claim ownership over a system` );
    }
    this._claimed.systems[ system.uuid ] = true;
    return this;
  }

  claimed ( system ) {
    if ( ! system instanceof System ) {
      throw new Error( `A faction can only test ownership over a system` );
    }
    return this._claimed.systems[ system.uuid ];
  }

  material () {
    if ( typeof this._darkMaterial === 'undefined' ) {
      this._darkMaterial = new THREE.MeshBasicMaterial({ color: this.planeColor, vertexColors: true });
    }
    return this._darkMaterial;
  }

  isHostileTo ( comparedTo ) {
    if ( !( comparedTo instanceof Faction ) ) {
      throw new Error( `Can only compare to other factions` );
    }
    // TODO: more data in database, more logic here
    // rather than lots of hardcoding
    if ( comparedTo.name === 'Vanduul' ) {
      return ( this.name !== 'Vanduul' );
    } else {
      return ( this.name === 'Vanduul' );
    }
  }

  getValue ( key ) {
    if ( key === undefined ) {
      return;
    }
    return this[ key ];
  }

  setValues ( values ) {
    if ( values === undefined ) {
      return;
    }

    for ( let key in values ) {

      let newValue = values[ key ];
      if ( newValue === undefined ) {
        console.log( `Faction: "${ key }" parameter is undefined for "${ this.name }"` );
        continue;
      }

      if ( key in this )
      {
        let currentValue = this[ key ];
        if ( currentValue instanceof THREE.Color ) {

          if ( newValue instanceof THREE.Color ) {
            this[ key ] = newValue;
          } else {
            newValue = newValue.replace( '0x', '#' );
            this[ key ] = new THREE.Color( newValue );
          }
          if ( key === 'color' ) {
            this.planeColor = this[ key ].clone().offsetHSL( 0, 0.5, 0 ).multiplyScalar( 0.20 );
            this.lineColor = this[ key ].clone().offsetHSL( 0, 0.05, -0.05 );
          }

        } else {
          this[ key ] = newValue;
        }
      }
    }
  }

  static preprocessFactions ( data ) {
    let factionId, faction;

    SCMAP.data.factions = [];
    SCMAP.data.factionsByName = {};

    for ( factionId in data ) {

      if ( data.hasOwnProperty( factionId ) ) {

        faction = data[ factionId ];

        if ( ! ( faction instanceof Faction ) ) {
          faction = new Faction({
            id: factionId,
            name: faction.name,
            color: faction.color,
            isRealFaction: faction.isRealFaction,
            parentFaction: null // FIXME
          });
        }

        SCMAP.data.factions[ factionId ]          = faction;
        SCMAP.data.factionsByName[ faction.id ]   = faction;
        SCMAP.data.factionsByName[ faction.name ] = faction;

      }
    }
  }

  static getById ( id ) {
    let faction = SCMAP.data.factions[ id ];
    if ( ! ( faction instanceof Faction ) ) {
      faction = SCMAP.data.factionsByName.Unclaimed;
    }
    return faction;
  }

  static getByName ( name ) {
    let faction = SCMAP.data.factionsByName[ name ];
    if ( ! ( faction instanceof Faction ) ) {
      faction = SCMAP.data.factionsByName.Unclaimed;
    }
    return faction;
  }
}

export default Faction;
