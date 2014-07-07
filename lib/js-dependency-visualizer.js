var path = require('path');
var fs   = require('fs');
var args = require('./argv').parse();

function defaultOption() {
    return {
        assetPath:   path.resolve(__dirname, '../asset'),
        srcPath:     path.resolve(__dirname, '..'),
        destPath:    path.resolve(__dirname, '../visualize'),
        dependRegex: /@depend\s(.+)(?:\.js)?/g,
        classRegex:  /@class\s(.+)/
    };
}

function mixin(base, over) {
    Object.keys(over).forEach(function(key) {
        base[key] = over[key];
    });

    return base;
}

function Visualizer(option) {
    this.option  = mixin(defaultOption(), option || {});
    this.depends = [];
}

Visualizer.prototype.analyze = function() {
    this.depends = [
        "var dependencies = {",
        "    links:",
        "        ["
    ];

    this.findDependency(this.option.srcPath);
    this.depends.push(
        "        ]",
        "};"
    );

    // create Directory
    if ( ! fs.existsSync(this.option.destPath) ) {
        fs.mkdirSync(this.option.destPath);
    }
    this.ls(this.option.assetPath).forEach(function(file) {
        var src  = path.resolve(this.option.assetPath, file),
            dest = this.option.destPath + '/' +  file;

        this.copy(src, dest);
    }.bind(this));
    fs.writeFileSync(this.option.destPath + '/dependencyData.js', this.depends.join('\n'), {encoding: 'utf8'});
    return this.depends.join('\n');
};

Visualizer.prototype.isDir = function(src) {
    var stat = fs.statSync(src);

    return stat.isDirectory();
};

Visualizer.prototype.copy = function(src, dest) {
    var buffer = fs.readFileSync(src);

    fs.writeFileSync(dest, buffer, {encoding: 'utf8'});
};

Visualizer.prototype.ls = function(src) {
    return ( this.isDir(src) ) ? fs.readdirSync(src) : [src];
};

Visualizer.prototype.getFileNameBody = function(file) {
    return path.basename(file).replace(/\.js$/, '');
};

Visualizer.prototype.log = function(message) {
    if ( args.get('verbose') ) {
        console.log(message);
    }
};


Visualizer.prototype.findDependency = function(src) {
    var fileList = this.ls(src),
        option   = this.option,
        that     = this;

    fileList.forEach(function(file) {
        var filePath = path.resolve(src, file),
            klass,
            json,
            buffer,
            match;

        if ( ! fs.existsSync(filePath) ) {
            that.log('[WARNING]: ' + filePath + ' is not exists.');
            return;
        }

        that.log('[INFO]: ' + filePath + ' processing...');

        option.dependRegex.lastIndex = 0;
        klass = that.getFileNameBody(file);

        if ( that.isDir(filePath) ) {
            that.findDependency(filePath);
            return;
        }

        buffer = fs.readFileSync(filePath);
        if ( null !== (match = option.classRegex.exec(buffer)) ) {
            klass = that.getFileNameBody(match[1]);
            that.log('[INFO]: class annotation found. use "' + klass + '".');
        }

        while ( null !== (match = option.dependRegex.exec(buffer)) ) {
            json = {
                source: klass,
                dest:   that.getFileNameBody(match[1])
            };
            that.log('[INFO]: dependency found "' + json.dest + '" module.');
            that.depends.push('            ' + JSON.stringify(json) + ',');
        }
    });
};

module.exports = Visualizer;
