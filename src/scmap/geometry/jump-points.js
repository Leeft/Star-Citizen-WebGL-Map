/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import JumpPoint from '../jump-point';
import LineSegments from './line-segments';

import THREE from 'three';

//const MATERIALS = {
//  NORMAL: new THREE.LineBasicMaterial({
//    color: 0xFFFFFF,
//    linewidth: 2,
//    vertexColors: true,
//  }),
//  UNDISC: new THREE.LineDashedMaterial({
//    color: 0xFFFFFF,
//    dashSize: 0.75,
//    gapSize: 0.75,
//    linewidth: 2,
//    vertexColors: true,
//  }),
//  UNCONF: new THREE.LineDashedMaterial({
//    color: 0xFFFFFF,
//    dashSize: 2,
//    gapSize: 2,
//    linewidth: 2,
//    vertexColors: true,
//  }),
//};
//
//const DEFAULT_MATERIAL = MATERIALS.UNCONF;

class JumpPoints {
  constructor( allSystems ) {
    this.allSystems = allSystems;
  }

  get mesh () {
    if ( this._mesh ) {
      return this._mesh;
    }

    const jumpLines = new LineSegments();

    this.allSystems.forEach( system => {

      system.jumpPoints.forEach( jumpPoint => {

        if ( ! jumpPoint.drawn ) {
          jumpLines.addColoredLine(
            jumpPoint.source.position, jumpPoint.source.faction.lineColor,
            jumpPoint.destination.position, jumpPoint.destination.faction.lineColor,
          );
          jumpPoint.setDrawn();
        }

        const oppositeJumppoint = jumpPoint.getOppositeJumppoint();
        if ( oppositeJumppoint instanceof JumpPoint ) {
          oppositeJumppoint.setDrawn();
        }

      });

    });

    this._mesh = jumpLines.mesh();
    return this._mesh;
  }

  //getMaterial () {
  //  if ( this.type in MATERIALS ) {
  //    return MATERIALS[ this.type ];
  //  } else {
  //    return DEFAULT_MATERIAL;
  //  }
  //}
}

export default JumpPoints;
