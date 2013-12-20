/*global module:true */

module.exports = function (grunt) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      core: [
        'Gruntfile.js',
        'howler.js',
        'karma.conf.js'
      ]
    },
    uglify: {
      options: {
        mangle: {
          except: ['Howler', 'Howl']
        }
      },
      howler: {
        files: {
          'howler.min.js': ['howler.js']
        }
      }
    },
    karma: {
      unit: {
        options: {
          configFile: 'karma.conf.js'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-karma');

  grunt.registerTask('default', ['jshint']);
  grunt.registerTask('test',    ['jshint', 'karma']);
  grunt.registerTask('build',   ['test', 'uglify']);
};