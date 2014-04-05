module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*!\n' +
              ' * <%= pkg.name %> v<%= pkg.version %> by Lianna Eeftinck\n' +
              ' * Copyright <%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
              ' * https://github.com/Leeft/Star-Citizen-WebGL-Map\n' +
              ' * Licensed under <%= _.pluck(pkg.licenses, "url").join(", ") %>\n' +
              ' */\n',
    databanner: '/*!\n' +
                ' * Sample map data (made up from a slightly randomised and limited data set\n' +
                ' * of only known systems); to be replaced by online live data in the future.\n' +
                ' * This data is thus not entirely accurate and incomplete.\n' +
                ' *\n' +
                ' * Copyright 2013-<%= grunt.template.today("yyyy") %> Lianna Eeftinck & Aaron Robinson. All Rights Reserved.\n' +
                ' *\n' +
                ' * This sample map data (everything in SCMAP.data.map to be specific) is\n' +
                ' * provided as an example only and is free to be used with this application\n' +
                ' * in any form but may not be used elsewhere without explicit permission.\n' +
                ' */\n',
    jqueryCheck: 'if (typeof jQuery === "undefined") { throw new Error("<%= pkg.name %> requires jQuery"); }\n',
    threejsCheck: 'if (typeof THREE === "undefined") { throw new Error("<%= pkg.name %> requires THREE.js"); }\n',

    copy: {

      threejs: {
        files: [
          { expand: false, src: 'js/three.js/build/three.min.js',                           dest: 'build/three.min.js'    },
          { expand: false, src: 'js/three.js/examples/js/shaders/ConvolutionShader.js',     dest: 'build/shaders/ConvolutionShader.js' },
          { expand: false, src: 'js/three.js/examples/js/shaders/FXAAShader.js',            dest: 'build/shaders/FXAAShader.js'        },
          { expand: false, src: 'js/three.js/examples/js/shaders/CopyShader.js',            dest: 'build/shaders/CopyShader.js'        },
          { expand: false, src: 'js/three.js/examples/js/postprocessing/EffectComposer.js', dest: 'build/postprocessing/EffectComposer.js' },
          { expand: false, src: 'js/three.js/examples/js/postprocessing/MaskPass.js',       dest: 'build/postprocessing/MaskPass.js'   },
          { expand: false, src: 'js/three.js/examples/js/postprocessing/RenderPass.js',     dest: 'build/postprocessing/RenderPass.js' },
          { expand: false, src: 'js/three.js/examples/js/postprocessing/ShaderPass.js',     dest: 'build/postprocessing/ShaderPass.js' },
          { expand: false, src: 'js/three.js/examples/js/postprocessing/BloomPass.js',      dest: 'build/postprocessing/BloomPass.js'  },
          { expand: false, src: 'js/three.js/examples/js/Detector.js',                      dest: 'build/Detector.js'                  },
          { expand: false, src: 'js/three.js/examples/js/libs/stats.min.js',                dest: 'build/stats.min.js'                 }
        ]
      },

      tweenjs: {
        files: [
          { expand: false, src: 'js/tween.js/build/tween.min.js', dest: 'build/tween.min.js' },
        ]
      },

      fsmjs: {
        files: [
          { expand: false, src: 'js/javascript-state-machine/state-machine.min.js', dest: 'build/state-machine.min.js' },
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
          'js/SCMAP/Editor.js',
          'js/SCMAP/SelectedSystemGeometry.js',
          'js/SCMAP/JumpPoint.js',
          'js/SCMAP/Faction.js',
          'js/SCMAP/Goods.js',
          'js/SCMAP/System.js',
          'js/SCMAP/Dijkstra.js',
          'js/SCMAP/Map.js',
          'js/SCMAP/UI.js',
          'js/SCMAP/OrbitControls.js',
          'js/main.js'
        ],
        dest: 'build/<%= pkg.name %>.js'
      },

      scdata: {
        options: {
          //banner: '<%= databanner %>',
          stripBanners: false
        },
        src: [
          'js/data/map.js',
          'js/data/lists.js',
          'js/data/systems.js',
        ],
        dest: 'build/<%= pkg.name %>-data.js'
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
        options: {
          banner: '<%= databanner %>'
        },
        src: ['<%= concat.scdata.dest %>'],
        dest: 'build/<%= pkg.name %>-data.min.js'
      },

      extlibs: {
        src: ['<%= concat.extlibs.dest %>'],
        dest: 'build/<%= pkg.name %>-libs.min.js'
      }

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
      }
    }

  });

  // These plugins provide necessary tasks
  grunt.loadNpmTasks( 'grunt-contrib-concat' );
  grunt.loadNpmTasks( 'grunt-contrib-uglify' );
  grunt.loadNpmTasks( 'grunt-contrib-copy' );
  grunt.loadNpmTasks( 'grunt-contrib-watch' );
  grunt.loadNpmTasks( 'grunt-contrib-jshint' );

  grunt.registerTask( 'copy-extlibs', [ 'copy' ] );
  grunt.registerTask( 'dist-scdata', [ 'concat:scdata', 'uglify:scdata' ] );
  grunt.registerTask( 'dist-scmap', [ 'jshint:beforeconcat', 'concat:scmap', 'jshint:afterconcat','uglify:scmap' ] );
  grunt.registerTask( 'dist-extlibs', [ 'concat:extlibs', 'uglify:extlibs' ] );

  // Default task(s).
  grunt.registerTask( 'default', [ 'copy-extlibs', 'dist-extlibs', 'dist-scdata', 'dist-scmap' ] );
};
