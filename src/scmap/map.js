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
import JumpPoints from './geometry/jump-points';
import DisplayState from './map/display-state';

import THREE from 'three';
import TWEEN from 'tween.js';
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

    const map = this;

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
          grid.position.y = -0.5;
          grid.updateMatrix();
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

    const displayState = new DisplayState({
      mode: settings.mode,
      map: this,
      time: config.time,
    });

    displayState.onUpdate = function ( value ) {
      map.route().removeFromScene(); // TODO: find a way to animate
      map.scene.children.forEach( mesh => {
        if ( typeof mesh.userData.scaleY === 'function' ) {
          mesh.userData.scaleY( mesh, value );
        }
      });
    };

    displayState.onComplete = () => {
      this.route().update();
    };

    displayState.onEnter2D = function () {
      $('#sc-map-3d-mode').prop( 'checked', false );
      settings.mode = '2d';
    };

    displayState.onEnter3D = function () {
      $('#sc-map-3d-mode').prop( 'checked', true );
      settings.mode = '3d';
    };

    this.displayState = displayState;
    if ( config.debug ) {
      console.info( 'DisplayState is', displayState );
    }
  }

  getSelected () {
    return this.__currentlySelected;
  }

  selected () {
    return this.getSelected();
  }

  animate () {
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
      let wantedY = object.userData.systemPosition.y * scalar;
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
      if ( config.debug ) {
        console.log( 'Created new route', this._route.toString() );
      }
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
    const map = this;
    let tween, newPosition, position, poi, graph, route;
    let tweens = [];

    if ( ! ( this._selectorObject.visible ) || ! ( this.getSelected() instanceof System ) ) {
      this._selectorObject.userData.systemPosition.copy( destination.position );
      this._selectorObject.position.copy( destination.sceneObject.position );
      this._selectorObject.visible = true;
      this.getSelected( destination );
      return;
    }

    newPosition = destination.sceneObject.position.clone();
    graph = new Dijkstra( allSystems, this.getSelected(), destination );
    graph.buildGraph();

    route = graph.routeArray( destination );
    if ( route.length <= 1 ) {
      this._selectorObject.userData.systemPosition.copy( destination.position );
      this._selectorObject.position.copy( destination.sceneObject.position );
      this._selectorObject.visible = true;
      this.setSelected( destination );
      return;
    }

    position = {
      x: this._selectorObject.position.x,
      y: this._selectorObject.position.y,
      z: this._selectorObject.position.z
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
          map._selectorObject.position.set( this.x, this.y, this.z );
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
          map._selectorObject.userData.systemPosition.copy( poi.position );
          map._selectorObject.position.copy( poi.sceneObject.position );
          map.setSelected( destination );
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

    // Now we're ready to generate a mesh for the jump points
    const jumpPoints = new JumpPoints( allSystems );
    const mesh = jumpPoints.mesh;
    // Set the 2d/3d tween callback
    mesh.userData.scaleY = function ( mesh, scaleY ) {
      mesh.scale.y = scaleY;
      mesh.updateMatrix();
    };
    mesh.scale.y = this.displayState.currentScale;
    mesh.updateMatrix();
    this.scene.add( mesh );

    console.info( `Populating the scene took ${ new Date().getTime() - startTime } msec` );

    $('#debug-systems').html( `${ systemCount } systems loaded` );

    UI.waitForFontAwesome( () => { this.updateSystems(); } );
  }

  pointAtPlane ( theta, radius, y ) {
    return new THREE.Vector3( radius * Math.cos( theta ), y, -radius * Math.sin( theta ) );
  }
}

export default Map;
