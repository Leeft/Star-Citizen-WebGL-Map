/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import settings from '../../settings';
import config from '../../config';
import StarSystem from '../../star-system';

import THREE from 'three';

const startColour = new THREE.Color( 0xEEEE66 );
const endColour   = new THREE.Color( 0xFF3322 );

class JumpRouteGeometry {
  constructor({
    map: map,
    route: route,
    initialScale: initialScale,
  }) {
    this.map = map;
    this.route = route;
    this.initialScale = initialScale;
  }

  get mesh () {
    if ( this._mesh ) {
      return this._mesh;
    }

    const group = new THREE.Object3D();
    group.name = 'Jump Route Geometry';
    group.matrixAutoUpdate = false;
    group.dynamic = false;
    this._mesh = group;

    try {

      const entireRoute = this.route.currentRoute();

      for ( let i = 0, entireRouteLength = entireRoute.length - 1; i < entireRouteLength; i += 1 )
      {
        const from = entireRoute[ i + 0 ].system.position;
        const to   = entireRoute[ i + 1 ].system.position;

        const geometry = JumpRouteGeometry.createSegmentGeometry( from, to );

        if ( geometry ) {
          const alpha    = this.route.alphaOfSystem( entireRoute[ i + 1 ].system );
          const material = new THREE.MeshBasicMaterial({ color: startColour.clone().lerp( endColour, alpha ) });
          const segment  = new THREE.Mesh( geometry, material );
          segment.position.copy( from );
          segment.lookAt( to );
          group.add( segment );
        }
      }

      if ( this.route.start instanceof StarSystem )
      {
        const startIndicator = this.map._createSelectorObject( startColour );
        startIndicator.scale.set( 3.8, 3.8, 3.8 );
        startIndicator.position.copy( this.route.start.position );
        startIndicator.visible = true;
        group.add( startIndicator );

        for ( let i = 0, waypointsLength = this.route.waypoints.length; i < waypointsLength; i += 1 )
        {
          const waypoint = this.route.waypoints[i];

          if ( waypoint instanceof StarSystem )
          {
            const waypointIndicator = this.map._createSelectorObject(
              startColour.clone().lerp( endColour, this.route.alphaOfSystem( waypoint ) )
            );
            waypointIndicator.scale.set( 3.8, 3.8, 3.8 );
            waypointIndicator.position.copy( waypoint.position );
            waypointIndicator.visible = true;
            group.add( waypointIndicator );
          }
        }
      }

    } catch( e ) {
      console.error( `Problem creating route geometry:`, e );
      throw e;
    }

    // Set the 2d/3d tween callback
    group.userData.scaleY = JumpRouteGeometry.scaleY;
    JumpRouteGeometry.scaleY( group, this.initialScale );

    return group;
  }

  static createSegmentGeometry ( source, destination ) {
    const distance = source.distanceTo( destination );
    const geometry = new THREE.CylinderGeometry( 0.6, 0.6, distance, 8, 1, true );
    geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, distance / 2, 0 ) );
    geometry.applyMatrix( new THREE.Matrix4().makeRotationX( THREE.Math.degToRad( 90 ) ) );
    return geometry;
  }

  static scaleY ( mesh, scaleY ) {
    mesh.scale.y = scaleY;
    mesh.updateMatrix();
  }
}

export default JumpRouteGeometry;
