/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  **/

import { Color } from './scmap/three';
import StarSystem from './scmap/star-system';
import Faction from './scmap/faction';
import Goods from './scmap/goods';
import { humanSort } from './helpers/functions';

const MAPREVISION = 5;
const LYtoAU = 63241.077; // Not used atm, but keeping around for convenience

class SCMAP {
  constructor () {
    this.data = {
      systems: {},
      systemsById: {},
      factions: {},
      crimeLevels: {},
      ueeStrategicValues: {},
      commodities: {},
      allSystems: [],
    };
  }

  get REVISION () {
    return MAPREVISION;
  }

  importStarSystems ( json ) {
    const systems = [];

    // First build basic objects to make them all known
    // (this will also initialise any jumppoints it can)
    for ( let systemName in json ) {
      const system = StarSystem.fromJSON( json[ systemName ] );
      this.data.systems[ system.name ]     = system;
      this.data.systemsById[ system.id ]   = system;
      this.data.systemsById[ system.uuid ] = system;
      systems.push( system );
    }

    // Now go through the built objects again, fixing any leftover jumppoint data
    systems.forEach( system => {
      system._fixJumpPoints( true );
    });

    // And provide them in a "human friendly" sort order
    this.data.allSystems = SCMAP.SortSystemList( systems );
  }

  getStarSystemByName ( name ) {
    return this.data.systems[ name ];
  }

  getStarSystemById ( id ) {
    return this.data.systemsById[ id ];
  }

  get allSystems () {
    return this.data.allSystems;
  }


  static SortSystemList ( systems ) {
    const array = [];
    let i = systems.length;
    while( i-- ) {
      array[i] = systems[i];
    }
    return array.sort( humanSort );
  }

  importFactions ( json ) {
    const factions = [];

    json.forEach( data => {
      const faction = new Faction({
        id: data.id,
        name: data.name,
        color: new Color( data.color.replace( '0x', '#' ) ),
        isRealFaction: data.isRealFaction,
        parentFaction: data.parentFactionId,
      });
      this.data.factions[ data.id ] = faction;
      factions.push( faction );
    });

    factions.forEach( faction => {
      if ( faction.parentFaction ) {
        faction.parentFaction = this.data.factions[ faction.parentFaction ];
      }
    });
  }

  getFactionById ( id ) {
    let faction = this.data.factions[ id ];
    if ( ! ( faction instanceof Faction ) ) {
      faction = this.data.factions.UCLM;
    }
    return faction;
  }

  importCommodities ( json ) {
    json.forEach( data => {
      this.data.commodities[ data.id ] = new Goods({
        id: data.id,
        name: data.name,
        blackMarket: data.blackMarket,
      });
    });
  }

  getCommodityById ( id ) {
    return this.data.commodities[ id ];
  }

  importUEEStrategicValues( json ) {
    this.data.ueeStrategicValues = json;
  }

  getUEEStrategicValueById( id ) {
    return this.data.ueeStrategicValues[ id ];
  }

  importCrimeLevels( json ) {
    this.data.crimeLevels = json;
  }

  getCrimeLevelById( id ) {
    return this.data.crimeLevels[ id ];
  }
}

export default new SCMAP();
