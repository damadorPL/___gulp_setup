var path = require('path');

/**
 * Configure object class
 * 
 */
function Configure (nodeObj) {
	
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

	this.ftp = {
		use: false,
		dir: '/krystianmazur/' + this.name,
		host: "ftp.krystianmazur.pl",
		user: "mono.krystianm-admin",
		pass: "Alamakota1",
		parallel: 2,
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

		php: [
			'*.php',
			'lib/**',
			'templates/*.php',
		],
		html: ['*.html', '*.htm'],
		style: ['styles/**/*.css', 'styles/sass/**/*.scss'],
		script: ['js/**/*.js'],
		script_lint: ['js/*.js','!js/*.min.js'],
		coffee: ['js/*.coffee'],
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
		// some_name: {
		// 	from: 'file_name',
		// 	to: 'destination_folder'
		// },
	};
	
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
		dir: __dirname + '/bower_components',
		// We can @import in scss file
		includesForScss: [
			// bowerDir + '/bootstrap-sass-official/assets/stylesheets',
			// bowerDir + '/fontawesome/scss',
			// bowerDir+'/',
		],
	};

	return this;
}
 
/**
 * Deep merge objects.
 * 
 * @param  {object} output One or more object. First object
 *                         is output object.
 * @return {object}        Merged object.
 */
Configure.prototype.merge = function () {
	var object, key, value, sourceKey;
  for (var i = 0; i < arguments.length; i++) {
		object = arguments[i];
		for (key in object) {
			value = object[key];
			if (typeof this[key]==='undefined') {
				this[key] = value;
			} else {
				if (!!(value && typeof value === 'object')) {
					this[key] = arguments.callee(sourceKey, value);
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
 * Check is gulp master task.
 * 
 * @return {Boolean}
 */
Configure.prototype.isMaster = function () {
	if (!this.masterTask) {
		if (this.nodeObj) {
			if (this.nodeObj.seq!==undefined) {
				var taskName = this.nodeObj.seq.slice(-1)[0];
				if (/master/i.test(taskName)) {
					this.masterTask = true;
				}
			}	
		}
	}
	return this.masterTask;
};


module.exports = Configure;