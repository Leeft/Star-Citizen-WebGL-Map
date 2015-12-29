/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

// These are deliberately strings: code using these numbers must be able
// to cope with strings as they may come from HTML data attributes.
const DEFAULTS = {
  systemsJson:          'data/systems.min.json',
  goodsJson:            'data/goods.json',
  crimeLevelsJson:      'data/crime-levels.json',
  factionsJson:         'data/factions.json',
  strategicValuesJson:  'data/uee-strategic-values.json',

  glowImage:            'images/glow.png',

  rotateSpeed:          '0.4',
  zoomSpeed:            '1.0',
  panSpeed:             '0.6',

  minSystemScale:       '0.5',
  defaultSystemScale:   '1.0',
  maxSystemScale:       '1.50',


  // These should've been named *LabelUserScale
  minLabelScale:        '0.4',
  defaultLabelScale:    '1.0',
  maxLabelScale:        '2.0',
  labelScale:           5, // sprite labels are multiplied by this for the actual scene

  minLabelOffset:       '-6.5',
  defaultLabelOffset:   '5.0',
  maxLabelOffset:       '7.5',

  debug:                false,
  quality:              'high',

  // takes 8m 19s at 1c, but autopilot speed is only 0.2c
  // FIXME: this value is probably going to be WAY, WAY off.
  approximateTraveltimePerAU: ( ( 8 * 60 ) + 19 ) * 5,
};

class Config {
  constructor () {
    const element = document.getElementById('sc-map-configuration');
    if ( element && ( typeof element.dataset === 'object' ) ) {
      Object.assign( this, DEFAULTS, element.dataset );
    } else {
      Object.assign( this, DEFAULTS );
    }
  }
}

export default new Config();
