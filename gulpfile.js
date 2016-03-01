/*
	Gulp Setup v3.0

	BrowserSync options: http://localhost:3001/sync-options
*/

// Gulp & utils. //
var gulp = require('gulp');
var util = require( 'gulp-util' );
var Q = require('q');
var filesystem = require("fs");
var del = require('del');
var path = require('path');
var size = require('gulp-size');
var gulpif = require('gulp-if');
var sourcemaps = require('gulp-sourcemaps');
var notifier = require('node-notifier');
var newer = require('gulp-newer');
var gulpFilter = require('gulp-filter');
var browserSync = require('browser-sync');
var rename = require('gulp-rename');
var runSequence = require('run-sequence');
var debug = require('gulp-debug');

// Templates. //
var mustache = require("gulp-mustache");

// Styles. //
var sass = require('gulp-sass');
var mmq = require('gulp-merge-media-queries');
var minifycss = require('gulp-minify-css');
var autoprefixer = require('gulp-autoprefixer');

// Scripts. //
var wp = require('webpack');
var webpack = require('webpack-stream');
var named = require('vinyl-named');

// Images. //
var responsive = require('gulp-responsive');
var responsiveFactory = require('C:\\DEV\\projects_addons\\gulp-responsive-factory');

var projectPath = process.cwd();
var gulpPath = __dirname;

// Configuration. //
var Configure = require(gulpPath+'/gulpfile_config.js');
var conf;
if (typeof Configure==='function') {
	conf = new Configure();
	conf = conf.load(projectPath+'/gulpfile_config.js');
	conf.webpack = require(projectPath+'/webpack.config.js');
}



//
//
// Clean.
//
//
function clean (callback) {
	conf.node = this;
	conf.tasks.clean = true;

	return Q

		.fcall(function(){
			return del(conf.getBuild());
		})
		
		.then(function(){
			if (conf.local.use) {
				return del(conf.getBuildLocal(), {force:true} ,function (err, deletedFiles) {
					if (err) {
						throw new Error("Can't delete file: "+deletedFiles.join("\n"));
					}
				});
			}
			return true;
		})

		.then(function() {
			conf.tasks.clean = false;
		});

}

//
//
// HTML.
//
//
function build_html (callback) {
	conf.node = this;
	conf.tasks.html = true;

	gulp.src(conf.getSource('html'), {base: conf.source.folder})

		.pipe(responsiveFactory({
			base: 'img', 
			where: conf.getSource('img')
		}))

		.pipe(mustache(conf.mustache))

		.pipe(gulpif( 
							conf.local.use,
							gulp.dest(conf.getBuildLocal())))

		.pipe(gulp.dest(conf.getBuild()))

		.on('end', function(){
			conf.tasks.html = false;
		})

		.on('end', function(){
			if (Object.getOwnPropertyNames(responsiveFactory.render).length === 0) {
				browserSync.reload();
				responsiveFactory.renderClear();
				if (typeof callback==='function') {
					callback();
				}
			} else {
				if (!conf.tasks.php && !conf.tasks.style) {
					runSequence(['image'], callback);
				} else {
					if (typeof callback==='function') {
						callback();
					}	
				}
			}
		});

}

//
//
// PHP.
//
//
function build_php (callback) {
	conf.node = this;
	conf.tasks.php = true;

	gulp.src(conf.getSource('php'), {base: conf.source.folder})

		.pipe(responsiveFactory({
			base: 'img', 
			where: conf.getSource('img')
		}))

		.pipe(mustache(conf.mustache))

		.pipe(gulpif( 
							conf.local.use,
							gulp.dest(conf.getBuildLocal())))

		.pipe(gulp.dest(conf.getBuild()))
		
		.on('end', function(){
			conf.tasks.php = false;
		})

		.on('end', function(){
			if (Object.getOwnPropertyNames(responsiveFactory.render).length === 0) {
				browserSync.reload();
				responsiveFactory.renderClear();
				if (typeof callback==='function') {
					callback();
				}
			} else {
				if (!conf.tasks.html && !conf.tasks.style) {
					runSequence(['image'], callback);
				} else {
					if (typeof callback==='function') {
						callback();
					}
				}
			}
		});

}

