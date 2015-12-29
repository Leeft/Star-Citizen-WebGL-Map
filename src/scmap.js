/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  **/

const MAPREVISION = 5;

//const LYtoAU = 63241.077;

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

  usersFaction () {
    // TODO: allow users to set their faction, if ever needed
    return this.data.factionsByName.UEE;
  }
}

export default new SCMAP();
