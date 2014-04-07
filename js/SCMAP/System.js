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
   this.scale = 1.0;
   this.binary = false;

   this.setValues( data );

   // Generated, internal
   this._routeObjects = [];
   this._drawnText = '';
   this._drawnSymbols = '';
};

SCMAP.System.prototype = {
   constructor: SCMAP.System,

   buildSceneObject: function () {
      var star, label, glow, position, lod, boxSize;

      this.sceneObject = new THREE.Object3D();

      // To make systems easier to click, we add an invisible cube to them
      // (probably also easier for the raycaster)
      star = new THREE.Mesh( SCMAP.System.CUBE, SCMAP.System.CUBE_MATERIAL );
      star.visible = false;
      boxSize = Math.min( 5.75, Math.max( 3.5, 5 * this.scale ) );
      star.scale.set( boxSize, boxSize, boxSize );
      this.sceneObject.add( star );

      // LOD for the systems to make them properly round up close
      lod = new THREE.LOD();
      for ( i = 0; i < SCMAP.System.LODMESH.length; i++ ) {
         star = new THREE.Mesh( SCMAP.System.LODMESH[ i ][ 0 ], this.starMaterial() );
         star.scale.set( this.scale, this.scale, this.scale );
         star.updateMatrix();
         star.matrixAutoUpdate = false;
         lod.addLevel( star, SCMAP.System.LODMESH[ i ][ 1 ] );
      }
      lod.updateMatrix();
      lod.matrixAutoUpdate = false;
      this.sceneObject.add( lod );

//if ( this.name === 'Nul' ) {
      //var customMaterial = this.glowShaderMaterial( this.starColor );
      //var moonGlow = new THREE.Mesh( SCMAP.System.LODMESH[ 1 ][ 0 ].clone(), customMaterial );
      //moonGlow.scale.multiplyScalar( 2.3 * this.scale );
      //moonGlow.userData.isGlow = true;
      //this.sceneObject.add( moonGlow );
//}

      glow = new THREE.Sprite( this.glowMaterial() );
      glow.scale.set( SCMAP.System.GLOW_SCALE * this.scale, SCMAP.System.GLOW_SCALE * this.scale, 1.0 );
      glow.userData.isGlow = true;
      glow.sortParticles = true;
      glow.visible = SCMAP.settings.glow;
      this.sceneObject.add( glow );

      label = new THREE.Sprite( this.labelSprite( SCMAP.settings.labelIcons ) );
      label.position.set( 0, 3.5, 0 );
      label.position.set( 0, this.scale * 3, 0 );
      label.scale.set( SCMAP.System.LABEL_SCALE * label.material.map.image.width, SCMAP.System.LABEL_SCALE * label.material.map.image.height, 1 );
      label.userData.isLabel = true;
      label.sortParticles = true;
      label.visible = SCMAP.settings.labels;
      this.sceneObject.add( label );

      position = this.position.clone();
      if ( storage && storage.mode === '2d' ) {
         position.setY( position.y * 0.005 );
      }
      this.sceneObject.position = position;
      this.sceneObject.userData.system = this;
      this.sceneObject.userData.scaleY = this.scaleY;
      return this.sceneObject;
   },

   updateSceneObject: function ( scene ) {
      for ( var i = 0; i < this.sceneObject.children.length; i++ ) {
         var object = this.sceneObject.children[i];
         if ( object.userData.isLabel ) {
            this.updateLabelSprite( object.material, SCMAP.settings.labelIcons );
            object.visible = SCMAP.settings.labels;
         } else if ( object.userData.isGlow ) {
            object.visible = SCMAP.settings.glow;
         }
      }
   },

   setLabelScale: function ( vector ) {
      for ( var i = 0; i < this.sceneObject.children.length; i++ ) {
         if ( this.sceneObject.children[i].userData.isLabel ) {
            this.sceneObject.children[i].scale.copy( vector );
         }
      }
   },

   starMaterial: function () {
      return SCMAP.System.STAR_MATERIAL_WHITE;
   },

   glowShaderMaterial: function ( color ) {
      var material = SCMAP.System.GLOW_SHADER_MATERIAL.clone();
      material.uniforms.glowColor.value = color;
      return material;
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

      if ( !SCMAP.UI.fontAwesomeIsReady ) {
         drawIcons = false;
      }

      var icons = ( drawIcons ) ? this.getIcons() : [];
      canvas = this.drawSystemText( this.name, icons );

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
      var icons = ( drawLabels ) ? this.getIcons() : [];
      var iconsKey = this.iconsToKey( icons );
      if ( this._drawnText !== this.name || this._drawnSymbols !== iconsKey ) {
         canvas = this.drawSystemText( this.name, icons );
         texture = new THREE.Texture( canvas );
         texture.needsUpdate = true;
         spriteMaterial.map = texture;
      }
   },

   // Draws the text on a label
   drawSystemText: function ( text, icons ) {
      var canvas, context, texture, actualWidth;
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

      if ( false ) {
         context.beginPath();
         context.rect( 0, 0, canvas.width, canvas.height );
         context.lineWidth = 5;
         context.strokeStyle = 'yellow';
         context.stroke();
      }

      textX = canvas.width / 2;
      textY = canvas.height / 2;

      context.font = '36pt Electrolize, Calibri, sans-serif';
      context.strokeStyle = 'rgba(0,0,0,0.95)';
      context.textAlign = 'center';
      context.lineWidth = 5;
      context.strokeText( text, textX, textY );

      context.fillStyle = this.faction.color.getStyle();
      context.fillText( text, textX, textY );

      this._drawnText = text;
      this._drawnSymbols = '';

      if ( icons && icons.length ) {
         this._drawnSymbols = this.iconsToKey( icons );
         this._drawSymbols( context, textX, textY - 50, icons );
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

         context.font = ( SCMAP.Symbol.SIZE * symbol.scale).toFixed(1) + 'pt FontAwesome';
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
      var $line = $( '<a></a>' );

      if ( typeof this.faction !== 'undefined' && typeof this.faction !== 'undefined' ) {
         $line.css( 'color', this.faction.color.getStyle() );
      }

      $line.addClass('system-link');
      $line.attr( 'data-goto', 'system' );
      $line.attr( 'data-system', this.id );
      $line.attr( 'href', '#system='+encodeURI( this.name ) );
      $line.attr( 'title', 'Show information on '+this.name );
      $line.html( '<i class="fa fa-crosshairs"></i>&nbsp;' + this.name );

      if ( !noIcons )
      {
         var icons = this.getIcons();
         if ( icons.length )
         {
            var $span = $('<span class="icons"></span>');
            for ( var i = 0; i < icons.length; i++ ) {
               $span.append( SCMAP.Symbol.getTag( icons[i] ) );
            }
            $line.append( $span );
         }
      }

      return $line;
   },

   iconsToKey: function ( icons ) {
      var list = [];
      for ( var i = 0; i < icons.length; i++ ) {
         list.push( icons[i].code );
      }
      return list.join( ';' );
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

   displayInfo: function ( doNotSwitch ) {
      var worlds = '(No information)';
      var _import = '&mdash;';
      var _export = '&mdash;';
      var blackMarket = '&mdash;';
      var strategicValue = 'Unknown';
      var crimeStatus = 'Unknown';
      var i;
      var tmp = [];
      var $blurb = $('<div class="sc_system_info" '+SCMAP.UI.makeSafeForCSS(this.name)+'"></div>');
      var currentStep = window.map.route().indexOfCurrentRoute( this );

      $('#systemname')
         .attr( 'class', SCMAP.UI.makeSafeForCSS( this.faction.name ) )
         .css( 'color', this.faction.color.getStyle() )
         .text( 'System: ' + this.name );

      if ( typeof this.nickname === 'string' && this.nickname.length ) {
         $('#systemnickname').text( this.nickname ).show();
      } else {
         $('#systemnickname').text( '' ).hide();
      }

      if ( typeof currentStep === 'number' )
      {
         var currentRoute = window.map.route().currentRoute();
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

         header.push( this.name );

         $('#systemname').empty().attr( 'class', SCMAP.UI.makeSafeForCSS( this.faction.name ) ).append( header );
      }

      if ( this.planetaryRotation.length ) {
         worlds = this.planetaryRotation.join( ', ' );
      }

      if ( this.import.length ) {
         _import = $.map( this.import, function( elem, i ) {
            return SCMAP.data.goods[ elem ].name;
         }).join( ', ' );
      }

      if ( this.export.length ) {
         _export = $.map( this.export, function( elem, i ) {
            return SCMAP.data.goods[ elem ].name;
         }).join( ', ' );
      }

      if ( this.blackMarket.length ) {
         blackMarket = $.map( this.blackMarket, function( elem, i ) {
            return SCMAP.data.goods[ elem ].name;
         }).join( ', ' );
      }

      //if ( typeof this.planets === 'string' || typeof this.planets === 'number' ) {
      //   planets = this.planets;
      //}

      if ( typeof this.crimeStatus === 'object' ) {
         crimeStatus = this.crimeStatus.name;
      }

      if ( typeof this.ueeStrategicValue === 'object' ) {
         strategicValue = this.ueeStrategicValue.color;
      }

      $("dl.basic-system dd.faction").text( this.faction.name );
      //$("dl.basic-system dd.planets").text( planets );
      $("dl.basic-system dd.rotation").html( worlds );
      $("dl.basic-system dd.import").html( _import );
      $("dl.basic-system dd.export").html( _export );
      $("dl.basic-system dd.blackMarket").html( blackMarket );
      $("dl.basic-system dt.crime").addClass( 'crime_'+crimeStatus.toLowerCase() );
      $("dl.basic-system dd.crime").text( crimeStatus );
      $("dl.basic-system dt.strategic").addClass( 'strategic_value_'+strategicValue.toLowerCase() );
      $("dl.basic-system dd.strategic").text( strategicValue );

      if ( this.faction.name !== 'Unclaimed' ) {
         $('dl.basic-system dd.faction').css( 'color', this.faction.color.getStyle() );
      }

      // User's notes and bookmarks

      $('#hangar-location').prop( 'checked', this.hasHangar() ).attr( 'data-system', this.id );
      $('#bookmark').prop( 'checked', this.isBookmarked() ).attr( 'data-system', this.id );

      if ( storage && storage['comments.'+this.id] ) {
         $('#comments').empty().val( storage['comments.'+this.id] );
         var $commentmd = $( markdown.toHTML( storage['comments.'+this.id] ) );
         $('#comments-md').html( $commentmd );
      } else {
         $('#comments').empty().val('');
         $('#comments-md').empty();
      }

      $('#comments').data( 'system', this.id );
      $('#bookmark').data( 'system', this.id );
      $('#hangar-location').data( 'system', this.id );

      if ( this.blob.length ) {
         var $md = $(markdown.toHTML( this.blob ));
         $md.find('p').prepend('<i class="fa fa-2x fa-quote-left"></i>');
         $blurb.append( '<div id="systemInfo">', $md, '</div>' );
         $('#system-background-info').show();
      } else {
         $('#system-background-info').hide();
      }

      if ( this.source ) {
         $blurb.append( '<p><a class="system-source-url" href="' + this.source + '" target="_blank">(source)</a></p>' );
      }

      $('#systemblurb').empty();
      $('#systemblurb').append( $blurb );

      $('#map_ui #system-selected').show();
      $('#map_ui #system-not-selected').hide();
      if ( !doNotSwitch ) {
         $('#map_ui').tabs( 'option', 'active', 2 );
         $('#map_ui').data( 'jsp' ).reinitialise();
         $('#map_ui').data( 'jsp' ).scrollToPercentY( 0 );
      }
   },

   // 2d/3d tween callback
   scaleY: function scaleY( object, scalar ) {
      var wantedY = object.userData.system.position.y * ( scalar / 100 );
      object.userData.system.sceneObject.translateY( wantedY - object.userData.system.sceneObject.position.y );
      object.userData.system.routeNeedsUpdate();
   },

   moveTo: function moveTo( vector ) {
      this.system.sceneObject.position.copy( vector );
      this.system.routeNeedsUpdate();
   },

   translateVector: function translateVector( vector ) {
      this.system.sceneObject.add( vector );
      this.system.routeNeedsUpdate();
   },

   routeNeedsUpdate: function () {
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
      return storage && storage[ 'bookmarks.' + this.id ] === '1';
   },

   hasHangar: function ( ) {
      return storage && storage[ 'hangarLocation.' + this.id ] === '1';
   },

   hasComments: function ( ) {
      return storage && storage[ 'comments.' + this.id ];
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

SCMAP.System.SortedList = function() {
   var array = [];
   var i = SCMAP.System.List.length;
   while( i-- ) {
      array[i] = SCMAP.System.List[i];
   }
   var sorted = array.sort( humanSort );
   return sorted;
};

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
SCMAP.System.GLOW_SCALE = 6.5;

SCMAP.System.CUBE = new THREE.CubeGeometry( 1, 1, 1 );
//SCMAP.System.MESH = new THREE.SphereGeometry( 1, 12, 12 );

SCMAP.System.LODMESH = [
   [ new THREE.IcosahedronGeometry( 1, 3 ), 20 ],
   [ new THREE.IcosahedronGeometry( 1, 2 ), 50 ],
   [ new THREE.IcosahedronGeometry( 1, 1 ), 150 ]
];

SCMAP.System.STAR_MATERIAL_WHITE = new THREE.MeshBasicMaterial({ color: SCMAP.System.COLORS.WHITE, name: 'STAR_MATERIAL_WHITE' });

SCMAP.System.CUBE_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true });
SCMAP.System.CUBE_MATERIAL.opacity = 0.3;
SCMAP.System.CUBE_MATERIAL.transparent = true;

SCMAP.System.GLOW_MAP = new THREE.ImageUtils.loadTexture( $('#gl-info').data('glow-image') );

// create custom material from the shader code in the html
$(function() {
   SCMAP.System.GLOW_SHADER_MATERIAL = new THREE.ShaderMaterial({
      uniforms: { 
         "c":   { type: "f", value: 0.05 },
         "p":   { type: "f", value: 3.3 },
         glowColor: { type: "c", value: SCMAP.Color.BLACK },
         viewVector: { type: "v3", value: new THREE.Vector3( 0, 0, 0 ) }
      },
      vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
      fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
   });
});

// EOF
