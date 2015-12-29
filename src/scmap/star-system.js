/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import SCMAP from '../scmap';
import Faction from './faction';
import JumpPoint from './jump-point';
import MapSymbols from './ui/symbols';
import config from './config';
import settings from './settings';
import { map } from '../starcitizen-webgl-map';
import { Color, Vector3 } from './three';
import { generateUUID } from './three/math';

const UNSET = new Color( 0x80A0CC );

class StarSystem {
  constructor ( data ) {
    this.id = undefined;
    this.uuid = undefined;
    this.name = generateUUID();
    this.nickname = '';
    this.position = new Vector3();
    this.faction = new Faction();
    this.size = 'medium';
    this.jumpPoints = [];
    this.poi = [];
    this.color = new Color( 0xFFFFFF );
    this.planets = 0;
    this.planetaryRotation = [];
    this.import = [];
    this.export = [];
    this.status = 'unknown';
    this.crimeStatus = '';
    this.blackMarket = [];
    this.ueeStrategicValue = undefined;
    this.info = [];
    this.scale = 1.0;
    this.binary = false;
    this.isOffLimits = false;
    this.hasWarning = false;
    this.isMajorTradeHub = false;

    this.setValues( data );
  }

  getIcons () {
    const myIcons = [];

    //if ( true && ( this.name === 'Sol' || /^Unknown/.test( this.name ) ) ) {
    //  myIcons.push( MapSymbols.DANGER );
    //  myIcons.push( MapSymbols.WARNING );
    //  myIcons.push( MapSymbols.HANGAR );
    //  myIcons.push( MapSymbols.INFO );
    //  myIcons.push( MapSymbols.TRADE );
    //  myIcons.push( MapSymbols.BANNED );
    //  myIcons.push( MapSymbols.AVOID );
    //  myIcons.push( MapSymbols.COMMENTS );
    //  myIcons.push( MapSymbols.BOOKMARK );
    //  return myIcons;
    //}

    if ( this.faction.isHostileTo( SCMAP.usersFaction() ) ) { myIcons.push( MapSymbols.DANGER ); }
    if ( this.hasWarning )      { myIcons.push( MapSymbols.WARNING ); }
    if ( this.info.length )     { myIcons.push( MapSymbols.INFO ); }
    if ( this.isMajorTradeHub ) { myIcons.push( MapSymbols.TRADE ); }
    if ( this.isOffLimits )     { myIcons.push( MapSymbols.BANNED ); }
    if ( this.hasHangar() )     { myIcons.push( MapSymbols.HANGAR ); }
    if ( this.isBookmarked() )  { myIcons.push( MapSymbols.BOOKMARK ); }
    if ( this.isToBeAvoided() ) { myIcons.push( MapSymbols.AVOID ); }
    if ( this.hasComments() )   { myIcons.push( MapSymbols.COMMENTS ); }

    return myIcons;
  }

  refreshIcons () {
    this.label.icons = ( settings.labelIcons ) ? this.getIcons() : [];
    this.label.redraw();
    this.refreshScale( this.labelScale );
  }

  get labelScale () {
    return ( settings.labelScale * config.labelScale * ( ( this.isUnknown() ) ? 0.5 : 1 ) );
  }

  // TODO: Move this helper to label class
  refreshScale ( scale ) {
    this.label.sprite.scale.set( scale * ( this.label.node.width / this.label.node.height ), scale, 1 );
  }

  // Returns the jumppoint leading to the given destination
  jumpPointTo ( destination ) {
    for ( let i = 0; i < this.jumpPoints.length; i++ ) {
      if ( this.jumpPoints[i].destination === destination ) {
        return this.jumpPoints[i];
      }
    }
  }

  isBookmarked ( ) {
    return this.storedSettings().bookmarked === true;
  }

  isUnknown () {
    return ( this.status === 'unknown' ) ? true : false;
  }

  setBookmarkedState ( state ) {
    this.storedSettings().bookmarked = ( state ) ? true : false;
    this.saveSettings();
    return this;
  }

  hasHangar () {
    return this.storedSettings().hangarLocation === true;
  }

  setHangarState ( state ) {
    this.storedSettings().hangarLocation = ( state ) ? true : false;
    this.saveSettings();
    return this;
  }

  isToBeAvoided () {
    return this.storedSettings().avoid === true;
  }

  setToBeAvoidedState ( state ) {
    this.storedSettings().avoid = ( state ) ? true : false;
    this.saveSettings();
    return this;
  }

  hasComments () {
    return( ( typeof this.storedSettings().comments === 'string' ) && ( this.storedSettings().comments.length > 0 ) );
  }

