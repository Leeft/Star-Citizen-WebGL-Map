/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

SCMAP.System = function ( data ) {
   // Filled in from the config
   this.id = undefined;
   this.uuid = undefined;
   this.name = '';
   this.nickname = '';
   this.position = new THREE.Vector3();
   this.faction = new SCMAP.Faction();
   this.size = 'medium';
   this.jumpPoints = [];
   this.starColor = new THREE.Color( 0xFFFFFF );
   this.source = undefined;
   this.planets = 0;
   this.planetaryRotation = [];
   this.import = [];
   this.export = [];
   this.crimeStatus = '';
   this.blackMarket = [];
   this.ueeStrategicValue = undefined;
   this.blob = [];

   this.setValues( data );

   // Generated
   this._routeObjects = [];
   this.scale = 1.0;
   this.binary = false;
};

SCMAP.System.prototype = {
   constructor: SCMAP.System,

   buildSceneObject: function () {
      var star, label, glow, position;

      this.sceneObject = new THREE.Object3D();
      star = new THREE.Mesh( SCMAP.System.MESH, this.starMaterial() );
      star.scale.set( this.scale, this.scale, this.scale );
      this.sceneObject.add( star );

      glow = new THREE.Sprite( this.glowMaterial() );
      glow.scale.set( SCMAP.System.GLOW_SCALE * this.scale, SCMAP.System.GLOW_SCALE * this.scale, 1.0 );
      glow.isGlow = true;
      glow.sortParticles = true;
      glow.visible = SCMAP.settings.glow;
      this.sceneObject.add( glow );

      label = new THREE.Sprite( this.labelSprite( SCMAP.settings.labelIcons ) );
      label.position.set( 0, 3.5, 0 );
      label.position.set( 0, this.scale * 3, 0 );
      label.scale.set( SCMAP.System.LABEL_SCALE * label.material.map.image.width, SCMAP.System.LABEL_SCALE * label.material.map.image.height, 1 );
      label.isLabel = true;
      label.sortParticles = true;
      label.visible = SCMAP.settings.labels;
      this.sceneObject.add( label );

      position = this.position.clone();
      if ( localStorage.mode === '2d' ) {
         position.setY( position.y * 0.005 );
      }
      this.sceneObject.position = position;
      this.sceneObject.system = this;
      this.sceneObject.scaleY = this.scaleY;
      return this.sceneObject;
   },

   updateSceneObject: function ( scene ) {
      for ( var i = 0; i < this.sceneObject.children.length; i++ ) {
         var object = this.sceneObject.children[i];
         if ( object.isLabel ) {
            this.updateLabelSprite( object.material, SCMAP.settings.labelIcons );
            object.visible = SCMAP.settings.labels;
         } else if ( object.isGlow ) {
            object.visible = SCMAP.settings.glow;
         }
      }
   },

   setLabelScale: function ( vector ) {
      for ( var i = 0; i < this.sceneObject.children.length; i++ ) {
         if ( this.sceneObject.children[i].isLabel ) {
            this.sceneObject.children[i].scale.copy( vector );
         }
      }
   },

   starMaterial: function () {
      return SCMAP.System.STAR_MATERIAL_WHITE;
   },

   glowMaterial: function () {
      var color = this.starColor;
      if ( color.equals( SCMAP.Color.BLACK ) ) {
         color.copy( SCMAP.Color.UNSET );
      }
      return new THREE.SpriteMaterial({
         map: SCMAP.System.GLOW_MAP,
         blending: THREE.AdditiveBlending,
         transparent: false,
         useScreenCoordinates: false,
         color: color
      });
   },

   labelSprite: function ( drawIcons ) {
      var canvas, texture, material;

      canvas = this.drawSystemText( drawIcons );

      texture = new THREE.Texture( canvas ) ;
      texture.needsUpdate = true;

      material = new THREE.SpriteMaterial({
         map: texture,
         useScreenCoordinates: false,
         blending: THREE.CustomBlending
      });

      return material;
   },

   // Refreshes the text and icons on the system's label
   updateLabelSprite: function ( spriteMaterial, drawLabels ) {
      var canvas, texture;
      canvas = this.drawSystemText( drawLabels );
      texture = new THREE.Texture( canvas ) ;
      texture.needsUpdate = true;
      spriteMaterial.map = texture;
   },

   // Draws the text on a label
   drawSystemText: function ( drawSymbols ) {
      var canvas, context, texture, text = this.name, actualWidth;
      var textX, textY;

      canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      context = canvas.getContext('2d');

      context.font = '36pt Electrolize, Calibri, sans-serif';
      context.textAlign = 'center';
      context.strokeStyle = 'rgba(0,0,0,0.95)';
      context.lineWidth = 5;
      actualWidth = Math.ceil( context.measureText( text ).width + 1 );
      while ( actualWidth > canvas.width ) {
         canvas.width *= 2;
         canvas.height *= 2;
      }

      //context.beginPath();
      //context.rect( 0, 0, canvas.width, canvas.height );
      //context.lineWidth = 5;
      //context.strokeStyle = 'yellow';
      //context.stroke();

      textX = canvas.width / 2;
      textY = canvas.height / 2;

      context.font = '36pt Electrolize, Calibri, sans-serif';
      context.strokeStyle = 'rgba(0,0,0,0.95)';
      context.textAlign = 'center';
      context.lineWidth = 5;
      context.strokeText( text, textX, textY );

      context.fillStyle = this.faction.color.getStyle();
      context.fillText( text, textX, textY );

      if ( drawSymbols ) {
         this._drawSymbols( context, textX, textY - 50, this.getIcons() );
      }

      return canvas;
   },

   // Draws the icon(s) on a label
   _drawSymbols: function ( context, x, y, symbols ) {
      var i, symbol, totalWidth = ( SCMAP.Symbol.SIZE * symbols.length ) + ( SCMAP.Symbol.SPACING * ( symbols.length - 1 ) );
      var offX, offY;
      x -= totalWidth / 2;

      for ( i = 0; i < symbols.length; i++ )
      {
         symbol = symbols[ i ];

         offX = 0;
         offY = 0;

         context.font = ( SCMAP.Symbol.SIZE * symbol.scale).toFixed(1) + 'pt FontAwesome';

         if ( false ) {
            context.beginPath();
            context.rect( x, y - SCMAP.Symbol.SIZE, SCMAP.Symbol.SIZE, SCMAP.Symbol.SIZE );
            context.lineWidth = 5;
            context.strokeStyle = 'yellow';
            context.stroke();
         }

         if ( symbol.offset ) {
            offX = symbol.offset.x;
            offY = symbol.offset.y;
         }

         context.strokeStyle = 'rgba(0,0,0,0.95)';
         context.textAlign = 'center';
         context.lineWidth = 5;
         context.strokeText( symbol.code, x + offX + ( SCMAP.Symbol.SIZE / 2 ), y + offY );

         context.fillStyle = symbol.color;
         context.fillText( symbol.code, x + offX + ( SCMAP.Symbol.SIZE / 2 ), y + offY );

         x += SCMAP.Symbol.SIZE + SCMAP.Symbol.SPACING;
      }
   },

   createInfoLink: function ( noIcons ) {
      var _this = this, $line = $( '<a></a>' );
      if ( typeof _this.faction !== 'undefined' && typeof _this.faction !== 'undefined' ) {
         $line.css( 'color', _this.faction.color.getStyle() );
      }
      $line.addClass('system-link');
      $line.attr( 'data-goto', 'system' );
      $line.attr( 'data-system', _this.id );
      $line.attr( 'href', '#system='+encodeURI( _this.name ) );
      $line.attr( 'title', 'Show information on '+_this.name );
      $line.html( '<i class="fa fa-crosshairs"></i>&nbsp;' + _this.name );

      if ( !noIcons )
      {
         var icons = this.getIcons();
         if ( icons.length )
         {
            var $span = $('<span class="icons"></span>');
            var $icon, icon;
            for ( var i = 0; i < icons.length; i++ ) {
               icon = icons[i]; 
               $icon = $( '<i title="'+icon.description+'" class="fa fa-fw '+icon.faClass+'"></i>' );
               $icon.css( 'color', icon.color );
               $span.append( $icon );
            }
            $line.append( $span );
         }
      }

      return $line;
   },

   getIcons: function () {
      var mySymbols = [];
      if ( false && this.name === 'Sol' ) {
         mySymbols.push( SCMAP.Symbols.DANGER );
         mySymbols.push( SCMAP.Symbols.WARNING );
         mySymbols.push( SCMAP.Symbols.HANGAR );
         mySymbols.push( SCMAP.Symbols.INFO );
         mySymbols.push( SCMAP.Symbols.TRADE );
         mySymbols.push( SCMAP.Symbols.BANNED );
         mySymbols.push( SCMAP.Symbols.COMMENTS );
         mySymbols.push( SCMAP.Symbols.BOOKMARK );
         return mySymbols;
      }
      if ( this.faction.isHostileTo( SCMAP.usersFaction() ) ) { mySymbols.push( SCMAP.Symbols.DANGER ); }
      if ( this.hasWarning() ) { mySymbols.push( SCMAP.Symbols.WARNING ); }
      if ( this.hasHangar() ) { mySymbols.push( SCMAP.Symbols.HANGAR ); }
      if ( this.blob.length ) { mySymbols.push( SCMAP.Symbols.INFO ); }
      if ( this.isMajorTradeHub() ) { mySymbols.push( SCMAP.Symbols.TRADE ); }
      if ( this.isOffLimits() ) { mySymbols.push( SCMAP.Symbols.BANNED ); }
      if ( this.hasComments() ) { mySymbols.push( SCMAP.Symbols.COMMENTS ); }
      if ( this.isBookmarked() ) { mySymbols.push( SCMAP.Symbols.BOOKMARK ); }
      return mySymbols;
   },

   displayInfo: function ( system ) {
      if ( typeof system === 'undefined' ) { system = this; }

      var worlds = '(No information)';
      var _import = '&mdash;';
      var _export = '&mdash;';
      var blackMarket = '&mdash;';
      var strategicValue = 'Unknown';
      var crimeStatus = 'Unknown';
      var i;
      var tmp = [];
      var $blurb = $('<div class="sc_system_info '+makeSafeForCSS(system.name)+'"></div>');
      var currentStep = window.map.indexOfCurrentRoute( system );

      $('#systemname')
         .attr( 'class', makeSafeForCSS( system.faction.name ) )
         .css( 'color', system.faction.color.getStyle() )
         .text( 'System: ' + system.name );

      if ( typeof system.nickname === 'string' && system.nickname.length ) {
         $blurb.append( '<h2 class="nickname">'+system.nickname+'</h2>' );
      }

      if ( typeof currentStep === 'number' )
      {
         var currentRoute = window.map.currentRoute();
         var header = [];

         if ( currentStep > 0 ) {
            var $prev = currentRoute[currentStep-1].system.createInfoLink();
            $prev.attr( 'title', 'Previous jump to ' + currentRoute[currentStep-1].system.name +
               ' (' + currentRoute[currentStep-1].system.faction.name + ' territory)' );
            $prev.empty().append( '<i class="left fa fa-fw fa-arrow-left"></i>' );
            header.push( $prev );
         } else {
            header.push( $('<i class="left fa fa-fw"></i>') );
         }

         if ( currentStep < ( currentRoute.length - 1 ) ) {
            var $next = currentRoute[currentStep+1].system.createInfoLink();
            $next.attr( 'title', 'Next jump to ' + currentRoute[currentStep+1].system.name +
               ' (' + currentRoute[currentStep+1].system.faction.name + ' territory)'  );
            $next.empty().append( '<i class="right fa fa-fw fa-arrow-right"></i>' );
            header.push( $next );
         } else {
            header.push( $('<i class="right fa fa-fw"></i>') );
         }

         header.push( system.name );

         $('#systemname').empty().attr( 'class', makeSafeForCSS( system.faction.name ) ).append( header );
      }

      if ( system.planetaryRotation.length ) {
         worlds = system.planetaryRotation.join( ', ' );
      }

      if ( system.import.length ) {
         _import = $.map( system.import, function( elem, i ) {
            return SCMAP.data.goods[ elem ].name;
         }).join( ', ' );
      }

      if ( system.export.length ) {
         _export = $.map( system.export, function( elem, i ) {
            return SCMAP.data.goods[ elem ].name;
         }).join( ', ' );
      }

      if ( system.blackMarket.length ) {
         blackMarket = $.map( system.blackMarket, function( elem, i ) {
            return SCMAP.data.goods[ elem ].name;
         }).join( ', ' );
      }

      //if ( typeof system.planets === 'string' || typeof system.planets === 'number' ) {
      //   planets = system.planets;
      //}

      if ( typeof system.crimeStatus === 'object' ) {
         crimeStatus = system.crimeStatus.name;
      }

      if ( typeof system.ueeStrategicValue === 'object' ) {
         strategicValue = system.ueeStrategicValue.color;
      }

      $blurb.append( '<dl>' +
         '<dt class="faction">Faction</dt><dd class="faction">'+system.faction.name+'</dd>' +
         //'<dt class="planets">Planets</dt><dd class="planets">'+planets+'</dd>' +
         '<dt class="rotation">Planetary rotation</dt><dd class="rotation">'+worlds+'</dd>' +
         '<dt class="import">Import</dt><dd class="import">'+_import+'</dd>' +
         '<dt class="export">Export</dt><dd class="export">'+_export+'</dd>' +
         '<dt class="blackMarket">Black market</dt><dd class="crime">'+blackMarket+'</dd>' +
         '<dt class="crime_'+crimeStatus.toLowerCase()+'">Crime status</dt><dd class="crime">'+crimeStatus+'</dd>' +
         '<dt class="strategic_value_'+strategicValue.toLowerCase()+'">UEE strategic value</dt><dd class="strategic">'+strategicValue+'</dd>' +
      '</dl>' );

      if ( system.faction.name !== 'Unclaimed' ) {
         $blurb.find('dd.faction').css( 'color', system.faction.color.getStyle() );
      }

      $blurb.append( '<p class="user"></p>' );

      $blurb.find('p.user').append( '<span class="quick-button"><input type="checkbox" id="hangar-location"><label class="fa-lg" for="hangar-location">Hangar Location</label></span>' );
      $blurb.find('#hangar-location')
         .prop( 'checked', system.hasHangar() )
         .attr( 'data-system', system.id );

      $blurb.find('p.user').append( '<span class="quick-button"><input type="checkbox" id="bookmark"><label class="fa-lg" for="bookmark">Bookmarked</label></span></p>' );
      $blurb.find('#bookmark')
         .prop( 'checked', system.isBookmarked() )
         .attr( 'data-system', system.id );

      $blurb.find('p.user').append('<label for="comments">Your comments:</label><br><textarea id="comments"></textarea>');
      if ( localStorage['comments.'+system.id] ) {
         $blurb.find('#comments').append( localStorage['comments.'+system.id] );
      }

      if ( system.blob.length ) {
         var $md = $(markdown.toHTML( system.blob ));
         $md.find('p').prepend('<i class="fa fa-2x fa-quote-left"></i>');
         $blurb.append( '<div id="systemInfo">', $md, '</div>' );
      }

      if ( system.source ) {
         $blurb.append( '<p><a class="system-source-url" href="' + system.source + '" target="_blank">(source)</a></p>' );
      }

      $blurb.append( '<div id="destinations">' );

      $('#systemblurb').empty();
      $('#systemblurb').append( $blurb );

      $('#systemblurb #bookmark').on( 'change', function() {
         if ( this.checked ) {
            localStorage['bookmarks.'+system.id] = '1';
         } else {
            delete localStorage['bookmarks.'+system.id];
         }
         system.updateSceneObject( scene );
      });
      $('#systemblurb #hangar-location').on( 'change', function() {
         if ( this.checked ) {
            localStorage['hangarLocation.'+system.id] = '1';
         } else {
            delete localStorage['hangarLocation.'+system.id];
         }
         system.updateSceneObject( scene );
      });
      var getComments = function( event ) {
         event.preventDefault();
         var text = $(this).val();
         if ( typeof text === 'string' && text.length > 0 ) {
            localStorage['comments.'+system.id] = $(this).val();
         } else {
            delete localStorage['comments.'+system.id];
         }
         system.updateSceneObject( scene );
      };
      $('#systemblurb #comments').on( 'keyup', getComments );
      $('#systemblurb #comments').on( 'blur', getComments );
      $('#systemblurb #comments').on( 'change', getComments );

      $('#map_ui').tabs( 'option', 'active', 2 );
      $('#map_ui').data( 'jsp' ).reinitialise();
   },

   // 2d/3d tween callback
   scaleY: function ( scalar ) {
      var wantedY = this.system.position.y * ( scalar / 100 );
      this.system.sceneObject.translateY( wantedY - this.system.sceneObject.position.y );
      for ( var j = 0; j < this.system._routeObjects.length; j++ ) {
         this.system._routeObjects[j].geometry.verticesNeedUpdate = true;
      }
   },

   moveTo: function ( vector ) {
      this.sceneObject.position.copy( vector );
      for ( var j = 0; j < this._routeObjects.length; j++ ) {
         this._routeObjects[j].geometry.verticesNeedUpdate = true;
      }
   },

   translateVector: function ( vector ) {
      this.sceneObject.add( vector );
      for ( var j = 0; j < this._routeObjects.length; j++ ) {
         this._routeObjects[j].geometry.verticesNeedUpdate = true;
      }
   },

   // Returns the jumppoint leading to the given destination
   jumpPointTo: function ( destination ) {
      for ( var i = 0; i < this.jumpPoints.length; i++ ) {
         if ( this.jumpPoints[i].destination === destination ) {
            return this.jumpPoints[i];
         }
      }
   },

   isBookmarked: function ( ) {
      return localStorage[ 'bookmarks.' + this.id ] === '1';
   },

   hasHangar: function ( ) {
      return localStorage[ 'hangarLocation.' + this.id ] === '1';
   },

   hasComments: function ( ) {
      return localStorage[ 'comments.' + this.id ];
   },

   isOffLimits: function ( ) {
      // TODO this needs to come from the DB
      return ( this.id === 90 || this.id === 97 );
   },

   hasWarning: function ( ) {
      // TODO this needs to come from the DB
      return ( this.id === 81 || this.id === 94 );
   },

   isMajorTradeHub: function ( ) {
      // TODO this needs to come from the DB
      return ( this.id === 82 || this.id === 95 || this.id === 80 || this.id === 102 || this.id === 100 || this.id === 108 || this.id === 96 || this.id === 85 || this.id === 83 || this.id === 106 || this.id === 15 || this.id === 84 || this.id === 88 || this.id === 19 || this.id === 92 );
   },

   getValue: function ( key ) {
      if ( key === undefined ) {
         return;
      }
      var value = this[ key ];
      return value;
   },

   setValues: function ( values ) {
      var key, currentValue, newValue, jumpPoint;

      if ( values === undefined ) {
         return;
      }

      for ( key in values ) {
         newValue = values[ key ];
         if ( newValue === undefined ) {
            console.log( 'SCMAP.System: "' + key + '" parameter is undefined for "'+this.name+'"' );
            continue;
         }

         if ( key in this )
         {
            currentValue = this[ key ];

            if ( key == 'size' ) {
               switch ( newValue ) {
                  case 'dwarf': this.scale = 0.6; break;
                  case 'medium': this.scale = 1.0; break;
                  case 'large': this.scale = 1.25; break;
                  case 'giant': this.scale = 1.6; break;
                  case 'binary': this.scale = 1.6; this.binary = true; break;
               }
               this[ key ] = newValue;
            }

            if ( currentValue instanceof THREE.Color ) {

               if ( newValue instanceof THREE.Color ) {
                  this[ key ] = newValue;
               } else {
                  newValue = newValue.replace( '0x', '#' );
                  this[ key ] = new THREE.Color( newValue );
               }

            } else if ( currentValue instanceof SCMAP.Faction ) {

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
};

SCMAP.System.preprocessSystems = function () {
   var i, systemName, system, data, faction;

   SCMAP.data.systemsById = {};
   SCMAP.System.List = [];

   for ( systemName in SCMAP.data.systems ) {

      data = SCMAP.data.systems[ systemName ];
      if ( data instanceof SCMAP.System ) {
         SCMAP.data.systemsById[ system.id ]   = data;
         SCMAP.data.systemsById[ system.uuid ] = data;
         continue;
      }

      faction = SCMAP.Faction.getById( data.faction_id );

      system = new SCMAP.System({
         id: data.system_id,
         uuid: data.uuid,
         name: systemName,
         position: data.coords,
         scale: data.scale || 1.0,
         starColor: data.color,
         faction: faction
      });

      system.setValues({
         'nickname': data.nickname,
         'size': data.size,
         'source': data.source,
         'crimeStatus': SCMAP.data.crime_levels[ data.crime_level_id ],
         'ueeStrategicValue': SCMAP.data.uee_strategic_values[ ""+data.uee_strategic_value_id ],
         'import': data.import,
         'export': data.export,
         'blackMarket': data.black_market,
         'blob': data.blob,
         'planets': 0,
         'planetaryRotation': [],
         'jumpPoints': data.jumppoints
      });

      SCMAP.data.systems[ system.name ]     = system;
      SCMAP.data.systemsById[ system.id ]   = system;
      SCMAP.data.systemsById[ system.uuid ] = system;

   }

   for ( systemName in SCMAP.data.systems )
   {

      system = SCMAP.System.getByName( systemName );

      SCMAP.System.List.push( system );

      for ( i = 0; i < system.jumpPoints.length; i++ )
      {
         jumpPoint = system.jumpPoints[ i ];
         system.jumpPoints[ i ] = new SCMAP.JumpPoint({
            source: system,
            destination: SCMAP.System.getById( jumpPoint.destination ),
            name: jumpPoint.name,
            typeId: jumpPoint.type_id,
            entryAU: jumpPoint.coords_au
         });
      }

   }
};

SCMAP.System.List = [];

SCMAP.System.getByName = function ( name ) {
   return SCMAP.data.systems[ name ];
};

SCMAP.System.getById = function ( id ) {
   return SCMAP.data.systemsById[ id ];
};

SCMAP.Color = {};
SCMAP.Color.BLACK = new THREE.Color( 'black' );
SCMAP.Color.UNSET = new THREE.Color( 0x80A0CC );

SCMAP.System.COLORS = {
   RED: 0xFF6060,
   BLUE: 0x6060FF,
   WHITE: 0xFFFFFF,
   YELLOW: 0xFFFF60,
   ORANGE: 0xF0F080,
   UNKNOWN: 0xFFFFFF //0xC0FFC0
};
SCMAP.System.LABEL_SCALE = 0.06;
SCMAP.System.GLOW_SCALE = 6;
SCMAP.System.MESH = new THREE.SphereGeometry( 1, 12, 12 );
//
SCMAP.System.STAR_MATERIAL_RED = new THREE.MeshBasicMaterial({ color: SCMAP.System.COLORS.RED, name: 'STAR_MATERIAL_RED' });
SCMAP.System.STAR_MATERIAL_BLUE = new THREE.MeshBasicMaterial({ color: SCMAP.System.COLORS.BLUE, name: 'STAR_MATERIAL_BLUE' });
SCMAP.System.STAR_MATERIAL_WHITE = new THREE.MeshBasicMaterial({ color: SCMAP.System.COLORS.WHITE, name: 'STAR_MATERIAL_WHITE' });
SCMAP.System.STAR_MATERIAL_YELLOW = new THREE.MeshBasicMaterial({ color: SCMAP.System.COLORS.YELLOW, name: 'STAR_MATERIAL_YELLOW' });
SCMAP.System.STAR_MATERIAL_ORANGE = new THREE.MeshBasicMaterial({ color: SCMAP.System.COLORS.ORANGE, name: 'STAR_MATERIAL_ORANGE' });
SCMAP.System.STAR_MATERIAL_UNKNOWN = new THREE.MeshBasicMaterial({ color: SCMAP.System.COLORS.UNKNOWN, name: 'STAR_MATERIAL_UNKNOWN' });
//
SCMAP.System.GLOW_MAP = new THREE.ImageUtils.loadTexture( $('#gl-info').data('glow-image') );
SCMAP.System.GLOW_MATERIAL_RED =     new THREE.SpriteMaterial({ map: SCMAP.System.GLOW_MAP, blending: THREE.AdditiveBlending, color: SCMAP.System.COLORS.RED     });
SCMAP.System.GLOW_MATERIAL_BLUE =    new THREE.SpriteMaterial({ map: SCMAP.System.GLOW_MAP, blending: THREE.AdditiveBlending, color: SCMAP.System.COLORS.BLUE    });
SCMAP.System.GLOW_MATERIAL_WHITE =   new THREE.SpriteMaterial({ map: SCMAP.System.GLOW_MAP, blending: THREE.AdditiveBlending, color: SCMAP.System.COLORS.WHITE   });
SCMAP.System.GLOW_MATERIAL_YELLOW =  new THREE.SpriteMaterial({ map: SCMAP.System.GLOW_MAP, blending: THREE.AdditiveBlending, color: SCMAP.System.COLORS.YELLOW  });
SCMAP.System.GLOW_MATERIAL_ORANGE =  new THREE.SpriteMaterial({ map: SCMAP.System.GLOW_MAP, blending: THREE.AdditiveBlending, color: SCMAP.System.COLORS.ORANGE  });
SCMAP.System.GLOW_MATERIAL_UNKNOWN = new THREE.SpriteMaterial({ map: SCMAP.System.GLOW_MAP, blending: THREE.AdditiveBlending, color: SCMAP.System.COLORS.UNKNOWN });
// EOF
