/**
* @author LiannaEeftinck / https://github.com/Leeft
*/

class MapSymbol {
  get SIZE () {
    return 24;
  }

  get SPACING () {
    return 2;
  }

  static getTag ( icon ) {
    var $icon = $( `<i title="${ icon.description }" class="fa fa-fw ${ icon.faClass }"></i>` );
    $icon.css( 'color', icon.color );
    return $icon;
  }
};

export default new MapSymbol();
