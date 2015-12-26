/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

import StarSystem from './star-system';
import { allSystems } from './systems';
import Dijkstra from './dijkstra';
import UI from './ui';
import settings from './settings';
import { hasSessionStorage } from './functions';
import { scene, map } from '../starcitizen-webgl-map';

import THREE from 'three';
import $ from 'jquery';

class Route {
  constructor ( start, waypoints ) {
    this.start = ( start instanceof StarSystem ) ? start : null;
    this.waypoints = [];
    this._graphs = [];
    this._routeObject = undefined;
    this._error = undefined;

    if ( waypoints instanceof StarSystem ) {
      waypoints = [ waypoints ];
    }

    if ( Array.isArray( waypoints ) ) {
      waypoints.forEach( waypoint => {
        if ( waypoint instanceof StarSystem ) {
          this.waypoints.push( waypoint );
        }
      });
    }

    this.__syncGraphs();
  }

  // Find the first matching graph or pair of graphs for the given
  // waypoint. Returns two graphs if the waypoint lies on the end
  // of one and the start of another
  __findGraphs ( system ) {
    let graphs = [];
    let seen = {};

    for ( let i = 0, graphsLength = this._graphs.length; i < graphsLength; i += 1 )
    {
      const graph = this._graphs[ i ];

      let routeArray = [];
      try {
        routeArray = graph.routeArray();
      } catch ( e ) {
        console.error( `Error getting route array: ${ e.message }` );
      }

      if ( graphs.length ) {
        if ( routeArray[0].system.id === system.id ) {
          graphs.push( graph );
          return graphs;
        }
      }

      routeArray.forEach( waypoint => {
        if ( waypoint.system === system && ! ( seen[ waypoint.system.id ] ) ) {
          seen[ waypoint.system.id ] = true;
          graphs.push( graph );
        }
      });
    }

    return graphs;
  }

  splitAt( waypoint ) {
    const graphs = this.__findGraphs( waypoint );

    if ( graphs.length > 1 ) {
      console.error( `Can't split at '${ waypoint.name }', graphs are already split` );
      return false;
    }

    if ( graphs.length !== 1 ) {
      console.error( `Couldn't find graph for waypoint '${ waypoint.name }'` );
      return false;
    }

    const graph = graphs[0];
    const oldEnd = graph.lastNode().system;

    graph.end = waypoint; // set end of graph to wp

    for ( let i = 0, graphsLength = this._graphs.length; i < graphsLength; i += 1 )
    {
      if ( this._graphs[i] === graph ) {
        // insert new graph at wp, starting at wp, ending at oldEnd
        this._graphs.splice( i + 1, 0, new Dijkstra( allSystems, waypoint, oldEnd ) );

        for ( let j = 0; j < this.waypoints.length; j += 1 ) {
          if ( this.waypoints[j] === oldEnd ) {
            this.waypoints.splice( j, 0, waypoint );
            break;
          }
        }

        this.__syncGraphs();
        this.storeToSession();
        return true;
      }
    }

    console.error( `Couldn't match graph to split` );
  }

  toString () {
    const result = [];

    if ( this.start instanceof StarSystem ) {
      result.push( this.start.toString() );
    }

    this.waypoints.forEach( system => {
      if ( system instanceof StarSystem ) {
        result.push( system );
      }
    });

    return result.join( ' > ' );
  }

  removeWaypoint ( toRemove ) {
    const graphs = this.__findGraphs( toRemove );

    if ( graphs.length !== 2 ) {
      console.error( `Can't remove waypoint '${ toRemove.name }', it is not a waypoint` );
      return false;
    }

    const [ graphOne, graphTwo ] = graphs;

    graphOne.end = graphTwo.start;

    // And now delete graphTwo
    this._graphs.forEach( ( graph, graphIndex ) => {
      if ( graph === graphTwo ) {
        console.log( `Removing`, graphTwo, `at index ${ graphIndex }` );
        // remove the graph
        this._graphs.splice( graphIndex, 1 );

        this.waypoints.forEach( ( waypoint, waypointIndex ) => {
          if ( toRemove === waypoint ) {
            console.log( `Removing`, waypoint, `at index ${ waypointIndex }` );
            // remove the waypoint
            this.waypoints.splice( waypointIndex, 1 );
          }
        });

        this.__syncGraphs();
        this.storeToSession();
        return true;
      }
    });
  }

