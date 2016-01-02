/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import MapGeometry from '../map-geometry';
import config from '../../config';
import THREE from 'three';

// Change to SpriteMaterial to visualise
const INTERACTABLE_DEBUG_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xFFFF00,
  depthWrite: false,
  opacity: 0.3,
  blending: THREE.AdditiveBlending,
});

class Interactables extends MapGeometry {
  get mesh () {
    if ( this._mesh ) {
      return this._mesh;
    }

    const group = new THREE.Group();
    this._mesh = group;

    try {
      this.allSystems.forEach( system => {

        // To make systems easier to click, we add an invisible sprite to them
        // (perhaps also easier for the raycaster) and use that as the object
        // to interact with rather than the other objects. The interactable
        // is a bit larger than the system itself.
        const interactable = new THREE.Sprite( INTERACTABLE_DEBUG_MATERIAL );
        const interactableSize = Math.min( 6.5, Math.max( 5.5, 7 * system.scale ) );
        interactable.position.copy( system.position );
        interactable.scale.set( interactableSize * config.renderScale, interactableSize * config.renderScale, interactableSize * config.renderScale );
        interactable.userData.system = system;
        interactable.userData.isInteractable = true;
        interactable.userData.position = system.position.clone();

        group.add( interactable );
      });
    } catch( e ) {
      console.error( `Problem creating interactable sprites:`, e );
      throw e;
    }

    // Set the 2d/3d tween callback
    group.userData.scaleY = Interactables.scaleY;

    group.dynamic = false;
    group.updateMatrix();

    Interactables.scaleY( group, this.initialScale );

    return group;
  }

  getIntersect ( event ) {
    let x, y;
    if ( ( event.touches ) && ( event.touches.length > 0 ) ) {
      x = event.touches[ 0 ].pageX;
      y = event.touches[ 0 ].pageY;
    } else {
      x = event.clientX;
      y = event.clientY;
    }

    const vector = new THREE.Vector3( ( x / window.innerWidth ) * 2 - 1, -( y / window.innerHeight ) * 2 + 1, 0.5 );
    vector.unproject( this.renderer.controls.object );

    const raycaster = new THREE.Raycaster(
      this.renderer.controls.object.position,
      vector.sub( this.renderer.controls.object.position ).normalize()
    );

    const intersects = raycaster.intersectObjects( this.mesh.children );
    return intersects[0];
  }

  static scaleY ( mesh, scaleY ) {
    mesh.traverse( function( obj ) {
      if ( obj.userData.system && obj.userData.isInteractable ) {
        obj.position.setY( obj.userData.position.y * scaleY );
      }
    });
  }
}

export default Interactables;
