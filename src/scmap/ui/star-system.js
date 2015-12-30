/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import UI from '../ui';
import MapSymbol from './symbol';
import { map } from '../../starcitizen-webgl-map';

import $ from 'jquery';
import markdown from 'markdown';

function createInfoLink ( system, noSymbols, noTarget ) {
  let $line = $( '<a></a>' );

  if ( typeof system.faction !== 'undefined' && typeof system.faction !== 'undefined' ) {
    $line.css( 'color', system.faction.color.getStyle() );
  }

  $line.addClass('system-link');
  $line.attr( 'data-goto', 'system' );
  $line.attr( 'data-system', system.id );
  $line.attr( 'href', '#system=' + encodeURIComponent( system.name ) );
  $line.attr( 'title', 'Show information on ' + system.name );
  if ( noTarget ) {
    $line.text( system.name );
  } else {
    $line.html( '<i class="fa fa-crosshairs"></i>&nbsp;' + system.name );
  }

  if ( !noSymbols )
  {
    let symbols = system.getIcons();
    if ( symbols.length )
    {
      let $span = $('<span class="icons"></span>');
      for ( let i = 0; i < symbols.length; i++ ) {
        $span.append( MapSymbol.getTag( symbols[i] ) );
      }
      $line.append( $span );
    }
  }

  return $line;
}

function displayInfo ( system, doNotSwitch ) {
  let previous = null;
  let next = null;
  let currentStep = map.route().indexOfCurrentRoute( system );

  if ( typeof currentStep === 'number' )
  {
    let currentRoute = map.route().currentRoute();

    if ( currentStep > 0 ) {
      previous = currentRoute[ currentStep - 1 ].system;
      if ( ( currentStep > 1 ) && ( previous === currentRoute[ currentStep ].system ) ) {
        previous = currentRoute[ currentStep - 2 ].system;
      }
      previous = previous;
    }

    if ( currentStep < ( currentRoute.length - 1 ) ) {
      next = currentRoute[ currentStep + 1 ].system;
      if ( ( currentStep < ( currentRoute.length - 2 ) ) && ( next === currentRoute[ currentStep ].system ) ) {
        next = currentRoute[ currentStep + 2 ].system;
      }
    }
  }

  let $element = $( UI.Tab('system').id )
    .empty()
    .append( UI.Templates.systemInfo({
      previous: previous,
      system: system,
      next: next
    }));

  // Set user's notes and bookmarks
  $element.find('.user-system-ishangar').prop( 'checked', system.hasHangar() ).attr( 'data-system', system.id );
  $element.find('.user-system-bookmarked').prop( 'checked', system.isBookmarked() ).attr( 'data-system', system.id );
  $element.find('.user-system-avoid').prop( 'checked', system.isToBeAvoided() ).attr( 'data-system', system.id );

  if ( system.hasComments() ) {
    $element.find('.user-system-comments').empty().val( system.getComments() );
    $element.find('.user-system-comments-md').html( $( markdown.markdown.toHTML( system.getComments() ) ) );
  } else {
    $element.find('.user-system-comments').empty().val('');
    $element.find('.user-system-comments-md').empty();
  }

  if ( !doNotSwitch ) {
    UI.toTab( 'system' );
  }
}

export { displayInfo, createInfoLink };
