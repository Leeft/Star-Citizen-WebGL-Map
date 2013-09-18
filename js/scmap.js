/**
* @author LiannaEeftinck / https://github.com/Leeft
*/

var SCMAP = SCMAP || { REVISION: '1' };

self.console = self.console || {
   info: function () {},
   log: function () {},
   debug: function () {},
   warn: function () {},
   error: function () {}
};

SCMAP.interactableObjects = SCMAP.interactableObjects || [];
SCMAP.systems = SCMAP.systems || {};

SCMAP.system = function ( name ) {
   if ( this.systems[name] === undefined ) {
      console.log( "SCMAP.system: Can't find the system '"+name+"'" );
   }
   return this.systems[ name ];
};

// constants here
// SCMAP.Foo = 'bar'

