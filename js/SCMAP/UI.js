/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

SCMAP.UI = function () {

   var me = this;

   var icons = [];
   for ( var icon in SCMAP.Symbols ) {
      icon = SCMAP.Symbols[ icon ]; // TODO use a handlebar template
      icons.push( $('<span><i class="fa-li fa '+icon.faClass+'"></i>'+icon.description+'</span>' ).css( 'color', icon.color ).outerHtml() );
   }

   $('#map_ui').empty().append(
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
         systemGroups: SCMAP.UI.buildDynamicLists()
      })
   );

   if ( $('#home') )
   {
      $('#3d-mode').prop( 'checked', SCMAP.settings.mode === '3d' );
      $('#3d-mode').on( 'change', function() { if ( this.checked ) displayState.to3d(); else displayState.to2d(); });

      $('#lock-rotation').prop( 'checked', SCMAP.settings.control.rotationLocked );
      $('#lock-rotation').on( 'change', function() {
         controls.noRotate = this.checked;
         if ( storage ) {
            storage['control.rotationLocked'] = ( this.checked ) ? '1' : '0';
         }
      });

      $('#resetCamera').on( 'click', function() {
         controls.cameraTo(
            SCMAP.settings.cameraDefaults.target,
            SCMAP.settings.cameraDefaults.orientation.theta,
            SCMAP.settings.cameraDefaults.orientation.phi,
            SCMAP.settings.cameraDefaults.orientation.radius
         );
      });
      $('#centreCamera').on( 'click', function() {
         controls.moveTo( SCMAP.settings.cameraDefaults.target );
      });
      $('#northCamera').on( 'click', function() {
         controls.rotateTo( 0, undefined, undefined );
      });
      $('#topCamera').on( 'click', function() {
         controls.rotateTo( 0, 0, 180 );
      });
      $('#top2D').on( 'click', function() {
         controls.noRotate = true;
         $('#lock-rotation').prop( 'checked', true );
         displayState.to2d();
         controls.rotateTo( 0, 0, 180 );
      });
   }

   $( "#map_ui" ).tabs({
      active: 0,
      activate: function( event, ui ) {
         event.preventDefault();
         var clicked_on = ui.newTab.find('a').attr('href');

         switch ( clicked_on ) {

            case '#listing':
               $('#listing').empty().append(
                  SCMAP.UI.Templates.listings({ systemGroups: SCMAP.UI.buildDynamicLists() })
               );
               break;

            default:
               $('#webgl-container').removeClass().addClass( 'noselect webgl-container-noedit' );
               //window.editor.enabled = false;
               //window.controls.requireAlt = false;
               //if ( clicked_on === '#info' && map.selected() instanceof SCMAP.System ) {
               //   map.selected().displayInfo();
               //}
               break;
         }

         $('#map_ui').data( 'jsp' ).reinitialise();
      }
   });

   /* jScrollPane */
   $('#map_ui').jScrollPane({ showArrows: true });

   $('#toggle-glow').prop( 'checked', SCMAP.settings.glow );
   $('#toggle-labels').prop( 'checked', SCMAP.settings.labels );
   $('#toggle-label-icons').prop( 'checked', SCMAP.settings.labelIcons );

   $('#avoid-hostile').prop( 'checked', SCMAP.settings.route.avoidHostile );
   $('#avoid-off-limits').prop( 'checked', SCMAP.settings.route.avoidOffLimits );
   $('#avoid-unknown-jumppoints').prop( 'checked', SCMAP.settings.route.avoidUnknownJumppoints );

   // Event handlers

   // Some simple UI stuff

   $('#avoid-hostile').on( 'change', function() {
      SCMAP.settings.route.avoidHostile = this.checked;
      SCMAP.settings.save( 'route' );
      map.route().rebuildCurrentRoute();
   });
   $('#avoid-off-limits').on( 'change', function() {
      SCMAP.settings.route.avoidOffLimits = this.checked;
      SCMAP.settings.save( 'route' );
      map.route().rebuildCurrentRoute();
   });
   $('#avoid-unknown-jumppoints').on( 'change', function() {
      SCMAP.settings.route.avoidUnknownJumppoints = this.checked;
      SCMAP.settings.save( 'route' );
      map.route().rebuildCurrentRoute();
   });

   $('#toggle-stats')
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

   $('#toggle-antialias')
      .prop( 'checked', SCMAP.settings.effect.Antialias )
      .on( 'change', function() {
         SCMAP.settings.effect.Antialias = this.checked;
         SCMAP.settings.save( 'effect' );
         console.log( localStorage.effect );
         window.location.reload( false );
      });

   $('#toggle-fxaa')
      .prop( 'checked', SCMAP.settings.effect.FXAA )
      .prop( 'disabled', SCMAP.settings.effect.Antialias )

      .on( 'change', function() {
         SCMAP.settings.effect.FXAA = this.checked;
         SCMAP.settings.save( 'effect' );
         if ( effectFXAA ) {
            effectFXAA.enabled = this.checked;
         }
      });

   $('#toggle-bloom')
      .prop( 'checked', SCMAP.settings.effect.Bloom )
      .prop( 'disabled', SCMAP.settings.effect.Antialias )

      .on( 'change', function() {
         SCMAP.settings.effect.Bloom = this.checked;
         SCMAP.settings.save( 'effect' );
         if ( composer ) {
            for ( var i = 0; i < composer.passes.length; i++ ) {
               if ( composer.passes[i] instanceof THREE.BloomPass ) {
                  composer.passes[i].enabled = this.checked;
               }
            }
         }
      });

   $('#toggle-glow').on( 'change', function() {
      SCMAP.settings.glow = this.checked;
      map.updateSystems();
      if ( storage ) {
         storage['settings.Glow'] = ( this.checked ) ? '1' : '0';
      }
   });

   $('#toggle-labels').on( 'change', function() {
      SCMAP.settings.labels = this.checked;
      $('#toggle-label-icons').prop( 'disabled', !SCMAP.settings.labels );
      map.updateSystems();
      if ( storage ) {
         storage['settings.Labels'] = ( this.checked ) ? '1' : '0';
      }
   });

   $('#toggle-label-icons')
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

   $('#map_ui').on( 'click', 'a[data-toggle-next]', function ( event ) {
      var $this = $(this);
      event.preventDefault();
      var $element = $this.parent().next();
      $element.toggle();
      if ( $element.is(':visible') ) {
         $this.parent().find('> a > i').first().removeClass('fa-caret-right').addClass('fa-caret-down');
      } else {
         $this.parent().find('> a > i').first().addClass('fa-caret-right').removeClass('fa-caret-down');
      }
      $('#map_ui').data( 'jsp' ).reinitialise();
   });

   $('#map_ui').on( 'click', 'a[data-toggle-child]', function ( event ) {
      var $this = $(this);
      event.preventDefault();
      var $element = $this.parent().find( $this.data('toggle-child') );
      $element.toggle();
      if ( $element.is(':visible') ) {
         $this.parent().find('> a > i').removeClass('fa-caret-right').addClass('fa-caret-down');
      } else {
         $this.parent().find('> a > i').addClass('fa-caret-right').removeClass('fa-caret-down');
      }
      $('#map_ui').data( 'jsp' ).reinitialise();
   });

   $('#map_ui').on( 'click', "a[data-goto='system']", function( event ) {
      event.preventDefault();
      var $this = $(this);
      var system = SCMAP.System.getById( $this.data('system') );
      system.displayInfo();
      controls.moveTo( system );
   });

   $('#map_ui #routelist').on( 'click', "td.control a.remove-waypoint", function( event ) {
      event.preventDefault();
      var $this = $(this);
      var system = SCMAP.System.getById( $this.data('system') );
      map.route().removeWaypoint( system );
      map.route().update();
   });

   $('#map_ui #routelist').on( 'click', 'button.delete-route', function( event ) {
      map.route().destroy();
   });

   var updateComments = function( event ) {
      event.preventDefault();
      var system = SCMAP.System.getById( $(this).data('system') );
      var text = $(this).val();
      if ( typeof text === 'string' && text.length > 0 ) {
         system.setComments( text );
         $('#map_ui .user-system-comments-md').html( $(markdown.toHTML( text )) );
      } else {
         system.setComments();
         $('#map_ui .user-system-comments-md').empty();
      }
      system.updateSceneObject( scene );
   };

   $('#map_ui').on( 'keyup', '.user-system-comments', updateComments );
   $('#map_ui').on( 'blur', '.user-system-comments', updateComments );
   $('#map_ui').on( 'change', '.user-system-comments', updateComments );

   $('#map_ui').on( 'click', '.remove-system-comments', function( event ) {
      event.preventDefault();
      var system = SCMAP.System.getById( $(this).data('system') );
      system.setComments();
      $('.comment-editing .user-system-comments').empty().val('');
      $('.comment-editing .user-system-comments-md').empty();
      system.updateSceneObject( scene );
   });

   $('#map_ui').on( 'change', '.user-system-bookmarked', function() {
      SCMAP.System.getById( $(this).data('system') )
         .setBookmarkedState( this.checked )
         .updateSceneObject( scene );
      SCMAP.settings.save( 'systems' );
   });

   $('#map_ui').on( 'change', '.user-system-ishangar', function() {
      SCMAP.System.getById( $(this).data('system') )
         .setHangarState( this.checked )
         .updateSceneObject( scene );
      SCMAP.settings.save( 'systems' );
   });

   $('#map_ui').on( 'change', '.user-system-avoid', function() {
      SCMAP.System.getById( $(this).data('system') )
         .setToBeAvoidedState( this.checked )
         .updateSceneObject( scene );
      SCMAP.settings.save( 'systems' );
      map.route().rebuildCurrentRoute();
   });

   $("#map_ui a[href='#']").removeAttr('href');
};

