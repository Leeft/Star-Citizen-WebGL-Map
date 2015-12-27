/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import MapGeometry from '../map-geometry';
import settings from '../../settings';
import config from '../../config';

import THREE from 'three';

let STAR_LOD_MESHES;
if ( config.quality === 'low' ) {
  STAR_LOD_MESHES = [
   [ new THREE.IcosahedronGeometry( 1, 1 ), 20 ],
   [ new THREE.IcosahedronGeometry( 1, 0 ), 500 ],
  ];
} else {
  STAR_LOD_MESHES = [
   [ new THREE.IcosahedronGeometry( 1, 3 ),  20 ],
   [ new THREE.IcosahedronGeometry( 1, 2 ), 150 ],
   [ new THREE.IcosahedronGeometry( 1, 1 ), 250 ],
   [ new THREE.IcosahedronGeometry( 1, 0 ), 500 ],
  ];
}

class SystemsGeometry extends MapGeometry {
  get mesh () {
    if ( this._mesh ) {
      return this._mesh;
    }

    const group = new THREE.Object3D();
    group.name = 'Star Systems Geometry';
    this._mesh = group;

    const material = new THREE.MeshBasicMaterial({ name: 'Star material' });

    try {
      this.allSystems.forEach( system => {
        // Build a LOD mesh for the stars to make them properly rounded
        // when viewed up close yet low on geometry at a distance
        const starLOD = new THREE.LOD();

        for ( let i = 0; i < STAR_LOD_MESHES.length; i++ ) {
          const star = new THREE.Mesh( STAR_LOD_MESHES[ i ][ 0 ], material );
          star.scale.set( system.scale, system.scale, system.scale );
          star.updateMatrix();
          star.matrixAutoUpdate = false;
          starLOD.addLevel( star, STAR_LOD_MESHES[ i ][ 1 ] );
        }

        starLOD.position.copy( system.position );
        starLOD.updateMatrix();
        starLOD.matrixAutoUpdate = false;
        starLOD.userData.isSystem = true;
        starLOD.userData.isLOD = true;

        group.add( starLOD );
      });

      group.dynamic = false;
    } catch( e ) {
      console.error( `Problem creating systems geometry:`, e );
      throw e;
    }

    // Set the 2d/3d tween callback
    group.userData.scaleY = SystemsGeometry.scaleY;

    SystemsGeometry.scaleY( group, this.initialScale );
    this.refreshScale();

    return group;
  }

  refreshLOD ( camera ) {
    this._mesh.traverse( function( obj ) {
      if ( obj.userData.isLOD ) {
        obj.update( camera );
      }
    });
  }

  refreshScale () {
    this._mesh.traverse( function( obj ) {
      if ( obj.userData.isSystem ) {
        obj.scale.set( settings.systemScale, settings.systemScale, settings.systemScale );
        obj.updateMatrix();
      }
    });
  }

  static scaleY ( mesh, scaleY ) {
    mesh.scale.y = scaleY;
    mesh.updateMatrix();
  }
}

export default SystemsGeometry;
