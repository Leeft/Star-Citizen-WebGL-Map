/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import SCMAP from '../scmap';
import System from './system';
import SystemList from './systems';
import { allSystems } from './systems';
import Goods from './goods';
import Faction from './faction';
import Dijkstra from './dijkstra';
import Route from './route';
import UI from './ui';
import config from './config';
import settings from './settings';
import SelectedSystemGeometry from './selected-system-geometry';
import xhrPromise from '../helpers/xhr-promise';
import { hasLocalStorage, hasSessionStorage } from './functions';
import { ui, renderer, scene } from '../starcitizen-webgl-map';
import { buildReferenceGrid } from './basic-grid';

import THREE from 'three';
import TWEEN from 'tween.js';
import StateMachine from 'javascript-state-machine';
import RSVP from 'rsvp';
import $ from 'jquery';

class Map {
  constructor () {
    this.name = `Star Citizen Persistent Universe`;
    this.scene = new THREE.Scene();

    // No editing available for the moment (doesn't work yet)
    this.canEdit = false;
    //$('#map_ui li.editor').hide();

    this._interactables = [];
    this._route = null; // The main route the user can set

    this._selectorObject = this.createSelectorObject( 0x99FF99 );
    this.scene.add( this._selectorObject );

    this._mouseOverObject = this.createSelectorObject( 0x8844FF );
    this._mouseOverObject.scale.set( 4.0, 4.0, 4.0 );
    this.scene.add( this._mouseOverObject );

    this.__currentlySelected = null;

    this.animate = this._animate.bind( this );

    let map = this;

    const getSystems          = xhrPromise( config.systemsJson );
    const getStrategicValues  = xhrPromise( config.strategicValuesJson );
    const getFactions         = xhrPromise( config.factionsJson );
    const getCrimeLevels      = xhrPromise( config.crimeLevelsJson );
    const getGoods            = xhrPromise( config.goodsJson );

    RSVP.all([
      getSystems,
      getStrategicValues,
      getFactions,
      getCrimeLevels,
      getGoods,
    ]).then( function( promises ) {

      getStrategicValues.then( strategic_values => { SCMAP.data.uee_strategic_values = JSON.parse( strategic_values ) } );
      getCrimeLevels.then( crimeLevels => { SCMAP.data.crime_levels = JSON.parse( crimeLevels ) } );

      getFactions.then( factions => { Faction.preprocessFactions( JSON.parse( factions ) ) } );
      getGoods.then( goods => { Goods.preprocessGoods( JSON.parse( goods ) ) } );

      getSystems.then( systems => {
        try {
          systems = JSON.parse( systems );
          map.populate( systems );
        } catch( e ) {
          console.error( `Could not populate map:`, e );
          throw e;
        };

        try {
          const grid = buildReferenceGrid();
          grid.name = 'referenceGrid';
          map.scene.add( grid );
        } catch( e ) {
          console.error( `Failed to create reference grid:`, e );
        };

        ui.updateSystemsList();
        renderer.controls.idle();

        map.route().restoreFromSession();
        map.route().update();

        if ( 'selectedSystem' in settings.storage ) {
          let selectedSystem = System.getById( settings.storage.selectedSystem );
          if ( selectedSystem instanceof System ) {
            map.setSelectionTo( selectedSystem );
            selectedSystem.displayInfo( true );
          }
        }

        renderer.controls.throttledEventListener.init( 'change', function () {
          let rotationMatrix = renderer.cameraRotationMatrix();

          if ( $('#debug-camera-is-moving') ) {
            $('#debug-camera-is-moving').text( 'Camera is moving' );
          }

          renderer.controls.rememberPosition();

          map.scene.traverse( function ( object ) {
            if ( ( object instanceof THREE.Sprite ) && object.userData.isLabel )
            {
              object.position.copy( object.userData.position.clone().applyMatrix4( rotationMatrix ) );
            }
            else if ( object instanceof THREE.LOD )
            {
              object.update( renderer.camera );
            }
          });
        });

        ui.updateHeight();
      }, failed => {
        console.error( 'Failed to process systems', failed );
      });

    }, ( failure ) => {
      console.error( `Failed loading data:`, failure );
    });

    this.displayState = this.buildDisplayModeFSM( settings.mode );
  }