  moveWaypoint( waypoint, destination ) {
    if ( waypoint === destination ) {
      return false;
    }

    if ( destination === this.start || this.waypoints.indexOf( destination ) >= 0 ) {
      return false;
    }

    // Easy case, moving start: update start and sync
    if ( waypoint === this.start ) {
      if ( this.waypoints.length !== 1 || destination !== this.waypoints[0] ) {
        this.start = destination;
        this.__syncGraphs();
        this.storeToSession();
        return true;
      } else {
        return false;
      }
    }

    // Slightly more difficult, moving any waypoint: update waypoint and sync
    let index = this.waypoints.indexOf( waypoint );
    if ( index > -1 ) {
      this.waypoints[ index ] = destination;
      this.__syncGraphs();
      this.storeToSession();
      return true;
    }

    // Advanced case: split graphs at waypoint, then update waypoint and sync
    if ( this.splitAt( waypoint ) ) {
      index = this.waypoints.indexOf( waypoint );
      if ( index > -1 ) {
        this.waypoints[ index ] = destination;
        this.__syncGraphs();
        this.storeToSession();
        return true;
      }
    }

    //console.error( `Couldn't find waypoint '${ waypoint.name }'` );
    return false;
  }

  setRoute () {
    const args = Array.prototype.slice.call( arguments );

    this.start = args.shift();
    this.start = ( this.start instanceof StarSystem ) ? this.start : null;
    this.waypoints = [];

    if ( this.start ) {
      args.forEach( system => {
        if ( system instanceof StarSystem ) {
          this.waypoints.push( system );
        }
      });

      this.waypoints = this.waypoints.filter( system => {
        return ( system instanceof StarSystem );
      });
    }

    this.storeToSession();
  }

  // Updates the graphs to match the current waypoints, and recalculates
  // the graphs where needed
  __syncGraphs () {
    const newGraphs = [];

    this._graphs = newGraphs;
    this._error = undefined;

    try {

      for ( let i = 0, waypointsLength = this.waypoints.length; i < waypointsLength; i += 1 )
      {
        const start = ( i === 0 ) ? this.start : this.waypoints[i - 1];
        const end   = this.waypoints[i];
        let graph;

        if ( this._graphs[i] instanceof Dijkstra ) {
          graph = this._graphs[i];
          this._graphs[i].start = start;
          this._graphs[i].end   = end;
        } else {
          graph = new Dijkstra( allSystems, start, end );
        }

        graph.buildGraph( 'time', true );
        newGraphs.push( graph );

        if ( graph.routeArray().length <= 1 ) {
          console.warn( `No route from ${ start.name } to ${ end.name } possible` );
          throw new RouteSegmentFailed( `No route from ${ start.name } to ${ end.name } available` );
          // TODO: could retry with fewer restrictions to indicate the user can change things
          // to make the route possible, and indicate so in the error message
        }

      }

      this._graphs = newGraphs;
      if ( newGraphs.length > 0 ) {
        console.log( `Synced and built ${ newGraphs.length } graphs` );
      }
    }
    catch ( e )
    {
      this._error = e;
      if ( !( e instanceof RouteSegmentFailed ) ) {
        console.error( `Error building route: ${ e.message }` );
      }
    }
  }

  lastError () {
    return this._error;
  }

  isSet () {
    return this.currentRoute().length > 1;
  }

