var util = require( 'gulp-util' );
var path = require('path');
var filesystem = require("fs");
var notifier = require('node-notifier');

var bowerDir = __dirname + '/bower_components';

/**
 * Configure object class
 * 
 */
function Configure (node) {
	
	this.node = node;
	this.tasks = {};

	//
	// Base.
	// 
	this.name= process.cwd().split('\\').pop();
	this.cms= '';	// ex. 'wordpress'
								// save style.css to main folder
	
	//
	// Files.
	// 
	this.local= {	// local server ex: xampp
		use: true,
		host: 'localhost/' + this.name,
		dir: 'C:\\xampp\\htdocs\\' + this.name + '\\',
	};

	this.archive = {
		use: false,
		dir: 'archives',
		dir2: 'C:\\DEV\\___archives\\' + this.name + '\\',
		//dir: "C:\\",
	};

	//
	// Files places.
	// 
	 
	//
	// DEV: '!**/_*', '!_*'
	//
	this.source = {	
		folder: 'source',
		folder_style: 'styles',
		folder_script: 'js',
		folder_image: 'img',

		php: ['**/*.php'],
		html: ['**/*.{html, htm}'],
		style: ['styles/*.css', 'styles/sass/*.scss'],
		style_watch: ['styles/**/*.css', 'styles/sass/**/*.scss'],
		// php: [
		// 	'*.php',
		// 	'lib/**',
		// 	'templates/*.php',
		// ],
		// html: ['*.html', '*.htm'],
		// style: ['styles/**/*.css', 'styles/sass/**/*.scss'],
		script: ['js/*.js'],
		script_lint: ['js/*.js','!js/*.min.js'],
		script_watch: ['js/**/*.js'],
		image: ['img/**'],
		rest: [
			'fonts/**',
			'languages/**'
		],
	};

	this.build = {
		folder: 'build',
		folder_style: 'css',
		folder_script: 'js',
		folder_image: 'img',
	};

	this.master = {
		folder: 'master',
		folder_style: 'css',
		folder_script: 'js',
		folder_image: 'img',
	};

	this.import = {
		// src: dest, 
		// use '\\'' not '/'
	};
	
	this.mustache = {},

	//
	//Image.
	//
	this.image = {
		quality: 93,
		progressive: true, // jpg,png
		withMetadata: true,
		errorOnEnlargement: false,
		interlaced: true,		// (gif)
		compressionLevel: 7,
	};

	//
	// Style.
	// 
	this.autoprefixer = [	// https://github.com/ai/autoprefixer
		// 'last 2 versions',
		'ie >= 11',
		'ie_mob >= 10',
		'ff >= 40',
		'chrome >= 44',
		'safari >= 8',
		'opera >= 33',
		'ios >= 8.4',
		'android >= 4.1',
		'bb >= 10'
	];

	this.bower = {
		dir: bowerDir,
		// We can @import in scss file
		includesForScss: [
			// bowerDir + '/bootstrap-sass-official/assets/stylesheets',
			// bowerDir + '/fontawesome/scss',
			bowerDir+'/',
		],
	};

	return this;
}
 
/**
 * Deep merge objects.
 * 
 * @param  {object} output One or more object. First object
 *                         is output object.
 * @return {object}        this (merged object).
 */
Configure.prototype.merge = function () {
	var object, key, value;
  for (var i = 0; i < arguments.length; i++) {
		object = arguments[i];
		for (key in object) {
			value = object[key];
			if (typeof this[key]==='undefined') {
				this[key] = value;
			} else {
				if (!!(value && typeof value === 'object')) {
					this[key] = arguments.callee.call(this[key], value);
				} else {
					this[key] = value;
				}
			}
		}
	}
	return this;
};

/**
 * Load or Reload local configuration files.
 * 
 * @return {[type]} [description]
 */
Configure.prototype.load = function (filePath, callback) {
	
	var localConfigFile = path.resolve(filePath);

	if (typeof require.cache[localConfigFile]!=='undefined') {
		delete require.cache[localConfigFile];
	}
	try{
		this.merge(require(localConfigFile));
	}catch(error){
		console.log('\nWARNING: Local config file error.\n');
	}
	if (typeof callback==='function') {
		callback();
	}
	return this;
};


/**
 * getFilesInFolder
 * 
 * @param  {string}  dir  Path.
 * @param  {boolean} deep Subfolders too.
 * @return {array}      	files
 */
