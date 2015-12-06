/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

import SCMAP from '../scmap';
import System, { GLOW_SCALE } from './system';
import MapSymbol from './symbol';
import MapSymbols from './symbols';
import { allSystems } from './systems';
import settings from './settings';
import { hasLocalStorage, hasSessionStorage } from './functions';
import { renderer } from '../starcitizen-webgl-map';

// Import the templates
import helpers from './ui/helpers';
import partials from './ui/partials';
import uiTemplate from '../template/ui-panel.hbs!';
import systemInfoTemplate from '../template/partial/system-info.hbs!';
import listingsTemplate from '../template/partial/systems-listing.hbs!';
import routeListingTemplate from '../template/partial/route-list.hbs!';

import markdown from 'markdown';
import THREE from 'three';
import $ from 'jquery';

import tabs from 'jquery-ui/ui/tabs';
import slider from 'jquery-ui/ui/slider';
import jscrollpane from 'jscrollpane';
import imagesLoaded from 'imagesloaded';

class UI {
  constructor ( map ) {
    let selectedSystem = null;
    if ( 'selectedSystem' in settings.storage ) {
      selectedSystem = System.getById( settings.storage.selectedSystem );
      if ( selectedSystem instanceof System ) {
        map.setSelectionTo( selectedSystem );
      } else {
        selectedSystem = null;
      }
    }

    this.map = map;

    let icons = [];
    for ( let icon in MapSymbols ) {
      icon = MapSymbols[ icon ];
      icons.push( $('<span><i class="fa-li fa ' + icon.faClass + '"></i>' + icon.description + '</span>' ).css( 'color', icon.color ).outerHtml() );
    }

    const ui = this;

    $('#sc-map-interface').empty().append(
      UI.Templates.mapUI({
        instructions: [
          `Left-click and release to select a system.`,
          `Left-click and drag from system to system to map a route between them.`,
          `Left-click and drag any waypoint on the route to move it. It moves an existing waypoint or creates new waypoints as needed.`,
          `Left-click and drag on the map to rotate the camera around the center of the map.`,
          `Mousewheel to zoom in and out, middle-click and drag can also be used.`,
          `Right-click to pan the camera around the map.`
        ],
        shortcuts: [
          { key: `R`,   description: `Reset camera orientation` },
          { key: `C`,   description: `Camera to center (Sol)` },
          { key: `T`,   description: `Top-down camera` },
          { key: `L`,   description: `Lock/unlock camera rotation` },
          { key: `2`,   description: `Switch to 2D mode` },
          { key: `3`,   description: `Switch to 3D mode` },
          { key: `Esc`, description: `Deselect target` }
        ],
        icons: icons,
        systemGroups: UI.buildDynamicLists(),
        system: selectedSystem,
        settings: {
          glow: settings.glow,
          labels: settings.labels,
          labelIcons: settings.labelIcons,
          effect: {
            Antialias: settings.effect.Antialias,
            FXAA: settings.effect.FXAA,
            Bloom: settings.effect.Bloom
          }
        },
        route: map.route().buildTemplateData()
      })
    );

    $( UI.menuBar ).each( function ( i, menuItem ) {
      $('#sc-map-interface ul.menubar').append( menuItem );
    });

    $('#sc-map-3d-mode')
      .prop( 'checked', settings.mode === '3d' )
      .on( 'change', () => {
        if ( this.checked ) {
          this.map.displayState.to3d();
        } else {
          this.map.displayState.to2d();
        }
      });

    $('#sc-map-lock-rotation')
      .prop( 'checked', settings.control.rotationLocked )
      .on( 'change', function() {
        renderer.controls.noRotate = this.checked;
        settings.storage['control.rotationLocked'] = ( this.checked ) ? '1' : '0';
      });

    $('#sc-map-resetCamera').on( 'click', function() {
      renderer.controls.cameraTo(
        settings.cameraDefaults.target,
        settings.cameraDefaults.orientation.theta,
        settings.cameraDefaults.orientation.phi,
        settings.cameraDefaults.orientation.radius
        );
    });

    $('#sc-map-centreCamera').on( 'click', function() {
      renderer.controls.moveTo( settings.cameraDefaults.target );
    });

    $('#sc-map-northCamera').on( 'click', function() {
      renderer.controls.rotateTo( 0, undefined, undefined );
    });

    $('#sc-map-topCamera').on( 'click', function() {
      renderer.controls.rotateTo( 0, 0, 180 );
    });

    $('#sc-map-top2D').on( 'click', () => {
      renderer.controls.noRotate = true;
      $('#sc-map-lock-rotation').prop( 'checked', true );
      this.map.displayState.to2d();
      renderer.controls.rotateTo( 0, 0, 180 );
    });

    let tabIndex = 0;
    if ( hasSessionStorage() && ( 'scMapTab' in window.sessionStorage ) ) {
      let defaultTab = UI.Tab( window.sessionStorage.scMapTab );
      if ( defaultTab ) {
        tabIndex = defaultTab.index;
      }
    }

    $('#sc-map-interface').tabs({
      active: tabIndex,
      activate: ( event, ui ) => {
        event.preventDefault();
        let clicked_on = ui.newTab.find('a').data('tab');
        let tab = UI.Tab( clicked_on );

        switch ( clicked_on ) {

          case 'systems':
            this.updateSystemsList();
            break;

          default:
            $('#sc-map-webgl-container').removeClass('edit');
            //window.editor.enabled = false;
            //window.controls.requireAlt = false;
            //if ( clicked_on === '#info' && map.selected() instanceof System ) {
            //   map.selected().displayInfo();
            //}
            break;
        }

        if ( hasSessionStorage() ) {
          settings.storage.scMapTab = clicked_on;
        }

        /* Browsers show an ugly URL bar if href is set to #, this
         * makes the HTML invalid but removes the ugly URL bar */
        $(`#sc-map-interface a[href="#"]`).removeAttr('href');

        this.updateHeight();
        this.toTabTop();
      }
    });

    $('#sc-map-toggle-glow').prop( 'checked', settings.glow );
    $('#sc-map-toggle-labels').prop( 'checked', settings.labels );
    $('#sc-map-toggle-label-icons').prop( 'checked', settings.labelIcons );

    // Some simple UI stuff

    $('#sc-map-interface').on( 'change', '.sc-map-avoid-hostile', function() {
      settings.route.avoidHostile = this.checked;
      settings.save( 'route' );
      map.route().update();
      map.route().storeToSession();
    });

    $('#sc-map-interface').on( 'change', '.sc-map-avoid-unknown-jumppoints', function() {
      settings.route.avoidUnknownJumppoints = this.checked;
      settings.save( 'route' );
      map.route().update();
      map.route().storeToSession();
    });

    $('#sc-map-interface').on( 'change', '.sc-map-avoid-off-limits', function() {
      settings.route.avoidOffLimits = this.checked;
      settings.save( 'route' );
      map.route().update();
      map.route().storeToSession();
    });

    // UI width slider / settings handling
    //
    if ( hasSessionStorage() )
    {
      settings.storage.uiWidth = UI.widthClasses[ UI.widthClassToIndex( settings.storage.uiWidth ) ];
      $('#sc-map-interface')
        .removeClass( UI.widthClasses.join(' ') )
        .addClass( settings.storage.uiWidth );
    }
    //
    $('#sc-map-interface .sc-map-slider-uiwidth').slider({
      min: 0,
      max: UI.widthClasses.length - 1,
      range: 'min',
      value: ( hasSessionStorage() ) ? UI.widthClassToIndex( settings.storage.uiWidth ) : UI.defaultWidthIndex,
      change: ( event, ui ) => {
        let value = ui.value;
        $('#sc-map-interface').removeClass( UI.widthClasses.join(' ') ).addClass( UI.widthClasses[ value ] );
        settings.storage.uiWidth = UI.widthClasses[ value ];
        this.updateHeight();
        renderer.resize();
      }
    });

    let updateLabelSize = function( event, ui ) {
      let value = ui.value;
      settings.labelScale = value / 100;
      settings.storage['settings.labelScale'] = settings.labelScale;
      map.scene.traverse( function ( object ) {
        if ( ( object instanceof THREE.Sprite ) && object.userData.systemLabel ) {
          object.userData.systemLabel.scaleSprite();
        }
      });
    };
    // UI width slider / settings handling
    $('#sc-map-interface .sc-map-slider-label-size').slider({
      min: ( Number( $('#sc-map-configuration').data('minLabelScale') ) || 0.4 ) * 100,
      max: ( Number( $('#sc-map-configuration').data('maxLabelScale') ) || 2.0 ) * 100,
      value: settings.labelScale * 100,
      change: updateLabelSize,
      slide: updateLabelSize
    });

    let updateLabelOffset = function( event, ui ) {
      let value = ui.value;
      settings.labelOffset = value / 100;
      settings.storage['settings.labelOffset'] = settings.labelOffset;
      let matrix = renderer.cameraRotationMatrix();
      map.scene.traverse( function ( object ) {
        if ( ( object instanceof THREE.Sprite ) && object.userData.systemLabel ) {
          object.userData.systemLabel.positionSprite( matrix );
        }
      });
    };
    // UI width slider / settings handling
    $('#sc-map-interface .sc-map-slider-label-offset').slider({
      min: ( Number( $('#sc-map-configuration').data('minLabelOffset') ) || -6.5 ) * 100,
      max: ( Number( $('#sc-map-configuration').data('maxLabelOffset') ) ||  7.5 ) * 100,
      value: settings.labelOffset * 100,
      change: updateLabelOffset,
      slide: updateLabelOffset
    });

    let updateSystemScale = function( event, ui ) {
      let value = ui.value;
      settings.systemScale = value / 100;
      settings.storage['settings.systemScale'] = settings.systemScale;
      let matrix = renderer.cameraRotationMatrix();
      let scale;
      map.scene.traverse( function ( object ) {
        if ( object.userData.scale && object.userData.isSystem ) {
          scale = settings.systemScale;
          object.scale.set( scale, scale, scale );
          object.updateMatrix();
          //   object.userData.systemLabel.positionSprite( matrix );
        } else if ( object.userData.scale && object.userData.isGlow ) {
          scale = object.userData.scale * GLOW_SCALE * settings.systemScale;
          object.scale.set( scale, scale, scale );
        }
      });
    };
    // UI width slider / settings handling
    $('#sc-map-interface .sc-map-slider-system-size').slider({
      min: ( Number( $('#sc-map-configuration').data('minSystemScale') ) || 0.5 ) * 100,
      max: ( Number( $('#sc-map-configuration').data('maxSystemScale') ) || 2.0 ) * 100,
      value: settings.systemScale * 100,
      change: updateSystemScale,
      slide: updateSystemScale
    });

    $('#sc-map-toggle-stats')
      .prop( 'checked', ( settings.storage['renderer.Stats'] === '1' ) ? true : false )
      .on( 'change', function() {
        if ( this.checked ) {
          $('#stats').show();
        } else {
          $('#stats').hide();
        }
        settings.storage['renderer.Stats'] = ( this.checked ) ? '1' : '0';
      });

    $('#sc-map-toggle-antialias')
      .on( 'change', function() {
        settings.effect.Antialias = this.checked;
        settings.save( 'effect' );
        window.location.reload( false );
      });

    $('#sc-map-toggle-fxaa')
      .prop( 'disabled', settings.effect.Antialias )
      .on( 'change', function() {
        settings.effect.FXAA = this.checked;
        settings.save( 'effect' );
        if ( renderer.FXAA ) {
          renderer.FXAA.enabled = this.checked;
        }
      });

    $('#sc-map-toggle-bloom')
      .prop( 'disabled', settings.effect.Antialias )
      .on( 'change', function() {
        settings.effect.Bloom = this.checked;
        settings.save( 'effect' );
        if ( renderer.composer ) {
          for ( let i = 0; i < renderer.composer.passes.length; i++ ) {
            if ( renderer.composer.passes[i] instanceof THREE.BloomPass ) {
              renderer.composer.passes[i].enabled = this.checked;
            }
          }
        }
      });

    $('#sc-map-toggle-glow').on( 'change', function() {
      settings.glow = this.checked;
      map.updateSystems();
      settings.storage['settings.Glow'] = ( this.checked ) ? '1' : '0';
    });

    $('#sc-map-toggle-labels').on( 'change', function() {
      settings.labels = this.checked;
      $('#sc-map-toggle-label-icons').prop( 'disabled', !settings.labels );
      map.updateSystems();
      settings.storage['settings.Labels'] = ( this.checked ) ? '1' : '0';
    });

    $('#sc-map-toggle-label-icons')
      .prop( 'disabled', !settings.labels )
      .on( 'change', function() {
        settings.labelIcons = this.checked;
        map.updateSystems();
        settings.storage['settings.LabelIcons'] = ( this.checked ) ? '1' : '0';
      });

    $('.quick-button.with-checkbox').on( 'click', function ( event ) {
      let $this = $(this);
      $this.find('input[type=checkbox]').click();
    });

    $('#sc-map-interface').on( 'click', 'a[data-toggle-next]', function ( event ) {
      let $this = $(this);
      event.preventDefault();
      let $element = $this.parent().next();
      $element.toggle();
      let title = $this.data('title');

      if ( $element.is(':visible') ) {
        $this.parent().find('> a > i').first().removeClass('fa-caret-right').addClass('fa-caret-down');
        settings.storage[ title ] = '1';
      } else {
        $this.parent().find('> a > i').first().addClass('fa-caret-right').removeClass('fa-caret-down');
        delete settings.storage[ title ];
      }

      ui.updateHeight();
    });

    $('#sc-map-interface').on( 'click', 'a[data-toggle-child]', function ( event ) {
      let $this = $(this);
      event.preventDefault();
      let $element = $this.parent().find( $this.data('toggle-child') );
      $element.toggle();
      if ( $element.is(':visible') ) {
        $this.parent().find('> a > i').removeClass('fa-caret-right').addClass('fa-caret-down');
      } else {
        $this.parent().find('> a > i').addClass('fa-caret-right').removeClass('fa-caret-down');
      }

      ui.updateHeight();
    });

    $('#sc-map-interface').on( 'click', `a[data-goto="system"]`, function( event ) {
      event.preventDefault();
      let $this = $(this);
      let system = System.getById( $this.data('system') );
      system.displayInfo();
      renderer.controls.moveTo( system );
    });

    $('#sc-map-interface').on( 'click', 'table.routelist .remove-waypoint', function( event ) {
      event.preventDefault();
      let $this = $(this);
      let system = System.getById( $this.data('system') );
      map.route().removeWaypoint( system );
      map.route().update();
      map.route().storeToSession();
    });

    $('#sc-map-interface').on( 'click', 'button.delete-route', function( event ) {
      map.route().destroy();
      map.route().storeToSession();
    });

    let updateComments = function( event ) {
      event.preventDefault();
      let system = System.getById( $(this).data('system') );
      let text = $(this).val();
      if ( typeof text === 'string' && text.length > 0 ) {
        system.setComments( text );
        $('#sc-map-interface .user-system-comments-md').html( $(markdown.toHTML( text )) );
      } else {
        system.setComments();
        $('#sc-map-interface .user-system-comments-md').empty();
      }
      system.updateSceneObject( scene );
    };

    $('#sc-map-interface').on( 'keyup', '.user-system-comments', updateComments );
    $('#sc-map-interface').on( 'blur', '.user-system-comments', updateComments );
    $('#sc-map-interface').on( 'change', '.user-system-comments', updateComments );

    $('#sc-map-interface').on( 'click', '.remove-system-comments', function( event ) {
      event.preventDefault();
      let system = System.getById( $(this).data('system') );
      system.setComments();
      $('.comment-editing .user-system-comments').empty().val('');
      $('.comment-editing .user-system-comments-md').empty();
      system.updateSceneObject( scene );
    });

    $('#sc-map-interface').on( 'change', '.user-system-bookmarked', function() {
      System.getById( $(this).data('system') )
        .setBookmarkedState( this.checked )
        .updateSceneObject( scene );
      settings.save( 'systems' );
    });

    $('#sc-map-interface').on( 'change', '.user-system-ishangar', function() {
      System.getById( $(this).data('system') )
        .setHangarState( this.checked )
        .updateSceneObject( scene );
      settings.save( 'systems' );
    });

    $('#sc-map-interface').on( 'change', '.user-system-avoid', function() {
      System.getById( $(this).data('system') )
        .setToBeAvoidedState( this.checked )
        .updateSceneObject( scene );
      settings.save( 'systems' );
      map.route().rebuildCurrentRoute();
    });

    /* jScrollPane */
    $('#sc-map-interface').jScrollPane({
      showArrows: false,
      horizontalGutter: 6
    });
  }

