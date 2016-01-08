/**
* @author Lianna Eeftinck / https://github.com/Leeft
*/

import TWEEN from 'tween.js';
import StateMachine from 'javascript-state-machine';

const MIN = 0.001; // 0 causes issues for three.js scaling
const MAX = 1.0;

class DisplayState {
  constructor ({
    mode: mode,
    map: map,
    time: time = 1000,
  }) {
    this.mode = mode;
    this.map  = map;

    this.position = { y: ( mode === '2d' ) ? MIN : MAX };

    this.tweenTo2d = new TWEEN.Tween( this.position )
      .to( { y: MIN }, time )
      .easing( TWEEN.Easing.Cubic.InOut );

    this.tweenTo3d = new TWEEN.Tween( this.position )
      .to( { y: MAX }, time )
      .easing( TWEEN.Easing.Cubic.InOut );

    const fsm = StateMachine.create({

      initial: mode || '3d',

      events: [
        { name: 'to2d', from: '3d', to: '2d' },
        { name: 'to3d', from: '2d', to: '3d' },
      ],

      callbacks: {
        onleave2d: () => {
          this.tweenTo3d.onComplete( () => {
            this.fsm.transition();
            this.onComplete();
          });
          this.tweenTo3d.start();
          return StateMachine.ASYNC;
        },

        onleave3d: () => {
          this.tweenTo2d.onComplete( () => {
            this.fsm.transition();
            this.onComplete();
          });
          this.tweenTo2d.start();
          return StateMachine.ASYNC;
        },
      },

      error: function( eventName, from, to, args, errorCode, errorMessage ) {
        console.warn( `DisplayState: ${ errorMessage }` );
      },
    });

    this.fsm = fsm;
  }

  get currentScale () {
    return this.position.y;
  }

  set onUpdate ( func ) {
    const updated = function () {
      func( this.y );
    };
    this.tweenTo2d.onUpdate( updated );
    this.tweenTo3d.onUpdate( updated );
  }

  get onComplete () {
    return this._onComplete || function () {};
  }
  set onComplete ( func ) {
    this._onComplete = func;
  }

  get onEnter2D () {
    return this.fsm.onenter2d;
  }
  set onEnter2D ( value ) {
    this.fsm.onenter2d = value;
  }

  get onEnter3D () {
    return this.fsm.onenter3d;
  }
  set onEnter3D ( value ) {
    this.fsm.onenter3d = value;
  }

  to2d () {
    return this.fsm.to2d();
  }

  to3d () {
    return this.fsm.to3d();
  }
}

export default DisplayState;
