/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import SCMAP from '../scmap';
import Faction from './faction';
import UI from './ui';
import JumpPoint from './jump-point';
import MapSymbol from './symbol';
import MapSymbols from './symbols';
import config from './config';
import settings from './settings';
import { storage } from './settings';
import { ui, renderer, scene, map } from '../starcitizen-webgl-map';

import THREE from 'three';
import Label from 'leeft/three-sprite-texture-atlas-manager/src/label';
import markdown from 'markdown';

const BLACK = new THREE.Color( 'black' );
const UNSET = new THREE.Color( 0x80A0CC );

const GLOW_SCALE = 5.5;
const LABEL_SCALE = 5;

const STAR_LOD_MESHES = [
   [ new THREE.IcosahedronGeometry( 1, 3 ),  20 ],
   [ new THREE.IcosahedronGeometry( 1, 2 ), 150 ],
   [ new THREE.IcosahedronGeometry( 1, 1 ), 250 ],
   [ new THREE.IcosahedronGeometry( 1, 0 ), 500 ]
];

const STAR_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xFFFFFF,
  name: 'STAR_MATERIAL',
});

const INTERACTABLE_DEBUG_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xFFFF00,
  depthWrite: false,
  map: null,
  blending: THREE.AdditiveBlending,
});

const GLOW_MATERIAL_PROMISE = new Promise( function ( resolve, reject ) {
  const loader = new THREE.TextureLoader();
  loader.load(
    config.glowImage,
    function ( texture ) {
      resolve( new THREE.SpriteMaterial({
        map: texture,
        blending: THREE.AdditiveBlending,
      }));
    },
    function ( /* progress */ ) {},
    function ( failure ) {
      reject( new Error( `Could not load texture ${ config.glowImage }: ${ failure }` ) );
    }
  );
});

class System {
  constructor ( data ) {
    this.id = undefined;
    this.uuid = undefined;
    this.name = THREE.Math.generateUUID();
    this.nickname = '';
    this.position = new THREE.Vector3();
    this.faction = new Faction();
    this.size = 'medium';
    this.jumpPoints = [];
    this.poi = [];
    this.color = new THREE.Color( 0xFFFFFF );
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

    // Generated, internal
    this._routeObjects = [];
  }

  buildSceneObject () {
    // Grouping all our system related objects in here
    const sceneObject = new THREE.Object3D();

    // To make systems easier to click, we add an invisible sprite to them
    // (probably also easier for the raycaster) and use that as the object
    // to interact with rather than the other objects
    const interactable = new THREE.Sprite( INTERACTABLE_DEBUG_MATERIAL );
    const interactableSize = Math.min( 5.75, Math.max( 5.5, 6 * this.scale ) );
    interactable.scale.set( interactableSize, interactableSize, interactableSize );
    sceneObject.userData.interactable = interactable;
    sceneObject.add( interactable );

    const scale = this.scale * settings.systemScale;

    // LOD for the stars to make them properly rounded when viewed up close
    // yet low on geometry at a distance
    const starLOD = new THREE.LOD();
    for ( let i = 0; i < STAR_LOD_MESHES.length; i++ ) {
      const star = new THREE.Mesh( STAR_LOD_MESHES[ i ][ 0 ], System.starMaterial() );
      star.scale.set( this.scale, this.scale, this.scale );
      star.updateMatrix();
      star.matrixAutoUpdate = false;
      starLOD.addLevel( star, STAR_LOD_MESHES[ i ][ 1 ] );
    }

    starLOD.scale.set( settings.systemScale, settings.systemScale, settings.systemScale );
    starLOD.updateMatrix();
    starLOD.matrixAutoUpdate = false;
    starLOD.userData.scale = settings.systemScale;
    starLOD.userData.isSystem = true;
    sceneObject.userData.starLOD = starLOD;
    sceneObject.add( starLOD );

    // Glow sprite for the star
    GLOW_MATERIAL_PROMISE.then( material => {
      const color = this.color;
      if ( color.equals( BLACK ) ) {
        color.copy( UNSET );
      }

      material = material.clone();
      material.color = color;

      const glow = new THREE.Sprite( material );
      glow.scale.set( GLOW_SCALE * scale, GLOW_SCALE * scale, 1.0 );
      glow.position.set( 0, 0, -0.2 );
      glow.userData.isGlow = true;
      glow.userData.scale = this.scale;
      glow.sortParticles = true;
      glow.visible = settings.glow;
      sceneObject.userData.glowSprite = glow;
      sceneObject.add( glow );
    });

    //if ( ! UI.fontAwesomeIsReady ) {
    //  drawSymbols = false;
    //}

    this.label = new Label({
      textureManager: renderer.textureManager,
      text:           this.name,
      addTo:          sceneObject,
      fillStyle:      this.factionStyle(),
      bold:           true,
    });

    if ( config.quality === 'low' ) {
      this.label.scale = 0.75;
      this.label.opacity = 1.0;
    }

    if ( this.isUnknown() ) {
      this.label.scale *= 0.5;
    }

    this.label.createSprite();
    const labelScale = settings.labelScale * LABEL_SCALE * ( ( this.isUnknown() ) ? 0.5 : 1 );
    this.label.sprite.scale.set( labelScale * ( this.label.node.width / this.label.node.height ), labelScale, 1 );

    this.label.sprite.userData.position = new THREE.Vector3( 0, - settings.labelOffset, - 0.1 );
    let spriteOffset = this.label.sprite.userData.position.clone();
    spriteOffset.applyMatrix4( renderer.cameraRotationMatrix() );
    this.label.sprite.position.copy( spriteOffset );

    this.label.sprite.userData.isLabel = true;

    //systemLabel ( drawSymbols, sceneObject ) {

    //  //if ( drawSymbols ) {
    //  //  label.drawSymbols();
    //  //}

    //  //label.positionSprite( renderer.cameraRotationMatrix() );
    //  //label.scaleSprite();

    //  return label;
    //}

    //if ( this.label && this.label.sceneObject ) {
    //  console.log( `systemLabel for ${ this.name }:`, this.label );
    //  this.label.sceneObject.userData.isLabel = true;
    //  this.label.sceneObject.visible = settings.labels;
    //  sceneObject.add( this.label.sceneObject );
    //}

    sceneObject.position.copy( this.position );
    if ( storage && storage.mode === '2d' ) {
      sceneObject.position.setY( sceneObject.position.y * 0.005 );
    }

    sceneObject.userData.system = this;
    sceneObject.userData.scaleY = this.scaleY;
    return sceneObject;
  }

