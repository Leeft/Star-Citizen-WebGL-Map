Star-Citizen-WebGL-Map
======================

*Early alpha release.*

An early release WebGL version of the universe map for the upcoming game
[Star Citizen](https://robertsspaceindustries.com/about-the-game), inspired by
the [Star Map WIP video](https://robertsspaceindustries.com/comm-link/engineering/13109-Star-Map-Demo)
that was released of the in-game map feature earlier last year. It uses the
awesome [three.js](http://threejs.org/) library to do much of the heavy lifting.

You *need* a webbrowser with WebGL support to use this map (any recent Firefox
or Chrome, or Internet Explorer 11+ will do), and your graphics card must
be supported. It has been verified to work on the first Nexus 7 tablet (with
Firefox for Android, Chrome didn't work; other browsers not tested) but should
work in any functional WebGL environment. Performance may vary however.

The latest "official releases" are currently available at
http://leeft.eu/starcitizen/ until the website with the database is ready for
the public :)

![Screenshot](http://img.photobucket.com/albums/v107/Liaantje/map-20140319.png)

Several primary features are still missing, such as:

* More graphics improvements to make it more similar to the map in that video,
as well as better 2D elements for the 2D mode
* Better interactivity, e.g. when selecting a system highlighting the systems
which they can trade goods with
* Tracking your settings
* Bookmarking locations, remembering your position

At some point I'll at least implement:

* More route-planner features: showing alternative routes, relative distances
(which may get more accurate as we get more info) and the known dangers on these
routes, trading information, etc.
* More settings for the settings panel
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

The map itself is mostly complete (for the moment the "unknown" systems
have been deliberately left out), and it is still static data as the database
used to generate the map data is also a work in progress. The XZ coordinates of
the systems are pretty accurate but deliberately slightly randomised, and the
vertical (Y) positions are still entirely random. They'll be fixed when I can
do the interactive editing.

If you want to discuss anything related to this map, please go to [my forum thread](https://forums.robertsspaceindustries.com/discussion/54931/browser-based-3d-system-map-early-wip).

Second release, March 2014 by [Daughter of Sol (Shiari)](https://forums.robertsspaceindustries.com/profile/51803/Shiari)

