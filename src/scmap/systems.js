/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import SCMAP from '../scmap';
import System from './system';
import { humanSort } from './functions';

let allSystems = [];

class SystemList {
  static List: allSystems

  static preprocessSystems ( data ) {
    var i, systemName, system, systems = [];

    SCMAP.data.systems = {};
    SCMAP.data.systemsById = {};
    allSystems = [];

    // First build basic objects to make them all known
    // (this will initialise any jumppoints it can as well)
    for ( systemName in data ) {
      if ( data.hasOwnProperty( systemName ) ) {
        system = System.fromJSON( data[ systemName ] );
        SCMAP.data.systems[ system.name ]     = system;
        SCMAP.data.systemsById[ system.id ]   = system;
        SCMAP.data.systemsById[ system.uuid ] = system;
        systems.push( system );
      }
    }

    // Now go through the built objects again, fixing any leftover jumppoint data
    $( systems ).each( function ( i, system ) {
      system._fixJumpPoints( true );
    });

    allSystems = SystemList.SortSystemList( systems );
  }

  static SortSystemList ( systems ) {
    var array = [];
    var i = systems.length;
    while( i-- ) {
      array[i] = systems[i];
    }
    var sorted = array.sort( humanSort );
    return sorted;
  }
}

export default new SystemList();
export { allSystems };
