/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

SCMAP.Goods = function ( data ) {

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

};

SCMAP.Goods.prototype = {
   constructor: SCMAP.Goods,

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
            console.log( 'SCMAP.Goods: "' + key + '" parameter is undefined for "'+this.name+'"' );
            continue;
         }

         if ( key in this )
         {
            var currentValue = this[ key ];
            this[ key ] = newValue;
         }

      }
   }
};

SCMAP.Goods.preprocessGoods = function ( data ) {
   var goodsId, goods;

   SCMAP.data.goodsByName = {};

   for ( goodsId in SCMAP.data.goods ) {

      if ( SCMAP.data.goods.hasOwnProperty( goodsId ) ) {

         goods = SCMAP.data.goods[ goodsId ];
         if ( goods instanceof SCMAP.Goods ) {
            SCMAP.data.goodsByName[ goods.name ] = goods;
            continue;
         }

         goods = new SCMAP.Goods({
            id: goodsId,
            name: goods.name,
            blackMarket: goods.blackMarket
         });

         SCMAP.data.goods[ goodsId ] = goods;
         SCMAP.data.goodsByName[ goods.name ] = goods;
      }
   }
};

SCMAP.Goods.getById = function ( id ) {
   return SCMAP.data.goods[ id ];
};
SCMAP.Goods.getByName = function ( name ) {
   return SCMAP.data.goodsByName[ name ];
};

// EOF