SCMAP.UI.prototype = {

   constructor: SCMAP.UI,

   toTabIndex: function toTabIndex( index ) {
      //$('#map_ui').tabs( 'options', 'active', index );
      window.ui.updateHeight();
      //$('#map_ui').data( 'jsp' ).scrollToPercentY( 0 );
   },

   updateHeight: function updateHeight() {
      //$('#map_ui').data( 'jsp' ).reinitialise();
   }

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

   for ( var factionId in SCMAP.data.factions ) {
      var faction = SCMAP.data.factions[factionId];
      factionsById[ faction.id ] = [];
   }

   var factions = [];

   $( SCMAP.System.List ).each( function ( i, system ) {
      var link = system.createInfoLink().outerHtml(); // TODO replace with template

      if ( system.hasHangar() ) { hangars.push( link ); }
      if ( system.isBookmarked() ) { bookmarked.push( link ); }
      if ( system.hasComments() ) { withComments.push( link ); }

      //$('#faction-list').empty();
      //for ( var factionId in SCMAP.data.factions ) {
      //   var faction = SCMAP.data.factions[factionId];
      //   var $factionHeader = $('<h3><a href="#" data-toggle-next="next"><i class="fa fa-fw fa-lg fa-caret-right"></i>'+faction.name+'</a></h3>');
      //       $factionHeader.find('a').css( 'color', faction.color.getStyle() );
      //   var $factionSystems = $('<ul style="display: none;" id="list-faction-'+faction.id+'" class="fa-ul ui-section"></ul>');
      //   $('#faction-list').append( $factionHeader ).append( $factionSystems );
      //}

      everything.push( link );
   });

   return [ {
         title: "Hangar locations&nbsp;"+SCMAP.Symbol.getTag( SCMAP.Symbols.HANGAR ).addClass('fa-lg').outerHtml(),
         items: hangars
      }, {
         title: "Bookmarked&nbsp;"+SCMAP.Symbol.getTag( SCMAP.Symbols.BOOKMARK ).addClass('fa-lg').outerHtml(),
         items: bookmarked
      }, {
         title: "With your comments&nbsp;"+SCMAP.Symbol.getTag( SCMAP.Symbols.COMMENTS ).addClass('fa-lg').outerHtml(),
         items: withComments
      }, {
         title: "By faction",
         factions: [
         ]
      }, {
         title: "Everything",
         items: everything
      }
   ];
};

