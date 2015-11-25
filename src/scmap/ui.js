/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

import SCMAP from '../scmap';
import System from './system';
import Faction from './faction';
import MapSymbol from './symbol';
import MapSymbols from './symbols';
import { allSystems } from './systems';
import settings from './settings';

class UI {
  constructor ( map ) {
    let selectedSystem = null;
    if ( hasSessionStorage() && ( 'selectedSystem' in window.sessionStorage ) ) {
      selectedSystem = System.getById( window.sessionStorage.selectedSystem );
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
        if ( storage ) {
          storage['control.rotationLocked'] = ( this.checked ) ? '1' : '0';
        }
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
          window.sessionStorage.scMapTab = clicked_on;
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
      window.sessionStorage.uiWidth = UI.widthClasses[ UI.widthClassToIndex( window.sessionStorage.uiWidth ) ];
      $('#sc-map-interface')
        .removeClass( UI.widthClasses.join(' ') )
        .addClass( window.sessionStorage.uiWidth );
    }
    //
    $('#sc-map-interface .sc-map-slider-uiwidth').slider({
      min: 0,
      max: UI.widthClasses.length - 1,
      range: 'min',
      value: ( hasSessionStorage() ) ? UI.widthClassToIndex( window.sessionStorage.uiWidth ) : UI.defaultWidthIndex,
      change: ( event, ui ) => {
        let value = ui.value;
        $('#sc-map-interface').removeClass( UI.widthClasses.join(' ') ).addClass( UI.widthClasses[ value ] );
        if ( hasSessionStorage() ) {
          window.sessionStorage.uiWidth = UI.widthClasses[ value ];
        }
        this.updateHeight();
        renderer.resize();
      }
    });

    let updateLabelSize = function( event, ui ) {
      let value = ui.value;
      settings.labelScale = value / 100;
      if ( settings.storage ) {
        settings.storage['settings.labelScale'] = settings.labelScale;
      }
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
      if ( settings.storage ) {
        settings.storage['settings.labelOffset'] = settings.labelOffset;
      }
      let matrix = window.renderer.cameraRotationMatrix();
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
      if ( settings.storage ) {
        settings.storage['settings.systemScale'] = settings.systemScale;
      }
      let matrix = window.renderer.cameraRotationMatrix();
      let scale;
      map.scene.traverse( function ( object ) {
        if ( object.userData.scale && object.userData.isSystem ) {
          scale = settings.systemScale;
          object.scale.set( scale, scale, scale );
          object.updateMatrix();
          //   object.userData.systemLabel.positionSprite( matrix );
        } else if ( object.userData.scale && object.userData.isGlow ) {
          scale = object.userData.scale * System.GLOW_SCALE * settings.systemScale;
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
      .prop( 'checked', ( storage && storage['renderer.Stats'] === '1' ) ? true : false )
      .on( 'change', function() {
        if ( this.checked ) {
          $('#stats').show();
        } else {
          $('#stats').hide();
        }
        if ( storage ) {
          storage['renderer.Stats'] = ( this.checked ) ? '1' : '0';
        }
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
      if ( storage ) {
        storage['settings.Glow'] = ( this.checked ) ? '1' : '0';
      }
    });

    $('#sc-map-toggle-labels').on( 'change', function() {
      settings.labels = this.checked;
      $('#sc-map-toggle-label-icons').prop( 'disabled', !settings.labels );
      map.updateSystems();
      if ( storage ) {
        storage['settings.Labels'] = ( this.checked ) ? '1' : '0';
      }
    });

    $('#sc-map-toggle-label-icons')
      .prop( 'disabled', !settings.labels )
      .on( 'change', function() {
        settings.labelIcons = this.checked;
        map.updateSystems();
        if ( storage ) {
          storage['settings.LabelIcons'] = ( this.checked ) ? '1' : '0';
        }
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
      let storage = null;
      if ( hasSessionStorage() ) {
        storage = window.sessionStorage;
      }
      if ( $element.is(':visible') ) {
        $this.parent().find('> a > i').first().removeClass('fa-caret-right').addClass('fa-caret-down');
        if ( storage ) {
          storage[ title ] = '1';
        }
      } else {
        $this.parent().find('> a > i').first().addClass('fa-caret-right').removeClass('fa-caret-down');
        if ( storage ) {
          delete storage[ title ];
        }
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
}

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

UI.htmlEscape = function htmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

UI.Templates = {
  mapUI:      Handlebars.compile( $('#templateMapUI').html() ),
  systemInfo: Handlebars.compile( $('#templateSystemInfo').html() ),
  listings:   Handlebars.compile( $('#templateSystemsListing').html() ),
  routeList:  Handlebars.compile( $('#templateRouteList').html() )
};

$( function () {
  let sectionLevel = 1;
  let tabCounter = 0;

  Handlebars.registerHelper( 'uiSection', function( title, shouldOpen, options ) {
    let opened = ( shouldOpen ) ? true : false;
    let icon = 'fa-caret-right';
    let hidden = 'style="display: none;"';
    let attrs = [], str;
    let oldLevel = sectionLevel++;
    let storage = null;
    if ( hasSessionStorage() ) {
      storage = window.sessionStorage;
    }

    if ( storage && ( title in storage ) ) {
      opened = ( storage[ title ] == '1' ) ? true : false;
    }

    if ( opened ) {
      icon = 'fa-caret-down';
      hidden = '';
    }

    for ( let prop in options.hash ) {
      attrs.push( prop + '="' + options.hash[prop] + '"' );
    }

    str = '<h' + oldLevel + '><a href="#" data-title="' + UI.htmlEscape( title ) +
      '" data-toggle-next="next" ' + attrs.join(' ') + '><i class="fa fa-fw fa-lg ' + icon + '">' +
      '</i>' + title + '</a></h' + oldLevel + `>\n` + '         <div class="ui-section" ' + hidden + '>';

    if ( 'fn' in options ) {
      str += options.fn( this );
    }

    str += '</div>';
    sectionLevel -= 1;
    return new Handlebars.SafeString( str );
  });

  Handlebars.registerHelper( 'tabHeader', function( title ) {
    return new Handlebars.SafeString( '<h1 class="padleft">' + title + '</h1>' );
  });

  /* title: shown to user, name: internal name, icon: font awesome icon class */
  Handlebars.registerHelper( 'jQueryUiTab', function( title, name, icon, options ) {
    let hidden = 'style="display: none;"';
    let attrs = [], str = '';
    let $menuItem;
    let id = 'sc-map-ui-tab-' + UI.makeSafeForCSS( name );

    //for ( let prop in options.hash ) {
    //   attrs.push( prop + '="' + options.hash[prop] + '"' );
    //}

    $menuItem = $(
      '<li>' +
      '<a title="' + UI.htmlEscape( title ) + '" data-tab="' + UI.htmlEscape( name ) + '" href="#' + UI.htmlEscape( id ) + '">' +
      '<i class="fa fa-fw fa-2x ' + UI.htmlEscape( icon ) + '"></i>' +
      '</a>' +
      '</li>'
    );
    UI.menuBar.push( $menuItem );

    str = '<div id="' + id + '" class="sc-map-ui-tab" ' + ((tabCounter !== 0) ? 'style="display: none"' : '') + '>';
    if ( 'fn' in options ) {
      str += options.fn( this );
    }
    str += '</div>';

    UI.Tabs.push({ id: '#' + id, name: name, index: tabCounter++ });

    return new Handlebars.SafeString( str );
  });

  Handlebars.registerHelper( 'bigButton', function( id, faClass, title ) {
    return new Handlebars.SafeString( '<button class="big-button" id="' + id + '">' +
      '<i class="fa ' + faClass + ' fa-fw fa-lg"></i> ' + title + '</button>' + '<br>' );
  });

  Handlebars.registerHelper( 'commoditiesList', function( commodities ) {
    if ( !commodities.length ) {
      return new Handlebars.SafeString( '&mdash;' );
    }
    return new Handlebars.SafeString(
      $.map( commodities, function( elem, i ) {
        return SCMAP.data.goods[ elem ].name;
      }).join( ', ' )
      );
  });

  Handlebars.registerHelper( 'markdown', function( markdownText ) {
    return new Handlebars.SafeString( markdown.toHTML( markdownText ) );
  });

  Handlebars.registerHelper( 'colourGetStyle', function( colour ) {
    return new Handlebars.SafeString( colour.getStyle() );
  });

  Handlebars.registerHelper( 'systemLink', function( system, options ) {
    let noIcons = false, noTarget = false;
    if ( 'noIcons' in options.hash ) {
      noIcons = ( options.hash.noIcons ) ? true : false;
    }
    if ( 'noTarget' in options.hash ) {
      noTarget = ( options.hash.noTarget ) ? true : false;
    }
    if ( ! ( system instanceof System ) ) {
      return '';
    }
    return new Handlebars.SafeString( system.createInfoLink( noIcons, noTarget ).outerHtml() );
  });

  Handlebars.registerHelper( 'routeNavLinks', function( prev, next, options ) {
    let str = '', $elem;

    if ( !prev && !next ) {
      return new Handlebars.SafeString( '' );
    }

    if ( prev instanceof System ) {
      $elem = $( '<a></a>' );
      if ( ( prev.faction instanceof Faction ) && ( prev.faction.color instanceof THREE.Color ) ) {
        $elem.css( 'color', prev.faction.color.getStyle() );
      }
      $elem.addClass( 'system-link' );
      $elem.attr( 'data-goto', 'system' );
      $elem.attr( 'data-system', prev.id );
      $elem.attr( 'href', '#system=' + encodeURIComponent( prev.name ) );
      $elem.attr( 'title', 'Previous jump, coming from ' + prev.name + ' (' + prev.faction.name + ' territory)' );
      $elem.empty().append( '<i class="left fa fa-fw fa-arrow-left"></i>' );
      str += $elem.outerHtml();
    } else {
      str += '<i class="left fa fa-fw"></i>';
    }

    if ( next instanceof System ) {
      $elem = $( '<a></a>' );
      if ( ( next.faction instanceof Faction ) && ( next.faction.color instanceof THREE.Color ) ) {
        $elem.css( 'color', next.faction.color.getStyle() );
      }
      $elem.addClass( 'system-link' );
      $elem.attr( 'data-goto', 'system' );
      $elem.attr( 'data-system', next.id );
      $elem.attr( 'href', '#system=' + encodeURIComponent( next.name ) );
      $elem.attr( 'title', 'Next jump, leading to ' + next.name + ' (' + next.faction.name + ' territory)' );
      $elem.empty().append( '<i class="right fa fa-fw fa-arrow-right"></i>' );
      str += $elem.outerHtml();
    } else {
      str += '<i class="right fa fa-fw"></i>';
    }

    return new Handlebars.SafeString( str );
  });

  Handlebars.registerHelper( 'checkboxButton', function( id, title, options ) {
    let attrs = [];
    for ( let prop in options.hash ) {
      if ( prop === 'icon' ) {
        title = title + ' <i class="fa fa-lg fa-fw ' + options.hash[ prop ] + '"></i>';
      } else {
        attrs.push( prop + '="' + UI.htmlEscape( options.hash[ prop ] ) + '"' );
      }
    }
    return new Handlebars.SafeString(
      '<span class="checkmark-button">' +
      '<input type="checkbox" id="' + id + '" ' + attrs.join(' ') + '>' +
      '<label for="' + id + '">' + title + '</label>' +
      '</span>'
    );
  });

  Handlebars.registerHelper( `debug`, function( optionalValue ) {
    console.log( `Current Context`, this );
    if (optionalValue) {
      console.log( `Value`, optionalValue );
    }
  });

  Handlebars.registerHelper( 'durationHMM', function( duration ) {
    if ( !duration ) {
      return '';
    }
    return new Handlebars.SafeString( duration.toHMM() );
  });

  Handlebars.registerHelper( 'plusOne', function( number ) {
    return new Handlebars.SafeString( number + 1 );
  });

  Handlebars.registerHelper( 'minusOne', function( number ) {
    return new Handlebars.SafeString( number - 1 );
  });

  Handlebars.registerHelper( 'checked', function( isChecked ) {
    return new Handlebars.SafeString( isChecked ? 'checked' : '' );
  });

  Handlebars.registerHelper( 'checkboxOption', function( id, defaultChecked, title, description, options ) {
    let attrs = [];
    let checked = '';
    if ( defaultChecked ) {
      checked = 'checked';
    }
    for ( let prop in options.hash ) {
      if ( prop === 'icon' ) {
        title = title + ' <i class="fa fa-lg fa-fw ' + options.hash[ prop ] + '"></i>';
      } else {
        attrs.push( prop + '="' + UI.htmlEscape( options.hash[ prop ] ) + '"' );
      }
    }
    return new Handlebars.SafeString(
      '<span class="checkmark-option">' +
      '<input class="' + id + '" type="checkbox" id="' + id + '" ' + checked + '>' +
      '<label for="' + id + '">' + title +
      '<span class="small label-info">' + description + '</span>' +
      '</label>' +
      '</span>'
      );
  });

  $('script[type="text/x-handlebars-template"][data-partial="1"]').each( function( index, elem ) {
    let $elem = $(elem);
    Handlebars.registerPartial( $elem.attr('id'), $elem.html() );
  });
});

// Courtesy of http://www.backalleycoder.com/2013/03/18/cross-browser-event-based-element-resize-detection/
( function () {
  /*jshint -W082 */
  // jscs: disable

  let attachEvent = document.attachEvent;

  if (!attachEvent) {
    let requestFrame = (function(){
      let raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || function(fn){ return window.setTimeout(fn, 20); };
      return function(fn){ return raf(fn); };
    })();

    let cancelFrame = (function(){
      let cancel = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame || window.clearTimeout;
      return function(id){ return cancel(id); };
    })();

    function resetTriggers(element){
      let triggers = element.__resizeTriggers__,
      expand = triggers.firstElementChild,
      contract = triggers.lastElementChild,
      expandChild = expand.firstElementChild;
      contract.scrollLeft = contract.scrollWidth;
      contract.scrollTop = contract.scrollHeight;
      expandChild.style.width = expand.offsetWidth + 1 + 'px';
      expandChild.style.height = expand.offsetHeight + 1 + 'px';
      expand.scrollLeft = expand.scrollWidth;
      expand.scrollTop = expand.scrollHeight;
    }

    function checkTriggers(element){
      return element.offsetWidth != element.__resizeLast__.width || element.offsetHeight != element.__resizeLast__.height;
    }

    function scrollListener(e){
      let element = this;
      resetTriggers(this);
      if (this.__resizeRAF__) cancelFrame(this.__resizeRAF__);
      this.__resizeRAF__ = requestFrame(function(){
        if (checkTriggers(element)) {
          element.__resizeLast__.width = element.offsetWidth;
          element.__resizeLast__.height = element.offsetHeight;
          element.__resizeListeners__.forEach(function(fn){
            fn.call(element, e);
          });
        }
      });
    }
  }

  window.addResizeListener = function(element, fn){
    if (attachEvent) {
      element.attachEvent('onresize', fn);
    } else {
      if (!element.__resizeTriggers__) {
        if (getComputedStyle(element).position == 'static') element.style.position = 'relative';
        element.__resizeLast__ = {};
        element.__resizeListeners__ = [];
        (element.__resizeTriggers__ = document.createElement('div')).className = 'resize-triggers';
        element.__resizeTriggers__.innerHTML = '<div class="expand-trigger"><div></div></div>' +
          '<div class="contract-trigger"></div>';
        element.appendChild(element.__resizeTriggers__);
        resetTriggers(element);
        element.addEventListener('scroll', scrollListener, true);
      }
      element.__resizeListeners__.push(fn);
    }
  };

  window.removeResizeListener = function(element, fn){
    if (attachEvent) {
      element.detachEvent('onresize', fn);
    } else {
      element.__resizeListeners__.splice(element.__resizeListeners__.indexOf(fn), 1);
      if (!element.__resizeListeners__.length) {
        element.removeEventListener('scroll', scrollListener);
        element.__resizeTriggers__ = !element.removeChild(element.__resizeTriggers__);
      }
    }
  };
})();

export default UI;
