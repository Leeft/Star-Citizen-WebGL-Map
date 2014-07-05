module.exports = function(grunt) {

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    banner: '/*!\n' +
              ' * <%= pkg.name %> v<%= pkg.version %> by Lianna Eeftinck\n' +
              ' * Copyright <%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
              ' * https://github.com/Leeft/Star-Citizen-WebGL-Map\n' +
              ' * Licensed under <%= _.pluck(pkg.licenses, "url").join(", ") %>\n' +
              ' */\n',

    jqueryCheck: 'if (typeof jQuery === "undefined") { throw new Error("<%= pkg.name %> requires jQuery"); }\n',
    threejsCheck: 'if (typeof THREE === "undefined") { throw new Error("<%= pkg.name %> requires THREE.js"); }\n',

    copy: {

      tweenjs: {
        files: [
          { expand: false, src: 'js/tween.js/build/tween.min.js',                      dest: 'build/tween.min.js' },
        ]
      },

      fsmjs: {
        files: [
          { expand: false, src: 'js/javascript-state-machine/state-machine.min.js',    dest: 'build/state-machine.min.js' },
        ]
      },

      jqueryplugins: {
        files: [
          { expand: false, src: 'js/jScrollPane/script/jquery.jscrollpane.min.js',     dest: 'build/jquery.jscrollpane.min.js' },
          { expand: false, src: 'js/jquery-mousewheel/build/jquery.mousewheel.min.js', dest: 'build/jquery.mousewheel.min.js' },
          { expand: false, src: 'js/markdown-js/dist/markdown.min.js',                 dest: 'build/markdown.min.js' }
        ]
      }

    },

    concat: {

      scmap: {
        options: {
          banner: '<%= banner %><%= jqueryCheck %><%= threejsCheck %>',
          stripBanners: false
        },
        src: [
          'js/SCMAP.js',
          'js/SCMAP/Settings.js',
          'js/SCMAP/SelectedSystemGeometry.js',
          'js/SCMAP/JumpPoint.js',
          'js/SCMAP/Faction.js',
          'js/SCMAP/Goods.js',
          'js/SCMAP/System.js',
          'js/SCMAP/Dijkstra.js',
          'js/SCMAP/Route.js',
          'js/SCMAP/Map.js',
          'js/SCMAP/UI.js',
          'js/SCMAP/Renderer.js',
          'js/SCMAP/OrbitControls.js',
          'js/main.js'
        ],
        dest: 'build/<%= pkg.name %>.js'
      },

      scdata: {
        options: {
          stripBanners: false
        },
        src: [
          'js/data/lists.js',
        ],
        dest: 'build/<%= pkg.name %>-seed-data.js'
      },

      extlibs: {
        src: [
          'js/three.js/examples/js/shaders/ConvolutionShader.js',
          'js/three.js/examples/js/shaders/FXAAShader.js',
          'js/three.js/examples/js/shaders/CopyShader.js',
          'js/three.js/examples/js/postprocessing/EffectComposer.js',
          'js/three.js/examples/js/postprocessing/MaskPass.js',
          'js/three.js/examples/js/postprocessing/RenderPass.js',
          'js/three.js/examples/js/postprocessing/ShaderPass.js',
          'js/three.js/examples/js/postprocessing/BloomPass.js',
          'js/three.js/examples/js/Detector.js',
          'js/three.js/examples/js/libs/stats.min.js',
          'js/handlebars-v1.3.0.js',
          'build/jquery.jscrollpane.min.js',
          'build/jquery.mousewheel.min.js',
          'build/markdown.min.js',
          'build/tween.min.js',
          'build/state-machine.min.js',
        ],
        dest: 'build/<%= pkg.name %>-libs.js'
      }

    },

    uglify: {

         scmap: {
            options: {
               banner: '<%= banner %><%= jqueryCheck %><%= threejsCheck %>'
            },
            src: ['<%= concat.scmap.dest %>'],
            dest: 'build/<%= pkg.name %>.min.js'
         },

         scdata: {
            src: ['<%= concat.scdata.dest %>'],
            dest: 'build/<%= pkg.name %>-seed-data.min.js'
         },

         extlibs: {
            src: ['<%= concat.extlibs.dest %>'],
            dest: 'build/<%= pkg.name %>-libs.min.js'
         }

      },

      less: {
         css: {
            files: {
               "css/sc.css": "styles.less"
            },
            options: {
               compress: true,
               cleancss: true
            }
         }
      },

      lesslint: {
         src: ['*.less'],
         options: {
            csslint: {
               'qualified-headings': false,
               'fallback-colors': false,
               'text-indent': false,
               'outline-none': false,
               'important': false,
               'empty-rules': false,
               'font-sizes': false,
               'ids': false
            }
         }
         /*
            compress: true,
            cleancss: true
         } */
      },

      jshint: {
         beforeconcat: ['js/main.js','js/SCMAP.js','js/SCMAP/**/*.js'],
         afterconcat: ['<%= concat.scmap.dest %>'],
      },

      watch: {
         scmap: {
            files: ['<%= concat.scmap.src %>'],
            tasks: ['dist-scmap']
         },
         scdata: {
            files: ['<%= concat.scdata.src %>'],
            tasks: ['dist-scdata']
         },
         extlibs: {
            files: ['<%= concat.extlibs.src %>'],
            tasks: ['dist-extlibs']
         },
         css: {
            files: ['*.less'],
            tasks: ['less-css']
         }
      }

   });

   // These plugins provide necessary tasks
   grunt.loadNpmTasks( 'grunt-contrib-concat' );
   grunt.loadNpmTasks( 'grunt-contrib-uglify' );
   grunt.loadNpmTasks( 'grunt-contrib-copy' );
   grunt.loadNpmTasks( 'grunt-contrib-watch' );
   grunt.loadNpmTasks( 'grunt-contrib-jshint' );
   grunt.loadNpmTasks( 'grunt-contrib-less' );
   grunt.loadNpmTasks( 'grunt-lesslint' );

   grunt.registerTask( 'copy-extlibs', [ 'copy' ] );
   grunt.registerTask( 'dist-scdata', [ 'concat:scdata', 'uglify:scdata' ] );
   grunt.registerTask( 'dist-scmap', [ 'jshint:beforeconcat', 'concat:scmap', 'jshint:afterconcat','uglify:scmap' ] );
   grunt.registerTask( 'dist-extlibs', [ 'concat:extlibs', 'uglify:extlibs' ] );
   grunt.registerTask( 'less-css', [ 'less:css' ] );

   // Default task(s).
   grunt.registerTask( 'default', [ 'copy-extlibs', 'dist-extlibs', 'dist-scdata', 'dist-scmap', 'less-css' ] );
};
