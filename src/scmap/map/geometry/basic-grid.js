/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import { allSystems } from '../../systems';
import LineSegments from './line-segments';

import THREE from 'three';

const SEGMENT_SIZE = 10;
const BLACK = new THREE.Color( 0x000000 );

function furthestPOI ( vector ) {
  let furthest = 0, POI;

  allSystems.forEach( system => {
    const xd = vector.x - system.position.x;
    const zd = vector.z - system.position.z;
    const distance = Math.sqrt( xd * xd + zd * zd );
    if ( distance > furthest ) {
      furthest = distance;
      POI = system;
    }
  });

  return [ furthest, POI ];
}

function closestPOI ( vector ) {
  let closest = Infinity;
  let POI;

  allSystems.forEach( system => {
    const xd = vector.x - system.position.x;
    const zd = vector.z - system.position.z;
    const distance = Math.sqrt( xd * xd + zd * zd );
    if ( distance < closest ) {
      closest = distance;
      POI = system;
    }
  });

  return [ closest, POI ];
}

function closestFromArray ( vector, systems ) {
  let closest = Infinity;
  let POI;

  systems.forEach( system => {
    const xd = vector.x - system.position.x;
    const zd = vector.z - system.position.z;
    const distance = Math.sqrt( xd * xd + zd * zd );
    if ( distance < closest ) {
      closest = distance;
      POI = system;
    }
  });

  return [ closest, POI ];
}

// Get a quick list of systems nearby (within a square) to speed
// up further filtering a little bit.
function withinApproxDistance ( vector, distance ) {
  let systems = [];

  allSystems.forEach( system => {
    if ( system.position.x < ( vector.x - distance ) ) { return; }
    if ( system.position.x > ( vector.x + distance ) ) { return; }
    if ( system.position.z < ( vector.z - distance ) ) { return; }
    if ( system.position.z > ( vector.z + distance ) ) { return; }
    systems.push( system );
  });

  return systems;
}

function colorForVector ( vector, systems ) {
  let color = BLACK;
  const [ distance, system ] = closestFromArray( vector, systems );

  if ( system && distance <= 4.5 * SEGMENT_SIZE ) {
    color = system.faction.planeColor.clone();

    if ( distance >= 4.0 * SEGMENT_SIZE ) {
      color.multiplyScalar( 0.5 );
    } else if ( distance >= 3.0 * SEGMENT_SIZE ) {
      color.multiplyScalar( 0.8 );
    }
  }

  return color;
}

