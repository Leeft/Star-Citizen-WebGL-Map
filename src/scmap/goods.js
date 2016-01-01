/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

const DEFAULTS = {
  id: undefined,
  name: 'Unknown',
  blackMarket: false,
};

class Goods {
  constructor( data ) {
    Object.assign( this, DEFAULTS, data );

    // Internals
    this._trade = {
      importing: [],
      exporting: [],
      blackMarket: []
    };
  }
}

export default Goods;