  toTab ( index ) {
    let tab = UI.Tab( index );
    $('#sc-map-interface').tabs( 'option', 'active', tab.index );
    this.updateHeight();
  }

  toTabTop () {
    if ( this.jScrollPane() ) {
      this.jScrollPane().scrollToPercentY( 0 );
    }
  }

  updateHeight () {
    let _this = this;
    let activeTab = UI.ActiveTab();
    if ( activeTab ) {
      let $images = $( activeTab.id + ' img' );
      if ( $images.length ) {
        $( activeTab.id ).imagesLoaded( function() {
          if ( _this.jScrollPane() ) {
            _this.jScrollPane().reinitialise();
          }
        });
      } else {
        if ( _this.jScrollPane() ) {
          _this.jScrollPane().reinitialise();
        }
      }
    }
  }

  jScrollPane () {
    if ( $('#sc-map-interface').data('jsp') ) {
      return $('#sc-map-interface').data('jsp');
    }
  }

  updateSystemsList () {
    let tab = UI.Tab( 'systems' );
    $( tab.id ).empty().append(
      UI.Templates.listings({ systemGroups: UI.buildDynamicLists() })
    );
  }

  static htmlEscape( str ) {
    return String( str )
      .replace( /&/g, '&amp;' )
      .replace( /"/g, '&quot;' )
      .replace( /'/g, '&#39;' )
      .replace( /</g, '&lt;' )
      .replace( />/g, '&gt;' );
  }
};

UI.menuBar = []; // Populated by template code

UI.widthClasses = [ 'widthXS', 'widthS', 'widthN', 'widthL', 'widthXL' ];
UI.defaultWidthIndex = 2;
UI.widthClassToIndex = function widthClassToIndex( name ) {
  if ( typeof name === 'string' ) {
    for ( let i = 0; i < UI.widthClasses.length; i += 1 ) {
      if ( name === UI.widthClasses[i] ) {
        return i;
      }
    }
  }
  return UI.defaultWidthIndex;
};

UI.Tabs = [];
UI.Tab = function Tab( name ) {
  for ( let i = 0; i < UI.Tabs.length; i += 1 ) {
    if ( ( typeof name === 'string' ) && ( UI.Tabs[ i ].name === name ) ) {
      return UI.Tabs[ i ];
    } else if ( ( typeof name === 'number' ) && ( UI.Tabs[ i ].id === name ) ) {
      return UI.Tabs[ i ];
    }
  }
  return;
};

UI.ActiveTab = function ActiveTab() {
  let activeTabIndex = $('#sc-map-interface').tabs( 'option', 'active' );
  for ( let i = 0; i < UI.Tabs.length; i += 1 ) {
    if ( i === activeTabIndex ) {
      return UI.Tabs[ i ];
    }
  }
  return;
};

UI.makeSafeForCSS = function makeSafeForCSS( name ) {
  if ( typeof name !== 'string' ) {
    return;
  }
  return name.replace( /[^a-zA-Z0-9]/g, function(s) {
    let c = s.charCodeAt(0);
    if (c == 32) return '-';
    if (c >= 65 && c <= 90) return '_' + s.toLowerCase();
    return (c.toString(16)).slice(-4);
  });
};

UI.fontAwesomeIsReady = false;
UI.waitForFontAwesome = function waitForFontAwesome( callback ) {
  let retries = 5;

  let checkReady = function() {
    let canvas, context;
    retries -= 1;
    canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 20;
    context = canvas.getContext('2d');
    context.fillStyle = 'rgba(0,0,0,1.0)';
    context.fillRect( 0, 0, 20, 20 );
    context.font = '16pt FontAwesome';
    context.textAlign = 'center';
    context.fillStyle = 'rgba(255,255,255,1.0)';
    context.fillText( '\uf0c8', 10, 18 );
    let data = context.getImageData( 2, 10, 1, 1 ).data;
    if ( data[0] !== 255 && data[1] !== 255 && data[2] !== 255 ) {
      console.log( 'FontAwesome is not yet available, retrying ...' );
      if ( retries > 0 ) {
        setTimeout( checkReady, 200 );
      }
    } else {
      console.log( 'FontAwesome is loaded' );
      UI.fontAwesomeIsReady = true;
      if ( typeof callback === 'function' ) {
        callback();
      }
    }
  };

  checkReady();
};

UI.buildDynamicLists = function buildDynamicLists() {
  let hangars = [];
  let bookmarked = [];
  let withComments = [];
  let byFaction = [];
  let everything = [];
  let factionsById = {};
  let data = [];

  for ( let factionId in SCMAP.data.factions ) {
    let faction = SCMAP.data.factions[factionId];
    factionsById[ faction.id ] = {
      faction: faction.name,
      items: []
    };
  }

  let factions = [];

  $( allSystems ).each( function ( i, system ) {
    let link = system.createInfoLink().outerHtml(); // TODO replace with template

    if ( system.hasHangar() ) { hangars.push( link ); }
    if ( system.isBookmarked() ) { bookmarked.push( link ); }
    if ( system.hasComments() ) { withComments.push( link ); }

    factionsById[ system.faction.id ].items.push( link );
    everything.push( link );
  });

  if ( hangars.length ) {
    data.push({
      title: 'Hangar locations&nbsp;' + MapSymbol.getTag( MapSymbols.HANGAR ).addClass('fa-lg').outerHtml(),
      items: hangars
    });
  }

  if ( bookmarked.length ) {
    data.push({
      title: 'Bookmarked&nbsp;' + MapSymbol.getTag( MapSymbols.BOOKMARK ).addClass('fa-lg').outerHtml(),
      items: bookmarked
    });
  }

  if ( withComments.length ) {
    data.push({
      title: 'With your comments&nbsp;' + MapSymbol.getTag( MapSymbols.COMMENTS ).addClass('fa-lg').outerHtml(),
      items: withComments
    });
  }

  data.push(
    {
      title: 'By faction',
      factions: factionsById
    },
    {
      title: 'Everything',
      items: everything
    }
  );

  return data;
};

UI.Templates = {
  mapUI: uiTemplate,
  systemInfo: systemInfoTemplate,
  listings: listingsTemplate,
  routeList: routeListingTemplate,
};

export default UI;