//
//
// Style.
// 
// 
function build_style (callback) {
	conf.node = this;
	conf.tasks.style = true;

	gulp.src(conf.getSource('style'))

    // .pipe(debug({title: '   FILES > '}))

		.pipe(gulpif( 
							!conf.isMaster(), 
							sourcemaps.init()) )
		
		.pipe(sass({
			includePaths: conf.bower.includesForScss
		}))

		.on("error", function(error){
			conf.notify({
				title: error.name +  ' line: ' + error.line,
				message: error.message,
				icon: 'C:\\DEV\\___assets\\sass_error.png'}, this);
		})

		.pipe(responsiveFactory({
			base: 'img', 
			where: conf.getSource('img')
		}))

		.pipe(gulpif(
							conf.isMaster(),
							mmq({ log: true })))

		.on("error", function(error) {
			conf.notify({
				title: 'css-mmq error',
				error: error,
			});
		})

		.pipe(gulpif(
							conf.isMaster(),
							minifycss()))

		.on("error", function(error) {
			conf.notify({
				title: 'css-minify error',
				error: error,
			});
		})

		.pipe(size())

		.pipe(gulpif( 
							!conf.isMaster(), 
							sourcemaps.write()))

		.pipe(gulp.dest(function(file) {
			if(conf.cms=='wordpress' && path.basename(file.path)==='style.css') {
				return conf.getBuild();
			}else{
				return conf.getBuild('folder_style');
			}
		}))

		.pipe(gulpif( 
							conf.local.use,
							gulp.dest(conf.getBuildLocal('folder_style'))))
		
		.on('end', function(){
			conf.tasks.style = false;
		})

		.on('end', function(){
			if (Object.getOwnPropertyNames(responsiveFactory.render).length === 0) {
				responsiveFactory.renderClear();
				if (typeof callback==='function') {
					callback();
				}
			} else {
				if (!conf.tasks.php && !conf.tasks.html) {
					runSequence(['image'], callback);
				} else {
					if (typeof callback==='function') {
						callback();
					}
				}
			}
		})

		.pipe(browserSync.stream());

}

//
//
// Script.
// 
// 
function build_script (callback) {
	conf.node = this;
	conf.tasks.script = true;

	// webpack config update //
	if (conf.isMaster()) {
		conf.webpack.devtool = '';
		conf.webpack['optimize-occurence-order'] = true;
		conf.webpack['optimize-minimize'] = true;
		conf.webpack.plugins = [
			new wp.optimize.UglifyJsPlugin({
				// include: /\.min\.js$/,
				minimize: true})];
	}

  return gulp.src(conf.getSource('script'))

    // .pipe(debug({title: '   FILES > '}))

  	.pipe(named())

    .pipe(webpack(conf.webpack, null, function(err, stats) {
  		var webpackTime = (stats.endTime-stats.startTime)+'ms';
  		util.log('webpack time: '+webpackTime);
  		browserSync.reload();
			conf.notify({
				title: 'Webpack',
				message: 'in ' + webpackTime,
				sound: false,
			});
  	}))

		.on("error", function(error){
			conf.notify({
				error: error,
				}, this);
		})

    .pipe(gulpif( 
						conf.local.use,
						gulp.dest(conf.getBuildLocal('folder_script'))))

    .pipe(gulp.dest(conf.getBuild('folder_script')))

    .on('end', function(){
			conf.tasks.script = false;
		});

}

//
//
// Images.
//
//
function build_image (callback) {
	conf.node = this;
	conf.tasks.images = true;

	var hasRender = responsiveFactory.hasRender();
	if (!hasRender && responsiveFactory.hasCache()) {
		responsiveFactory.render = responsiveFactory.cache['default'];
		hasRender = true;
	}
	var dest = conf.getBuild('folder_image');

	gulp.src(conf.getSource('image'))

		.pipe(
			gulpif(
				!hasRender,
				newer(dest)))

		// ! gif, ! ico
		.pipe(gulpFilter('**/*.{jpg,jpeg,png,webp,tif,tiff}'))

		.pipe(gulpFilter(Object.keys(responsiveFactory.render)))

		// .pipe(debug({title:'   FILES > '}))

		.pipe(responsive(
			responsiveFactory.render,
			conf.image
			))
				
		.on("error", function(error){
			conf.notify({
				error: error,
				}, this);
		})

		.pipe(gulp.dest(dest))
	
		.pipe(gulpif( 
							conf.local.use,
							gulp.dest(conf.getBuildLocal('folder_image'))))

		.on('end', browserSync.reload)

		.on('end', responsiveFactory.renderClear)

		.on('end', function(){
			if (typeof callback==='function') {
				callback();
				conf.tasks.images = false;
			}
		});
	
}

