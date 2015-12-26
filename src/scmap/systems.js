/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import SCMAP from '../scmap';
import StarSystem from './star-system';
import { humanSort } from './functions';

let allSystems = [];

class SystemList {
  static preprocessSystems ( data ) {
    const systems = [];

    SCMAP.data.systems = {};
    SCMAP.data.systemsById = {};

    // First build basic objects to make them all known
    // (this will initialise any jumppoints it can as well)
    for ( let systemName in data ) {
      if ( data.hasOwnProperty( systemName ) ) {
        const system = StarSystem.fromJSON( data[ systemName ] );
        SCMAP.data.systems[ system.name ]     = system;
        SCMAP.data.systemsById[ system.id ]   = system;
        SCMAP.data.systemsById[ system.uuid ] = system;
        systems.push( system );
      }
    }

    // Now go through the built objects again, fixing any leftover jumppoint data
    systems.forEach( system => {
      system._fixJumpPoints( true );
    });

    allSystems = SystemList.SortSystemList( systems );
  }

  static SortSystemList ( systems ) {
    const array = [];
    let i = systems.length;
    while( i-- ) {
      array[i] = systems[i];
    }

    return array.sort( humanSort );
  }
}

export default SystemList;
export { allSystems };
