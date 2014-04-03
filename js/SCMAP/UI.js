function initUI () {

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
                  window.editor.enabled = true;
                  window.controls.requireAlt = true;
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

                  if ( localStorage && localStorage[ 'hangarLocation.' + system.id ] === '1' ) {
                     hangarCount += 1;
                     $('#hangar-list').append( $('<li>'+link+'</li>') );
                  }

                  if ( localStorage && localStorage[ 'bookmarks.' + system.id ] === '1' ) {
                     bookmarkCount += 1;
                     $('#bookmark-list').append( $('<li>'+link+'</li>') );
                  }

                  if ( localStorage ) {
                     if ( 'comments.'+system.id in localStorage ) {
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
               window.editor.enabled = false;
               window.controls.requireAlt = false;
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
   $('#avoid-hostile').prop( 'checked', ( localStorage && localStorage['route.avoidHostile'] === '1' ) );
   $('#avoid-off-limits').prop( 'checked', ( localStorage && localStorage['route.avoidOffLimits'] === '1' ) );
   $('#avoid-unknown-jumppoints').prop( 'checked', ( localStorage && localStorage['route.avoidUnknownJumppoints'] === '1' ) );

   for ( var icon in SCMAP.Symbols ) {
      icon = SCMAP.Symbols[ icon ];
      var $li = $('<li><i class="fa-li fa '+icon.faClass+'"></i>'+icon.description+'</li>' );
      $li.css( 'color', icon.color );
      $('#map_ui ul.legend').append( $li );
   }

   // Event handlers

   $('#toggle-fxaa').prop( 'checked', ( localStorage && localStorage['effect.FXAA'] === '1' ) ? true : false );
   $('#toggle-bloom').prop( 'checked', ( localStorage && localStorage['effect.Bloom'] === '1' ) ? true : false );

   $('#3d-mode').prop( 'checked', localStorage && localStorage.mode === '3d' );

   // Some simple UI stuff

   $('#lock-rotation').prop( 'checked', localStorage && localStorage['control.rotationLocked'] === '1' );

   $('#3d-mode').on( 'change', function() { if ( this.checked ) displayState.to3d(); else displayState.to2d(); });

   $('#avoid-hostile').on( 'change', function() {
      if ( localStorage ) {
         localStorage['route.avoidHostile'] = ( this.checked ) ? '1' : '0';
      }
      map.rebuildCurrentRoute();
   });
   $('#avoid-off-limits').on( 'change', function() {
      if ( localStorage ) {
         localStorage['route.avoidOffLimits'] = ( this.checked ) ? '1' : '0';
         map.rebuildCurrentRoute();
      }
   });
   $('#avoid-unknown-jumppoints').on( 'change', function() {
      if ( localStorage ) {
         localStorage['route.avoidUnknownJumppoints'] = ( this.checked ) ? '1' : '0';
         map.rebuildCurrentRoute();
      }
   });

   $('#lock-rotation').on( 'change', function() {
      controls.noRotate = this.checked;
      if ( localStorage ) {
         localStorage['control.rotationLocked'] = ( this.checked ) ? '1' : '0';
      }
   });
   $('#toggle-fxaa').on( 'change', function() {
      effectFXAA.enabled = this.checked;
      if ( localStorage ) {
         localStorage['effect.FXAA'] = ( this.checked ) ? '1' : '0';
      }
   });
   $('#toggle-bloom').on( 'change', function() {
      effectBloom.enabled = this.checked;
      if ( localStorage ) {
         localStorage['effect.Bloom'] = ( this.checked ) ? '1' : '0';
      }
   });

   $('#toggle-glow').on( 'change', function() {
      SCMAP.settings.glow = this.checked;
      map.updateSystems();
      if ( localStorage ) {
         localStorage['settings.Glow'] = ( this.checked ) ? '1' : '0';
      }
   });
   $('#toggle-labels').on( 'change', function() {
      SCMAP.settings.labels = this.checked;
      map.updateSystems();
      if ( localStorage ) {
         localStorage['settings.Labels'] = ( this.checked ) ? '1' : '0';
      }
   });
   $('#toggle-label-icons').on( 'change', function() {
      SCMAP.settings.labelIcons = this.checked;
      map.updateSystems();
      if ( localStorage ) {
         localStorage['settings.LabelIcons'] = ( this.checked ) ? '1' : '0';
      }
   });

   $('#resetCamera').on( 'click', function() {
      controls.cameraTo( cameraDefaults.target, cameraDefaults.theta, cameraDefaults.phi, cameraDefaults.radius );
   });
   $('#centreCamera').on( 'click', function() {
      controls.moveTo( cameraDefaults.target );
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
      if ( !localStorage ) { return; }
      var system = SCMAP.System.getById( $(this).data('system-id') );
      var text = $(this).val();
      if ( typeof text === 'string' && text.length > 0 ) {
         localStorage['comments.'+system.id] = text;
         //$md.find('p').prepend('<i class="fa fa-2x fa-quote-left"></i>');
         var $commentmd = $(markdown.toHTML( text ));
         $('#comments-md').html( $commentmd );
      } else {
         delete localStorage['comments.'+system.id];
         $('#comments-md').empty();
      }
      system.updateSceneObject( scene );
   };
   $('#comments').on( 'keyup', updateComments );
   $('#comments').on( 'blur', updateComments );
   $('#comments').on( 'change', updateComments );

   $('#bookmark').on( 'change', function() {
      var system = SCMAP.System.getById( $(this).data('system-id') );
      if ( !localStorage ) { return; }
      if ( this.checked ) {
         localStorage['bookmarks.'+system.id] = '1';
      } else {
         delete localStorage['bookmarks.'+system.id];
      }
      system.updateSceneObject( scene );
   });

   $('#hangar-location').on( 'change', function() {
      var system = SCMAP.System.getById( $(this).data('system-id') );
      if ( !localStorage ) { return; }
      if ( this.checked ) {
         localStorage['hangarLocation.'+system.id] = '1';
      } else {
         delete localStorage['hangarLocation.'+system.id];
      }
      system.updateSceneObject( scene );
   });
}

function makeSafeForCSS( name ) {
   if ( typeof name !== 'string' ) {
      return;
   }
   return name.replace( /[^a-zA-Z0-9]/g, function(s) {
      var c = s.charCodeAt(0);
      if (c == 32) return '-';
      if (c >= 65 && c <= 90) return '_' + s.toLowerCase();
      return (c.toString(16)).slice(-4);
   });
}

// End of file
