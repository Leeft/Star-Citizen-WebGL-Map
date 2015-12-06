export default function ( obj ) {
  const vals = [];
  for ( let key in obj ) {
    if ( obj.hasOwnProperty(key) ) {
      vals.push( obj[key] );
    }
  }
  return vals;
};
