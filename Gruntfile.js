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
          'js/SCMAP/SystemLabel.js',
          'js/SCMAP/Knapsack.js',
          'js/SCMAP/TextureManager.js',
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
          'vendor/tweenjs/build/tween.min.js',
          'vendor/imagesloaded.pkgd.js',
          'vendor/handlebars/handlebars.js',
          'vendor/javascript-state-machine/state-machine.js',
          'vendor/jScrollPane/script/jquery.jscrollpane.js',
          'vendor/jScrollPane/script/jquery.mousewheel.js',
          'vendor/markdown-js/dist/markdown.js'
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
   grunt.loadNpmTasks( 'grunt-contrib-watch' );
   grunt.loadNpmTasks( 'grunt-contrib-jshint' );
   grunt.loadNpmTasks( 'grunt-contrib-less' );
   grunt.loadNpmTasks( 'grunt-lesslint' );

   grunt.registerTask( 'dist-scdata', [ 'concat:scdata', 'uglify:scdata' ] );
   grunt.registerTask( 'dist-scmap', [ 'jshint:beforeconcat', 'concat:scmap', 'jshint:afterconcat','uglify:scmap' ] );
   grunt.registerTask( 'dist-extlibs', [ 'concat:extlibs', 'uglify:extlibs' ] );
   grunt.registerTask( 'less-css', [ 'less:css' ] );

   // Default task(s).
   grunt.registerTask( 'default', [ 'dist-extlibs', 'dist-scdata', 'dist-scmap', 'less-css' ] );
};
