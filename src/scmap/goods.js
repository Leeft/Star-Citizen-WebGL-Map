/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import SCMAP from '../scmap';

class Goods {
  constructor( data ) {
    this.id = undefined;
    this.name = 'Unknown';
    this.blackMarket = false;

    this.setValues( data );

    // Internals
    this._trade = {
      importing: [],
      exporting: [],
      blackMarket: []
    };
  }

  getValue ( key ) {
    if ( key === undefined ) {
      return;
    }
    let value = this[ key ];
    return value;
  }

  setValues ( values ) {
    if ( values === undefined ) {
      return;
    }

    for ( let key in values ) {

      let newValue = values[ key ];
      if ( newValue === undefined ) {
        console.log( `Goods: "${ key }" parameter is undefined for "${ this.name }"` );
        continue;
      }

      if ( key in this )
      {
        let currentValue = this[ key ];
        this[ key ] = newValue;
      }

    }
  }

  static preprocessGoods ( data ) {
    let goodsId, goods;

    SCMAP.data.goodsByName = {};

    for ( goodsId in SCMAP.data.goods ) {

      if ( SCMAP.data.goods.hasOwnProperty( goodsId ) ) {

        goods = SCMAP.data.goods[ goodsId ];
        if ( goods instanceof Goods ) {
          SCMAP.data.goodsByName[ goods.name ] = goods;
          continue;
        }

        goods = new Goods({
          id: goodsId,
          name: goods.name,
          blackMarket: goods.blackMarket
        });

        SCMAP.data.goods[ goodsId ] = goods;
        SCMAP.data.goodsByName[ goods.name ] = goods;
      }
    }
  }

  static getById ( id ) {
    return SCMAP.data.goods[ id ];
  }

  static getByName ( name ) {
    return SCMAP.data.goodsByName[ name ];
  }
}

export default Goods;
