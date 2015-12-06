/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import System from './system';
import THREE from 'three';

const MATERIALS = {
  NORMAL: new THREE.LineBasicMaterial({
    color: 0xFFFFFF,
    linewidth: 2,
    vertexColors: true,
  }),
  UNDISC: new THREE.LineDashedMaterial({
    color: 0xFFFFFF,
    dashSize: 0.75,
    gapSize: 0.75,
    linewidth: 2,
    vertexColors: true,
  }),
  UNCONF: new THREE.LineDashedMaterial({
    color: 0xFFFFFF,
    dashSize: 2,
    gapSize: 2,
    linewidth: 2,
    vertexColors: true,
  }),
};

const DEFAULT_MATERIAL = MATERIALS.UNCONF;

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
      console.error( `Invalid route created` );
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

  buildSceneObject () {
    let oppositeJumppoint, geometry;

    if ( this.drawn ) {
      return;
    }

    // Check if the opposite jumppoint has already been drawn
    oppositeJumppoint = this.getOppositeJumppoint();
    if ( oppositeJumppoint instanceof JumpPoint && oppositeJumppoint.drawn ) {
      return;
    }

    geometry = new THREE.Geometry();
    geometry.colors.push( this.source.faction.lineColor );
    geometry.vertices.push( this.source.sceneObject.position );
    geometry.colors.push( this.destination.faction.lineColor );
    geometry.vertices.push( this.destination.sceneObject.position );

    // Set both the jumppoints as drawn
    this.setDrawn();
    if ( oppositeJumppoint instanceof JumpPoint ) {
      oppositeJumppoint.setDrawn();
    }

    // This is apparently needed for dashed lines
    geometry.computeLineDistances();
    return new THREE.Line( geometry, this.getMaterial(), THREE.LinePieces );
  }

  getOppositeJumppoint () {
    for ( let i = 0; i < this.destination.jumpPoints.length; i++ ) {
      let jumppoint = this.destination.jumpPoints[i];
      if ( jumppoint.destination == this.source ) {
        return jumppoint;
      }
    }
  }

  getMaterial () {
    if ( this.type in MATERIALS ) {
      return MATERIALS[ this.type ];
    } else {
      return DEFAULT_MATERIAL;
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