//
//
// Rest.
// 
// 
function build_rest (callback) {
	conf.node = this;
	conf.tasks.rest = true;

	return gulp.src(conf.getSource('rest'), { base: conf.source.folder })

		.pipe(gulp.dest(conf.getBuild()))

		.pipe(gulpif( 
							conf.local.use,
							gulp.dest(conf.getBuildLocal())))

		.on('end', browserSync.reload)

		.on('end', function () {
			conf.tasks.rest = false;
		});

}

function build_import (callback) {
	conf.node = this;
	conf.tasks.import = true;
	if (conf.import && Object.keys(conf.import).length) {
		var src, trg, trgLocal;
		var files = conf.import;
		var filesLength = Object.keys(files).length;
		var count = 0;

		var onEnd = function (){
			count++;
			if (count===filesLength) {
				callback();
				conf.tasks.import = false;
			}
		};

		for(src in files) {
			trg = conf.getBuild(files[src]);
			trgLocal = conf.getBuildLocal(files[src]);
			if (filesystem.lstatSync(src).isDirectory()) {
				src += '/**/*';
			}
			src = path.normalize(src);
			gulp.src(src, {base: ''})
				// .pipe(debug({title:'   FILES > '}))
				.pipe(gulp.dest(trg))
				.pipe(gulpif(
									conf.local.use,
									gulp.dest(trgLocal)))
				.on('end', onEnd);
		}
	} else {
		callback();
		conf.tasks.import = false;
	}

}

//
//
// Watch.
// 
// 
function watch (callback) {
	conf.node = this;
	console.log('___WATCH___');

	if(conf.isSync()){
		browserSync.create();
		// browserSync.use(htmlInjector, {});
		browserSync.init({
			proxy: conf.local.host,
			// Here you can disable/enable each feature individually //
			ghostMode: {
				clicks: true,
				forms: true,
				scroll: false
			},
			// browser: "google chrome",//["google chrome", "firefox"], // default
			logLevel: "info",
			// Don't show any notifications in the browser. //
			notify: true,
			// plugins: ["bs-html-injector"]
		});
	}

	function wErr (error) {
		console.error(error);
		conf.notify({
			title: 'WATCH ERROR',
			icon: 'C:\\DEV\\___assets\\gulp.png',
			error: error,
		});
	}

	gulp.watch(conf.getSource('html'), ['html']).on('error', wErr);
	gulp.watch(conf.getSource('php'), ['php']).on('error', wErr);
	gulp.watch(conf.getSource('style_watch'), ['style']).on('error', wErr);
	gulp.watch(conf.getSource('image'), ['image']).on('error', wErr);
	gulp.watch(conf.getSource('rest'), ['rest']).on('error', wErr);
	gulp.watch(conf.getSource('script'), ['script']).on('error',wErr);
	gulp.watch(['gulpfile_config.js'], ['reload_config']).on('error',wErr);

	conf.notify({
		title: 'GULP START',
		icon: 'C:\\DEV\\___assets\\gulp.png',		
	});

}

//
//
// Gulp Tasks.
// 
// 
gulp.task('______DEVELOPMENT', 
							[
							'html',
							 'php',
							 'style',
							 'script',
							 // 'image',
							 'rest_import',
							 'rest'
							 ]);

gulp.task('______DEVELOPMENT_sync', 
					['html',
					 'php',
					 'style',
					 'script',
					 //'image',
					 'rest_import',
					 'rest'], watch);

gulp.task('______MASTER', 
							['html',
							 'php',
							 'style',
							 'script',
							 //'image',
							 'rest_import',
							 'rest']);

gulp.task('______MASTER_sync', 
							['html',
							 'php',
							 'style',
							 'script',
							 //'image',
							 'rest_import',
							 'rest'], watch);

gulp.task('clean_build', clean);

gulp.task('clean_master', clean);

gulp.task('html', build_html);

gulp.task('php', build_php);

gulp.task('style', build_style);

gulp.task('script', build_script );

gulp.task('image', build_image);

gulp.task('rest_import', build_import);

gulp.task('rest', build_rest);

gulp.task('reload_config', function(callback) {

	conf.load(projectPath+'/gulpfile_config.js');
	runSequence(['php', 'html', 'style', 'script'],
              callback);

});
