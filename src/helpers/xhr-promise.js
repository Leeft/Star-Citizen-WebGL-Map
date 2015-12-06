import RSVP from 'rsvp';

export default function( url )
{
  return new RSVP.Promise( ( resolve, reject ) => {

    var request = new XMLHttpRequest();

    request.onreadystatechange = function () {
      if ( this.readyState === this.DONE ) {
        if ( this.status === 200 ) {
          // Success
          resolve( this.response );
        } else {
          // Something went wrong (404 etc.)
          reject( new Error( this.statusText ) );
        }
      }
    }

    request.onerror = function () {
      reject( new Error( `XMLHttpRequest Error: ${ this.statusText }` ) );
    };

    request.open( 'GET', url );
    request.send();

  }, url );
}
