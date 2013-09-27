/**
* @author LiannaEeftinck / https://github.com/Leeft
*/

SCMAP.System = function ( data ) {
   this.name = '';
   this.position = new THREE.Vector3();
   this.ownership = '';
   this.scale = 1.0;
   this.jumppoints = [];

   this.distance = Number.MAX_VALUE *2;
   this.visited = false;
   this.parent = undefined;

   this.color = 0xFFFFFF,

   this.have_info = false;
   this.source = undefined;
   this.planets = 0;
   this.planetary_rotation = [];
   this.import = [];
   this.export = [];
   this.crime_status = [];
   this.black_market = [];
   this.description = [];
   this.uue_strategic_value = undefined;
   this.blob = [];

   this.sceneObject = undefined;
   this.setValues( data );
};

SCMAP.System.prototype = {
   constructor: SCMAP.System,

   createObject: function ( material ) {
      var object = new THREE.Mesh( SCMAP.System.mesh, material );
      object.scale.set( this.scale, this.scale, this.scale );
      object.position = this.position;
      object.system = this;
      this.sceneObject = object;
      return object;
   },

   createLabel: function ( groupObject ) {
      var canvas, context, texture, scaling = 0.24, material, sprite; //systemNameWidth,

      canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 64;
      context = canvas.getContext('2d');
      context.font = "36pt Electrolize";
      context.textAlign = 'center';
      context.fillStyle = "rgba(255,255,255,0.95)";
      //systemNameWidth = context.measureText( this.name ).width;
      context.fillText( this.name, canvas.width / 2, 38 );

      texture = new THREE.Texture( canvas ) ;
      texture.needsUpdate = true;
      material = new THREE.SpriteMaterial({ map: texture, useScreenCoordinates: false });

      sprite = new THREE.Sprite( material );
      sprite.position.set( this.position.x, this.position.y + 12, this.position.z );
      sprite.scale.set( scaling * canvas.width, scaling * canvas.height, 1 );
      sprite.system = this;
      return sprite;
   },

   createLink: function () {
      var _this = this,
          $line = $( '<a></a>' );
      $line.attr( 'href', '#system='+encodeURI(_this.name) );
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
      if ( typeof system === 'undefined' ) {
         system = this;
      }

      var blurb = $('<div class="sc_system_info '+makeSafeForCSS(system.name)+'"></div>');

      $('#systemname').text( 'System: ' + system.name );

      var currentRoute = window.map.currentRoute();
      if ( currentRoute.length )
      {
         var partOfRoute = false;
         var currentStep = 0;

         for ( var i = 0; i < currentRoute.length; i++ ) {
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
               $prev.addClass( 'left' );
               $prev.attr( 'title', 'Jump to ' + currentRoute[currentStep-1].name );
               $prev.empty().append( '<i class="left sprite-arrow-left-24"></i>' );
               header.push( $prev );
            } else {
               header.push( $('<i class="left sprite-blank-24"></i>') );
            }

            header.push( system.name );

            if ( currentStep < ( currentRoute.length - 1 ) ) {
               var $next = currentRoute[currentStep+1].createLink();
               $next.addClass( 'right' );
               $next.attr( 'title', 'Jump to ' + currentRoute[currentStep+1].name );
               $next.empty().append( '<i class="right sprite-arrow-right-24"></i>' );
               header.push( $next );
            } else {
               header.push( $('<i class="right sprite-blank-24"></i>') );
            }

            $('#systemname').empty().append( header );
         }
      }

      if ( ! system.have_info )
      {
         blurb.append( "<p><strong>No data available yet for '"+system.name+"'</strong></p>" );
      }
      else
      {
         var worlds = 'No inhabitable worlds';
         var _import = 'None';
         var _export = 'None';
         var black_market = 'None';
         var strategic_value = 'Unknown';

         if ( system.planetary_rotation.length ) {
            worlds = system.planetary_rotation.join( ', ' );
         }

         if ( system.import.length ) {
            _import = system.import.join( ', ' );
         }

         if ( system.export.length ) {
            _export = system.export.join( ', ' );
         }

         if ( system.black_market.length ) {
            black_market = system.black_market.join( ', ' );
         }

         if ( typeof system.uee_strategic_value === 'string' && system.uee_strategic_value.length ) {
            strategic_value = system.uee_strategic_value;
         }

         blurb.append( '<dl>' +
            '<dt class="ownership">Ownership</dt><dd class="ownership">'+system.ownership+'</dd>' +
            '<dt class="planets">Planets</dt><dd class="planets">'+system.planets+'</dd>' +
            '<dt class="rotation">Planetary rotation</dt><dd class="rotation">'+worlds+'</dd>' +
            '<dt class="import">Import</dt><dd class="import">'+_import+'</dd>' +
            '<dt class="export">Export</dt><dd class="export">'+_export+'</dd>' +
            '<dt class="crime_'+system.crime_status.toLowerCase()+'">Crime status</dt><dd class="crime">'+system.crime_status+'</dd>' +
            '<dt class="black_market">Black market</dt><dd class="crime">'+black_market+'</dd>' +
            '<dt class="strategic_value_'+strategic_value.toLowerCase()+'">UEE strategic value</dt><dd class="strategic">'+strategic_value+'</dd>' +
         '</dl>' );

         for ( var i = 0; i < system.blob.length; i++ ) {
            var blob = system.blob[i];
            blurb.append( '<p class="blurb_hidden">' + blob + '</p>' );
         }

         if ( system.source ) {
            blurb.append( '<p class=""><a href="' + system.source + '" target="_blank">(source)</a></p>' );
         }
      }

      blurb.append( '<div id="destinations">' );

      $('#systemblurb').empty();
      $('#systemblurb').append( blurb );

      $('#map_ui').tabs( 'option', 'active', 0 );

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
            console.log( 'SCMAP.System: \'' + key + '\' parameter is undefined.' );
            continue;
         }

         if ( key in this ) {
            var currentValue = this[ key ];
            if ( currentValue instanceof THREE.Color ) {
               currentValue.set( newValue );
            } else if ( currentValue instanceof THREE.Vector3 && newValue instanceof THREE.Vector3 ) {
               currentValue.copy( newValue );
            } else {
               this[ key ] = newValue;
            }
         }
      }
   }
};

SCMAP.System.mesh = new THREE.SphereGeometry( 5, 12, 12 );
