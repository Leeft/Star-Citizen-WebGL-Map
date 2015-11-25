/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  **/

const MAPREVISION = 5;

const LYtoAU = 63241.077;
const approximateTraveltimePerAU = ( ( 8 * 60 ) + 19 ) * 5; // 8:19 at 1c, but autopilot speed is 0.2c

function travelTimeAU ( distanceAU ) {
  return( approximateTraveltimePerAU * distanceAU );
}

// constants here

class SCMAP {
  constructor () {
    this.data = {
      factions: [],
      crime_levels: [],
      uee_strategic_values: [],
      goods: [],
      map: {},
      systems: [],
      systemsById: []
    };
  }

  get REVISION () {
    return MAPREVISION;
  }

  travelTimeAU ( distanceAU ) {
    return travelTimeAU( distanceAU );
  }

  usersFaction () {
    // TODO: allow users to set their faction, if ever needed
    return this.data.factionsByName.UEE;
  }
}

export default new SCMAP();
