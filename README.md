Star-Citizen-WebGL-Map
======================

*Pre-pre alpha release.*

A early release WebGL version of the universe map for the upcoming game
[Star Citizen](https://robertsspaceindustries.com/about-the-game), inspired by
the [Star Map WIP video](https://robertsspaceindustries.com/comm-link/engineering/13109-Star-Map-Demo)
that was released of the in-game map feature earlier this year. It uses the
awesome [three.js](http://threejs.org/) library to do the heavy lifting.

You *need* a webbrowser with WebGL support (Firefox or Chrome) to use this map, and
a graphics card which can handle WebGL. It has been verified to work on the
Nexus 7 tablet (using Firefox for Android, other browsers not tested) but should
work in any working WebGL environment. If you can run the Hangar module on your
PC, you can probably run this as well.

It is entirely data driven, so when the data changes, so will the map. It is
quite flexible already.

A live demo is available at http://leeft.eu/starcitizen/

![Screenshot](http://img801.imageshack.us/img801/544/53iu.png)

Several primary features are still missing;

* Graphics improvements to make it more similar to the map in that video
* A "flat" map mode like in the video
* Camera angle limits (to prevent gimbal lock problems at some angles)
* Filling in the missing data
* Linking to e.g. the Wiki and other maps

Things which will likely be implemented:

* Route-planner, showing alternative routes, relative distances (which may
get more accurate as we get more info) and the known dangers on these routes
* Graphics (or other) settings panel
* Map editor, saving locally in the browser (which can be saved as a map
with the program)
* ...

Other things I may do in the future, largely dependant on what information
will be available through any API's Cloud Imperium Games might be creating for us:

* News tracker for (selected) systems
* Seeing where your friends are
* Highlighting big events on the map
* Revealing new jump points as they've been explored and published widely
* ...

I will probably *not* implement anything like the planets view in the video, the
amount of work involved with that would be tremendous. And leaving it out here
leaves some use for the in-game map feature as well. ;)

The map is far from complete still: the map needs the rest of the systems known
so far to be added, and the known system info is basically empty (except for
a single system to test with, Nul). I've been focusing on the code rather than
the data, which is why the data isn't there.

Initial release, September 2013 by [Daughter of Sol (Shiari)](https://forums.robertsspaceindustries.com/profile/51803/Shiari)

