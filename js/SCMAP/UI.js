/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

SCMAP.UI = function () {

   $('#bookmark-list-header a').append( SCMAP.Symbol.getTag( SCMAP.Symbols.BOOKMARK ).addClass('fa-lg') );
   $('#hangar-list-header a').append( SCMAP.Symbol.getTag( SCMAP.Symbols.HANGAR ).addClass('fa-lg') );
   $('#commented-list-header a').append( SCMAP.Symbol.getTag( SCMAP.Symbols.COMMENTS ).addClass('fa-lg') );

   $('#faction-list').empty();
   for ( var factionId in SCMAP.data.factions ) {
      var faction = SCMAP.data.factions[factionId];
      var $factionHeader = $('<h3><a href="#" data-toggle-next="next"><i class="fa fa-fw fa-lg fa-caret-right"></i>'+faction.name+'</a></h3>');
          $factionHeader.find('a').css( 'color', faction.color.getStyle() );
      var $factionSystems = $('<ul style="display: none;" id="list-faction-'+faction.id+'" class="fa-ul ui-section"></ul>');
      $('#faction-list').append( $factionHeader ).append( $factionSystems );
   }

   $( "#map_ui" ).tabs({
      active: 0,
      activate: function( event, ui ) {
         event.preventDefault();
         var clicked_on = ui.newTab.find('a').attr('href');

         switch ( clicked_on ) {

            case '#editor':
               if ( map.canEdit ) {
                  $('#webgl-container').removeClass().addClass( 'noselect webgl-container-edit' );
                  //window.editor.enabled = true;
                  //window.controls.requireAlt = true;
               }
               break;

            case '#listing':
               var systems = SCMAP.System.SortedList();
               var bookmarkCount = 0, hangarCount = 0, commentedCount = 0;
               var system;

               $('#hangar-list').empty();
               $('#bookmark-list').empty();
               $('#commented-list').empty();
               $('#a-z-list').empty();

               for ( var i = 0; i < systems.length; i += 1 ) {
                  system = systems[ i ];
                  var link = system.createInfoLink().outerHtml();

                  if ( storage && storage[ 'hangarLocation.' + system.id ] === '1' ) {
                     hangarCount += 1;
                     $('#hangar-list').append( $('<li>'+link+'</li>') );
                  }

                  if ( storage && storage[ 'bookmarks.' + system.id ] === '1' ) {
                     bookmarkCount += 1;
                     $('#bookmark-list').append( $('<li>'+link+'</li>') );
                  }

                  if ( storage ) {
                     if ( 'comments.'+system.id in storage ) {
                        commentedCount += 1;
                        $('#commented-list').append( $('<li>'+link+'</li>') );
                     }
                  }

                  $('#a-z-list').append( $('<li>'+link+'</li>') );
               }

               if ( bookmarkCount > 0 ) {
                  $('#bookmark-list-wrapper').show();
               } else {
                  $('#bookmark-list-wrapper').hide();
               }

               if ( hangarCount > 0 ) {
                  $('#hangar-list-wrapper').show();
               } else {
                  $('#hangar-list-wrapper').hide();
               }

               if ( commentedCount > 0 ) {
                  $('#commented-list-wrapper').show();
               } else {
                  $('#commented-list-wrapper').hide();
               }

               for ( var factionId in SCMAP.data.factions ) {
                  var faction = SCMAP.data.factions[factionId];
                  $('#list-faction-'+faction.id).empty();
                  for ( i = 0; i < systems.length; i += 1 ) {
                     system = systems[i];
                     if ( system.faction.id === faction.id ) {
                        $('#list-faction-'+faction.id).append( '<li>'+system.createInfoLink().outerHtml()+'</li>' );
                     }
                  }
               }

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

   for ( var icon in SCMAP.Symbols ) {
      icon = SCMAP.Symbols[ icon ];
      var $li = $('<li><i class="fa-li fa '+icon.faClass+'"></i>'+icon.description+'</li>' );
      $li.css( 'color', icon.color );
      $('#map_ui ul.legend').append( $li );
   }

   // Event handlers

   $('#3d-mode').prop( 'checked', SCMAP.settings.mode === '3d' );

   // Some simple UI stuff

   $('#lock-rotation').prop( 'checked', SCMAP.settings.control.rotationLocked );

   $('#3d-mode').on( 'change', function() { if ( this.checked ) displayState.to3d(); else displayState.to2d(); });

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

   $('#lock-rotation').on( 'change', function() {
      controls.noRotate = this.checked;
      if ( storage ) {
         storage['control.rotationLocked'] = ( this.checked ) ? '1' : '0';
      }
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
      map.updateSystems();
      if ( storage ) {
         storage['settings.Labels'] = ( this.checked ) ? '1' : '0';
      }
   });
   $('#toggle-label-icons').on( 'change', function() {
      SCMAP.settings.labelIcons = this.checked;
      map.updateSystems();
      if ( storage ) {
         storage['settings.LabelIcons'] = ( this.checked ) ? '1' : '0';
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

   var updateComments = function( event ) {
      event.preventDefault();
      if ( !storage ) { return; }
      var system = SCMAP.System.getById( $(this).data('system') );
      var text = $(this).val();
      if ( typeof text === 'string' && text.length > 0 ) {
         storage['comments.'+system.id] = text;
         //$md.find('p').prepend('<i class="fa fa-2x fa-quote-left"></i>');
         var $commentmd = $(markdown.toHTML( text ));
         $('#comments-md').html( $commentmd );
      } else {
         delete storage['comments.'+system.id];
         $('#comments-md').empty();
      }
      system.updateSceneObject( scene );
   };
   $('#comments').on( 'keyup', updateComments );
   $('#comments').on( 'blur', updateComments );
   $('#comments').on( 'change', updateComments );

   $('#bookmark').on( 'change', function() {
      var system = SCMAP.System.getById( $(this).data('system') );
      if ( !storage ) { return; }
      if ( this.checked ) {
         storage['bookmarks.'+system.id] = '1';
      } else {
         delete storage['bookmarks.'+system.id];
      }
      system.updateSceneObject( scene );
   });

   $('#hangar-location').on( 'change', function() {
      var system = SCMAP.System.getById( $(this).data('system') );
      if ( !storage ) { return; }
      if ( this.checked ) {
         storage['hangarLocation.'+system.id] = '1';
      } else {
         delete storage['hangarLocation.'+system.id];
      }
      system.updateSceneObject( scene );
   });
};

SCMAP.UI.prototype = {

   constructor: SCMAP.UI

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

// End of file
