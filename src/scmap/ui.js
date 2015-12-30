/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

import SCMAP from '../scmap';
import StarSystem from './star-system';
import MapSymbol from './ui/symbol';
import MapSymbols from './ui/symbols';
import config from './config';
import settings from './settings';
import { hasLocalStorage, hasSessionStorage } from '../helpers/functions';
import { renderer } from '../starcitizen-webgl-map';
import RouteUI from './ui/route';
import { displayInfo, createInfoLink } from './ui/star-system';

// Import the templates
import helpers from './ui/helpers';
import partials from './ui/partials';
import uiTemplate from '../template/ui-panel.hbs!';
import systemInfoTemplate from '../template/partial/system-info.hbs!';
import listingsTemplate from '../template/partial/systems-listing.hbs!';
import routeListingTemplate from '../template/partial/route-list.hbs!';

import markdown from 'markdown';
import $ from 'jquery';

import tabs from 'jquery-ui/ui/tabs';
import slider from 'jquery-ui/ui/slider';
import jqueryMousewheel from 'jquery-mousewheel';
import jscrollpane from 'jscrollpane';
import resizeListener from 'element-resize-detector';

$.fn.outerHtml = function() {
  return $('<div />').append(this.eq(0).clone()).html();
};

const sessionStorage = ( hasSessionStorage() ) ? window.sessionStorage : {};

const oldRenderStats = {
  render: {
    calls: 0,
    faces: 0,
    points: 0,
    vertices: 0,
  },
  memory: {
    geometries: 0,
    textures: 0,
  }
};

