export default function () {
  const sec_num = parseInt( this, 10 );
  const hours   = Math.floor(   sec_num / 3600 );
  const minutes = Math.floor( ( sec_num - ( hours * 3600 ) ) / 60 );
  if ( minutes < 10 ) {
    minutes = '0' + minutes;
  }
  return hours + ':' + minutes;
};
