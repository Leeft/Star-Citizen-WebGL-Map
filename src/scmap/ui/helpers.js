/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

import SCMAP from '../../scmap';
import StarSystem from '../star-system';
import Faction from '../faction';
import UI from '../ui';
import { hasSessionStorage } from '../../helpers/functions';
import { Color } from '../../scmap/three';
import { createInfoLink } from '../ui/star-system';

import Handlebars from 'handlebars/handlebars.runtime';
import markdown from 'markdown';
import $ from 'jquery';

let sectionLevel = 1;
let tabCounter = 0;

let storage = {};

Handlebars.registerHelper( 'distanceLY', function( distance ) {
  if ( ! distance ) {
    return new Handlebars.SafeString('');
  }

  return new Handlebars.SafeString( `${ distance.toFixed(1) } ly` );
});

Handlebars.registerHelper( 'uiSection', function( title, shouldOpen, options ) {
  let opened = ( shouldOpen ) ? true : false;
  let icon = 'fa-caret-right';
  let hidden = 'style="display: none;"';
  let attrs = [], str;
  let oldLevel = sectionLevel++;
  let safeTitle = 'panel' + title.replace( /[^\w]/g, '' );

  if ( hasSessionStorage() ) {
    storage = window.sessionStorage;
  }

  if ( typeof storage[ safeTitle ] === 'string' ) {
    opened = ( storage[ safeTitle ] === '1' ) ? true : false;
  }

  if ( opened ) {
    icon = 'fa-caret-down';
    hidden = '';
  }

  for ( let prop in options.hash ) {
    attrs.push( prop + '="' + options.hash[prop] + '"' );
  }

  str = '<h' + oldLevel + '><a href="#" data-title="' + UI.htmlEscape( safeTitle ) +
    '" data-toggle-next="next" ' + attrs.join(' ') + '><i class="fa fa-fw fa-lg ' + icon + '">' +
    '</i>' + title + '</a></h' + oldLevel + `>\n` + '         <div class="ui-section" ' + hidden + '>';

  if ( 'fn' in options ) {
    str += options.fn( this );
  }

  str += '</div>';
  sectionLevel -= 1;
  return new Handlebars.SafeString( str );
});

Handlebars.registerHelper( 'tabHeader', function( title ) {
  return new Handlebars.SafeString( '<h1 class="padleft">' + title + '</h1>' );
});

/* title: shown to user, name: internal name, icon: font awesome icon class */
Handlebars.registerHelper( 'jQueryUiTab', function( title, name, icon, options ) {
  let hidden = 'style="display: none;"';
  let attrs = [], str = '';
  let $menuItem;
  let id = 'sc-map-ui-tab-' + UI.makeSafeForCSS( name );

  //for ( let prop in options.hash ) {
  //   attrs.push( prop + '="' + options.hash[prop] + '"' );
  //}

  $menuItem = $(
    '<li>' +
    '<a title="' + UI.htmlEscape( title ) + '" data-tab="' + UI.htmlEscape( name ) + '" href="#' + UI.htmlEscape( id ) + '">' +
    '<i class="fa fa-fw fa-2x ' + UI.htmlEscape( icon ) + '"></i>' +
    '</a>' +
    '</li>'
  );

  UI.menuBar.push( $menuItem );

  str = '<div id="' + id + '" class="sc-map-ui-tab" ' + ((tabCounter !== 0) ? 'style="display: none"' : '') + '>';
  if ( 'fn' in options ) {
    str += options.fn( this );
  }
  str += '</div>';

  UI.Tabs.push({ id: '#' + id, name: name, index: tabCounter++ });

  return new Handlebars.SafeString( str );
});

Handlebars.registerHelper( 'bigButton', function( id, cssClass, title ) {
  return new Handlebars.SafeString(
    `<button class="big-button" id="${ id }"><i class="fa ${ cssClass } fa-fw fa-lg"></i>${ title }</button><br>`
  );
});

Handlebars.registerHelper( 'commoditiesList', function( commodities ) {
  if ( !commodities.length ) {
    return new Handlebars.SafeString( '&mdash;' );
  }

  return new Handlebars.SafeString(
    $.map( commodities, function( elem, i ) {
      const commodity = SCMAP.getCommodityById( elem );
      return ( commodity ) ? commodity.name : '???';
    }).join( ', ' )
  );
});

Handlebars.registerHelper( 'markdown', function( markdownText ) {
  return new Handlebars.SafeString( markdown.markdown.toHTML( markdownText || '' ) );
});

Handlebars.registerHelper( 'colourGetStyle', function( colour ) {
  return new Handlebars.SafeString( colour.getStyle() );
});