class UI {
  constructor ( map ) {
    this.map = map;

    let selectedSystem = null;
    if ( 'selectedSystem' in settings.storage ) {
      selectedSystem = StarSystem.getById( settings.storage.selectedSystem );
      if ( selectedSystem instanceof StarSystem ) {
        map.setSelectionTo( selectedSystem );
      } else {
        selectedSystem = null;
      }
    }

    let icons = [];
    for ( let name in MapSymbols ) {
      const icon = MapSymbols[ name ];
      icons.push( $('<span><i class="fa-li fa ' + icon.cssClass + '"></i>' + icon.description + '</span>' ).css( 'color', icon.color ).outerHtml() );
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
        route: RouteUI.templateData( map.route() )
      })
    );

    $( UI.menuBar ).each( function ( i, menuItem ) {
      $('#sc-map-interface ul.menubar').append( menuItem );
    });

    $('#sc-map-3d-mode')
      .prop( 'checked', settings.mode === '3d' )
      .on( 'change', function () {
        if ( this.checked ) {
          map.displayState.to3d();
        } else {
          map.displayState.to2d();
        }
      });

    $('#sc-map-lock-rotation')
      .prop( 'checked', settings.control.rotationLocked )
      .on( 'change', function() {
        renderer.controls.noRotate = this.checked;
        settings.storage['control.rotationLocked'] = ( this.checked ) ? '1' : '0';
        settings.save('control');
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

    $('#sc-map-top2D').on( 'click', function () {
      renderer.controls.noRotate = true;
      $('#sc-map-lock-rotation').prop( 'checked', true );
      map.displayState.to2d();
      renderer.controls.rotateTo( 0, 0, 180 );
    });

    let tabIndex = 0;
    if ( 'scMapTab' in sessionStorage ) {
      let defaultTab = UI.Tab( sessionStorage.scMapTab );
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
            UI.updateSystemsList();
            break;

          default:
            $('#sc-map-webgl-container').removeClass('edit');
            break;
        }

        if ( config.debug ) {
          $('.sc-map-debug .hide').removeClass('hide');
        }

        sessionStorage.scMapTab = clicked_on;

        /* Browsers show an ugly URL bar if href is set to #, this
         * makes the HTML invalid but removes the ugly URL bar */
        $(`#sc-map-interface a[href="#"]`).removeAttr('href');

        UI.toTabTop();
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
    settings.storage.uiWidth = UI.widthClasses[ UI.widthClassToIndex( settings.storage.uiWidth ) ];
    $('#sc-map-interface')
      .removeClass( UI.widthClasses.join(' ') )
      .addClass( settings.storage.uiWidth );

    //
    $('#sc-map-interface .sc-map-slider-uiwidth').slider({
      min: 0,
      max: UI.widthClasses.length - 1,
      range: 'min',
      value: ( settings.storage.uiWidth ) ? UI.widthClassToIndex( settings.storage.uiWidth ) : UI.defaultWidthIndex,
      change: ( event, ui ) => {
        let value = ui.value;
        $('#sc-map-interface').removeClass( UI.widthClasses.join(' ') ).addClass( UI.widthClasses[ value ] );
        settings.storage.uiWidth = UI.widthClasses[ value ];
        renderer.resize();
        UI.jScrollPane().reinitialise();
      }
    });

    const updateLabelSize = function( event, slider ) {
      settings.labelScale = slider.value / 100;
      map.geometry.labels.refreshScale();
    };
    $('#sc-map-interface .sc-map-slider-label-size').slider({
      min: Number( config.minLabelScale ) * 100,
      max: Number( config.maxLabelScale ) * 100,
      value: settings.labelScale * 100,
      change: updateLabelSize,
      slide: updateLabelSize,
    });

    const updateLabelOffset = function( event, slider ) {
      settings.labelOffset = slider.value / 100;
      map.geometry.labels.matchRotation( renderer.cameraRotationMatrix() );
    };
    $('#sc-map-interface .sc-map-slider-label-offset').slider({
      min: Number( config.minLabelOffset ) * 100,
      max: Number( config.maxLabelOffset ) * 100,
      value: settings.labelOffset * 100,
      change: updateLabelOffset,
      slide: updateLabelOffset,
    });

    const updateSystemScale = function( event, slider ) {
      settings.systemScale = slider.value / 100;
      map.geometry.systems.refreshScale();
      map.geometry.glow.refreshScale();
    };
    // UI width slider / settings handling
    $('#sc-map-interface .sc-map-slider-system-size').slider({
      min: Number( config.minSystemScale ) * 100,
      max: Number( config.maxSystemScale ) * 100,
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
        settings.save('renderer');
      });

    //$('#sc-map-toggle-antialias')
    //  .on( 'change', function() {
    //    settings.effect.Antialias = this.checked;
    //    settings.save( 'effect' );
    //    window.location.reload( false );
    //  });

    //$('#sc-map-toggle-fxaa')
    //  .prop( 'disabled', settings.effect.Antialias )
    //  .on( 'change', function() {
    //    settings.effect.FXAA = this.checked;
    //    settings.save( 'effect' );
    //    if ( renderer.FXAA ) {
    //      renderer.FXAA.enabled = this.checked;
    //    }
    //  });

    //$('#sc-map-toggle-bloom')
    //  .prop( 'disabled', settings.effect.Antialias )
    //  .on( 'change', function() {
    //    settings.effect.Bloom = this.checked;
    //    settings.save( 'effect' );
    //    if ( renderer.composer ) {
    //      for ( let i = 0; i < renderer.composer.passes.length; i++ ) {
    //        if ( renderer.composer.passes[i] instanceof THREE.BloomPass ) {
    //          renderer.composer.passes[i].enabled = this.checked;
    //        }
    //      }
    //    }
    //  });

    $('#sc-map-toggle-glow').on( 'change', function() {
      settings.glow = this.checked;
      map.geometry.glow.refreshVisibility();
    });

    $('#sc-map-toggle-labels').on( 'change', function() {
      settings.labels = this.checked;
      map.geometry.labels.refreshVisibility();
    });

    $('#sc-map-toggle-label-icons')
      .prop( 'disabled', !settings.labels )
      .on( 'change', function() {
        settings.labelIcons = this.checked;
        map.geometry.labels.refreshIcons();
      });

    // FIXME: These currently don't have any effect
    $('#sc-map-toggle-antialias').prop( 'disabled', true );
    $('#sc-map-toggle-fxaa').prop( 'disabled', true );
    $('#sc-map-toggle-bloom').prop( 'disabled', true );

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
        sessionStorage[ title ] = '1';
      } else {
        $this.parent().find('> a > i').first().addClass('fa-caret-right').removeClass('fa-caret-down');
        delete sessionStorage[ title ];
      }
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
    });

    $('#sc-map-interface').on( 'click', `a[data-goto="system"]`, function( event ) {
      event.preventDefault();
      let $this = $(this);
      let system = StarSystem.getById( $this.data('system') );
      displayInfo( system );
      renderer.controls.moveTo( system );
    });

    $('#sc-map-interface').on( 'click', 'table.routelist .remove-waypoint', function( event ) {
      event.preventDefault();
      let $this = $(this);
      let system = StarSystem.getById( $this.data('system') );
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
      let system = StarSystem.getById( $(this).data('system') );
      let text = $(this).val();
      if ( typeof text === 'string' && text.length > 0 ) {
        system.setComments( text );
        $('#sc-map-interface .user-system-comments-md').html( $(markdown.markdown.toHTML( text )) );
      } else {
        system.setComments();
        $('#sc-map-interface .user-system-comments-md').empty();
      }
      system.refreshIcons();
    };

    $('#sc-map-interface').on( 'keyup', '.user-system-comments', updateComments );
    $('#sc-map-interface').on( 'blur', '.user-system-comments', updateComments );
    $('#sc-map-interface').on( 'change', '.user-system-comments', updateComments );

    $('#sc-map-interface').on( 'click', '.remove-system-comments', function( event ) {
      event.preventDefault();
      let system = StarSystem.getById( $(this).data('system') );
      system.setComments();
      $('.comment-editing .user-system-comments').empty().val('');
      $('.comment-editing .user-system-comments-md').empty();
      system.refreshIcons();
    });

    $('#sc-map-interface').on( 'change', '.user-system-bookmarked', function() {
      StarSystem.getById( $(this).data('system') )
        .setBookmarkedState( this.checked )
        .refreshIcons();
      settings.save( 'systems' );
    });

    $('#sc-map-interface').on( 'change', '.user-system-ishangar', function() {
      StarSystem.getById( $(this).data('system') )
        .setHangarState( this.checked )
        .refreshIcons();
      settings.save( 'systems' );
    });

    $('#sc-map-interface').on( 'change', '.user-system-avoid', function() {
      StarSystem.getById( $(this).data('system') )
        .setToBeAvoidedState( this.checked )
        .refreshIcons();
      settings.save( 'systems' );
      map.route().rebuildCurrentRoute();
    });

    // Init the mousewheel plugin ("import" alone doesn't cut it)
    jqueryMousewheel( $ );

    /* jScrollPane */
    $('#sc-map-interface').jScrollPane({
      showArrows: false,
      horizontalGutter: 6,
      mouseWheelSpeed: 4,
    });

    this.oldWidth = 0;
    this.oldHeight = 0;

    resizeListener().listenTo( $('#sc-map-interface .sc-map-ui-padding')[ 0 ], element => {
      const width = $(element).width();
      const height = $(element).height();
      if ( width !== this.oldWidth || height !== this.oldHeight ) {
        UI.jScrollPane().reinitialise();
        this.oldWidth = width;
        this.oldHeight = height;
      }
    });
  }

  static displayInfoOn ( system, doNotSwitch ) {
    displayInfo( system, doNotSwitch );
  }

  static toTab ( index ) {
    let tab = UI.Tab( index );
    $('#sc-map-interface').tabs( 'option', 'active', tab.index );
  }

  static toTabTop () {
    UI.jScrollPane().scrollToPercentY( 0 );
  }

  static loadedSystems ( number ) {
    $('#debug-systems').html( `${ number } systems loaded` );
  }

  static entered2D () {
    $('#sc-map-3d-mode').prop( 'checked', false );
  }

  static entered3D () {
    $('#sc-map-3d-mode').prop( 'checked', true );
  }

  static jScrollPane () {
    if ( $('#sc-map-interface').data('jsp') ) {
      return $('#sc-map-interface').data('jsp');
    }
  }

  static updateSystemsList () {
    const tab = UI.Tab( 'systems' );
    $( tab.id ).empty().append(
      UI.Templates.listings({ systemGroups: UI.buildDynamicLists() })
    );
  }

  static htmlEscape ( str ) {
    return String( str )
      .replace( /&/g, '&amp;' )
      .replace( /"/g, '&quot;' )
      .replace( /'/g, '&#39;' )
      .replace( /</g, '&lt;' )
      .replace( />/g, '&gt;' );
  }

  static makeSafeForCSS ( name ) {
    if ( typeof name !== 'string' ) {
      return;
    }

    return name.replace( /[^a-zA-Z0-9]/g, function(s) {
      let c = s.charCodeAt(0);
      if (c == 32) return '-';
      if (c >= 65 && c <= 90) return '_' + s.toLowerCase();
      return (c.toString(16)).slice(-4);
    });
  }

  static buildDynamicLists () {
    let hangars = [];
    let bookmarked = [];
    let withComments = [];
    let byFaction = [];
    let everything = [];
    let data = [];

    const factionsById = {};
    for ( let factionId in SCMAP.data.factions ) {
      const faction = SCMAP.data.factions[ factionId ];
      factionsById[ faction.id ] = {
        faction: faction.name,
        items: [],
      };
    }

    let factions = [];

    SCMAP.allSystems.forEach( system => {
      let link = createInfoLink( system ).outerHtml(); // TODO replace with template

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
  }

  static debugRenderer ( renderStats ) {
    const $elem = $('#debug-renderer');

    [ 'calls', 'faces', 'points', 'vertices' ].forEach( property => {
      if ( renderStats.render[ property ] !== oldRenderStats.render[ property ] ) {
        $elem.find(`dd.${ property }`).text( renderStats.render[ property ] );
        oldRenderStats.render[ property ] = renderStats.render[ property ];
      }
    });

    [ 'geometries', 'textures' ].forEach( property => {
      if ( renderStats.memory[ property ] !== oldRenderStats.memory[ property ] ) {
        $elem.find(`dd.${ property }`).text( renderStats.memory[ property ] );
        oldRenderStats.memory[ property ] = renderStats.memory[ property ];
      }
    });
  }

  static sidePanelWidth () {
    return $('#sc-map-interface .sc-map-ui-padding').width();
  }

  static containerWidth () {
    return $('#sc-map-interface').width();
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

UI.Templates = {
  mapUI: uiTemplate,
  systemInfo: systemInfoTemplate,
  listings: listingsTemplate,
  routeList: routeListingTemplate,
};

// Workaround for a Chrome (WebKit) issue where the
// scrollable area can vanish when scrolling it
if ( /webkit/i.test( navigator.userAgent ) )
{
  document.getElementById('sc-map-interface')
    .addEventListener( 'scroll', function( /* event */ ) {
      document.getElementById('sc-map-interface').style.width = UI.containerWidth() + 0.1;
    }, false );
}

export default UI;