  updateSceneObject ( scene ) {
    for ( let i = 0; i < this.sceneObject.children.length; i++ ) {
      let object = this.sceneObject.children[i];
      if ( object.userData.isLabel ) {
        // FIXME
        //if ( this.label instanceof Label ) {
        //  this.label.update( settings.labelIcons );
        //}
        const labelScale = settings.labelScale * LABEL_SCALE * ( ( this.isUnknown() ) ? 0.5 : 1 );
        object.scale.set( labelScale * ( this.label.node.width / this.label.node.height ), labelScale, 1 );
        object.visible = settings.labels;
      } else if ( object.userData.isGlow ) {
        object.visible = settings.glow;
      }
    }
  }

  //setLabelScale ( vector ) {
  //  for ( let i = 0; i < this.sceneObject.children.length; i++ ) {
  //    if ( this.sceneObject.children[i].userData.isLabel ) {
  //      this.sceneObject.children[i].scale.copy( vector );
  //    }
  //  }
  //}

  static starMaterial () {
    return STAR_MATERIAL;
  }

  createInfoLink ( noSymbols, noTarget ) {
    let $line = $( '<a></a>' );

    if ( typeof this.faction !== 'undefined' && typeof this.faction !== 'undefined' ) {
      $line.css( 'color', this.faction.color.getStyle() );
    }

    $line.addClass('system-link');
    $line.attr( 'data-goto', 'system' );
    $line.attr( 'data-system', this.id );
    $line.attr( 'href', '#system=' + encodeURIComponent( this.name ) );
    $line.attr( 'title', 'Show information on ' + this.name );
    if ( noTarget ) {
      $line.text( this.name );
    } else {
      $line.html( '<i class="fa fa-crosshairs"></i>&nbsp;' + this.name );
    }

    if ( !noSymbols )
    {
      let symbols = this.getSymbols();
      if ( symbols.length )
      {
        let $span = $('<span class="icons"></span>');
        for ( let i = 0; i < symbols.length; i++ ) {
          $span.append( MapSymbol.getTag( symbols[i] ) );
        }
        $line.append( $span );
      }
    }

    return $line;
  }

  symbolsToKey ( symbols ) {
    let list = [];
    for ( let i = 0; i < symbols.length; i++ ) {
      list.push( symbols[i].code );
    }
    return list.join( ';' );
  }

  getIcons () {
    return this.getSymbols();
  }

