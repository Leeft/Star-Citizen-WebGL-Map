# Star-Citizen-WebGL-Map

A WebGL version of the (reverse engineered) universe map for the upcoming game
[Star Citizen](https://robertsspaceindustries.com/about-the-game), inspired by
the [Star Map WIP video](https://robertsspaceindustries.com/comm-link/engineering/13109-Star-Map-Demo)
that was released of the in-game map feature earlier last year. It uses the
awesome [three.js](http://threejs.org/) library to do much of the heavy lifting.

You *need* a webbrowser with WebGL support to use this map (any recent Firefox,
Chrome, or Internet Explorer 11+ will do, Opera should work but I haven't
tested it), and your graphics card must be supported. It has been verified to
work on the first Nexus 7 tablet (with Firefox for Android, Chrome didn't work
at the time; other browsers have not been tested) but it will work in any
functional WebGL environment. No guarantees on the performance, however.

The latest "official releases" are currently available at
http://leeft.eu/starcitizen/ until the website with the database is ready for
the public ...

![Screenshot](http://the-verse.info/assets/images/webglmap-22b5815f4130d66dd569f8f61a951e80.png)

## Future enhancements?

Several features are still missing, such as:

* More graphics improvements, not sure what yet though
* Adding features like the perry line and nebulae to the scene
* Better interactivity, e.g. when selecting a system highlighting the systems
which they can trade goods with

At some point I'll at least implement:

* More route-planner features: showing alternative routes, relative distances
(which may get more accurate as we get more info) and the known dangers on these
routes, trading information, etc.
* Other points of interest besides star systems
* Interactive map editing
* ...

Other things I may do in the future (largely dependant on what information
will be available through any API's Cloud Imperium Games might be creating for us):

* News tracker for (selected) systems
* Tracking where your friends are
* Highlighting big events on the map
* Revealing new jump points as they've been explored and published widely
* ...

I will probably *not* implement anything like the planets view in the video, the
amount of work involved with that would be tremendous. And leaving it out of my map
leaves some use for the in-game map feature as well. ;)

The map itself is mostly complete, and it is still static data as the database
used to generate the map data is also a work in progress. The XZ coordinates of
the systems are pretty accurate but deliberately slightly randomised, and the
vertical (Y) positions are still entirely random. They'll be fixed when I can
do the interactive editing.

If you want to discuss anything related to this map, please go to
[my forum thread](https://forums.robertsspaceindustries.com/discussion/54931/browser-based-3d-system-map).

# Building the map code and customising

Since you're looking at the source code, you may be interested in this. You'll need:

* [node.js](http://nodejs.org/): if not yet installed (on Linux), maybe give
[nvm](https://github.com/creationix/nvm) a try to manage your Node setup ...
otherwise use whatever package installation system your OS provides, or install
from its source code.
* Install Grunt: `npm install -g grunt-cli`
* Install Bower: `npm install -g bower`
* Install the map and dev environment dependencies: run both `bower install` and `npm install`
from this directory.
* Compile the code and bundle the libraries: run `grunt`; use `grunt watch` to monitor
the files for changes and recompile as needed.

Once built, the file `index.html` and the files in `css/`, `images/` and `build/`
should be all you need.

At this time some customisation is certainly possible by modifying the templates
in `index.html`, but the code needs lots more work to make it easy to plug parts
of the code in to another website and render a custom map without rewriting much
of it.

## License

[MIT](https://raw.githubusercontent.com/Leeft/Star-Citizen-WebGL-Map/master/LICENSE).

## Credits

August 2014 by [Daughter of Sol (Shiari)](https://forums.robertsspaceindustries.com/profile/51803/Shiari).
