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

// constants here
// SCMAP.Foo = 'bar'

