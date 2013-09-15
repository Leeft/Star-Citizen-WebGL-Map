Star-Citizen-WebGL-Map
======================

*Pre-pre-pre-pre alpha release.*

A early release WebGL version of the universe map for the upcoming game
[Star Citizen](https://robertsspaceindustries.com/about-the-game), inspired by
the [Star Map WIP video](https://robertsspaceindustries.com/comm-link/engineering/13109-Star-Map-Demo)
that was released of the in-game map feature earlier this year. It uses the
awesome [three.js](http://threejs.org/) library to do the heavy lifting.

You *need* a webbrower with WebGL support (Firefox or Chrome) to use this map, and
a graphics card which can handle WebGL. It has been verified to work on the
Nexus 7 tablet (using Firefox for Android, other browsers not tested) and should
work in any working WebGL environement. If you can run the Hangar on your PC, you
can probably run this as well.

Several primary features are still missing;

* Graphics improvements to make it more similar to the map in that video
* A "flat" map mode like in the video
* Camera movement around the map (is entirely disabled for now)
* Camera angle limits (to prevent gimbal lock problems at some angles)

Things which will probably be implemented:

* Route-planner, with alternative routes and the known dangers on these routes
* Graphics (or other) settings panel
* ...

Known issues:

* Chrome doesn't like loading from a file:// URL, so Firefox is currently
recommended for executing it from the filesystem (without a webserver).

I will probably *not* implement anything like the planets view in the video, the
amount of work involved with that would be tremendous. And leaving it out here
leaves some use for the in-game map feature as well. ;)

The map is far from complete still: the map needs the rest of the systems known
so far to be added, and the known system info is basically empty (except for
a single system to test with, Nul). I've been focusing on the code rather than
the data, which is why the data isn't there.

September 2013 by [Daughter of Sol (Shiari)](https://forums.robertsspaceindustries.com/profile/51803/Shiari)