Handlebars.registerHelper( 'systemLink', function( system, options ) {
  let noIcons = false, noTarget = false;
  if ( 'noIcons' in options.hash ) {
    noIcons = ( options.hash.noIcons ) ? true : false;
  }
  if ( 'noTarget' in options.hash ) {
    noTarget = ( options.hash.noTarget ) ? true : false;
  }
  if ( ! ( system instanceof StarSystem ) ) {
    return '';
  }
  return new Handlebars.SafeString( createInfoLink( system, noIcons, noTarget ).outerHtml() );
});

Handlebars.registerHelper( 'routeNavLinks', function( prev, next, options ) {
  let str = '', $elem;

  if ( !prev && !next ) {
    return new Handlebars.SafeString( '' );
  }

  if ( prev instanceof StarSystem ) {
    $elem = $( '<a></a>' );
    if ( ( prev.faction instanceof Faction ) && ( prev.faction.color instanceof Color ) ) {
      $elem.css( 'color', prev.faction.color.getStyle() );
    }
    $elem.addClass( 'system-link' );
    $elem.attr( 'data-goto', 'system' );
    $elem.attr( 'data-system', prev.id );
    $elem.attr( 'href', '#system=' + encodeURIComponent( prev.name ) );
    $elem.attr( 'title', 'Previous jump, coming from ' + prev.name + ' (' + prev.faction.name + ' territory)' );
    $elem.empty().append( '<i class="left fa fa-fw fa-arrow-left"></i>' );
    str += $elem.outerHtml();
  } else {
    str += '<i class="left fa fa-fw"></i>';
  }

  if ( next instanceof StarSystem ) {
    $elem = $( '<a></a>' );
    if ( ( next.faction instanceof Faction ) && ( next.faction.color instanceof Color ) ) {
      $elem.css( 'color', next.faction.color.getStyle() );
    }
    $elem.addClass( 'system-link' );
    $elem.attr( 'data-goto', 'system' );
    $elem.attr( 'data-system', next.id );
    $elem.attr( 'href', '#system=' + encodeURIComponent( next.name ) );
    $elem.attr( 'title', 'Next jump, leading to ' + next.name + ' (' + next.faction.name + ' territory)' );
    $elem.empty().append( '<i class="right fa fa-fw fa-arrow-right"></i>' );
    str += $elem.outerHtml();
  } else {
    str += '<i class="right fa fa-fw"></i>';
  }

  return new Handlebars.SafeString( str );
});

Handlebars.registerHelper( 'checkboxButton', function( id, title, options ) {
  let attrs = [];
  for ( let prop in options.hash ) {
    if ( prop === 'icon' ) {
      title = title + ' <i class="fa fa-lg fa-fw ' + options.hash[ prop ] + '"></i>';
    } else {
      attrs.push( prop + '="' + UI.htmlEscape( options.hash[ prop ] ) + '"' );
    }
  }
  return new Handlebars.SafeString(
    '<span class="checkmark-button">' +
    '<input type="checkbox" id="' + id + '" ' + attrs.join(' ') + '>' +
    '<label for="' + id + '">' + title + '</label>' +
    '</span>'
  );
});

Handlebars.registerHelper( `debug`, function( optionalValue ) {
  console.log( `Current Context`, this );

  if (optionalValue) {
    console.log( `Value`, optionalValue );
  }
});

Handlebars.registerHelper( 'durationHMM', function( duration ) {
  if ( ! duration ) {
    return new Handlebars.SafeString('');
  }

  const sec_num = parseInt( duration, 10 );
  const hours   = Math.floor( sec_num / 3600 );

  let minutes = Math.floor( ( sec_num - ( hours * 3600 ) ) / 60 );

  if ( minutes < 10 ) {
    minutes = '0' + minutes;
  }

  return new Handlebars.SafeString( `${ hours }:${ minutes }` );
});

Handlebars.registerHelper( 'plusOne', function( number ) {
  return new Handlebars.SafeString( number + 1 );
});

Handlebars.registerHelper( 'minusOne', function( number ) {
  return new Handlebars.SafeString( number - 1 );
});

Handlebars.registerHelper( 'checked', function( isChecked ) {
  return new Handlebars.SafeString( isChecked ? 'checked' : '' );
});

Handlebars.registerHelper( 'checkboxOption', function( id, defaultChecked, title, description, options ) {
  let attrs = [];
  let checked = '';

  if ( defaultChecked ) {
    checked = 'checked';
  }

  for ( let prop in options.hash ) {
    if ( prop === 'icon' ) {
      title = `${ title } <i class="fa fa-lg fa-fw ${ options.hash[ prop ] }'"></i>`;
    } else {
      attrs.push( prop + '="' + UI.htmlEscape( options.hash[ prop ] ) + '"' );
    }
  }

  return new Handlebars.SafeString(
    '<span class="checkmark-option">' +
    '<input class="' + id + '" type="checkbox" id="' + id + '" ' + checked + '>' +
    '<label for="' + id + '">' + title +
    '<span class="small label-info">' + description + '</span>' +
    '</label>' +
    '</span>'
    );
});
