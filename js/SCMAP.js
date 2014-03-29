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
   faClass: 'fa-warning',
   description: 'Danger, hostile environment!',
   color: 'rgba(255,50,50,0.95)'
};
SCMAP.Symbols.HANGAR = {
   code: "\uf015",
   scale: 1.15,
   faClass: 'fa-home',
   description: 'Hangar location',
   color: 'rgba(255,255,255,0.95)',
   offset: new THREE.Vector2( 0, 2 )
};
SCMAP.Symbols.INFO = {
   code: "\uf05a",
   scale: 1.0,
   faClass: 'fa-info-circle',
   description: 'Information available',
   color: 'rgba(255, 162, 255, 0.95)'//,
   //offset: new THREE.Vector2( 0, 2 )
};
SCMAP.Symbols.TRADE = {
   code: "\uf0ec",
   scale: 0.90,
   faClass: 'fa-exchange',
   description: 'Major trade hub',
   color: 'rgba(255,255,0,0.95)',
   offset: new THREE.Vector2( -2, -2 )
};
//SCMAP.Symbols.TRADE = {
//   code: "\uf0d1",
//   scale: 0.95,
//   faClass: 'fa-truck',
//   description: 'Major trade hub',
//   color: 'rgba(255,255,0,0.95)',
//   offset: new THREE.Vector2( -2, -2 )
//};
SCMAP.Symbols.BANNED = {
   code: "\uf05e",
   scale: 1.0,
   faClass: 'fa-ban',
   description: 'System off-limits',
   color: 'rgba(255, 117, 25, 0.95)'
};
SCMAP.Symbols.COMMENTS = {
   code: "\uf075",
   scale: 0.9,
   faClass: 'fa-comment',
   description: 'Your comments',
   color: 'rgba(106, 187, 207, 0.95)'
};
SCMAP.Symbols.BOOKMARKED = {
   code: "\uf02e",
   scale: 0.9,
   faClass: 'fa-bookmark',
   description: 'Bookmarked',
   color: 'rgba(102, 153, 0, 0.95)'
};

// constants here
// SCMAP.Foo = 'bar'

