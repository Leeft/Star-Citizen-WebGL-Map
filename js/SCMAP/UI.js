/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

SCMAP.UI = function ( map ) {

   var me = this;

   this.map = map;

   var icons = [];
   for ( var icon in SCMAP.Symbols ) {
      icon = SCMAP.Symbols[ icon ];
      icons.push( $('<span><i class="fa-li fa '+icon.faClass+'"></i>'+icon.description+'</span>' ).css( 'color', icon.color ).outerHtml() );
   }

   $('#sc-map-interface').empty().append(
      SCMAP.UI.Templates.mapUI({
         instructions: [
            "Left-click and release to select a system.",
            "Left-click and drag from system to system to map a route between them.",
            "Left-click and drag any waypoint on the route to move it. It moves an existing waypoint or creates new waypoints as needed.",
            "Left-click and drag on the map to rotate the camera around the center of the map.",
            "Mousewheel to zoom in and out, middle-click and drag can also be used.",
            "Right-click to pan the camera around the map."
         ],
         shortcuts: [
            { key: "R",   description: "Reset camera orientation" },
            { key: "C",   description: "Camera to center (Sol)" },
            { key: "T",   description: "Top-down camera" },
            { key: "L",   description: "Lock/unlock camera rotation" },
            { key: "2",   description: "Switch to 2D mode" },
            { key: "3",   description: "Switch to 3D mode" },
            { key: "Esc", description: "Deselect target" }
         ],
         icons: icons,
         systemGroups: SCMAP.UI.buildDynamicLists(),
         system: null,
         route: {
            status: {
               text: 'No route set.',
               class: 'no-route'
            }
         }
      })
   );
   $( SCMAP.UI.menuBar ).each( function ( i, menuItem ) {
      $('#sc-map-interface ul.menubar').append( menuItem );
   });


      $('#sc-map-3d-mode')
         .prop( 'checked', SCMAP.settings.mode === '3d' )
         .on( 'change', function() {
            if ( this.checked ) {
               me.map.displayState.to3d();
            } else {
               me.map.displayState.to2d();
            }
         });

      $('#sc-map-lock-rotation')
         .prop( 'checked', SCMAP.settings.control.rotationLocked )
         .on( 'change', function() {
            renderer.controls.noRotate = this.checked;
            if ( storage ) {
               storage['control.rotationLocked'] = ( this.checked ) ? '1' : '0';
            }
         });

      $('#sc-map-resetCamera').on( 'click', function() {
         renderer.controls.cameraTo(
            SCMAP.settings.cameraDefaults.target,
            SCMAP.settings.cameraDefaults.orientation.theta,
            SCMAP.settings.cameraDefaults.orientation.phi,
            SCMAP.settings.cameraDefaults.orientation.radius
         );
      });

      $('#sc-map-centreCamera').on( 'click', function() {
         renderer.controls.moveTo( SCMAP.settings.cameraDefaults.target );
      });

      $('#sc-map-northCamera').on( 'click', function() {
         renderer.controls.rotateTo( 0, undefined, undefined );
      });

      $('#sc-map-topCamera').on( 'click', function() {
         renderer.controls.rotateTo( 0, 0, 180 );
      });

      $('#sc-map-top2D').on( 'click', function() {
         renderer.controls.noRotate = true;
         $('#sc-map-lock-rotation').prop( 'checked', true );
         me.map.displayState.to2d();
         renderer.controls.rotateTo( 0, 0, 180 );
      });

   var tabIndex = 0;
   if ( hasSessionStorage() && ( 'scMapTab' in window.sessionStorage ) ) {
      var defaultTab = SCMAP.UI.Tab( window.sessionStorage.scMapTab );
      if ( defaultTab ) {
         tabIndex = defaultTab.index;
      }
   }

   $("#sc-map-interface").tabs({
      active: tabIndex,
      activate: function( event, ui ) {
         event.preventDefault();
         var clicked_on = ui.newTab.find('a').data('tab');
         var tab = SCMAP.UI.Tab( clicked_on );

         switch ( clicked_on ) {

            case 'systems':
               me.updateSystemsList();
               break;

            default:
               $('#sc-map-webgl-container').removeClass('edit');
               //window.editor.enabled = false;
               //window.controls.requireAlt = false;
               //if ( clicked_on === '#info' && map.selected() instanceof SCMAP.System ) {
               //   map.selected().displayInfo();
               //}
               break;
         }

         if ( hasSessionStorage() ) {
            window.sessionStorage.scMapTab = clicked_on;
         }

         //$('#sc-map-interface').data( 'jsp' ).reinitialise();
         //$('#sc-map-interface').data( 'jsp' ).scrollToPercentY( 0 );
      }
   });

   /* jScrollPane */
   //$('#sc-map-interface').jScrollPane({ showArrows: true });

   $('#sc-map-toggle-glow').prop( 'checked', SCMAP.settings.glow );
   $('#sc-map-toggle-labels').prop( 'checked', SCMAP.settings.labels );
   $('#sc-map-toggle-label-icons').prop( 'checked', SCMAP.settings.labelIcons );

   // Some simple UI stuff

   $('#sc-map-avoid-hostile')
      .prop( 'checked', SCMAP.settings.route.avoidHostile )
      .on( 'change', function() {
         SCMAP.settings.route.avoidHostile = this.checked;
         SCMAP.settings.save( 'route' );
         map.route().rebuildCurrentRoute();
      });

   $('#sc-map-avoid-off-limits')
      .prop( 'checked', SCMAP.settings.route.avoidOffLimits )
      .on( 'change', function() {
         SCMAP.settings.route.avoidOffLimits = this.checked;
         SCMAP.settings.save( 'route' );
         map.route().rebuildCurrentRoute();
      });

   $('#sc-map-avoid-unknown-jumppoints')
      .prop( 'checked', SCMAP.settings.route.avoidUnknownJumppoints )
      .on( 'change', function() {
         SCMAP.settings.route.avoidUnknownJumppoints = this.checked;
         SCMAP.settings.save( 'route' );
         map.route().rebuildCurrentRoute();
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
      .prop( 'checked', SCMAP.settings.effect.Antialias )
      .on( 'change', function() {
         SCMAP.settings.effect.Antialias = this.checked;
         SCMAP.settings.save( 'effect' );
         window.location.reload( false );
      });

   $('#sc-map-toggle-fxaa')
      .prop( 'checked', SCMAP.settings.effect.FXAA )
      .prop( 'disabled', SCMAP.settings.effect.Antialias )

      .on( 'change', function() {
         SCMAP.settings.effect.FXAA = this.checked;
         SCMAP.settings.save( 'effect' );
         if ( renderer.FXAA ) {
            renderer.FXAA.enabled = this.checked;
         }
      });

   $('#sc-map-toggle-bloom')
      .prop( 'checked', SCMAP.settings.effect.Bloom )
      .prop( 'disabled', SCMAP.settings.effect.Antialias )

      .on( 'change', function() {
         SCMAP.settings.effect.Bloom = this.checked;
         SCMAP.settings.save( 'effect' );
         if ( renderer.composer ) {
            for ( var i = 0; i < renderer.composer.passes.length; i++ ) {
               if ( renderer.composer.passes[i] instanceof THREE.BloomPass ) {
                  renderer.composer.passes[i].enabled = this.checked;
               }
            }
         }
      });

   $('#sc-map-toggle-glow').on( 'change', function() {
      SCMAP.settings.glow = this.checked;
      map.updateSystems();
      if ( storage ) {
         storage['settings.Glow'] = ( this.checked ) ? '1' : '0';
      }
   });

   $('#sc-map-toggle-labels').on( 'change', function() {
      SCMAP.settings.labels = this.checked;
      $('#sc-map-toggle-label-icons').prop( 'disabled', !SCMAP.settings.labels );
      map.updateSystems();
      if ( storage ) {
         storage['settings.Labels'] = ( this.checked ) ? '1' : '0';
      }
   });

   $('#sc-map-toggle-label-icons')
      .prop( 'disabled', !SCMAP.settings.labels )
      .on( 'change', function() {
         SCMAP.settings.labelIcons = this.checked;
         map.updateSystems();
         if ( storage ) {
            storage['settings.LabelIcons'] = ( this.checked ) ? '1' : '0';
         }
   });

   $('.quick-button.with-checkbox').on( 'click', function ( event ) {
      var $this = $(this);
      $this.find('input[type=checkbox]').click();
   });

   $('#sc-map-interface').on( 'click', 'a[data-toggle-next]', function ( event ) {
      var $this = $(this);
      event.preventDefault();
      var $element = $this.parent().next();
      $element.toggle();
      var title = $this.data('title');
      var storage = null;
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
      //$('#sc-map-interface').data( 'jsp' ).reinitialise();
   });

   $('#sc-map-interface').on( 'click', 'a[data-toggle-child]', function ( event ) {
      var $this = $(this);
      event.preventDefault();
      var $element = $this.parent().find( $this.data('toggle-child') );
      $element.toggle();
      if ( $element.is(':visible') ) {
         $this.parent().find('> a > i').removeClass('fa-caret-right').addClass('fa-caret-down');
      } else {
         $this.parent().find('> a > i').addClass('fa-caret-right').removeClass('fa-caret-down');
      }
      //$('#sc-map-interface').data( 'jsp' ).reinitialise();
   });

   $('#sc-map-interface').on( 'click', "a[data-goto='system']", function( event ) {
      event.preventDefault();
      var $this = $(this);
      var system = SCMAP.System.getById( $this.data('system') );
      system.displayInfo();
      renderer.controls.moveTo( system );
   });

   $('#sc-map-interface').on( 'click', "table.routelist .remove-waypoint", function( event ) {
      event.preventDefault();
      var $this = $(this);
      var system = SCMAP.System.getById( $this.data('system') );
      map.route().removeWaypoint( system );
      map.route().update();
   });

   $('#sc-map-interface').on( 'click', 'button.delete-route', function( event ) {
      map.route().destroy();
   });

   var updateComments = function( event ) {
      event.preventDefault();
      var system = SCMAP.System.getById( $(this).data('system') );
      var text = $(this).val();
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
      var system = SCMAP.System.getById( $(this).data('system') );
      system.setComments();
      $('.comment-editing .user-system-comments').empty().val('');
      $('.comment-editing .user-system-comments-md').empty();
      system.updateSceneObject( scene );
   });

   $('#sc-map-interface').on( 'change', '.user-system-bookmarked', function() {
      SCMAP.System.getById( $(this).data('system') )
         .setBookmarkedState( this.checked )
         .updateSceneObject( scene );
      SCMAP.settings.save( 'systems' );
   });

   $('#sc-map-interface').on( 'change', '.user-system-ishangar', function() {
      SCMAP.System.getById( $(this).data('system') )
         .setHangarState( this.checked )
         .updateSceneObject( scene );
      SCMAP.settings.save( 'systems' );
   });

   $('#sc-map-interface').on( 'change', '.user-system-avoid', function() {
      SCMAP.System.getById( $(this).data('system') )
         .setToBeAvoidedState( this.checked )
         .updateSceneObject( scene );
      SCMAP.settings.save( 'systems' );
      map.route().rebuildCurrentRoute();
   });

   /* Browsers show an ugly URL bar if href is set to #, this
    * makes the HTML invalid but removes the ugly URL bar */
   $("#sc-map-interface a[href='#']").removeAttr('href');
};

SCMAP.UI.prototype = {

   constructor: SCMAP.UI,

   toTab: function toTab( index ) {
      var tab = SCMAP.UI.Tab( index );
      $('#sc-map-interface').tabs( 'option', 'active', tab.index );
   },

   toTabTop: function toTabTop() {
      if ( $('#sc-map-interface').data('jsp') ) {
         $('#sc-map-interface').data('jsp').scrollToPercentY( 0 );
      }
   },

   updateHeight: function updateHeight() {
      if ( $('#sc-map-interface').data('jsp') ) {
         $('#sc-map-interface').data('jsp').reinitialise();
      }
   },

   updateSystemsList: function updateSystemsList() {
      var tab = SCMAP.UI.Tab( 'systems' );
      $( tab.id ).empty().append(
         SCMAP.UI.Templates.listings({ systemGroups: SCMAP.UI.buildDynamicLists() })
      );
   }
};

SCMAP.UI.Tabs = [];
SCMAP.UI.menuBar = [];

SCMAP.UI.Tab = function Tab( name ) {
   for ( var i = 0; i < SCMAP.UI.Tabs.length; i += 1 ) {
      if ( ( typeof name === 'string' ) && ( SCMAP.UI.Tabs[ i ].name === name ) ) {
         return SCMAP.UI.Tabs[ i ];
      } else if ( ( typeof name === 'number' ) && ( SCMAP.UI.Tabs[ i ].id === name ) ) {
         return SCMAP.UI.Tabs[ i ];
      }
   }
   return;
};

SCMAP.UI.makeSafeForCSS = function makeSafeForCSS( name ) {
   if ( typeof name !== 'string' ) {
      return;
   }
   return name.replace( /[^a-zA-Z0-9]/g, function(s) {
      var c = s.charCodeAt(0);
      if (c == 32) return '-';
      if (c >= 65 && c <= 90) return '_' + s.toLowerCase();
      return (c.toString(16)).slice(-4);
   });
};

SCMAP.UI.fontAwesomeIsReady = false;
SCMAP.UI.waitForFontAwesome = function waitForFontAwesome( callback ) {
   var retries = 5;

   function checkReady () {
      var canvas, context;
      retries -= 1;
      canvas = document.createElement('canvas');
      canvas.width = 20;
      canvas.height = 20;
      context = canvas.getContext('2d');
      context.font = '16pt FontAwesome';
      context.textAlign = 'center';
      context.fillStyle = 'rgba(255,255,255,1.0)';
      context.fillText( '\uf0c8', 10, 18 );
      var data = context.getImageData( 10, 10, 1, 1 ).data;
      if ( data[0] === 0 && data[1] === 0 && data[2] === 0 ) {
         console.log( "FontAwesome is not yet available, retrying ..." );
         if ( retries > 0 ) {
            setTimeout( checkReady, 200 );
         }
      } else {
         console.log( "FontAwesome is loaded" );
         SCMAP.UI.fontAwesomeIsReady = true;
         if ( typeof callback === 'function' ) {
            callback();
         }
      }
   }

   checkReady();
};

SCMAP.UI.buildDynamicLists = function buildDynamicLists() {
   var hangars = [];
   var bookmarked = [];
   var withComments = [];
   var byFaction = [];
   var everything = [];
   var factionsById = {};
   var data = [];

   for ( var factionId in SCMAP.data.factions ) {
      var faction = SCMAP.data.factions[factionId];
      factionsById[ faction.id ] = {
         faction: faction.name,
         items: []
      };
   }

   var factions = [];

   $( SCMAP.System.List ).each( function ( i, system ) {
      var link = system.createInfoLink().outerHtml(); // TODO replace with template

      if ( system.hasHangar() ) { hangars.push( link ); }
      if ( system.isBookmarked() ) { bookmarked.push( link ); }
      if ( system.hasComments() ) { withComments.push( link ); }

      factionsById[ system.faction.id ].items.push( link );
      everything.push( link );
   });

   if ( hangars.length ) {
      data.push({
         title: "Hangar locations&nbsp;"+SCMAP.Symbol.getTag( SCMAP.Symbols.HANGAR ).addClass('fa-lg').outerHtml(),
         items: hangars
      });
   }

   if ( bookmarked.length ) {
      data.push({
         title: "Bookmarked&nbsp;"+SCMAP.Symbol.getTag( SCMAP.Symbols.BOOKMARK ).addClass('fa-lg').outerHtml(),
         items: bookmarked
      });
   }

   if ( withComments.length ) {
      data.push({
         title: "With your comments&nbsp;"+SCMAP.Symbol.getTag( SCMAP.Symbols.COMMENTS ).addClass('fa-lg').outerHtml(),
         items: withComments
      });
   }

   data.push(
     {
         title: "By faction",
         factions: factionsById
      },
      {
         title: "Everything",
         items: everything
      }
   );

   return data;
};

SCMAP.UI.htmlEscape = function htmlEscape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
};

