/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import jQuery from 'jquery';

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

  minLabelScale:        '0.4',
  defaultLabelScale:    '1.0',
  maxLabelScale:        '2.0',

  minLabelOffset:       '-6.5',
  defaultLabelOffset:   '5.0',
  maxLabelOffset:       '7.5',
};

class Config {
  constructor () {
    const $element = jQuery('#sc-map-configuration');
    if ( $element ) {
      Object.assign( this, DEFAULTS, $element.data() );
    } else {
      Object.assign( this, DEFAULTS );
    }
  }
}

const config = new Config();

export default config;
