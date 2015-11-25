/**
* @author LiannaEeftinck / https://github.com/Leeft
*/

// TODO: Make this data-driven?

const SYMBOLS = {

  DANGER: {
    code: `\uf071`,
    scale: 0.9,
    faClass: 'fa-warning',
    description: 'Danger, hostile faction',
    color: 'rgba(255,50,50,1.0)'
  },

  WARNING: {
    code: `\uf071`,
    scale: 0.9,
    faClass: 'fa-warning',
    description: 'Warning, hostile environment',
    color: 'rgba(255,117,25,1.0)'
  },

  HANGAR: {
    code: `\uf015`,
    scale: 1.15,
    faClass: 'fa-home',
    description: 'Hangar location',
    color: 'rgba(255,255,255,1.0)',
    offset: new THREE.Vector2( -0.25, 2 )
  },

  INFO: {
    code: `\uf05a`,
    scale: 1.0,
    faClass: 'fa-info-circle',
    description: 'Information available',
    color: 'rgba(255, 162, 255, 1.0)'//,
    //offset: new THREE.Vector2( 0, 2 )
  },

  TRADE: {
    code: `\uf0ec`,
    scale: 0.90,
    faClass: 'fa-exchange',
    description: 'Major trade hub',
    color: 'rgba(255,255,0,1.0)',
    offset: new THREE.Vector2( 0, -1 )
  },

  //TRADE: {
  //   code: `\uf0d1`,
  //   scale: 1.0,
  //   faClass: 'fa-truck',
  //   description: 'Major trade hub',
  //   color: 'rgba(255,255,0,1.0)',
  //   offset: new THREE.Vector2( -2, -2 )
  //},

  BANNED: {
    code: `\uf05e`,
    scale: 1.0,
    faClass: 'fa-ban',
    description: 'System off-limits',
    color: 'rgba(255, 117, 25, 1.0)'
  },

  AVOID: {
    code: `\uf00d`,
    scale: 1.2,
    faClass: 'fa-times',
    description: 'Avoid: do not route here',
    color: 'rgba(255,50,50,1.0)'
  },

  COMMENTS: {
    code: `\uf075`,
    scale: 1.0,
    faClass: 'fa-comment',
    description: 'Your comments',
    color: 'rgba(106, 187, 207, 1.0)',
    offset: new THREE.Vector2( 0, -3 )
  },

  BOOKMARK: {
    code: `\uf02e`,
    scale: 1.05,
    faClass: 'fa-bookmark',
    description: 'Bookmarked',
    color: 'rgba(102, 193, 0, 1.0)',
    offset: new THREE.Vector2( -1, 1 )
  },

};

export default SYMBOLS;
