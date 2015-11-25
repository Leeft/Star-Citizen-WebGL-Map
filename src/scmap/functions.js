function hasLocalStorage() {
  try {
    return 'localStorage' in window && window.localStorage !== null;
  } catch(e) {
    return false;
  }
}

function hasSessionStorage() {
  try {
    return 'sessionStorage' in window && window.sessionStorage !== null;
  } catch(e) {
    return false;
  }
}

function humanSort( a, b ) {
  var x, cmp1, cmp2;
  var aa = a.name.split(/(\d+)/);
  var bb = b.name.split(/(\d+)/);

  for ( x = 0; x < Math.max( aa.length, bb.length ); x++ )
  {
    if ( aa[x] != bb[x] )
    {
      cmp1 = ( isNaN( parseInt( aa[x], 10 ) ) ) ? aa[x] : parseInt( aa[x], 10 );
      cmp2 = ( isNaN( parseInt( bb[x], 10 ) ) ) ? bb[x] : parseInt( bb[x], 10 );

      if ( cmp1 === undefined || cmp2 === undefined ) {
        return aa.length - bb.length;
      } else {
        return ( cmp1 < cmp2 ) ? -1 : 1;
      }
    }
  }

  return 0;
}

export { hasLocalStorage, hasSessionStorage, humanSort };