  getComments () {
    return this.storedSettings().comments;
  }

  setComments ( comments ) {
    if ( ( typeof comments === 'string' ) && ( comments.length > 1 ) ) {
      this.storedSettings().comments = comments;
    } else {
      delete this.storedSettings().comments;
    }
    this.saveSettings();
    return this;
  }

  storedSettings () {
    if ( !( this.id in settings.systems ) ) {
      settings.systems[ this.id ] = {};
    }
    return settings.systems[ this.id ];
  }

  saveSettings () {
    settings.save('systems');
    return this;
  }

  toString () {
    return this.name;
  }

  getValue ( key ) {
    if ( key === undefined ) {
      return;
    }
    let value = this[ key ];
    return value;
  }

  factionStyle () {
    return this.faction.color.getStyle();
  }

  _fixJumpPoints( cleanup ) {
    let i, jumpPoint, destination, jumpPoints = [];

    for ( i = 0; i < this.jumpPoints.length; i++ )
    {
      jumpPoint = this.jumpPoints[ i ];

      if ( jumpPoint instanceof JumpPoint ) {
        continue;
      }

      destination = StarSystem.getById( jumpPoint.destinationSystemId );

      if ( destination instanceof StarSystem ) {
        jumpPoint = new JumpPoint({
          source: this,
          destination: destination,
          name: jumpPoint.name,
          type: jumpPoint.type,
          entryAU: jumpPoint.coordsAu
        });
        if ( cleanup ) {
          jumpPoints.push( jumpPoint );
        } else {
          system.jumpPoints[ i ] = jumpPoint;
        }
      }
    }

    if ( cleanup ) {
      this.jumpPoints = jumpPoints;
    }

    return this;
  }

  setValues ( values ) {
    let key, currentValue, newValue, jumpPoint;

    if ( values === undefined ) {
      return;
    }

    for ( key in values ) {
      newValue = values[ key ];
      if ( newValue === undefined ) {
        console.log( `StarSystem: "${ key }" parameter is undefined for "${ this.name }"` );
        continue;
      }

      if ( key in this )
      {
        currentValue = this[ key ];

        if ( key == 'size' ) {
          switch ( newValue ) {
            case 'dwarf': this.scale = 0.90; break;
            case 'medium': this.scale = 1.0; break;
            case 'large': this.scale = 1.15; break;
            case 'giant': this.scale = 1.27; break;
            case 'binary': this.scale = 1.4; this.binary = true; break;
          }
          this[ key ] = newValue;
        }

        if ( currentValue instanceof Color ) {

          if ( newValue instanceof Color ) {
            this[ key ] = newValue;
          } else {
            newValue = newValue.replace( '0x', '#' );
            this[ '_' + key ] = newValue;
            if ( /unknown/.test( newValue ) ) {
              this[ key ] = UNSET;
            } else {
              this[ key ] = new Color( newValue );
            }
          }

        } else if ( currentValue instanceof Faction ) {

          this[ key ] = newValue.claim( this );

        } else if ( currentValue instanceof Vector3 && newValue instanceof Vector3 ) {

          currentValue.copy( newValue );

        } else if ( currentValue instanceof Vector3 ) {

          if ( newValue instanceof Vector3 ) {
            currentValue.copy( newValue );
          } else if ( newValue instanceof Array ) {
            currentValue.fromArray( newValue );
          }

        } else {

          this[ key ] = newValue;

        }
      }
    }
  }

  static fromJSON ( json ) {
    let system;

    if ( json instanceof StarSystem ) {
      return json;
    }

    return new StarSystem({
      'id': json.systemId,
      'uuid': json.uuid,
      'name': json.name,
      'position': json.coords,
      'scale': json.scale || 1.0,
      'color': json.color,
      'faction': Faction.getById( json.factionId ),
      'isMajorTradeHub': json.isMajorTradeHub,
      'hasWarning': json.hasWarning,
      'isOffLimits': json.isOffLimits,
      'nickname': json.nickname,
      'size': json.size,
      'info': json.info,
      'status': json.status,
      'crimeStatus': SCMAP.data.crime_levels[ json.crimeLevel ],
      'ueeStrategicValue': SCMAP.data.uee_strategic_values[ '' + json.ueeStrategicValue ],
      'import': json.import,
      'export': json.export,
      'blackMarket': json.blackMarket,
      'planets': [], // TODO
      'planetaryRotation': [], // TODO
      'jumpPoints': json.jumpPoints,
    });
  }

  static getByName ( name ) {
    return SCMAP.data.systems[ name ];
  }

  static getById ( id ) {
    return SCMAP.data.systemsById[ id ];
  }
}

export default StarSystem;