  currentRoute () {
    const route = [];

    for ( let i = 0, graphsLength = this._graphs.length; i < graphsLength; i += 1 ) {
      // TODO: Check whether this is correct or not, looks kaput
      if ( this.waypoints[i] instanceof StarSystem ) {
        this._graphs[i].rebuildGraph();
        let routePart = this._graphs[i].routeArray( this.waypoints[i] );
        for ( let j = 0; j < routePart.length; j += 1 ) {
          route.push( routePart[j] );
        }
      }
    }

    return route;
  }

  // Returns a float 0.0 to 1.0 to indicate where we are in
  // the route; we can use this to establish the approximate
  // colour of the given point
  alphaOfSystem ( system ) {
    const currentStep = this.indexOfCurrentRoute( system );

    if ( currentStep ) {
      return ( currentStep / this.currentRoute().length );
    }

    return 0;
  }

  indexOfCurrentRoute ( system ) {
    if ( ! system instanceof StarSystem ) {
      return;
    }

    let currentStep = 0;

    this.currentRoute().forEach( ( waypoint, index ) => {
      if ( waypoint.system === system ) {
        currentStep = index;
      }
    });

    return currentStep;
  }

  rebuildCurrentRoute () {
    this.removeFromScene();
    this._graphs.forEach( graph => {
      if ( graph.rebuildGraph() ) {
        let destination = graph.destination();
        if ( destination ) {
          console.log( `Have existing destination, updating route` );
          this.update( destination );
        }
      }
    });
  }

  destroy () {
    this.start = null;
    this.waypoints = [];
    this.update();
  }

  removeFromScene () {
    if ( this._routeObject ) {
      scene.remove( this._routeObject );
    }
  }

  buildTemplateData () {
    let waypoint;

    const templateData = {
      settings: {
        avoidHostile: settings.route.avoidHostile,
        avoidUnknownJumppoints: settings.route.avoidUnknownJumppoints,
        avoidOffLimits: settings.route.avoidOffLimits
      },
    };

    const entireRoute = this.currentRoute();

    if ( !entireRoute.length )
    {
      if ( this.start && this.waypoints.length )
      {
        templateData.status = {
          text: 'No route available with your current settings.',
          class: 'impossible'
        };
      }
      else
      {
        templateData.status = {
          text: 'No route set',
          class: 'no-route'
        };
      }
    }
    else
    {
      templateData.from          = entireRoute[0].system;
      templateData.to            = entireRoute[ entireRoute.length - 1 ].system;
      templateData.waypoints     = [];
      templateData.totalDuration = 0;

      for ( let i = 0, entireRouteLength = entireRoute.length; i < entireRouteLength; i += 1 )
      {
        const system = entireRoute[i].system;

        if ( ( i > 0 ) && ( system.id === entireRoute[ i - 1 ].system.id ) )
        {
          // Duplicate waypoint, which means we jumped between routes, so update the last waypoint instead
          waypoint = templateData.waypoints[ templateData.waypoints.length - 1 ];
          waypoint.iconClass = 'fa-times text-danger';
          waypoint.iconTitle = 'Remove waypoint';
          waypoint.rowClass  = 'waypoint';
          waypoint.action    = `<a href="#" class="remove-waypoint" data-system="${ system.id }">`;
          continue;
        }

        waypoint = {
          rowClass: '',
          index: templateData.waypoints.length + 1,
          system: system,
          iconClass: 'fa-long-arrow-down',
          iconTitle: 'Jump Point',
          duration: 30 * 60,
          action: ''
        };

        if ( i === 0 ) {

          waypoint.duration = 30 * 60 / 2; // TODO
          waypoint.rowClass = 'start';
          waypoint.iconClass = 'fa-flag';
          waypoint.iconTitle = 'Start';

        } else if ( i === ( entireRoute.length - 1 ) ) {

          waypoint.duration = 30 * 60 / 2; // TODO
          waypoint.rowClass = 'end';
          waypoint.iconClass = 'fa-flag-checkered';
          waypoint.iconTitle = 'Destination';

        }

        templateData.waypoints.push( waypoint );
        templateData.totalDuration += waypoint.duration;
      }
    }

    return templateData;
  }

