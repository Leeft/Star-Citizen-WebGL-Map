/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

SCMAP.System = function ( data ) {
   // Defaults, to be filled in from the config
   this.id = undefined;
   this.uuid = undefined;
   this.name = THREE.Math.generateUUID();
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
   this.status = 'unknown';
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
      var interactable, interactableSize, starLOD, star, glow;

      // Grouping all our system related objects in here
      var sceneObject = new THREE.Object3D();

      // To make systems easier to click, we add an invisible sprite to them
      // (probably also easier for the raycaster) and use that as the object
      // to interact with
      interactable = new THREE.Sprite( SCMAP.System.INTERACTABLE_DEBUG_MATERIAL );
      interactableSize = Math.min( 5.75, Math.max( 5.5, 6 * this.scale ) );
      interactable.scale.set( interactableSize, interactableSize, interactableSize );
      sceneObject.userData.interactable = interactable;
      sceneObject.add( interactable );

      // LOD for the stars to make them properly rounded when viewed up close
      // yet low on geometry at a distance
      starLOD = new THREE.LOD();
      for ( i = 0; i < SCMAP.System.STAR_LOD_MESHES.length; i++ ) {
         star = new THREE.Mesh( SCMAP.System.STAR_LOD_MESHES[ i ][ 0 ], this.starMaterial() );
         star.scale.set( this.scale, this.scale, this.scale );
         star.updateMatrix();
         star.matrixAutoUpdate = false;
         starLOD.addLevel( star, SCMAP.System.STAR_LOD_MESHES[ i ][ 1 ] );
      }
      starLOD.updateMatrix();
      starLOD.matrixAutoUpdate = false;
      sceneObject.userData.starLOD = starLOD;
      sceneObject.add( starLOD );

      // Glow sprite for the star
      glow = new THREE.Sprite( this.glowMaterial() );
      glow.scale.set( SCMAP.System.GLOW_SCALE * this.scale, SCMAP.System.GLOW_SCALE * this.scale, 1.0 );
      glow.position.set( 0, 0, -0.2 );
      glow.userData.isGlow = true;
      glow.sortParticles = true;
      glow.visible = SCMAP.settings.glow;
      sceneObject.userData.glowSprite = glow;
      sceneObject.add( glow );

      this.systemLabel = this.systemLabel( SCMAP.settings.labelIcons );
      if ( this.systemLabel && this.systemLabel.sceneObject ) {
         this.systemLabel.sceneObject.userData.isLabel = true;
         this.systemLabel.sceneObject.visible = SCMAP.settings.labels;
         sceneObject.add( this.systemLabel.sceneObject );
      }

      sceneObject.position.copy( this.position );
      if ( storage && storage.mode === '2d' ) {
         sceneObject.position.setY( sceneObject.position.y * 0.005 );
      }

      sceneObject.userData.system = this;
      sceneObject.userData.scaleY = this.scaleY;
      return sceneObject;
   },

   updateSceneObject: function updateSceneObject( scene ) {
      for ( var i = 0; i < this.sceneObject.children.length; i++ ) {
         var object = this.sceneObject.children[i];
         if ( object.userData.isLabel ) {
            if ( this.systemLabel instanceof SCMAP.SystemLabel ) {
               this.systemLabel.update( SCMAP.settings.labelIcons );
            }
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
      return SCMAP.System.STAR_MATERIAL;
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

   systemLabel: function systemLabel( drawSymbols ) {
      var texture, material, label, node, uvExtremes;

      if ( ! SCMAP.UI.fontAwesomeIsReady ) {
         drawSymbols = false;
      }

      label = new SCMAP.SystemLabel( this );
      node = window.renderer.textureManager.allocateTextureNode( label.width(), label.height() );
      if ( ! node ) {
         return null;
      }

      label.node = node;
      label.drawText();
      if ( drawSymbols ) {
         label.drawSymbols();
      }

      node.setUV();

      var euler = new THREE.Euler( window.renderer.camera.userData.phi + Math.PI / 2, window.renderer.camera.userData.theta, 0, 'YXZ' );

      label.sceneObject = new THREE.Sprite( new THREE.SpriteMaterial({ map: node.texture }) );
      label.sceneObject.userData.position = new THREE.Vector3( 0, - 5.0, - 0.1 );

      var spriteOffset = label.sceneObject.userData.position.clone();
          spriteOffset.applyMatrix4( new THREE.Matrix4().makeRotationFromEuler( euler ) );

      label.sceneObject.position.copy( spriteOffset );
      label.scaleSprite();

      return label;
   },

   createInfoLink: function createInfoLink( noSymbols, noTarget ) {
      var $line = $( '<a></a>' );

      if ( typeof this.faction !== 'undefined' && typeof this.faction !== 'undefined' ) {
         $line.css( 'color', this.faction.color.getStyle() );
      }

      $line.addClass('system-link');
      $line.attr( 'data-goto', 'system' );
      $line.attr( 'data-system', this.id );
      $line.attr( 'href', '#system='+encodeURIComponent( this.name ) );
      $line.attr( 'title', 'Show information on '+this.name );
      if ( noTarget ) {
         $line.text( this.name );
      } else {
         $line.html( '<i class="fa fa-crosshairs"></i>&nbsp;' + this.name );
      }

      if ( !noSymbols )
      {
         var symbols = this.getSymbols();
         if ( symbols.length )
         {
            var $span = $('<span class="icons"></span>');
            for ( var i = 0; i < symbols.length; i++ ) {
               $span.append( SCMAP.Symbol.getTag( symbols[i] ) );
            }
            $line.append( $span );
         }
      }

      return $line;
   },

   symbolsToKey: function symbolsToKey( symbols ) {
      var list = [];
      for ( var i = 0; i < symbols.length; i++ ) {
         list.push( symbols[i].code );
      }
      return list.join( ';' );
   },

   getIcons: function getIcons() {
      return this.getSymbols();
   },

   getSymbols: function getSymbols() {
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
      var previous = null;
      var next = null;
      var currentStep = window.map.route().indexOfCurrentRoute( this );

      if ( typeof currentStep === 'number' )
      {
         var currentRoute = window.map.route().currentRoute();

         if ( currentStep > 0 ) {
            previous = currentRoute[ currentStep - 1 ].system;
            if ( ( currentStep > 1 ) && ( previous === currentRoute[ currentStep ].system ) ) {
               previous = currentRoute[ currentStep - 2 ].system;
            }
            previous = previous;
         }

         if ( currentStep < ( currentRoute.length - 1 ) ) {
            next = currentRoute[ currentStep + 1 ].system;
            if ( ( currentStep < ( currentRoute.length - 2 ) ) && ( next === currentRoute[ currentStep ].system ) ) {
               next = currentRoute[ currentStep + 2 ].system;
            }
         }
      }

      var $element = $( SCMAP.UI.Tab('system').id )
         .empty()
         .append( SCMAP.UI.Templates.systemInfo({
            previous: previous,
            system: me,
            next: next
         }));

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

      if ( !doNotSwitch ) {
         ui.toTab( 'system' );
         ui.updateHeight();
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

   isUnknown: function isUnknown( ) {
      return ( this.status === 'unknown' ) ? true : false;
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

   factionStyle: function factionStyle() {
      return this.faction.color.getStyle();
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
      'status': data.status,
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
SCMAP.System.LABEL_SCALE = 5;
SCMAP.System.GLOW_SCALE = 6.5;
SCMAP.System.UNKNOWN_SYSTEM_SCALE = 0.65;

SCMAP.System.STAR_LOD_MESHES = [
   [ new THREE.IcosahedronGeometry( 1, 3 ),  20 ],
   [ new THREE.IcosahedronGeometry( 1, 2 ), 150 ],
   [ new THREE.IcosahedronGeometry( 1, 1 ), 250 ],
   [ new THREE.IcosahedronGeometry( 1, 0 ), 500 ]
];

SCMAP.System.STAR_MATERIAL = new THREE.MeshBasicMaterial({ color: SCMAP.System.COLORS.WHITE, name: 'STAR_MATERIAL' });

SCMAP.System.INTERACTABLE_DEBUG_MATERIAL = new THREE.MeshBasicMaterial();
SCMAP.System.INTERACTABLE_DEBUG_MATERIAL.color = 0xFFFF00;
SCMAP.System.INTERACTABLE_DEBUG_MATERIAL.depthWrite = false;
SCMAP.System.INTERACTABLE_DEBUG_MATERIAL.map = null;
SCMAP.System.INTERACTABLE_DEBUG_MATERIAL.blending = THREE.AdditiveBlending;

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