  getSelected () {
    return this.__currentlySelected;
  }

  selected () {
    return this.getSelected();
  }

  _animate () {
    let rotationY = THREE.Math.degToRad( Date.now() * 0.00025 ) * 300;
    this.scene.traverse( function ( object ) {
      if ( object.userData.isSelector ) {
        object.rotation.y = rotationY;
      }
    });
  }

  setSelected ( system ) {
    if ( system !== null && ! ( system instanceof System ) ) {
      throw new Error( system, 'is not an instance of System' );
    }
    this.__currentlySelected = system;
    if ( system ) {
      settings.storage.selectedSystem = system.id;
    } else {
      delete settings.storage.selectedSystem;
    }
    return system;
  }

  createSelectorObject ( color ) {
    let mesh = new THREE.Mesh( SelectedSystemGeometry, new THREE.MeshBasicMaterial({ color: color }) );
    mesh.scale.set( 4.2, 4.2, 4.2 );
    mesh.visible = false;
    mesh.userData.systemPosition = new THREE.Vector3( 0, 0, 0 );
    mesh.userData.isSelector = true;
    // 2d/3d tween callback
    mesh.userData.scaleY = function ( object, scalar ) {
      let wantedY = object.userData.systemPosition.y * ( scalar / 100 );
      object.translateY( wantedY - object.position.y );
    };
    return mesh;
  }

  __updateSelectorObject ( system ) {
    if ( system instanceof System ) {
      this._selectorObject.visible = true;
      this._selectorObject.userData.systemPosition.copy( system.position );
      //this._selectorObject.position.copy( system.sceneObject.position );
      this.moveSelectorTo( system );
      this.setSelected( system );
    } else {
      this._selectorObject.visible = false;
      this.setSelected( null );
    }
  }

  // Lazy builds the route
  route () {
    if ( !( this._route instanceof Route ) ) {
      this._route = new Route();
      console.log( 'Created new route', this._route.toString() );
    }
    return this._route;
  }

  setSelectionTo ( system ) {
    return this.__updateSelectorObject( system );
  }

  getSystemByName ( name ) {
    return System.getByName( name );
  }

  interactables () {
    return this._interactables;
  }

  deselect () {
    return this.__updateSelectorObject();
  }

  updateSystems () {
    allSystems.forEach( system => {
      system.updateSceneObject( this.scene );
    });
  }

  setAllLabelSizes ( vector ) {
    allSystems.forEach( system => {
      system.setLabelScale( vector );
    });
  }

  moveSelectorTo ( destination ) {
    let tween, newPosition, position, _this = this, poi, graph, route;
    let tweens = [];

    if ( ! ( _this._selectorObject.visible ) || ! ( _this.getSelected() instanceof System ) ) {
      _this._selectorObject.userData.systemPosition.copy( destination.position );
      _this._selectorObject.position.copy( destination.sceneObject.position );
      _this._selectorObject.visible = true;
      _this.getSelected( destination );
      return;
    }

    newPosition = destination.sceneObject.position.clone();
    graph = new Dijkstra( allSystems, _this.getSelected(), destination );
    graph.buildGraph();

    route = graph.routeArray( destination );
    if ( route.length <= 1 ) {
      _this._selectorObject.userData.systemPosition.copy( destination.position );
      _this._selectorObject.position.copy( destination.sceneObject.position );
      _this._selectorObject.visible = true;
      _this.setSelected( destination );
      return;
    }

    position = {
      x: _this._selectorObject.position.x,
      y: _this._selectorObject.position.y,
      z: _this._selectorObject.position.z
    };

    /* jshint ignore:start */
    for ( let i = 0; i < route.length - 1; i++ ) {
      poi = route[ i + 1 ].system;

      tween = new TWEEN.Tween( position )
        .to( {
          x: poi.sceneObject.position.x,
          y: poi.sceneObject.position.y,
          z: poi.sceneObject.position.z
        }, 800 / ( route.length - 1 ) )
      .easing( TWEEN.Easing.Linear.None )
        .onUpdate( function () {
          _this._selectorObject.position.set( this.x, this.y, this.z );
        } );

      if ( i == 0 ) {
        if ( route.length == 2 ) {
          tween.easing( TWEEN.Easing.Cubic.InOut );
        } else {
          tween.easing( TWEEN.Easing.Cubic.In );
        }
      }

      if ( i > 0 ) {
        tweens[ i - 1 ].chain( tween );
      }

      if ( i == route.length - 2 ) {
        tween.easing( TWEEN.Easing.Cubic.Out );
        tween.onComplete( function() {
          _this._selectorObject.userData.systemPosition.copy( poi.position );
          _this._selectorObject.position.copy( poi.sceneObject.position );
          _this.setSelected( destination );
        } );
      }

      tweens.push( tween );
    }
    /* jshint ignore:end */

    tweens[0].start();
  }

