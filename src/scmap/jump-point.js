/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import System from './system';
import THREE from 'three';

class JumpPoint {
  constructor( data ) {
    this.id = data.jumpPointId;
    this.name = ( typeof data.name === 'string' && data.name.length > 1 ) ? data.name : undefined;
    this.source = ( data.source instanceof System ) ? data.source : undefined;
    this.destination = ( data.destination instanceof System ) ? data.destination : undefined;
    this.drawn = false;
    this.type = ( typeof data.type === 'string' ) ? data.type : 'UNDISC';
    this.entryAU = new THREE.Vector3();

    if ( ( typeof data.entryAU === 'object' ) && Array.isArray( data.entryAU ) ) {
      this.entryAU = this.entryAU.fromArray( data.entryAU );
    }

    if ( !this.isValid() ) {
      console.warn( `Invalid route created` );
    } else {
      if ( this.name === undefined || this.name === '' ) {
        this.name = `[${ this.source.name } to ${ this.destination.name }]`;
      }
    }
  }

  length () {
    if ( !this.isValid() ) { return; }
    return this.source.position.distanceTo( this.destination.position );
  }

  jumpTime () {
    if ( !this.isValid() ) { return; }
    // TODO FIXME: This is a rough guesstimate on how long it will take
    // to travel a JP, and not based in any facts ... no word from devs
    // on this so far.
    return this.length() * 4; // 2 mins for 30LY, ~Sol to Vega (27LY)
  }

  fuelConsumption () {
    if ( !this.isValid() ) { return; }
    // TODO: Devs have stated that JP's don't consume fuel to traverse.
    // If that changes, this needs to be quantified and fixed.
    return 0;
  }

  getOppositeJumppoint () {
    for ( let i = 0; i < this.destination.jumpPoints.length; i++ ) {
      const jumppoint = this.destination.jumpPoints[i];
      if ( jumppoint.destination == this.source ) {
        return jumppoint;
      }
    }
  }

  isValid () {
    return( this.source instanceof System && this.destination instanceof System && this.source !== this.destination );
  }

  isUnconfirmed () {
    return ( ( this.type === 'UNCONF' ) || ( this.type === 'UNDISC' ) );
  }

  setDrawn () {
    this.drawn = true;
  }
}

export default JumpPoint;
