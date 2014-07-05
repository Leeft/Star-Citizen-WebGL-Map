/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

SCMAP.System = function ( data ) {
   // Defaults, to be filled in from the config
   this.id = undefined;
   this.uuid = undefined;
   this.name = '';
   this.nickname = '';
   this.position = new THREE.Vector3();
   this.faction = new SCMAP.Faction();
   this.size = 'medium';
   this.jumpPoints = [];
   this.poi = [];
   this.color = new THREE.Color( 0xFFFFFF );
   this.planets = 0;
   this.planetaryRotation = [];
   this.import = [];
   this.export = [];
   this.crimeStatus = '';
   this.blackMarket = [];
   this.ueeStrategicValue = undefined;
   this.info = [];
   this.scale = 1.0;
   this.binary = false;
   this.isOffLimits = false;
   this.hasWarning = false;
   this.isMajorTradeHub = false;

   this.setValues( data );

   // Generated, internal
   this._routeObjects = [];
   this._drawnText = '';
   this._drawnSymbols = '';
};

SCMAP.System.prototype = {
   constructor: SCMAP.System,

   buildSceneObject: function buildSceneObject() {
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
//      var customMaterial = this.glowShaderMaterial( this.color );
//      var moonGlow = new THREE.Mesh( SCMAP.System.LODMESH[ 1 ][ 0 ].clone(), customMaterial );
//      moonGlow.scale.multiplyScalar( 2.3 * this.scale );
//      moonGlow.userData.isGlow = true;
//      this.sceneObject.add( moonGlow );
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

   updateSceneObject: function updateSceneObject( scene ) {
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

   setLabelScale: function setLabelScale( vector ) {
      for ( var i = 0; i < this.sceneObject.children.length; i++ ) {
         if ( this.sceneObject.children[i].userData.isLabel ) {
            this.sceneObject.children[i].scale.copy( vector );
         }
      }
   },

   starMaterial: function starMaterial() {
      return SCMAP.System.STAR_MATERIAL_WHITE;
   },

   //glowShaderMaterial: function glowShaderMaterial( color ) {
   //   var material = SCMAP.System.GLOW_SHADER_MATERIAL.clone();
   //   material.uniforms.glowColor.value = color;
   //   return material;
   //},

   glowMaterial: function glowMaterial() {
      var color = this.color;
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

   labelSprite: function labelSprite( drawIcons ) {
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
   updateLabelSprite: function updateLabelSprite( spriteMaterial, drawLabels ) {
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
   drawSystemText: function drawSystemText( text, icons ) {
      var canvas, context, texture, actualWidth;
      var textX, textY;

      canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      context = canvas.getContext('2d');

      context.font = '36pt Electrolize, Calibri, sans-serif';
      context.textAlign = 'center';
      context.strokeStyle = 'rgba(0,0,0,1.0)';
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
      context.strokeStyle = 'rgba(0,0,0,1.0)';
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
   _drawSymbols: function _drawSymbols( context, x, y, symbols ) {
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
            context.rect( x - 1, y - SCMAP.Symbol.SIZE - 1, SCMAP.Symbol.SIZE + 2, SCMAP.Symbol.SIZE + 2 );
            context.lineWidth = 5;
            context.strokeStyle = 'yellow';
            context.stroke();
         }

         if ( symbol.offset ) {
            offX = symbol.offset.x;
            offY = symbol.offset.y;
         }

         context.font = ( SCMAP.Symbol.SIZE * symbol.scale).toFixed(1) + 'pt FontAwesome';
         context.strokeStyle = 'rgba(0,0,0,1.0)';
         context.textAlign = 'center';
         context.lineWidth = 5;
         context.strokeText( symbol.code, x + offX + ( SCMAP.Symbol.SIZE / 2 ), y + offY );

         context.fillStyle = symbol.color;
         context.fillText( symbol.code, x + offX + ( SCMAP.Symbol.SIZE / 2 ), y + offY );

         x += SCMAP.Symbol.SIZE + SCMAP.Symbol.SPACING;
      }
   },

   createInfoLink: function createInfoLink( noIcons, noTarget ) {
      var $line = $( '<a></a>' );

      if ( typeof this.faction !== 'undefined' && typeof this.faction !== 'undefined' ) {
         $line.css( 'color', this.faction.color.getStyle() );
      }

      $line.addClass('system-link');
      $line.attr( 'data-goto', 'system' );
      $line.attr( 'data-system', this.id );
      $line.attr( 'href', '#system='+encodeURI( this.name ) );
      $line.attr( 'title', 'Show information on '+this.name );
      if ( noTarget ) {
         $line.text( this.name );
      } else {
         $line.html( '<i class="fa fa-crosshairs"></i>&nbsp;' + this.name );
      }

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

   iconsToKey: function iconsToKey( icons ) {
      var list = [];
      for ( var i = 0; i < icons.length; i++ ) {
         list.push( icons[i].code );
      }
      return list.join( ';' );
   },

   getIcons: function getIcons() {
      var mySymbols = [];
      if ( false && this.name === 'Sol' ) {
         mySymbols.push( SCMAP.Symbols.DANGER );
         mySymbols.push( SCMAP.Symbols.WARNING );
         mySymbols.push( SCMAP.Symbols.INFO );
         mySymbols.push( SCMAP.Symbols.TRADE );
         mySymbols.push( SCMAP.Symbols.BANNED );
         mySymbols.push( SCMAP.Symbols.HANGAR );
         mySymbols.push( SCMAP.Symbols.BOOKMARK );
         mySymbols.push( SCMAP.Symbols.AVOID );
         mySymbols.push( SCMAP.Symbols.COMMENTS );
         return mySymbols;
      }
      if ( this.faction.isHostileTo( SCMAP.usersFaction() ) ) { mySymbols.push( SCMAP.Symbols.DANGER ); }
      if ( this.hasWarning ) { mySymbols.push( SCMAP.Symbols.WARNING ); }
      if ( this.info.length ) { mySymbols.push( SCMAP.Symbols.INFO ); }
      if ( this.isMajorTradeHub ) { mySymbols.push( SCMAP.Symbols.TRADE ); }
      if ( this.isOffLimits ) { mySymbols.push( SCMAP.Symbols.BANNED ); }
      if ( this.hasHangar() ) { mySymbols.push( SCMAP.Symbols.HANGAR ); }
      if ( this.isBookmarked() ) { mySymbols.push( SCMAP.Symbols.BOOKMARK ); }
      if ( this.isToBeAvoided() ) { mySymbols.push( SCMAP.Symbols.AVOID ); }
      if ( this.hasComments() ) { mySymbols.push( SCMAP.Symbols.COMMENTS ); }
      return mySymbols;
   },

   displayInfo: function displayInfo( doNotSwitch ) {
      var me = this;
      var $element = $( SCMAP.UI.Tab('system').id )
         .empty()
         .append( SCMAP.UI.Templates.systemInfo({ system: me }) );

      // Set user's notes and bookmarks
      $element.find('.user-system-ishangar').prop( 'checked', this.hasHangar() ).attr( 'data-system', this.id );
      $element.find('.user-system-bookmarked').prop( 'checked', this.isBookmarked() ).attr( 'data-system', this.id );
      $element.find('.user-system-avoid').prop( 'checked', this.isToBeAvoided() ).attr( 'data-system', this.id );

      if ( this.hasComments() ) {
         $element.find('.user-system-comments').empty().val( this.getComments() );
         $element.find('.user-system-comments-md').html( $( markdown.toHTML( this.getComments() ) ) );
      } else {
         $element.find('.user-system-comments').empty().val('');
         $element.find('.user-system-comments-md').empty();
      }

      // TODO FIXME
      //var currentStep = window.map.route().indexOfCurrentRoute( this );
      //if ( typeof currentStep === 'number' )
      //{
      //   var currentRoute = window.map.route().currentRoute();
      //   var header = [];
      //   var adjacentSystem;

      //   if ( currentStep > 0 ) {
      //      adjacentSystem = currentRoute[currentStep-1].system;
      //      if ( (currentStep > 1) && (adjacentSystem === currentRoute[currentStep].system) ) {
      //         adjacentSystem = currentRoute[currentStep-2].system;
      //      }
      //      var $prev = adjacentSystem.createInfoLink();
      //      $prev.attr( 'title', 'Previous jump to ' + adjacentSystem.name +
      //         ' (' + adjacentSystem.faction.name + ' territory)' );
      //      $prev.empty().append( '<i class="left fa fa-fw fa-arrow-left"></i>' );
      //      header.push( $prev );
      //   } else {
      //      header.push( $('<i class="left fa fa-fw"></i>') );
      //   }

      //   if ( currentStep < ( currentRoute.length - 1 ) ) {
      //      adjacentSystem = currentRoute[currentStep+1].system;
      //      if ( (currentStep < (currentRoute.length - 2)) && (adjacentSystem === currentRoute[currentStep].system) ) {
      //         adjacentSystem = currentRoute[currentStep+2].system;
      //      }
      //      var $next = adjacentSystem.createInfoLink();
      //      $next.attr( 'title', 'Next jump to ' + adjacentSystem.name +
      //         ' (' + adjacentSystem.faction.name + ' territory)'  );
      //      $next.empty().append( '<i class="right fa fa-fw fa-arrow-right"></i>' );
      //      header.push( $next );
      //   } else {
      //      header.push( $('<i class="right fa fa-fw"></i>') );
      //   }

      //   header.push( this.name );

      //   $('#systemname').removeClass('padleft').empty().append( header );
      //}
      //else
      //{
      //   $('#systemname').addClass('padleft');
      //}

      if ( !doNotSwitch ) {
         ui.toTab( 'system' );
      }
   },

   // 2d/3d tween callback
   scaleY: function scaleY( object, scalar ) {
      var wantedY = object.userData.system.position.y * ( scalar / 100 );
      object.userData.system.sceneObject.translateY( wantedY - object.userData.system.sceneObject.position.y );
      object.userData.system.routeNeedsUpdate();
      return this;
   },

   moveTo: function moveTo( vector ) {
      this.system.sceneObject.position.copy( vector );
      this.system.routeNeedsUpdate();
      return this;
   },

   translateVector: function translateVector( vector ) {
      this.system.sceneObject.add( vector );
      this.system.routeNeedsUpdate();
      return this;
   },

   routeNeedsUpdate: function routeNeedsUpdate() {
      for ( var j = 0; j < this._routeObjects.length; j++ ) {
         this._routeObjects[j].geometry.verticesNeedUpdate = true;
      }
      return this;
   },

   // Returns the jumppoint leading to the given destination
   jumpPointTo: function jumpPointTo( destination ) {
      for ( var i = 0; i < this.jumpPoints.length; i++ ) {
         if ( this.jumpPoints[i].destination === destination ) {
            return this.jumpPoints[i];
         }
      }
   },

   isBookmarked: function isBookmarked( ) {
      return this.storedSettings().bookmarked === true;
   },

   setBookmarkedState: function setBookmarkedState( state ) {
      this.storedSettings().bookmarked = ( state ) ? true : false;
      this.saveSettings();
      return this;
   },

   hasHangar: function hasHangar( ) {
      return this.storedSettings().hangarLocation === true;
   },

   setHangarState: function setHangarState( state ) {
      this.storedSettings().hangarLocation = ( state ) ? true : false;
      this.saveSettings();
      return this;
   },

   isToBeAvoided: function isToBeAvoided( ) {
      return this.storedSettings().avoid === true;
   },

   setToBeAvoidedState: function setToBeAvoidedState( state ) {
      this.storedSettings().avoid = ( state ) ? true : false;
      this.saveSettings();
      return this;
   },

   hasComments: function hasComments( ) {
      return( ( typeof this.storedSettings().comments === 'string' ) && ( this.storedSettings().comments.length > 0 ) );
   },

   getComments: function getComments( ) {
      return this.storedSettings().comments;
   },

   setComments: function setComments( comments ) {
      if ( (typeof comments === 'string') && (comments.length > 1) ) {
         this.storedSettings().comments = comments;
      } else {
         delete this.storedSettings().comments;
      }
      this.saveSettings();
      return this;
   },

   storedSettings: function storedSettings() {
      if ( !( this.id in SCMAP.settings.systems ) ) {
         SCMAP.settings.systems[ this.id ] = {};
      }
      return SCMAP.settings.systems[ this.id ];
   },

   saveSettings: function saveSettings() {
      SCMAP.settings.save('systems');
      return this;
   },

   toString: function toString() {
      return this.name;
   },

   getValue: function getValue( key ) {
      if ( key === undefined ) {
         return;
      }
      var value = this[ key ];
      return value;
   },

   _fixJumpPoints: function _fixJumpPoints( cleanup ) {
      var i, jumpPoint, destination, jumpPoints = [];

      for ( i = 0; i < this.jumpPoints.length; i++ )
      {
         jumpPoint = this.jumpPoints[ i ];

         if ( jumpPoint instanceof SCMAP.JumpPoint ) {
            continue;
         }

         destination = SCMAP.System.getById( jumpPoint.destinationSystemId );

         if ( destination instanceof SCMAP.System ) {
            jumpPoint = new SCMAP.JumpPoint({
               source: this,
               destination: destination,
               name: jumpPoint.name,
               type: jumpPoint.type,
               entryAU: jumpPoint.coordsAu
            });
            if ( cleanup ) {
               jumpPoints.push( jumpPoint );
            } else {
               system.jumpPoints[ i ] = jumpPoint;
            }
         }
      }

      if ( cleanup ) {
         this.jumpPoints = jumpPoints;
      }

      return this;
   },

   setValues: function setValues( values ) {
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

SCMAP.System.preprocessSystems = function ( data ) {
   var i, systemName, system, systems = [];

   SCMAP.data.systems = {};
   SCMAP.data.systemsById = {};
   SCMAP.System.List = [];

   // First build basic objects to make them all known
   // (this will initialise any jumppoints it can as well)
   for ( systemName in data ) {
      if ( data.hasOwnProperty( systemName ) ) {
         system = SCMAP.System.fromJSON( data[ systemName ] );
         SCMAP.data.systems[ system.name ]     = system;
         SCMAP.data.systemsById[ system.id ]   = system;
         SCMAP.data.systemsById[ system.uuid ] = system;
         systems.push( system );
      }
   }

   // Now go through the built objects again, fixing any leftover jumppoint data
   $( systems ).each( function ( i, system ) {
      system._fixJumpPoints( true );
   });

   SCMAP.System.List = SCMAP.System.SortSystemList( systems );
};

SCMAP.System.List = [];

SCMAP.System.SortSystemList = function SortSystemList( systems ) {
   var array = [];
   var i = systems.length;
   while( i-- ) {
      array[i] = systems[i];
   }
   var sorted = array.sort( humanSort );
   return sorted;
};

SCMAP.System.fromJSON = function fromJSON( data ) {
   var system;

   if ( data instanceof SCMAP.System ) {
      return data;
   }

   return new SCMAP.System({
      'id': data.systemId,
      'uuid': data.uuid,
      'name': data.name,
      'position': data.coords,
      'scale': data.scale || 1.0,
      'color': data.color,
      'faction': SCMAP.Faction.getById( data.factionId ),
      'isMajorTradeHub': data.isMajorTradeHub,
      'hasWarning': data.hasWarning,
      'isOffLimits': data.isOffLimits,
      'nickname': data.nickname,
      'size': data.size,
      'info': data.info,
      'crimeStatus': SCMAP.data.crimeLevels[ data.crimeLevel ],
      'ueeStrategicValue': SCMAP.data.ueeStrategicValues[ ""+data.ueeStrategicValue ],
      'import': data.import,
      'export': data.export,
      'blackMarket': data.blackMarket,
      'planets': [], // TODO
      'planetaryRotation': [], // TODO
      'jumpPoints': data.jumpPoints
   });
};

SCMAP.System.getByName = function getByName( name ) {
   return SCMAP.data.systems[ name ];
};

SCMAP.System.getById = function getById( id ) {
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

SCMAP.System.CUBE = new THREE.BoxGeometry( 1, 1, 1 );

SCMAP.System.LODMESH = [
   [ new THREE.IcosahedronGeometry( 1, 3 ), 20 ],
   [ new THREE.IcosahedronGeometry( 1, 2 ), 50 ],
   [ new THREE.IcosahedronGeometry( 1, 1 ), 150 ]
];

SCMAP.System.STAR_MATERIAL_WHITE = new THREE.MeshBasicMaterial({ color: SCMAP.System.COLORS.WHITE, name: 'STAR_MATERIAL_WHITE' });

SCMAP.System.CUBE_MATERIAL = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true });
SCMAP.System.CUBE_MATERIAL.opacity = 0.3;
SCMAP.System.CUBE_MATERIAL.transparent = true;

SCMAP.System.GLOW_MAP = new THREE.ImageUtils.loadTexture( $('#sc-map-configuration').data('glow-image') );

// create custom material from the shader code in the html
//$(function() {
//   SCMAP.System.GLOW_SHADER_MATERIAL = new THREE.ShaderMaterial({
//      uniforms: { 
//         "c":   { type: "f", value: 0.05 },
//         "p":   { type: "f", value: 3.3 },
//         glowColor: { type: "c", value: SCMAP.Color.BLACK },
//         viewVector: { type: "v3", value: new THREE.Vector3( 0, 0, 0 ) }
//      },
//      vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
//      fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
//      side: THREE.BackSide,
//      blending: THREE.AdditiveBlending,
//      transparent: true
//   });
//});

// EOF
