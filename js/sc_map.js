var sc_map_scaling = 0.5; // every coordinate is multiplied by this amount
var sc_map = {
   "UUE": {
      color: 0x8080f0,
      systems: {
         "Sol":      { scale: 1.0, coords: [        0, 89.8333,        0 ] },
         "Vega":     { scale: 1.0, coords: [ -212.235, 72.0087, -176.189 ] },
         "Croshaw":  { scale: 1.0, coords: [  24.1568, 137.555,  207.281 ] },
         "Ferron":   { scale: 1.0, coords: [  155.294, 108.297,  454.291 ] },
         "Centauri": { scale: 1.0, coords: [ -384.783, 160.355,  516.475 ] },
         "Garron":   { scale: 1.0, coords: [ -439.999,  211.41,  8.63671 ] },
         "Stanton":  { scale: 1.0, coords: [  200.156, 192.841, -388.652 ] },
         "Davien":   { scale: 1.0, coords: [   317.49, 94.2372,  319.558 ] },
         "Tohil":    { scale: 1.0, coords: [  605.742, 170.713, -849.873 ] },
         "Bremen":   { scale: 1.0, coords: [ -536.625,   127.4, -993.222 ] },
         "Chronos":  { scale: 1.0, coords: [ -120.784, 64.6038, -727.211 ] }
      },
      known_routes: {
         "Sol":  [ "Vega", "Croshaw", "Stanton" ],
         "Vega": [ "Garron", "Kellog", "Virgil" ],
         "Stanton": [ "Chronos", "Pelles", "Kallis" ],
         "Croshaw": [ "Nul", "Davien", "Centauri", "Rhetor" ],
         "Davien": [ "Ferron", "Cathcart" ],
         "Ferron": [ "Idris", "Davien" ],
         "Chronos": [ "Kellog", "Bremen", "Branaugh" ],
         "Tohil": [ "Oso", "Pallas" ],
         "Bremen": [ "Branaugh", "Kellog" ],
         "Garron": [ "Nul" ],
         "Centauri": [ "Nul", "Elysium" ],
      }
   },
   "Vanduul": {
      color: 0xf08080,
      systems: {
         "Caliban":  { scale: 1.0, coords: [ -586.665, 79.2172,  250.465 ] },
         "Vanguard": { scale: 1.0, coords: [ -923.135, 203.937,   416.29 ] },
         "Orion":    { scale: 1.0, coords: [ -864.631, 65.5464,  144.051 ] },
         "Tiber":    { scale: 1.0, coords: [ -724.703,  158.08, -95.0038 ] },
         "Virgil":   { scale: 1.0, coords: [ -576.311, 141.248, -215.918 ] },
         "Vendetta": { scale: 1.0, coords: [ -988.702, 156.609, -575.205 ] }
      },
      known_routes: {
         "Vendetta": [ "Kellog" ],
         "Tiber": [ "Virgil", "Garron", "Orion" ],
         "Orion": [ "Caliban", "Vanguard" ],
         "Caliban": [ "Vanguard", "Nul" ],
         "Vulture": [ "Elysium", "Leir" ],
      }
   },
   "Xi'An": {
      color: 0x80ff80,
      systems: {
         "Pallas":   { scale: 1.0, coords: [ 400.12, 150.91, -1129.048 ] }
      },
      known_routes: {
         "Pallas": [ "Gliese", "Tohil", "Hadur", "Oya" ],
      }
   },
   "Banu": {
      color: 0xf0f080,
      systems: {
         "Gliese":   { scale: 1.0, coords: [  263.999, 112.777, -1233.32 ] }
      },
      known_routes: {
         "Gliese": [ "Branaugh", "Pallas" ],
      }
   },
   // Ownership 'Other'
   "Other": {
      color: 0xf0f0f0,
      systems: {
         "Kellog":   { scale: 1.0, coords: [ -650.507,  104.32, -654.663 ] },
         "Kallis":   { scale: 1.0, coords: [   408.94, 190.374, -108.823 ] },
         "Oso":      { scale: 1.0, coords: [  540.077, 160.447, -333.377 ] }
      },
      known_routes: {
         "Kallis": [ "Oso" ],
         "Oso": [ "Hades", "Castra" ],
      }
   },
   // Ownership 'None'
   "None": {
      color: 0xc0c0c0,
      systems: {
         "Nul":      { scale: 1.0, coords: [ -315.764, 143.636,  264.283 ] },
         "Pelles":   { scale: 1.0, coords: [  434.822, 271.055, -595.933 ] },
         "Branaugh": { scale: 1.0, coords: [ -260.548, 156.019,  -988.04 ] }
      },
      known_routes: {
         "Pelles": [ "Castra" ],
      }
   }
};