function buildReferenceGrid () {
  const startTime = new Date().getTime();
  const geo = new THREE.BufferGeometry();
  const uniqueColours = {};
  const grid = [];

  let alongX = [];
  let minX = 0, minZ = 0, maxX = 0, maxZ = 0;

  // First we compute rough outer bounds based on all the systems on the map
  // (plus a bit extra because we want to fade to black as well)
  allSystems.forEach( system => {
    if ( system.position.x < minX ) { minX = system.position.x - (  6 * 10 ); }
    if ( system.position.x > maxX ) { maxX = system.position.x + (  8 * 10 ); }
    if ( system.position.z < minZ ) { minZ = system.position.z - (  6 * 10 ); }
    if ( system.position.z > maxZ ) { maxZ = system.position.z + ( 10 * 10 ); }
  });

  // Now round those numbers to a multiple of SEGMENT_SIZE
  minX = Math.floor( minX / SEGMENT_SIZE ) * SEGMENT_SIZE;
  minZ = Math.floor( minZ / SEGMENT_SIZE ) * SEGMENT_SIZE;
  maxX = Math.floor( maxX / SEGMENT_SIZE ) * SEGMENT_SIZE;
  maxZ = Math.floor( maxZ / SEGMENT_SIZE ) * SEGMENT_SIZE;

  // With the boundaries established, go through each coordinate
  // on the map, and set the colour for each gridpoint on the
  // map with the nearest system's faction being used for that
  // colour. We also take note of each X coordinate visited.
  // There is a bit of room for optimisation left here; the
  // systems could be sorted by a X or Z coordinate, sort of like
  // in an octree, and could possibly be found quicker that way.
  for ( let iz = minZ; iz <= maxZ; iz += SEGMENT_SIZE ) {

    grid[ iz ] = [];

    for ( let ix = minX; ix <= maxX; ix += SEGMENT_SIZE ) {

      alongX[ ix ] = true;

      const vector = new THREE.Vector3( ix, 0, iz );
      const systems = withinApproxDistance( vector, 6.5 * SEGMENT_SIZE );
      const color = colorForVector( vector, systems );

      if ( color !== BLACK )
      {
        grid[ iz ][ ix ] = color.getHexString();
        if ( uniqueColours[ grid[iz][ix] ] === undefined ) {
          uniqueColours[ grid[iz][ix] ] = color;
        }
      }
      else
      {
        grid[ iz ][ ix ] = null;
        uniqueColours[ null ] = BLACK;
      }

    }

  }

  // Now for both X and Z we build a sorted list of each of
  // those coordinates seen, allowing for quick iteration.
  let alongX2 = []; for ( let j in alongX ) { alongX2.push( j ); }
  alongX = alongX2.sort( function ( a, b ) { return a - b; } );

  let alongZ = []; for ( let j in grid ) { alongZ.push( j ); }
  alongZ.sort( function ( a, b ) { return a - b; } );

  const lines = new LineSegments();

  // Now we got most data worked out, and we can start drawing
  // the horizontal lines. We draw a line from start vertex to
  // end vertex for each section where the colour doesn't
  // change, which gives us the fewest number of lines drawn.
  for ( let i = 1; i < alongZ.length; i += 1 ) {
    const z = alongZ[i];
    const vertices = [];
    const vertexColours = [];

    for ( let j = 1; j < alongX.length; j += 1 ) {
      const x = alongX[ j ];
      const left = Math.floor( Number( x ) - SEGMENT_SIZE );
      const right = Math.floor( Number( x ) + SEGMENT_SIZE );

      const vertexColor = grid[ z ][ x ];

      if ( (vertexColor !== grid[z][left]  && grid[z][left] ) ||
          (vertexColor !== grid[z][right] && grid[z][right])    )
      {
        vertices.push( new THREE.Vector3( x, 0, z ) );
        vertexColours.push( uniqueColours[ vertexColor ] );
      }
    }

    for ( let k = 0; k < vertices.length - 1; k += 1 ) {
      lines.addColoredLine( vertices[ k ], vertexColours[ k ], vertices[ k + 1 ], vertexColours[ k + 1 ] );
    }
  }

  // And do the same for the vertical lines in a separate pass
  for ( let i = 1; i < alongX.length; i += 1 ) {
    const x = alongX[i];
    const vertices = [];
    const vertexColours = [];

    for ( let j = 1; j < alongZ.length; j += 1 ) {
      const z = alongZ[j];
      const above = Math.floor( Number( z ) - SEGMENT_SIZE );
      const below = Math.floor( Number( z ) + SEGMENT_SIZE );

      const vertexColor = grid[ z ][ x ];

      if ( ( grid[above] && grid[above][x] && vertexColor !== grid[above][x] ) ||
          ( grid[below] && grid[below][x] && vertexColor !== grid[below][x] )    )
      {
        vertices.push( new THREE.Vector3( x, 0, z ) );
        vertexColours.push( uniqueColours[ vertexColor ] );
      }
    }

    for ( let k = 0; k < vertices.length - 1; k += 1 ) {
      lines.addColoredLine( vertices[ k ], vertexColours[ k ], vertices[ k + 1 ], vertexColours[ k + 1 ] );
    }
  }

  const mesh = lines.mesh();

  console.log( `Building the grid reference plane took ${ (new Date).getTime() - startTime } msec` );

  return mesh;
}

export { buildReferenceGrid };