  update () {
    const before = this.toString();

    this.__syncGraphs();
    this.removeFromScene();

    const entireRoute = this.currentRoute();

    if ( entireRoute.length )
    {
      // Exception can be thrown and caught to signal the route isn't possible
      if ( this.lastError() ) {
        return;
      }

      let destination = this.waypoints[ this.waypoints.length - 1 ];

      // Build all the parts of the route together in a single geometry group
      this._routeObject = new THREE.Object3D();
      this._routeObject.matrixAutoUpdate = false;

      const startColour = new THREE.Color( 0xEEEE66 );
      const endColour   = new THREE.Color( 0xFF3322 );

      for ( let i = 0, entireRouteLength = entireRoute.length - 1; i < entireRouteLength; i += 1 ) {
        const from = entireRoute[ i ].system;
        const to = entireRoute[ i + 1 ].system;
        const geometry = this.createRouteGeometry( from, to );
        if ( geometry ) {
          const material = new THREE.MeshBasicMaterial({ color: startColour.clone().lerp( endColour, this.alphaOfSystem( to ) ) });
          const mesh = new THREE.Mesh( geometry, material );
          mesh.position.copy( from.sceneObject.position );
          mesh.lookAt( to.sceneObject.position );
          this._routeObject.add( mesh );
        }
      }

      if ( typeof this.start.sceneObject === 'object' )
      {
        let waypointObject = map.createSelectorObject( startColour );
        waypointObject.scale.set( 3.8, 3.8, 3.8 );
        waypointObject.position.copy( this.start.sceneObject.position );
        waypointObject.visible = true;
        this._routeObject.add( waypointObject );

        for ( let i = 0, waypointsLength = this.waypoints.length; i < waypointsLength; i += 1 ) {
          const waypoint = this.waypoints[i];
          if ( typeof waypoint.sceneObject === 'object' ) {
            waypointObject = map.createSelectorObject( startColour.clone().lerp( endColour, this.alphaOfSystem( waypoint ) ) );
            waypointObject.scale.set( 3.8, 3.8, 3.8 );
            waypointObject.position.copy( waypoint.sceneObject.position );
            waypointObject.visible = true;
            this._routeObject.add( waypointObject );
          }
        }

        scene.add( this._routeObject );
      }
    }

    $( UI.Tab('route').id )
      .empty()
      .append( UI.Templates.routeList({
        route: this.buildTemplateData()
      }));

    if ( this.toString() !== before ) {
      ui.toTab( 'route' );
    }
  }

  storeToSession () {
    if ( hasSessionStorage ) {
      if ( this.start && ( this.waypoints.length ) ) {
        window.sessionStorage.currentRoute = JSON.stringify({
          start: this.start.id,
          waypoints: this.waypoints.map( waypoint => {
            return waypoint.id;
          })
        });
      } else {
        delete window.sessionStorage.currentRoute;
      }
    }
  }

  restoreFromSession () {
    if ( hasSessionStorage && ( 'currentRoute' in window.sessionStorage ) ) {
      const data = JSON.parse( window.sessionStorage.currentRoute );
      this.start = StarSystem.getById( data.start );
      this.waypoints = data.waypoints.map( waypoint => {
        return StarSystem.getById( waypoint );
      });
    }
  }

  createRouteGeometry ( source, destination ) {
    if ( !source.sceneObject ) { return; }
    if ( !destination.sceneObject ) { return; }
    const distance = source.sceneObject.position.distanceTo( destination.sceneObject.position );
    const geometry = new THREE.CylinderGeometry( 0.6, 0.6, distance, 8, 1, true );
    geometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, distance / 2, 0 ) );
    geometry.applyMatrix( new THREE.Matrix4().makeRotationX( THREE.Math.degToRad( 90 ) ) );
    return geometry;
  }
}

function RouteSegmentFailed( message ) {
  this.message = message;
  this.name = 'RouteSegmentFailed';
}
RouteSegmentFailed.prototype = new Error();
RouteSegmentFailed.prototype.constructor = RouteSegmentFailed;

export default Route;
