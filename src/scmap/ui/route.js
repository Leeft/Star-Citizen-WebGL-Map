/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

import UI from '../ui';
import settings from '../settings';

import jQuery from 'jquery';

let oldRoute = '';

class RouteUI {
  static update ( route ) {
    jQuery( UI.Tab('route').id )
      .empty()
      .append( UI.Templates.routeList({ route: RouteUI.templateData( route ) }));

    if ( oldRoute !== route.toString() ) {
      oldRoute = route.toString();
      UI.toTab( 'route' );
    }
  }

  static templateData ( route )
  {
    let waypoint;

    const entireRoute = route.currentRoute();

    const templateData = {
      settings: {
        avoidHostile: settings.route.avoidHostile,
        avoidUnknownJumppoints: settings.route.avoidUnknownJumppoints,
        avoidOffLimits: settings.route.avoidOffLimits
      },
    };

    if ( ! entireRoute.length )
    {
      if ( route.start && route.waypoints.length )
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
}

export default RouteUI;
