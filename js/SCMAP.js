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

SCMAP.Symbol.getTag = function ( icon ) {
   var $icon = $( '<i title="'+icon.description+'" class="fa fa-fw '+icon.faClass+'"></i>' );
   $icon.css( 'color', icon.color );
   return $icon;
};

SCMAP.Symbols.DANGER = {
   code: "\uf071",
   scale: 0.9,
   faClass: 'fa-warning',
   description: 'Danger, hostile faction',
   color: 'rgba(255,50,50,1.0)'
};
SCMAP.Symbols.WARNING = {
   code: "\uf071",
   scale: 0.9,
   faClass: 'fa-warning',
   description: 'Warning, hostile environment',
   color: 'rgba(255,117,25,1.0)'
};
SCMAP.Symbols.HANGAR = {
   code: "\uf015",
   scale: 1.15,
   faClass: 'fa-home',
   description: 'Hangar location',
   color: 'rgba(255,255,255,1.0)',
   offset: new THREE.Vector2( -0.25, 2 )
};
SCMAP.Symbols.INFO = {
   code: "\uf05a",
   scale: 1.0,
   faClass: 'fa-info-circle',
   description: 'Information available',
   color: 'rgba(255, 162, 255, 1.0)'//,
   //offset: new THREE.Vector2( 0, 2 )
};
SCMAP.Symbols.TRADE = {
   code: "\uf0ec",
   scale: 0.90,
   faClass: 'fa-exchange',
   description: 'Major trade hub',
   color: 'rgba(255,255,0,1.0)',
   offset: new THREE.Vector2( 0, -3 )
};
//SCMAP.Symbols.TRADE = {
//   code: "\uf0d1",
//   scale: 1.0,
//   faClass: 'fa-truck',
//   description: 'Major trade hub',
//   color: 'rgba(255,255,0,1.0)',
//   offset: new THREE.Vector2( -2, -2 )
//};
SCMAP.Symbols.BANNED = {
   code: "\uf05e",
   scale: 1.0,
   faClass: 'fa-ban',
   description: 'System off-limits',
   color: 'rgba(255, 117, 25, 1.0)'
};
SCMAP.Symbols.AVOID = {
   code: "\uf00d",
   scale: 1.2,
   faClass: 'fa-times',
   description: 'Avoid: do not route here',
   color: 'rgba(255,50,50,1.0)'
};
SCMAP.Symbols.COMMENTS = {
   code: "\uf075",
   scale: 1.0,
   faClass: 'fa-comment',
   description: 'Your comments',
   color: 'rgba(106, 187, 207, 1.0)',
   offset: new THREE.Vector2( 0, -3 )
};
SCMAP.Symbols.BOOKMARK = {
   code: "\uf02e",
   scale: 1.05,
   faClass: 'fa-bookmark',
   description: 'Bookmarked',
   color: 'rgba(102, 193, 0, 1.0)',
   offset: new THREE.Vector2( -1, 1 )
};

SCMAP.travelTimeAU = function ( distanceAU ) {
   return( SCMAP.approximateTraveltimePerAU * distanceAU );
};

SCMAP.usersFaction = function ( ) {
   // TODO: allow users to set their faction, if ever needed
   return SCMAP.data.factionsByName.UEE;
};

// constants here

SCMAP.LYtoAU = 63241.077;
SCMAP.approximateTraveltimePerAU = ( ( 8 * 60 ) + 19 ) * 5; // 8:19 at 1c, but autopilot speed is 0.2c

// EOF
