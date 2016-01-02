/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/
import SCMAP from '../scmap';
import config from './config';
import { hasLocalStorage, hasSessionStorage } from '../helpers/functions';
import { Vector3 } from './three';

class Settings {
  constructor () {

    if ( hasLocalStorage() ) {
      this.storage = window.localStorage;
    } else if ( hasSessionStorage() ) {
      this.storage = window.sessionStorage;
    } else {
      this.storage = {};
    }

    this.camera = {
      camera: new Vector3( 0, 80 * config.renderScale, 100 * config.renderScale ),
      target: new Vector3( 0, 10 * config.renderScale, 0 ),
      orientation: {
        theta: 0,
        phi: 0.9616764178488756,
        radius: 122.2 * config.renderScale,
      }
    };

    this.effect = {
      Antialias: true,
      FXAA: false,
      Bloom: false,
    };

    this.control = {
      rotationLocked: ( this.storage['control.rotationLocked'] === '1' ) ? true : false,
    };

    this.renderer = {
      Stats: ( this.storage['renderer.Stats'] === '1' ) ? true : false,
    };

    this.route = {
      avoidHostile: false,
      avoidOffLimits: false,
      avoidUnknownJumppoints: false,
    };

    // Clean up the mess we made in older versions

    this.removeOldSettings();

    // Load configs

    this.cameraDefaults = JSON.parse( JSON.stringify( this.camera ) );
    this.cameraDefaults.camera = new Vector3();
    this.cameraDefaults.camera.copy( this.camera.camera );
    this.cameraDefaults.target = new Vector3();
    this.cameraDefaults.target.copy( this.camera.target );

    this.load( 'camera' );

    if ( this.storage && 'route' in this.storage ) {
      this.load( 'route' );
    }

    this.load( 'systems' );
    if ( ! this.systems ) { this.systems = {}; }
    this.save( 'systems' );

    this.load( 'effect' );
  }


  get mode () {
    return ( ( this.storage.mode === '2d' ) ? '2d' : '3d' );
  }

  set mode ( value ) {
    if ( /^(2d|3d)$/.test( value ) ) {
      this.storage.mode = value;
    } else {
      this.storage.mode = '3d';
    }
  }


  get uiWidth () {
    return ( ( Number( this.storage['settings.uiWidth'] ) > 0 ) ? Number( this.storage['settings.uiWidth'] ) : 320 );
  }

  set uiWidth ( value ) {
    this.storage[ 'settings.uiWidth' ] = value;
  }


  get labelScale () {
    const userScale = ( ( Number( this.storage['settings.labelScale'] ) > 0 ) ? Number( this.storage['settings.labelScale'] ) : Number( config.defaultLabelScale ) );
    return Math.max(
      Number( config.minLabelScale ),
      Math.min( userScale, config.maxLabelScale )
    );
  }

  set labelScale ( value ) {
    this.storage[ 'settings.labelScale' ] = value;
  }


  get labelOffset () {
    const userOffset = ( ( Number( this.storage['settings.labelOffset'] ) ) ? Number( this.storage['settings.labelOffset'] ) : Number( config.defaultLabelOffset ) );
    return Math.max(
      Number( config.minLabelOffset ),
      Math.min( userOffset, config.maxLabelOffset )
    );
  }

  set labelOffset ( value ) {
    this.storage[ 'settings.labelOffset' ] = value;
  }


  get systemScale () {
    const userScale = ( ( Number( this.storage['settings.systemScale'] ) > 0 ) ? Number( this.storage['settings.systemScale'] ) : Number( config.defaultSystemScale ) );
    return Math.max(
      Number( config.minSystemScale ),
      Math.min( userScale, config.maxSystemScale )
    );
  }

  set systemScale ( value ) {
    this.storage[ 'settings.systemScale' ] = value;
  }


  get glow () {
    return ( this.storage['settings.Glow'] !== '0' );
  }

  set glow ( value ) {
    this.storage['settings.Glow'] = ( value ) ? '1' : '0';
  }


  get labels () {
    return ( this.storage['settings.Labels'] !== '0' );
  }

  set labels ( value ) {
    this.storage['settings.Labels'] = ( value ) ? '1' : '0';
  }


  get labelIcons () {
    return ( this.storage['settings.LabelIcons'] !== '0' );
  }

  set labelIcons ( value ) {
    this.storage['settings.LabelIcons'] = ( value ) ? '1' : '0';
  }


  get usersFaction () {
    return SCMAP.getFactionById( 'UEE' );
  }


  load ( key ) {
    if ( ( key in this.storage ) ) {
      try {
        this[ key ] = JSON.parse( this.storage[ key ] );
      } catch ( e ) {
        console.error( `Error parsing 'localStorage.${ key }'; ${ e.name }: ${ e.message }` );
      }
    }
  }

  save ( key ) {
    if ( ( key in this ) ) {
      this.storage[ key ] = JSON.stringify( this[ key ] );
    }
  }

  removeOldSettings () {
    if ( 'effect.Bloom' in this.storage ) {
      delete this.storage['effect.Bloom'];
    }

    if ( 'effect.FXAA' in this.storage ) {
      delete this.storage['effect.FXAA'];
    }

    for ( let property in this.storage )
    {
      if ( /^(comments|hangarLocation|bookmarks)[.](\d+)$/.test( property ) ) {
        delete this.storage[ property ];
      }

      if ( /^(camera|target)[.](x|y|z)$/.test( property ) ) {
        delete this.storage[ property ];
      }
    }
  }
}

export default new Settings();
