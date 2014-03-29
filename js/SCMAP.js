/**
* @author LiannaEeftinck / https://github.com/Leeft
*/

var SCMAP = SCMAP || { REVISION: '3' };

self.console = self.console || {
   info: function () {},
   log: function () {},
   debug: function () {},
   warn: function () {},
   error: function () {}
};

SCMAP.data = {
   factions: [],
   crime_levels: [],
   uee_strategic_values: [],
   goods: [],
   map: {},
   systems: [],
   systemsById: []
};

SCMAP.Symbol = {};
SCMAP.Symbols = {};

SCMAP.Symbol.SIZE = 24;
SCMAP.Symbol.SPACING = 9;

SCMAP.Symbols.DANGER = {
   code: "\uf071",
   scale: 0.9,
   color: 'rgba(200,0,0,0.95)'
};
SCMAP.Symbols.HOME = {
   code: "\uf015",
   scale: 1.15,
   color: 'rgba(255,255,255,0.95)',
   offset: new THREE.Vector2( 0, 2 )
};
SCMAP.Symbols.TRADE = {
   code: "\uf0d1",
   scale: 1.0,
   color: 'rgba(255,255,0,0.95)'
};

// constants here
// SCMAP.Foo = 'bar'