SCMAP.UI.Templates = {
   mapUI:      Handlebars.compile( $('#templateMapUI').html() ),
   systemInfo: Handlebars.compile( $('#templateSystemInfo').html() ),
   listings:   Handlebars.compile( $('#templateSystemsListing').html() ),
   routeList:  Handlebars.compile( $('#templateRouteList').html() )
};

$(function() {
   var sectionLevel = 1;
   var tabCounter = 0;

   Handlebars.registerHelper( 'uiSection', function( title, shouldOpen, options ) {
      var opened = ( shouldOpen ) ? true : false;
      var icon = 'fa-caret-right';
      var hidden = 'style="display: none;"';
      var attrs = [], str;
      var oldLevel = sectionLevel++;
      var storage = null;
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

      for ( var prop in options.hash ) {
         attrs.push( prop + '="' + options.hash[prop] + '"' );
      }

      str = '<h'+oldLevel+'><a href="#" data-title="'+SCMAP.UI.htmlEscape(title)+
         '" data-toggle-next="next" '+attrs.join(" ")+'><i class="fa fa-fw fa-lg '+icon+'">'+
         '</i>'+title+'</a></h'+oldLevel+">\n"+'         <div class="ui-section" '+hidden+'>';

      if ( 'fn' in options ) {
         str += options.fn( this );
      }

      str += '</div>';
      sectionLevel -= 1;
      return new Handlebars.SafeString( str );
   });

   Handlebars.registerHelper( 'tabHeader', function( title ) {
      return new Handlebars.SafeString( '<h1 class="padleft">'+title+'</h1>' );
   });

   /* title: shown to user, name: internal name, icon: font awesome icon class */
   Handlebars.registerHelper( 'jQueryUiTab', function( title, name, icon, options ) {
      var hidden = 'style="display: none;"';
      var attrs = [], str = '';
      var $menuItem;
      var id = 'sc-map-ui-tab-'+SCMAP.UI.makeSafeForCSS( name );

      //for ( var prop in options.hash ) {
      //   attrs.push( prop + '="' + options.hash[prop] + '"' );
      //}

      $menuItem = $(
         '<li>' +
            '<a title="'+SCMAP.UI.htmlEscape(title)+'" data-tab="'+SCMAP.UI.htmlEscape(name)+'" href="#'+SCMAP.UI.htmlEscape(id)+'">'+
               '<i class="fa fa-fw fa-2x '+SCMAP.UI.htmlEscape(icon)+'"></i>'+
            '</a>'+
         '</li>'
      );
      SCMAP.UI.menuBar.push( $menuItem );

      str = '<div id="' + id + '" class="sc-map-ui-tab" ' + ((tabCounter !== 0) ? 'style="display: none"' : '') + '>';
      if ( 'fn' in options ) {
         str += options.fn( this );
      }
      str += '</div>';

      SCMAP.UI.Tabs.push({ id: '#'+id, name: name, index: tabCounter++ });

      return new Handlebars.SafeString( str );
   });

   Handlebars.registerHelper( 'bigButton', function( id, faClass, title ) {
      return new Handlebars.SafeString( '<button class="big-button" id="'+id+'">'+
         '<i class="fa '+faClass+' fa-fw fa-lg"></i> '+title+'</button>'+'<br>' );
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
      var noIcons = false, noTarget = false;
      if ( 'noIcons' in options.hash ) {
         noIcons = ( options.hash.noIcons ) ? true : false;
      }
      if ( 'noTarget' in options.hash ) {
         noTarget = ( options.hash.noTarget ) ? true : false;
      }
      if ( !(system instanceof SCMAP.System) ) {
         return '';
      }
      return new Handlebars.SafeString( system.createInfoLink( noIcons, noTarget ).outerHtml() );
   });

   Handlebars.registerHelper( 'checkboxButton', function( id, title, options ) {
      var attrs = [];
      for ( var prop in options.hash ) {
         if ( prop === 'icon' ) {
            title = title+' <i class="fa fa-lg fa-fw '+options.hash[prop]+'"></i>';
         } else {
            attrs.push( prop + '="' + SCMAP.UI.htmlEscape(options.hash[prop]) + '"' );
         }
      }
      return new Handlebars.SafeString(
         '<span class="checkmark-button">'+
            '<input type="checkbox" id="'+id+'" '+attrs.join(" ")+'>'+
            '<label for="'+id+'">'+title+'</label>'+
         '</span>'
      );
   });

   Handlebars.registerHelper( "debug", function( optionalValue ) {
      console.log( "Current Context", this );
      if (optionalValue) {
         console.log( "Value", optionalValue );
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

   Handlebars.registerHelper( 'checkboxOption', function( id, title, description, options ) {
      var attrs = [];
      for ( var prop in options.hash ) {
         if ( prop === 'icon' ) {
            title = title+' <i class="fa fa-lg fa-fw '+options.hash[prop]+'"></i>';
         } else {
            attrs.push( prop + '="' + SCMAP.UI.htmlEscape(options.hash[prop]) + '"' );
         }
      }
      return new Handlebars.SafeString(
         '<span class="checkmark-option">'+
            '<input type="checkbox" id="'+id+'">'+
            '<label for="'+id+'">'+title+
               '<span class="small label-info">'+description+'</span>'+
            '</label>'+
         '</span>'
      );
   });

   $('script[type="text/x-handlebars-template"][data-partial="1"]').each( function( index, elem ) {
      var $elem = $(elem);
      Handlebars.registerPartial( $elem.attr('id'), $elem.html() );
   });
});

// End of file
