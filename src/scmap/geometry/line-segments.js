/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import THREE from 'three';

class LineSegments {
  constructor () {
    this._positions = [];
    this._colors = [];
    this._indices = [];
    this.index = 0;
  }

  addColoredLine ( v1, c1, v2, c2 ) {
    if ( this.index >= THREE.BufferGeometry.MaxIndex ) {
      throw new Error('Too many points');
    }

    this._positions.push( v1.x, v1.y, v1.z );
    this._colors.push( c1.r, c1.g, c1.b );

    this._positions.push( v2.x, v2.y, v2.z );
    this._colors.push( c2.r, c2.g, c2.b );

    this._indices.push( this.index, this.index + 1 );

    return ( this.index += 2 );
  }

  geometry () {
    this._geometry = new THREE.BufferGeometry();

    if ( ( THREE.BufferGeometry.MaxIndex > 65535 ) && ( this._indices.length > 65535 ) ) {
      this._geometry.setIndex( new THREE.BufferAttribute( new Uint32Array( this._indices ), 1 ) );
    } else {
      this._geometry.setIndex( new THREE.BufferAttribute( new Uint16Array( this._indices ), 1 ) );
    }

    if ( this._positions.length ) {
      this._geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( this._positions ), 3 ) );
    }

    if ( this._colors.length ) {
      this._geometry.addAttribute( 'color', new THREE.BufferAttribute( new Float32Array( this._colors ), 3 ) );
    }

    this._geometry.dynamic = false;
    this._geometry.computeBoundingBox();

    return this._geometry;
  }

  mesh () {
    const material = new THREE.LineBasicMaterial({ vertexColors: THREE.VertexColors });
    const mesh     = new THREE.LineSegments( this.geometry(), material );
    mesh.matrixAutoUpdate = false;
    return mesh;
  }
}

export default LineSegments;
