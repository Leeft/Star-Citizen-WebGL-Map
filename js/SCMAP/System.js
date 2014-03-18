/**
* @author LiannaEeftinck / https://github.com/Leeft
*/

SCMAP.System = function ( data ) {
   // Filled in from the config
   this.iid = undefined;
   this.uuid = undefined;
   this.name = '';
   this.nickname = undefined;
   this.position = new THREE.Vector3();
   this.ownership = new SCMAP.Faction();
   this.size = 'medium';
   this.jumppoints = [];
   this.star_color = 'unknown';
   this.source = undefined;
   this.planets = 0;
   this.planetary_rotation = [];
   this.import = [];
   this.export = [];
   this.crime_status = '';
   this.black_market = [];
   this.description = [];
   this.uue_strategic_value = undefined;
   this.blob = [];

   this.setValues( data );

   // Internals -- For Dijkstra routing code
   this.distance = Number.MAX_VALUE *2;
   this.visited = false;
   this.parent = undefined;

   // Generated
   this.color = new THREE.Color( SCMAP.System.COLORS.UNKNOWN );
   this.sceneObjects = {};
   this.routeVertices = [];
   this.routeObjects = [];
   this.have_info = false;
   this.scale = 1.0;
   this.binary = false;
};

SCMAP.System.prototype = {
   constructor: SCMAP.System,

   buildObject: function () {
      var star, label, glow, object;

      star = new THREE.Mesh( SCMAP.System.MESH, this.starMaterial() );
      star.scale.set( this.scale, this.scale, this.scale );
      star.system = this;
      this.sceneObjects.mesh = star; // TODO Remove/replace

      object = new THREE.Object3D();

      if ( SCMAP.settings.glow ) {
         glow = new THREE.Sprite( this.glowMaterial() );
         glow.scale.set( SCMAP.System.GLOW_SCALE * this.scale, SCMAP.System.GLOW_SCALE * this.scale, 1.0 );
         glow.system = this;
         glow.isGlow = true;
         this.sceneObjects.glow = glow; // TODO Remove/replace
         object.add( this.sceneObjects.glow );
      }

      if ( SCMAP.settings.labels ) {
         label = new THREE.Sprite( this.labelMaterial() );
         label.position.set( 0, 3, 0 );
         label.scale.set( SCMAP.System.LABEL_SCALE * label.material.map.image.width, SCMAP.System.LABEL_SCALE * label.material.map.image.height, 1 );
         label.system = this;
         label.isLabel = true;
         this.sceneObjects.label = label; // TODO Remove/replace
         object.add( this.sceneObjects.label );
      }

      object.add( this.sceneObjects.mesh );
      object.position = this.position.clone();
      object.system = this;
      this.sceneObject = object;
      this.scenePosition = object.position; // TODO Remove/replace
      return object;
   },

   rotateAroundAxis: function ( axis, radians ) {
      var rotObjectMatrix = new THREE.Matrix4();
      rotObjectMatrix.makeRotationAxis( axis.normalize(), radians );
      this.sceneObject.matrix.multiply( rotObjectMatrix );
      this.sceneObject.rotation.setFromRotationMatrix( this.sceneObject.matrix );
//var euler = new THREE.Euler( axis.x, axis.y, axis.z, 'XYZ' );
//this.sceneObjects.rotation = euler;

      //for ( var i = 0; i < this.sceneObject.children.length; i++ ) {
      //   var obj = this.sceneObject.children[i];
      //   if ( obj.isGlow || obj.isLabel ) {
      //      obj.rotation.setFromRotationMatrix( rotObjectMatrix );
      //   }
      //}
      //this.sceneObjects.glow.rotation.setFromRotationMatrix( rotObjectMatrix );
      //this.sceneObjects.label.rotation.setFromRotationMatrix( rotObjectMatrix );
   },

   getColorByName: function ( color ) {
      color = color.toUpperCase();
      if ( typeof SCMAP.System.COLORS[ color ] !== 'undefined' ) {
         return SCMAP.System.COLORS[ color ];
      } else {
         return SCMAP.System.COLORS.UNKNOWN;
      }
   },

   starMaterial: function () {
      return SCMAP.System.STAR_MATERIAL_WHITE;
      //var color = this.star_color.toUpperCase();
      //if ( SCMAP.System[ 'STAR_MATERIAL_'+color ] instanceof THREE.MeshBasicMaterial ) {
      //   return SCMAP.System[ 'STAR_MATERIAL_'+color ];
      //} else {
      //   return SCMAP.System[ SCMAP.System.STAR_MATERIAL_UNKNOWN ];
      //}
   },

   glowMaterial: function () {
      var color = this.star_color.toUpperCase();
      if ( SCMAP.System[ 'GLOW_MATERIAL_'+color ] instanceof THREE.SpriteMaterial ) {
         return SCMAP.System[ 'GLOW_MATERIAL_'+color ];
      } else {
         return SCMAP.System[ SCMAP.System.GLOW_MATERIAL_UNKNOWN ];
      }
   },

   labelMaterial: function () {
      var canvas, context, texture, material;
      canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 64;
      context = canvas.getContext('2d');
      context.font = "36pt Electrolize, sans-serif";
      context.textAlign = 'center';
      context.strokeStyle = 'rgba(0,0,0,0.95)';
      context.lineWidth = 5;
      context.strokeText( this.name, canvas.width / 2, 38 );
      context.fillStyle = "rgba(255,255,255,0.95)";
      //systemNameWidth = context.measureText( this.name ).width; // didn't get this to work yet
      context.fillText( this.name, canvas.width / 2, 38 );
      texture = new THREE.Texture( canvas ) ;
      texture.needsUpdate = true;
      material = new THREE.SpriteMaterial({ map: texture, useScreenCoordinates: false });
      return material;
   },

   createLink: function () {
      var _this = this, $line = $( '<a></a>' );
      if ( typeof _this.ownership !== 'undefined' && typeof _this.ownership !== 'undefined' ) {
         $line.css( 'color', new THREE.Color( _this.ownership.color ).getStyle() );
      }
      $line.attr( 'href', '#system='+encodeURI( _this.name ) );
      $line.attr( 'title', 'Show information on '+_this.name );
      $line.text( _this.name );
      $line.bind( 'click', function() {
         _this.displayInfo( _this );
         window.controls.goTo( _this.position );
         window.map.select( _this.name );
      } );
      return $line;
   },

   displayInfo: function ( system ) {
      if ( typeof system === 'undefined' ) { system = this; }

      var blurb = $('<div class="sc_system_info '+makeSafeForCSS(system.name)+'"></div>');
      var i;

      $('#systemname')
         .attr( 'class', makeSafeForCSS( system.ownership.name ) )
         .css( 'color', new THREE.Color( system.ownership.color ).getStyle() )
         .text( 'System: ' + system.name );

      var currentRoute = window.map.currentRoute();
      if ( currentRoute.length )
      {
         var partOfRoute = false;
         var currentStep = 0;

         for ( i = 0; i < currentRoute.length; i++ ) {
            if ( currentRoute[i] == system ) {
               partOfRoute = true;
               currentStep = i;
               break;
            }
         }

         if ( partOfRoute )
         {
            var header = [];

            if ( currentStep > 0 ) {
               var $prev = currentRoute[currentStep-1].createLink();
               //$prev.addClass( 'left' );
               $prev.attr( 'title', 'Previous jump to ' + currentRoute[currentStep-1].name +
                  ' (' + currentRoute[currentStep-1].ownership.name + ' territory)' );
               $prev.empty().append( '<i class="left fa fa-fw fa-arrow-left"></i>' );
               header.push( $prev );
            } else {
               header.push( $('<i class="left fa fa-fw"></i>') );
            }

            if ( currentStep < ( currentRoute.length - 1 ) ) {
               var $next = currentRoute[currentStep+1].createLink();
               //$next.addClass( 'right' );
               $next.attr( 'title', 'Next jump to ' + currentRoute[currentStep+1].name +
                  ' (' + currentRoute[currentStep+1].ownership.name + ' territory)'  );
               $next.empty().append( '<i class="right fa fa-fw fa-arrow-right"></i>' );
               header.push( $next );
            } else {
               header.push( $('<i class="right fa fa-fw"></i>') );
            }

            header.push( system.name );

            $('#systemname').empty().attr( 'class', makeSafeForCSS( system.ownership.name ) ).append( header );
         }
      }

      if ( ! system.have_info )
      {
         blurb.append( "<p><strong>No data available yet for '"+system.name+"'</strong></p>" );
      }
      else
      {
         var worlds = 'No inhabitable worlds',
             _import = '&mdash;',
             _export = '&mdash;',
             black_market = '&mdash;',
             strategic_value = 'Unknown',
             crime_status = 'Unknown',
             planets = 'Unknown',
             nickname,
             tmp = [];

         if ( system.planetary_rotation.length ) {
            worlds = system.planetary_rotation.join( ', ' );
         }

         if ( system.import.length ) {
            tmp = [];
            for ( i = 0; i < system.import.length; i++ ) {
               tmp.push( system.import[i].name );
            }
            _import = tmp.join( ', ' );
         }

         if ( system.export.length ) {
            tmp = [];
            for ( i = 0; i < system.export.length; i++ ) {
               tmp.push( system.export[i].name );
            }
            _export = tmp.join( ', ' );
         }

         if ( system.black_market.length ) {
            tmp = [];
            for ( i = 0; i < system.black_market.length; i++ ) {
               tmp.push( system.black_market[i].name );
            }
            black_market = tmp.join( ', ' );
         }

         if ( typeof system.planets === 'string' || typeof system.planets === 'number' ) {
            planets = system.planets;
         }

         if ( typeof system.crime_status === 'string' && system.crime_status.length ) {
            crime_status = system.crime_status;
         }

         if ( typeof system.uee_strategic_value === 'string' && system.uee_strategic_value.length ) {
            strategic_value = system.uee_strategic_value;
         }

         blurb.append( '<dl>' +
            ( ( typeof nickname === 'string' ) ? '<dt class="nickname">Nickname</dt><dd class="nickname">'+nickname+'</dd>' : '' ) +
            '<dt class="ownership">Ownership</dt><dd class="ownership">'+system.ownership.name+'</dd>' +
            '<dt class="planets">Planets</dt><dd class="planets">'+planets+'</dd>' +
            '<dt class="rotation">Planetary rotation</dt><dd class="rotation">'+worlds+'</dd>' +
            '<dt class="import">Import</dt><dd class="import">'+_import+'</dd>' +
            '<dt class="export">Export</dt><dd class="export">'+_export+'</dd>' +
            '<dt class="black_market">Black market</dt><dd class="crime">'+black_market+'</dd>' +
            '<dt class="crime_'+crime_status.toLowerCase()+'">Crime status</dt><dd class="crime">'+crime_status+'</dd>' +
            '<dt class="strategic_value_'+strategic_value.toLowerCase()+'">UEE strategic value</dt><dd class="strategic">'+strategic_value+'</dd>' +
         '</dl>' );

         blurb.append( markdown.toHTML( system.blob ) );

         if ( system.source ) {
            blurb.append( '<p class=""><a href="' + system.source + '" target="_blank">(source)</a></p>' );
         }
      }

      blurb.append( '<div id="destinations">' );

      $('#systemblurb').empty();
      $('#systemblurb').append( blurb );

      $('#map_ui').tabs( 'option', 'active', 0 );
      $('#map_ui').data( 'jsp' ).reinitialise();

   //   var text = new destinationSystem();
   //   var gui = new dat.GUI({ autoPlace: false });
   //   var customContainer = document.getElementById('destinations');
   //   customContainer.appendChild( gui.domElement );
   //// Choose from accepted values
   //gui.add(text, 'name', [ 'pizza', 'chrome', 'hooray' ] );

   //   var select = $('<select>').attr('id','destination').appendTo('#destinations');
   //   $( system.jumppoints ).each( function() {
   //      select.append( $('<option>').attr( 'value', system.destination.name ).text( system.destination.name ) );
   //   } );
   //
   //   $('<input>').attr( 'type', 'checkbox' ).attr( 'id', 'locked' ).appendTo('#destinations');
   },

   getValue: function ( key ) {
      if ( key === undefined ) {
         return;
      }
      var value = this[ key ];
      return value;
   },

   setValues: function ( values ) {
      if ( values === undefined ) {
         return;
      }

      for ( var key in values ) {
         var newValue = values[ key ];
         if ( newValue === undefined ) {
            console.log( 'SCMAP.System: "' + key + '" parameter is undefined for "'+this.name+'"' );
            continue;
         }

         if ( key in this )
         {
            var currentValue = this[ key ];

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
                  this[ key ] = new THREE.Color( this.getColorByName( newValue ) );
               }
            } else if ( currentValue instanceof SCMAP.Faction ) {
               this[ key ] = SCMAP.Faction.getByName( newValue );
            } else if ( currentValue instanceof THREE.Vector3 && newValue instanceof THREE.Vector3 ) {
               currentValue.copy( newValue );
            } else {
               this[ key ] = newValue;
            }

            if ( key == 'star_color' && typeof this.star_color == 'string' ) {
               this.color = new THREE.Color( this.getColorByName( this.star_color ) );
            }
         }
      }
   }
};

SCMAP.System.COLORS = {
   RED: 0xFF6060,
   BLUE: 0x6060FF,
   WHITE: 0xFFFFFF,
   YELLOW: 0xFFFF60,
   ORANGE: 0xF0F080,
   UNKNOWN: 0xC0FFC0
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