Configure.prototype.getFilesInFolder = function (dir, deep) {

	var self = this;
	var results = [];
	filesystem.readdirSync(dir).forEach(function(file) {
		var f = dir+'/'+file;
		if (self.isDirectory(f)) {
			if (deep) {
				results = results.concat(self.getFilesInFolder(f, true));
			}
		} else {
			results.push(path.normalize(f));
		}
	});
	return results;

};

/**
 * Verify that path is file or not.
 * 
 * @param  {string}  file Path.
 * @return {Boolean}      
 */
Configure.prototype.isFile = function (filePath) {
	var stat = filesystem.statSync(filePath);
	if (stat && stat.isFile()) {
		return true;
	}
	return false;
};

/**
 * Verify that path is directory or not.
 * 
 * @param  {string}  dirPath Path.
 * @return {Boolean}         
 */
Configure.prototype.isDirectory = function (dirPath) {
	var stat = filesystem.statSync(dirPath);
	if (stat && stat.isDirectory()) {
		return true;
	}
	return false;
};

/**
 * Check is gulp master task.
 * 
 * @return {Boolean}
 */
Configure.prototype.isMaster = function () {
	if (typeof this.masterTask==='undefined') {
		this.masterTask = false;
		if (this.node) {
			if (this.node.seq!==undefined) {
				var taskName = this.node.seq.slice(-1)[0];
				if (/master/i.test(taskName)) {
					this.masterTask = true;
				}
			}	
		}
	}
	return this.masterTask;
};

/**
 * Check is browser sync. task (& watch files).
 * 
 * @return {Boolean}
 */
Configure.prototype.isSync = function () {
	if (typeof this.syncTask==='undefined') {
		this.syncTask = false;
		if (this.node) {
			if (this.node.seq!==undefined) {
				var taskName = this.node.seq.slice(-1)[0];
				if (/_sync/i.test(taskName)) {
					this.syncTask = true;
				}
			}	
		}
	}
	return this.syncTask;
};

/**
 * Add path to sting or array
 * @param  {string} where source/build/jquery/
 *                        jquery-ui/local.
 * @param  {string} type  image/script/rest/html/style/php
 * @return {string or aray}      
 */
function globs (p, dir) {//  where, type) {
	if (typeof dir==='undefined') {
		return path.normalize(p);
	} else if (typeof dir === 'string') {
		return path.normalize(p+'/'+dir);
	} else if(Array.isArray(dir)) {
		return dir.map(function (d){
			return path.normalize(p+'/'+d);
		});
	}
	return null;
}

Configure.prototype.getSource = function (type) {
	var dir = type;
	if (this.source[type]!==undefined) {
		dir = this.source[type];
	}
	return globs(this.source.folder, dir);
};

Configure.prototype.getBuild = function (type) {
	var dir = type;
	if (this.isMaster()) {
		if (this.master[type]!==undefined) {
			dir = this.master[type];
		}
		return globs(this.master.folder, dir);
	}
	if (this.build[type]!==undefined) {
		dir = this.build[type];
	}
	return globs(this.build.folder, dir);
};

Configure.prototype.getBuildLocal = function (type) {
	var dir = type;
	if (this.isMaster()) {
		if (this.master[type]!==undefined) {
			dir = this.master[type];
		}
		return globs(this.local.dir, dir);
	}
	if (this.build[type]!==undefined) {
		dir = this.build[type];
	}
	return globs(this.local.dir, dir);
};

Configure.prototype.notify = function (opts, that) {
	
	if (!opts.title) {
		if (opts.error && opts.error.plugin) {
			opts.title = opts.error.plugin.substring(0, 60);
		} else {
			opts.title = 'Error';
		}
	}
	if (!opts.message) {
		if (opts.error && opts.error.message) {
			opts.message = opts.error.message.substring(0, 160);
		} else {
			opts.message = '';
		}
	}
	opts.icon = opts.icon || '';
	opts.sound = typeof opts.sound!=='undefined' ? opts.sound : true;

	notifier.notify({
		'wait': false,
		'sound': opts.sound,
		'title': opts.title,
		'message': opts.message,
		'icon': opts.icon
	});
	if (that) {
		that.emit('end');
	}

	if (opts.error) {
		// util.log(opts.error);
		console.error(opts.error);
	}

};


module.exports = Configure;