/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import IconLabelSymbol from 'leeft/three-sprite-texture-atlas-manager/src/icon-label-symbol';

// TODO: Make this data-driven?

const SYMBOLS = {

  DANGER: new IconLabelSymbol({
    code: `\uf071`,
    scale: 0.9,
    cssClass: 'fa-warning',
    description: 'Danger, hostile faction',
    color: 'rgba(255,50,50,1.0)',
  }),

  WARNING: new IconLabelSymbol({
    code: `\uf071`,
    scale: 0.9,
    cssClass: 'fa-warning',
    description: 'Warning, hostile environment',
    color: 'rgba(255,117,25,1.0)',
  }),

  HANGAR: new IconLabelSymbol({
    code: `\uf015`,
    scale: 1.15,
    cssClass: 'fa-home',
    description: 'Hangar location',
    color: 'rgba(255,255,255,1.0)',
    offset: { x: -0.25, y: -1 },
  }),

  INFO: new IconLabelSymbol({
    code: `\uf05a`,
    scale: 1.0,
    cssClass: 'fa-info-circle',
    description: 'Information available',
    color: 'rgba(255,162,255,1.0)',
  }),

  TRADE: new IconLabelSymbol({
    code: `\uf291`,
    scale: 0.9,
    cssClass: 'fa-shopping-basket',
    description: 'Major trade hub',
    color: 'rgba(255,255,0,1.0)',
    offset: { x: 0, y: -1 },
  }),

  BANNED: new IconLabelSymbol({
    code: `\uf05e`,
    scale: 1.0,
    cssClass: 'fa-ban',
    description: 'System off-limits',
    color: 'rgba(255, 117, 25, 1.0)',
    offset: { x: 0, y: -1 },
  }),

  AVOID: new IconLabelSymbol({
    code: `\uf00d`,
    scale: 1.2,
    cssClass: 'fa-times',
    description: 'Avoid: do not route here',
    color: 'rgba(255,50,50,1.0)',
    offset: { x: 0, y: -2 },
  }),

  COMMENTS: new IconLabelSymbol({
    code: `\uf075`,
    scale: 1.0,
    cssClass: 'fa-comment',
    description: 'Your comments',
    color: 'rgba(106,187,207,1.0)',
    offset: { x: 0, y: -3 },
  }),

  BOOKMARK: new IconLabelSymbol({
    code: `\uf02e`,
    scale: 1.05,
    cssClass: 'fa-bookmark',
    description: 'Bookmarked',
    color: 'rgba(102,193,0,1.0)',
    offset: { x: -1, y: -1 },
  }),
};

export default SYMBOLS;
