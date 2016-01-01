import RSVP from 'rsvp';

let promise;

function waitForFontAwesome( timeout = 500, log = false, retries = 10 ) {
  /* globals Promise */
  if ( promise !== undefined ) {
    return promise;
  }

  promise = new RSVP.Promise( function( resolve, reject ) {
    let attempt = 0;
    let canvas = document.createElement('canvas');
    canvas.width = canvas.height = 20;
    let context = canvas.getContext('2d');

    const checkReady = function() {
      attempt += 1;
      context.fillStyle = 'rgba(0,0,0,1.0)';
      context.fillRect( 0, 0, 20, 20 );

      context.font = '16pt FontAwesome';
      context.textAlign = 'center';
      context.fillStyle = 'rgba(255,255,255,1.0)';
      context.fillText( '\uf0c8', 10, 18 );

      var data = context.getImageData( 2, 10, 1, 1 ).data;

      if ( data[0] !== 255 && data[1] !== 255 && data[2] !== 255 )
      {

        if ( log ) {
          console.log( `FontAwesome is not yet available (attempt# ${ attempt })` );
        }

        if ( attempt < retries ) {

          window.setTimeout( checkReady, timeout );

        } else {

          if ( log ) {
            console.info( `Could not detect FontAwesome after ${ retries } checks; some functionality may not be available` );
          }

          reject( new Error( `Could not load FontAwesome` ) );

        }

      } else {

        if ( log ) {
          console.info( `FontAwesome is loaded` );
        }

        resolve( true );

      }
    };

    // Start the ready-check
    checkReady();

  });

  return promise;
}

export default waitForFontAwesome;
