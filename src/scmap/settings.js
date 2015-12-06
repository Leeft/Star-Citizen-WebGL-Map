/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/
import $ from 'jquery';
import { hasLocalStorage, hasSessionStorage } from './functions';

import THREE from 'three';

class Settings {
  constructor () {

    if ( hasLocalStorage() ) {
      this.storage = window.localStorage;
    } else if ( hasSessionStorage() ) {
      this.storage = window.sessionStorage;
    } else {
      this.storage = {};
    }

    this.uiWidth = ( this.storage && Number( this.storage['settings.uiWidth'] ) > 0 ) ?
      Number( this.storage['settings.uiWidth'] ) : 320;

    this.labelScale = ( this.storage && Number( this.storage['settings.labelScale'] ) > 0 ) ?
      Number( this.storage['settings.labelScale'] ) : $('#sc-map-configuration').data('defaultLabelScale') || 1.0;

    this.labelScale = Math.max(
      Number( $('#sc-map-configuration').data('minLabelScale') ) || 0.4,
      Math.min( this.labelScale, $('#sc-map-configuration').data('maxLabelScale') || 2.0 )
    );

    this.labelOffset = ( this.storage && Number( this.storage['settings.labelOffset'] ) > 0 ) ?
      Number( this.storage['settings.labelOffset'] ) : $('#sc-map-configuration').data('defaultLabelOffset') || 5.0;

    this.labelOffset = Math.max(
      Number( $('#sc-map-configuration').data('minLabelOffset') ) || -3.5,
      Math.min( this.labelOffset, $('#sc-map-configuration').data('maxLabelOffset') || 7.5 )
    );

    this.systemScale = ( this.storage && Number( this.storage['settings.systemScale'] ) > 0 ) ?
      Number( this.storage['settings.systemScale'] ) : $('#sc-map-configuration').data('defaultSystemScale') || 1.0;

    this.systemScale = Math.max(
      Number( $('#sc-map-configuration').data('minSystemScale') ) || 0.5,
      Math.min( this.systemScale, $('#sc-map-configuration').data('maxSystemScale') || 2.0 )
    );

    this.glow = ( this.storage && this.storage['settings.Glow'] === '0' ) ? false : true;
    this.labels = ( this.storage && this.storage['settings.Labels'] === '0' ) ? false : true;
    this.labelIcons = ( this.storage && this.storage['settings.LabelIcons'] === '0' ) ? false : true;

    this.camera = {
      camera: new THREE.Vector3( 0, 80, 100 ),
      target: new THREE.Vector3( 0, 10, 0 ),
      orientation: {
        theta: 0,
        phi: 0.9616764178488756,
        radius: 122.2,
      }
    };

    this.effect = {
      Antialias: true,
      FXAA: false,
      Bloom: false,
    };

    this.control = {
      rotationLocked: ( this.storage && this.storage['control.rotationLocked'] === '1' ) ? true : false,
    };

    this.renderer = {
      Stats: ( this.storage && this.storage['renderer.Stats'] === '1' ) ? true : false,
    };

    this.route = {
      avoidHostile: false,
      avoidOffLimits: false,
      avoidUnknownJumppoints: false,
    };

    // Clean up the mess we made

    this.convertAndRemoveOldSettings();

    // Load configs

    this.cameraDefaults = JSON.parse( JSON.stringify( this.camera ) );
    this.cameraDefaults.camera = new THREE.Vector3();
    this.cameraDefaults.camera.copy( this.camera.camera );
    this.cameraDefaults.target = new THREE.Vector3();
    this.cameraDefaults.target.copy( this.camera.target );

    this.load( 'camera' );

    if ( this.storage && 'route' in this.storage ) {
      this.load( 'route' );
    }

    this.load( 'systems' );
    if ( ! this.systems ) { this.systems = {}; }

    this.load( 'effect' );

    this.mode = ( this.storage && (this.storage.mode === '2d') ) ? '2d' : '3d';

    this.mergeAndRemoveOldSettings();
    this.save( 'systems' );
  }

  load ( key ) {
    if ( this.storage && ( key in this.storage ) ) {
      try {
        this[ key ] = JSON.parse( this.storage[ key ] );
      } catch ( e ) {
        console.error( `Error parsing 'localStorage.${ key }'; ${ e.name }: ${ e.message }` );
      }
    }
  }

  save ( key ) {
    if ( this.storage && ( key in this ) ) {
      this.storage[ key ] = JSON.stringify( this[ key ] );
    }
  }

  convertAndRemoveOldSettings () {
    if ( ! this.storage ) {
      return;
    }

    if ( 'effect.Bloom' in this.storage ) {
      this.effect.Bloom = ( this.storage['effect.Bloom'] === '1' ) ? true : false;
      delete this.storage['effect.Bloom'];
    }

    if ( 'effect.FXAA' in this.storage ) {
      this.effect.FXAA = ( this.storage['effect.FXAA'] === '1' ) ? true : false;
      delete this.storage['effect.FXAA'];
    }

    delete this.storage['camera.x'];
    delete this.storage['camera.y'];
    delete this.storage['camera.z'];
    delete this.storage['target.x'];
    delete this.storage['target.y'];
    delete this.storage['target.z'];
  }

  mergeAndRemoveOldSettings () {
    let property, matches, systemId;

    if ( ! this.storage ) {
      return;
    }

    for ( property in this.storage ) {
      if ( ! this.storage.hasOwnProperty( property ) ) {
        continue;
      }

      matches = property.match( /^bookmarks[.](\d+)$/ );
      if ( matches && (this.storage[ property ] === '1') ) {
        systemId = matches[ 1 ];
        if ( this.systems[ systemId ] !== 'object' ) {
          this.systems[ systemId ] = {};
        }
        this.systems[ systemId ].bookmarked = true;
        delete this.storage[ property ];
      }

      matches = property.match( /^hangarLocation[.](\d+)$/ );
      if ( matches && (this.storage[ property ] === '1') ) {
        systemId = matches[ 1 ];
        if ( this.systems[ systemId ] !== 'object' ) {
          this.systems[ systemId ] = {};
        }
        this.systems[ systemId ].hangarLocation = true;
        delete this.storage[ property ];
      }

      matches = property.match( /^comments[.](\d+)$/ );
      if ( matches && (this.storage[ property ] !== '') ) {
        systemId = matches[ 1 ];
        if ( this.systems[ systemId ] !== 'object' ) {
          this.systems[ systemId ] = {};
        }
        this.systems[ systemId ].comments = this.storage[ property ];
        delete this.storage[ property ];
      }
    }
  }
}

export default new Settings();