var sectionLevel = 1;
Handlebars.registerHelper( 'uiSection', function( title, shouldOpen, options ) {
   var opened = ( shouldOpen ) ? true : false;
   var icon = 'fa-caret-right';
   var hidden = 'style="display: none;"';
   var attrs = [];
   var oldLevel = sectionLevel++;
   var str;
   if ( opened ) {
      icon = 'fa-caret-down';
      hidden = '';
   }
   for ( var prop in options.hash ) {
      attrs.push( prop + '="' + options.hash[prop] + '"' );
   }
   str = '<h'+oldLevel+'><a href="#" data-toggle-next="next" '+attrs.join(" ")+'><i class="fa fa-fw fa-lg '+icon+'"></i>'+title+'</a></h'+oldLevel+">\n"+
         '         <div class="ui-section" '+hidden+'>';
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

Handlebars.registerHelper( 'bigButton', function( id, faClass, title ) {
   return new Handlebars.SafeString( '<button class="big-button" id="'+id+'"><i class="fa '+faClass+' fa-fw fa-lg"></i> '+title+'</button>'+'<br>' );
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
   console.log( options );
   var noIcons = false, noTarget = false;
   if ( 'noIcons' in options.hash ) {
      noIcons = ( options.hash.noIcons ) ? true : false;
   }
   if ( 'noTarget' in options.hash ) {
      noTarget = ( options.hash.noTarget ) ? true : false;
   }
   return new Handlebars.SafeString( system.createInfoLink( noIcons, noTarget ).outerHtml() );
});

Handlebars.registerHelper( 'checkboxButton', function( id, title, options ) {
   var attrs = [];
   for ( var prop in options.hash ) {
      if ( prop === 'icon' ) {
         title = title+' <i class="fa fa-lg fa-fw '+options.hash[prop]+'"></i>';
      } else {
         attrs.push( prop + '="' + htmlEscape(options.hash[prop]) + '"' );
      }
   }
   return new Handlebars.SafeString(
      '<span class="checkmark-button">'+
         '<input type="checkbox" id="'+id+'" '+attrs.join(" ")+'><label for="'+id+'">'+title+'</label>'+
      '</span>'
   );
});

Handlebars.registerHelper( "debug", function(optionalValue) {
  console.log("Current Context");
  console.log("====================");
  console.log(this);

  if (optionalValue) {
    console.log("Value");
    console.log("====================");
    console.log(optionalValue);
  }
});

Handlebars.registerHelper( 'mapUiTabHeader', function( id, title, icon ) {
   return new Handlebars.SafeString(
      '<li><a title="'+htmlEscape(title)+'" href="#'+htmlEscape(id)+'"><i class="fa fa-fw fa-2x '+htmlEscape(icon)+'"></i></a></li>'
   );
});

Handlebars.registerHelper( 'checkboxOption', function( id, title, description, options ) {
   var attrs = [];
   for ( var prop in options.hash ) {
      if ( prop === 'icon' ) {
         title = title+' <i class="fa fa-lg fa-fw '+options.hash[prop]+'"></i>';
      } else {
         attrs.push( prop + '="' + htmlEscape(options.hash[prop]) + '"' );
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

function htmlEscape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
}

SCMAP.UI.Templates = {
   mapUI:      Handlebars.compile( $('#templateMapUI').html() ),
   systemInfo: Handlebars.compile( $('#templateSystemInfo').html() ),
   listings:   Handlebars.compile( $('#templateSystemsListing').html() ),
   routeList:  Handlebars.compile( $('#templateRouteList').html() )
};

// End of file
