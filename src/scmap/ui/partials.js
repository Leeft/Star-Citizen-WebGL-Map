/**
  * @author Lianna Eeftinck / https://github.com/Leeft
  */

import Handlebars from 'handlebars/handlebars.runtime';

import partialAbout from '../../template/partial/about.hbs!';
import partialDebugInformation from '../../template/partial/debug-information.hbs!';
import partialIconLegend from '../../template/partial/icon-legend.hbs!';
import partialInstructions from '../../template/partial/instructions.hbs!';
import partialQuickFunctions from '../../template/partial/quick-functions.hbs!';
import partialRouteList from '../../template/partial/route-list.hbs!';
import partialSettings from '../../template/partial/settings.hbs!';
import partialShortcuts from '../../template/partial/shortcuts.hbs!';
import partialSystemInfo from '../../template/partial/system-info.hbs!';
import partialSystemsListing from '../../template/partial/systems-listing.hbs!';

Handlebars.registerPartial( 'templateAbout', partialAbout );
Handlebars.registerPartial( 'templateDebugInformation', partialDebugInformation );
Handlebars.registerPartial( 'templateMainIconLegend', partialIconLegend );
Handlebars.registerPartial( 'templateMainInstructions', partialInstructions );
Handlebars.registerPartial( 'templateMainQuickFunctions', partialQuickFunctions );
Handlebars.registerPartial( 'templateRouteList', partialRouteList );
Handlebars.registerPartial( 'templateSettings', partialSettings );
Handlebars.registerPartial( 'templateMainShortcuts', partialShortcuts );
Handlebars.registerPartial( 'templateSystemInfo', partialSystemInfo );
Handlebars.registerPartial( 'templateSystemsListing', partialSystemsListing );
