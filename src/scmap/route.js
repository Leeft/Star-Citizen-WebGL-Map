/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

import System from './system';
import { allSystems } from './systems';
import Dijkstra from './dijkstra';
import UI from './ui';
import settings from './settings';

class Route {
  constructor ( start, waypoints ) {
    this.start = ( start instanceof System ) ? start : null;
    this.waypoints = [];

    this._graphs = [];
    this._routeObject = undefined;

    this._error = undefined;

    if ( waypoints instanceof System ) {
      this.waypoints = [ waypoints ];
    } else if ( Array.isArray( waypoints ) ) {
      for ( let i = 0, waypointsLength = waypoints.length; i < waypointsLength; i += 1 ) {
        if ( waypoints[i] instanceof System ) {
          this.waypoints.push( waypoints[ i ] );
        }
      }
    }

    this.__syncGraphs();
  }

  // Find the first matching graph or pair of graphs for the given
  // waypoint. Returns two graphs if the waypoint lies on the end
  // of one and the start of another
  __findGraphs ( waypoint ) {
    let graphs = [];
    let seen = {};

    for ( let i = 0, graphsLength = this._graphs.length; i < graphsLength; i += 1 )
    {
      let route = [];
      try {
        route = this._graphs[i].routeArray();
      } catch ( e ) {
        console.error( `Error getting route array: ${ e.message }` );
      }

      if ( graphs.length ) {
        if ( route[0].system.id === waypoint.id ) {
          graphs.push( this._graphs[i] );
          return graphs;
        }
      }

      for ( let j = 0, routeLength = route.length; j < routeLength; j += 1 ) {
        if ( route[j].system === waypoint && !(seen[ route[j].system.id ]) ) {
          seen[ route[j].system.id ] = true;
          graphs.push( this._graphs[i] );
        }
      }
    }

    return graphs;
  }

  splitAt( waypoint ) {
    let graphs = this.__findGraphs( waypoint );
    if ( graphs.length > 1 ) {
      console.error( `Can't split at '${ waypoint.name }', graphs are already split` );
      return false;
    }
    if ( graphs.length !== 1 ) {
      console.error( `Couldn't find graph for waypoint '${ waypoint.name }'` );
      return false;
    }
    let graph = graphs[0];
    let routeArray = graph.routeArray();
    let oldEnd = graph.lastNode().system;
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
    let result = [];
    if ( this.start instanceof System ) {
      result.push( this.start.toString() );
    }
    $.each( this.waypoints, function( index, value ) {
      if ( value instanceof System ) {
        result.push( value );
      }
    });
    return result.join( ' > ' );
  }

  removeWaypoint ( waypoint ) {
    let graphs = this.__findGraphs( waypoint );
    if ( graphs.length !== 2 ) {
      console.error( `Can't remove waypoint '${ waypoint.name }', it is not a waypoint` );
      return false;
    }
    let graphOne = graphs[0];
    let graphTwo = graphs[1];
    graphOne.end = graphTwo.start;
    // And now delete graphTwo
    for ( let i = 0, graphsLength = this._graphs.length; i < graphsLength; i += 1 )
    {
      if ( this._graphs[i] === graphTwo ) {
        console.log( `Matched ${ graphTwo } starting at index ${ i }` );
        console.log( this._graphs );
        // remove the graph
        this._graphs.splice( i, 1 );
        console.log( this._graphs );
        for ( let j = 0; j < this.waypoints.length; j += 1 ) {
          if ( this.waypoints[j] === waypoint ) {
            console.log( `Matched ${ waypoint } at index ${ j }` );
            console.log( this.waypoints );
            this.waypoints.splice( j, 1 );
            console.log( this.waypoints );
            break;
          }
        }
        this.__syncGraphs();
        this.storeToSession();
        return true;
      }
    }
  }

  moveWaypoint( waypoint, destination ) {
    let index;

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
    index = this.waypoints.indexOf( waypoint );
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
    let args = Array.prototype.slice.call( arguments );
    let i;
    this.start = args.shift();
    this.start = ( this.start instanceof System ) ? this.start : null;
    this.waypoints = [];
    if ( this.start ) {
      for ( i = 0; i < args.length; i += 1 ) {
        if ( args[i] instanceof System ) {
          this.waypoints.push( args[i] );
        }
      }

      for ( i = 0; i < this.waypoints.length; i += 1 ) {
        this.waypoints[i] = ( this.waypoints[i] instanceof System ) ? this.waypoints[i] : null;
      }
    }
    this.storeToSession();
  }

