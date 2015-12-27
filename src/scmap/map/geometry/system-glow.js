/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import MapGeometry from '../map-geometry';
import settings from '../../settings';
import config from '../../config';

import THREE from 'three';

const GLOW_SCALE = 7.5;
const BLACK = new THREE.Color( 'black' );
const UNSET = new THREE.Color( 0x80A0CC );

const GLOW_MATERIAL_PROMISE = new Promise( function ( resolve, reject ) {
  const loader = new THREE.TextureLoader();
  loader.load(
    config.glowImage,
    function ( texture ) {
      resolve( new THREE.SpriteMaterial({
        map: texture,
        blending: THREE.AdditiveBlending,
        opacity: 0.65,
      }));
    },
    function ( /* progress */ ) {},
    function ( failure ) {
      reject( new Error( `Could not load texture ${ config.glowImage }: ${ failure }` ) );
    }
  );
});

class SystemGlow extends MapGeometry {
  constructor ({ material: material }) {
    super(...arguments);
    this.material = material;
  }

  get mesh () {
    if ( this._mesh ) {
      return this._mesh;
    }

    const group = new THREE.Group();
    this._mesh = group;

    try {
      this.allSystems.forEach( system => {
        const color = system.color;
        if ( color.equals( BLACK ) ) {
          color.copy( UNSET );
        }

        const material = this.material.clone();
        material.color = color;

        const glow = new THREE.Sprite( material );
        glow.position.set( system.position.x, system.position.y, system.position.z - 0.2 );
        glow.userData.isGlow = true;
        glow.userData.system = system;
        glow.userData.y = system.position.y;
        glow.sortParticles = true;

        group.add( glow );
      });
    } catch( e ) {
      console.error( `Problem creating glow sprites:`, e );
      throw e;
    }

    group.userData.y = 0;
    group.dynamic = false;
    group.userData.scaleY = SystemGlow.scaleY;
    group.updateMatrix();
    group.name = 'Star System Glow';

    this.refreshVisibility();
    this.refreshScale();

    SystemGlow.scaleY( group, this.initialScale );

    return group;
  }

  refreshVisibility () {
    this._mesh.traverse( function( obj ) {
      if ( obj.userData.isGlow && obj.userData.system ) {
        obj.visible = settings.glow;
      }
    });
  }

  refreshScale () {
    this._mesh.traverse( function( obj ) {
      if ( obj.userData.isGlow && obj.userData.system ) {
        const scale = obj.userData.system.scale * settings.systemScale * GLOW_SCALE;
        obj.scale.set( scale, scale, 1.0 );
      }
    });
  }

  static scaleY ( mesh, scaleY ) {
    mesh.traverse( function( obj ) {
      if ( obj.userData.isGlow && obj.userData.system ) {
        obj.position.setY( obj.userData.y * scaleY );
      }
    });
  }
}

export default SystemGlow;
export { GLOW_MATERIAL_PROMISE };