  getSymbols () {
    let mySymbols = [];
    if ( false && this.name === 'Sol' ) {
      mySymbols.push( MapSymbols.DANGER );
      mySymbols.push( MapSymbols.WARNING );
      mySymbols.push( MapSymbols.INFO );
      mySymbols.push( MapSymbols.TRADE );
      mySymbols.push( MapSymbols.BANNED );
      mySymbols.push( MapSymbols.HANGAR );
      mySymbols.push( MapSymbols.BOOKMARK );
      mySymbols.push( MapSymbols.AVOID );
      mySymbols.push( MapSymbols.COMMENTS );
      return mySymbols;
    }

    if ( this.faction.isHostileTo( SCMAP.usersFaction() ) ) { mySymbols.push( MapSymbols.DANGER ); }
    if ( this.hasWarning )      { mySymbols.push( MapSymbols.WARNING ); }
    if ( this.info.length )     { mySymbols.push( MapSymbols.INFO ); }
    if ( this.isMajorTradeHub ) { mySymbols.push( MapSymbols.TRADE ); }
    if ( this.isOffLimits )     { mySymbols.push( MapSymbols.BANNED ); }
    if ( this.hasHangar() )     { mySymbols.push( MapSymbols.HANGAR ); }
    if ( this.isBookmarked() )  { mySymbols.push( MapSymbols.BOOKMARK ); }
    if ( this.isToBeAvoided() ) { mySymbols.push( MapSymbols.AVOID ); }
    if ( this.hasComments() )   { mySymbols.push( MapSymbols.COMMENTS ); }

    return mySymbols;
  }

  displayInfo ( doNotSwitch ) {
    let me = this;
    let previous = null;
    let next = null;
    let currentStep = map.route().indexOfCurrentRoute( this );

    if ( typeof currentStep === 'number' )
    {
      let currentRoute = map.route().currentRoute();

      if ( currentStep > 0 ) {
        previous = currentRoute[ currentStep - 1 ].system;
        if ( ( currentStep > 1 ) && ( previous === currentRoute[ currentStep ].system ) ) {
          previous = currentRoute[ currentStep - 2 ].system;
        }
        previous = previous;
      }

      if ( currentStep < ( currentRoute.length - 1 ) ) {
        next = currentRoute[ currentStep + 1 ].system;
        if ( ( currentStep < ( currentRoute.length - 2 ) ) && ( next === currentRoute[ currentStep ].system ) ) {
          next = currentRoute[ currentStep + 2 ].system;
        }
      }
    }

    let $element = $( UI.Tab('system').id )
      .empty()
      .append( UI.Templates.systemInfo({
        previous: previous,
        system: me,
        next: next
      }));

    // Set user's notes and bookmarks
    $element.find('.user-system-ishangar').prop( 'checked', this.hasHangar() ).attr( 'data-system', this.id );
    $element.find('.user-system-bookmarked').prop( 'checked', this.isBookmarked() ).attr( 'data-system', this.id );
    $element.find('.user-system-avoid').prop( 'checked', this.isToBeAvoided() ).attr( 'data-system', this.id );

    if ( this.hasComments() ) {
      $element.find('.user-system-comments').empty().val( this.getComments() );
      $element.find('.user-system-comments-md').html( $( markdown.toHTML( this.getComments() ) ) );
    } else {
      $element.find('.user-system-comments').empty().val('');
      $element.find('.user-system-comments-md').empty();
    }

    if ( !doNotSwitch ) {
      ui.toTab( 'system' );
      ui.updateHeight();
    }
  }

  // 2d/3d tween callback
  scaleY ( object, scalar ) {
    let wantedY = object.userData.system.position.y * ( scalar / 100 );
    object.userData.system.sceneObject.translateY( wantedY - object.userData.system.sceneObject.position.y );
    object.userData.system.routeNeedsUpdate();
    return this;
  }

  moveTo ( vector ) {
    this.system.sceneObject.position.copy( vector );
    this.system.routeNeedsUpdate();
    return this;
  }

  translateVector ( vector ) {
    this.system.sceneObject.add( vector );
    this.system.routeNeedsUpdate();
    return this;
  }

  routeNeedsUpdate () {
    for ( let j = 0; j < this._routeObjects.length; j++ ) {
      this._routeObjects[j].geometry.verticesNeedUpdate = true;
    }
    return this;
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

      destination = System.getById( jumpPoint.destinationSystemId );

      if ( destination instanceof System ) {
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
        console.log( `System: "${ key }" parameter is undefined for "${ this.name }"` );
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

        if ( currentValue instanceof THREE.Color ) {

          if ( newValue instanceof THREE.Color ) {
            this[ key ] = newValue;
          } else {
            newValue = newValue.replace( '0x', '#' );
            this[ '_' + key ] = newValue;
            if ( /unknown/.test( newValue ) ) {
              this[ key ] = UNSET;
            } else {
              this[ key ] = new THREE.Color( newValue );
            }
          }

        } else if ( currentValue instanceof Faction ) {

          this[ key ] = newValue.claim( this );

        } else if ( currentValue instanceof THREE.Vector3 && newValue instanceof THREE.Vector3 ) {

          currentValue.copy( newValue );

        } else if ( currentValue instanceof THREE.Vector3 ) {

          if ( newValue instanceof THREE.Vector3 ) {
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

    if ( json instanceof System ) {
      return json;
    }

    return new System({
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

export default System;
export { GLOW_SCALE };