  // Updates the graphs to match the current waypoints, and recalculates
  // the graphs where needed
  __syncGraphs () {
    let newGraphs = [];
    this._graphs = newGraphs;
    this._error = undefined;

    try {

      for ( let i = 0, waypointsLength = this.waypoints.length; i < waypointsLength; i += 1 )
      {
        let start = ( i === 0 ) ? this.start : this.waypoints[i - 1];
        let end   = this.waypoints[i];
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

        let routeSegment = graph.routeArray();

        if ( routeSegment.length <= 1 ) {
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
    let route = this.currentRoute();
    return route.length > 1;
  }

  currentRoute () {
    let route = [];
    for ( let i = 0, graphsLength = this._graphs.length; i < graphsLength; i += 1 ) {
      if ( this.waypoints[i] instanceof System ) {
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
    // TODO: Combine with indexOfCurrentRoute code
    if ( ! system instanceof System ) {
      return 0;
    }

    let currentStep = 0;
    let currentRoute = this.currentRoute();

    if ( currentRoute.length ) {
      for ( let i = 0, routeLength = currentRoute.length; i < routeLength; i++ ) {
        if ( currentRoute[i].system === system ) {
          currentStep = i;
          break;
        }
      }
    }

    if ( currentStep ) {
      return( currentStep / currentRoute.length );
    }

    return 0;
  }

  indexOfCurrentRoute ( system ) {
    if ( ! system instanceof System ) {
      return;
    }

    let currentStep;
    let currentRoute = this.currentRoute();

    if ( currentRoute.length ) {
      for ( let i = 0, routeLength = currentRoute.length; i < routeLength; i++ ) {
        if ( currentRoute[i].system === system ) {
          currentStep = i;
          break;
        }
      }
    }

    return currentStep;
  }

  rebuildCurrentRoute () {
    this.removeFromScene();
    for ( let i = 0, graphsLength = this._graphs.length; i < graphsLength; i++ ) {
      if ( this._graphs[i].rebuildGraph() ) {
        let destination = this._graphs[i].destination();
        if ( destination ) {
          console.log( `Have existing destination, updating route` );
          this.update( destination );
        }
      }
    }
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
    let system, i, waypoint;
    let templateData = {
      settings: {
        avoidHostile: settings.route.avoidHostile,
        avoidUnknownJumppoints: settings.route.avoidUnknownJumppoints,
        avoidOffLimits: settings.route.avoidOffLimits
      },
    };
    let entireRoute = this.currentRoute();

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

      for ( i = 0, entireRouteLength = entireRoute.length; i < entireRouteLength; i += 1 )
      {
        system = entireRoute[i].system;

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
    let _this = this, i, route, material, system, $entry;
    let before = this.toString();
    let entireRouteLength;
    let waypointsLength;

    this.__syncGraphs();

    this.removeFromScene();

    let entireRoute = this.currentRoute();

    if ( entireRoute.length )
    {
      // Exception can be thrown and caught to signal the route isn't possible
      if ( this.lastError() ) {
        return;
      }

      destination = this.waypoints[ this.waypoints.length - 1 ];

      // Build all the parts of the route together in a single geometry group
      this._routeObject = new THREE.Object3D();
      this._routeObject.matrixAutoUpdate = false;

      let startColour = new THREE.Color( 0xEEEE66 );
      let endColour   = new THREE.Color( 0xFF3322 );

      for ( i = 0, entireRouteLength = entireRoute.length - 1; i < entireRouteLength; i += 1 ) {
        let from = entireRoute[ i ].system;
        let to = entireRoute[ i + 1 ].system;
        let geometry = this.createRouteGeometry( from, to );
        if ( geometry ) {
          material = new THREE.MeshBasicMaterial({ color: startColour.clone().lerp( endColour, this.alphaOfSystem( to ) ) });
          let mesh = new THREE.Mesh( geometry, material );
          mesh.position.copy( from.sceneObject.position );
          mesh.lookAt( to.sceneObject.position );
          this._routeObject.add( mesh );
        }
      }

      if ( typeof this.start.sceneObject === 'object' )
      {
        let waypointObject = window.map.createSelectorObject( startColour );
        waypointObject.scale.set( 3.8, 3.8, 3.8 );
        waypointObject.position.copy( this.start.sceneObject.position );
        waypointObject.visible = true;
        this._routeObject.add( waypointObject );

        for ( i = 0, waypointsLength = this.waypoints.length; i < waypointsLength; i += 1 ) {
          if ( typeof this.waypoints[i].sceneObject === 'object' ) {
            waypointObject = window.map.createSelectorObject( startColour.clone().lerp( endColour, this.alphaOfSystem( this.waypoints[i] ) ) );
            waypointObject.scale.set( 3.8, 3.8, 3.8 );
            waypointObject.position.copy( this.waypoints[i].sceneObject.position );
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
          waypoints: $.map( this.waypoints, function ( waypoint, i ) {
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
      let data = JSON.parse( window.sessionStorage.currentRoute );
      this.start = System.getById( data.start );
      this.waypoints = $.map( data.waypoints, function ( waypoint, i ) {
        return System.getById( waypoint );
      });
      //this.update();
    }
  }

  createRouteGeometry ( source, destination ) {
    if ( !source.sceneObject ) { return; }
    if ( !destination.sceneObject ) { return; }
    let distance = source.sceneObject.position.distanceTo( destination.sceneObject.position );
    let geometry = new THREE.CylinderGeometry( 0.6, 0.6, distance, 8, 1, true );
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
