var gulp = require('gulp'),
	concat = require('gulp-concat'),
	del = require('del'),
	uglify = require('gulp-uglify');

gulp.task('default', ['make']);

gulp.task('make', [ 'js' ]);

gulp.task('clean', function () {
	del([
		'*.min.js'
	]);
});

gulp.task('js', function () {
	return gulp.src([
			'./zepto-deferred.js',
			'howler.js'
		])
		.pipe(uglify({
			preserveComments: 'license',
		}))
		.pipe(concat('howler.min.js'))
		.pipe(gulp.dest('./'));

});

gulp.task('watch', function () {
	gulp.watch([
		'*.js',
	], [ 'js' ]);
});