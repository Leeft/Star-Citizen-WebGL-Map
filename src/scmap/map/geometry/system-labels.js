/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import MapGeometry from '../map-geometry';
import settings from '../../settings';
import config from '../../config';

import Label from 'leeft/three-sprite-texture-atlas-manager/src/label';
import THREE from 'three';

const LABEL_SCALE = 5;

class SystemLabels extends MapGeometry {
  get mesh () {
    if ( this._mesh ) {
      return this._mesh;
    }

    const group = new THREE.Group();
    this._mesh = group;

    try {
      this.allSystems.forEach( system => {
        system.label = new Label({
          textureManager: this.renderer.textureManager,
          text:           system.name,
          addTo:          group,
          fillStyle:      system.factionStyle(),
          bold:           true,
        });

        if ( config.quality === 'low' ) {
          system.label.scale = 0.75;
          system.label.opacity = 1.0;
        }

        if ( system.isUnknown() ) {
          system.label.scale *= 0.5;
        }

        system.label.createSprite();

        system.label.sprite.position.copy( system.position );
        system.label.sprite.userData.system = system;
        system.label.sprite.userData.isLabel = true;
        system.label.sprite.userData.position = system.position.clone();

        //systemLabel ( drawSymbols, sceneObject ) {

        //  //if ( drawSymbols ) {
        //  //  label.drawSymbols();
        //  //}

        //  //label.positionSprite( this.renderer.cameraRotationMatrix() );
        //  //label.scaleSprite();

        //  return label;
        //}

        group.add( system.label.sprite );
      });
    } catch( e ) {
      console.error( `Problem creating glow sprites:`, e );
      throw e;
    }

    // Set the 2d/3d tween callback
    group.userData.scaleY = SystemLabels.scaleY;

    group.userData.isLabelGroup = true;
    group.dynamic = false;
    group.updateMatrix();

    this.refreshVisibility();
    this.refreshScale();

    // Compensate the position of the labels so it's shown straight above
    // the star system irrespective of camera rotation.
    this.matchRotation( this.renderer.cameraRotationMatrix() );

    SystemLabels.scaleY( group, this.initialScale );

    return group;
  }

  matchRotation ( rotationMatrix ) {
    const vector = new THREE.Vector3( 0, - settings.labelOffset, -0.1 );
    this._mesh.position.copy( vector.applyMatrix4( rotationMatrix ) );
  }

  refreshVisibility () {
    this._mesh.traverse( function( obj ) {
      if ( obj.userData.isLabel && obj.userData.system ) {
        obj.visible = settings.labels;
      }
    });
  }

  refreshScale () {
    this._mesh.traverse( function( obj ) {
      if ( obj.userData.system  && obj.userData.isLabel ) {
        const system = obj.userData.system;
        const labelScale = settings.labelScale * LABEL_SCALE * ( ( system.isUnknown() ) ? 0.5 : 1 );
        obj.scale.set( labelScale * ( system.label.node.width / system.label.node.height ), labelScale, 1 );
      }
    });
  }

  static scaleY ( mesh, scaleY ) {
    mesh.traverse( function( obj ) {
      if ( obj.userData.system  && obj.userData.isLabel ) {
        obj.position.setY( obj.userData.position.y * scaleY );
      }
    });
  }
}

export default SystemLabels;
