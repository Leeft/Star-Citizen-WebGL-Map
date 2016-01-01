/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import MapGeometry from '../map-geometry';
import JumpPoint from '../../jump-point';
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

class JumpPoints extends MapGeometry {
  get mesh () {
    if ( this._mesh ) {
      return this._mesh;
    }

    const jumpLines = new LineSegments();

    this.allSystems.forEach( system => {

      system.jumpPoints.forEach( jumpPoint => {

        if ( ! jumpPoint.drawn )
        {
          // TODO: Maybe this can be done more efficiently?
          const sourceVec = jumpPoint.source.position.clone().sub( jumpPoint.destination.position );
          sourceVec.setLength( sourceVec.length() - ( 3 * ( jumpPoint.source.scale ) ) );
          sourceVec.add( jumpPoint.destination.position );

          // TODO: Maybe this can be done more efficiently?
          const destVec = jumpPoint.destination.position.clone().sub( jumpPoint.source.position );
          destVec.setLength( destVec.length() - ( 3 * ( jumpPoint.destination.scale ) ) );
          destVec.add( jumpPoint.source.position );

          jumpLines.addColoredLine(
            sourceVec, jumpPoint.source.faction.lineColor,
            destVec, jumpPoint.destination.faction.lineColor,
          );
          jumpPoint.setDrawn();

          const oppositeJumppoint = jumpPoint.getOppositeJumppoint();
          if ( oppositeJumppoint instanceof JumpPoint ) {
            oppositeJumppoint.setDrawn();
          }
        }

      });

    });

    this._mesh = jumpLines.mesh();

    // Set the 2d/3d tween callback
    this._mesh.userData.scaleY = JumpPoints.scaleY;

    JumpPoints.scaleY( this._mesh, this.initialScale );

    return this._mesh;
  }

  static scaleY ( mesh, scaleY ) {
    mesh.scale.y = scaleY;
    mesh.updateMatrix();
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