  populate( data ) {
    let systemCount = 0;

    const startTime = new Date().getTime();

    SystemList.preprocessSystems( data );

    // First we go through the data to build the basic systems
    allSystems.forEach( system => {
      let sceneObject = system.buildSceneObject();
      this.scene.add( sceneObject );
      this._interactables.push( sceneObject.userData.interactable );
      systemCount++;
      system.sceneObject = sceneObject;
    });

    // Then we go through again and add the routes in a second pass
    allSystems.forEach( system => {
      system.jumpPoints.forEach( jumpPoint => {
        let jumpPointObject = jumpPoint.buildSceneObject();
        if ( jumpPointObject instanceof THREE.Object3D ) {
          system._routeObjects.push( jumpPointObject );
          this.scene.add( jumpPointObject );
        }
      });
    });

    console.log( `Populating the scene took ${ new Date().getTime() - startTime } msec` );

    $('#debug-systems').html( `${ systemCount } systems loaded` );

    UI.waitForFontAwesome( () => { this.updateSystems(); } );
  }

  pointAtPlane ( theta, radius, y ) {
    return new THREE.Vector3( radius * Math.cos( theta ), y, -radius * Math.sin( theta ) );
  }

  buildDisplayModeFSM ( initialState ) {
    let tweenTo2d, tweenTo3d, position, fsm;
    let map = this;

    position = { y: ( initialState === '3d' ) ? 100 : 0.5 };

    tweenTo2d = new TWEEN.Tween( position )
      .to( { y: 0.5 }, 1000 )
      .easing( TWEEN.Easing.Cubic.InOut )
      .onUpdate( function () {
        map.route().removeFromScene(); // TODO: find a way to animate
        map.scene.children.forEach( child => {
          if ( typeof child.userData.scaleY === 'function' ) {
            child.userData.scaleY( child, this.y );
          }
        });
      } );

    tweenTo3d = new TWEEN.Tween( position )
      .to( { y: 100.0 }, 1000 )
      .easing( TWEEN.Easing.Cubic.InOut )
      .onUpdate( function () {
        map.route().removeFromScene(); // TODO: find a way to animate
        map.scene.children.forEach( child => {
          if ( typeof child.userData.scaleY === 'function' ) {
            child.userData.scaleY( child, this.y );
          }
        });
      } );

    fsm = StateMachine.create({
      initial: initialState || '3d',

      events: [
        { name: 'to2d',  from: '3d', to: '2d' },
        { name: 'to3d', from: '2d', to: '3d' }
      ],

      callbacks: {
        onenter2d: function() {
          $('#sc-map-3d-mode').prop( 'checked', false );
          settings.storage.mode = '2d';
        },

        onenter3d: function() {
          $('#sc-map-3d-mode').prop( 'checked', true );
          settings.storage.mode = '3d';
        },

        onleave2d: function() {
          tweenTo3d.onComplete( function() {
            fsm.transition();
            map.route().update();
          });
          tweenTo3d.start();
          return StateMachine.ASYNC;
        },

        onleave3d: function() {
          tweenTo2d.onComplete( function() {
            fsm.transition();
            map.route().update();
          });
          tweenTo2d.start();
          return StateMachine.ASYNC;
        },
      },

      error: function( eventName, from, to, args, errorCode, errorMessage ) {
        console.log( 'event ' + eventName + ' was naughty : ' + errorMessage );
      }
    });

    return fsm;
  }
}

export default Map;
