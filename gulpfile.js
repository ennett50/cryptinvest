const gulp = require('gulp');
const buffer = require('vinyl-buffer');
const postcss = require('gulp-postcss');
const stylus = require('gulp-stylus');
const cleanCSS = require('gulp-clean-css');
const autoprefixer = require('autoprefixer');
const browserSync = require('browser-sync').create();
const gulpIf = require('gulp-if');
const sourcemaps = require('gulp-sourcemaps');
const rename = require('gulp-rename');
const del = require('del');
const gutil = require('gulp-util');
const pug = require('gulp-pug');
const spritesmith = require('gulp.spritesmith');
const tinypng = require('gulp-tinypng-nokey');
const webpack = require('webpack');
const changed = require('gulp-changed');
const svgSymbols = require('gulp-svg-symbols');
const svgmin = require('gulp-svgmin');

const isDevelopment = process.env.NODE_ENV !== 'production';


gulp.task('views', function () {
  return gulp.src('./src/index.pug')
    .pipe(pug({
      basedir: './'
    }))
    .on('error', function(error) {
      gutil.log(gutil.colors.red('Error: ' + error.message));
      this.emit('end');
    })
    .pipe(gulp.dest('./public'));
});

gulp.task('styles', function () {
  return gulp.src('./src/app.styl')
    .pipe(gulpIf(isDevelopment, sourcemaps.init()))
    .pipe(stylus({
      'include css': true
    })
    .on('error', function(error) {
      gutil.log(gutil.colors.red('Error: ' + error.message));
      this.emit('end');
    }))
    .pipe(gulpIf(!isDevelopment, postcss([
      autoprefixer({
          browsers: ['> 5%', 'ff > 14']
      })
    ])))
    .pipe(gulpIf(isDevelopment, sourcemaps.write()))
    .pipe(gulpIf(!isDevelopment, cleanCSS()))
    .pipe(rename('style.css'))
    .pipe(gulp.dest('./public/css'))
});

gulp.task('scripts', function(done) {
  return webpack(require('./webpack.config.js'), function(error, stats) {
    if (error) throw new gutil.PluginError('webpack', error);

    gutil.log('[scripts]', stats.toString({
      colors: gutil.colors.supportsColor,
      chunks: false,
      hash: false,
      version: false
    }));

    done();
  });
});

gulp.task('fonts', function () {
  return gulp.src([
    './src/assets/fonts/**/*.*'
  ])
    .pipe(gulp.dest('./public/fonts'));
});

gulp.task('sprite', function() {
  const spriteData = gulp.src('./src/assets/images/sprite/*.{png,jpg,jpeg}')
    .pipe(spritesmith({
      imgName: 'sprite.png',
      cssName: 'images.styl',
      algorithm: 'binary-tree',
      padding: 2,
      cssTemplate: './src/assets/styles/sprites/sprite-template.mustache'
    }));

  spriteData.img
    .pipe(buffer())
    .pipe(gulpIf(!isDevelopment, tinypng()))
    .pipe(gulp.dest('./public/images'));

  spriteData.css.pipe(gulp.dest('./src/styles/sprites'));

  return spriteData;
});

gulp.task('svgSymbols', function () {
  return gulp.src('./src/assets/images/svg/**/*.svg')
    .pipe(svgmin())
    .pipe(svgSymbols({
      templates: ['default-svg'],
      className: '.icon_%f'
    }))
    .pipe(gulp.dest('./public'));
});

gulp.task('images', function () {
  return gulp.src(['./src/assets/images/**/*.*', '!./src/assets/images/sprite'])
    .pipe(changed('./public/images'))
    .pipe(gulpIf(!isDevelopment, gulpIf(['!*.svg'], tinypng())))
    .pipe(gulp.dest('./public/images'));
});

gulp.task('misc', function () {
  return gulp.src('./src/assets/misc/**/*.*')
    .pipe(gulp.dest('./public'));
});

gulp.task('watch', function () {
  gulp.watch('./src/**/*.pug', gulp.series('views'));
  gulp.watch('./src/**/*.{css,styl}', gulp.series('styles'));
  gulp.watch('./src/**/*.js', gulp.series('scripts'));
  gulp.watch('./src/assets/misc/**/*.*', gulp.series('misc'));
  gulp.watch('./src/assets/images/svg/**/*.svg', gulp.series('svgSymbols'));
  gulp.watch(['./src/assets/images/**/*.*', '!./src/assets/images/svg'], gulp.series('images'));
});

gulp.task('serve', function () {
  browserSync.init({
    // proxy: 'example.com',
    // files: 'public/**/*.*',
    // https: true,
    server: './public',
    port: 8080
  });

  browserSync.watch('./public/**/*.*').on('change', browserSync.reload);
});

gulp.task('clean', function () {
  return del('./public')
});

gulp.task('build', gulp.series(
  'clean',
  gulp.parallel(
    'sprite',
    'svgSymbols'
  ),
  gulp.parallel(
    'views',
    'styles',
    'scripts',
    'fonts',
    'images',
    'misc'
  )));

gulp.task('default', gulp.series(
  'build',
  gulp.parallel(
    'watch',
    'serve'
  )));
