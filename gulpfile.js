'use strict';

var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var gjshint = require('gulp-jshint');
var ngAnnotate = require('gulp-ng-annotate');
var stylish = require('jshint-stylish');
var saveLicense = require('uglify-save-license');

/*
 * Default task is build
 */
gulp.task('default', ['build']);

gulp.task('build', function () {
    return gulp.src([
        'src/howler.js'
    ])
    .pipe(gjshint())
    .pipe(gjshint.reporter(stylish))
    .pipe(ngAnnotate())
    .pipe(concat('howler.js'))
    .pipe(gulp.dest('dist'))
    .pipe(uglify({
      preserveComments: 'license'
     }))
    .pipe(concat('howler.min.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('jshint', function () {
    return gulp.src('src/**/*.js')
        .pipe(gjshint())
        .pipe(gjshint.reporter(stylish));
});

