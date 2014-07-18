var path = require('path');
var fs   = require('fs');
var args = require('./argv').parse();

function defaultOption() {
    return {
        files:       [],
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

Visualizer.makeFromPath = function(src) {
    return new Visualizer({
        files: ( Visualizer.prototype.isDir(src) ) ? fs.readdirSync(src) : [src]
    });
};

Visualizer.prototype.analyze = function() {
    this.depends = [
        "var dependencies = {",
        "    links:",
        "        ["
    ];

    this.findDependency(this.option.files);
    this.depends.push(
        "        ]",
        "};"
    );

    return this;
};

Visualizer.prototype.result = function() {
    return this.depends.join('\n');
};

Visualizer.prototype.isDir = function(src) {
    var stat = fs.statSync(src);

    return stat.isDirectory();
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


Visualizer.prototype.findDependency = function(fileList) {
    var option = this.option,
        that   = this;

    fileList.forEach(function(filePath) {
        var klass,
            json,
            buffer,
            match;

        if ( ! fs.existsSync(filePath) ) {
            that.log('[WARNING]: ' + filePath + ' is not exists.');
            return;
        }

        that.log('[INFO]: ' + filePath + ' processing...');

        option.dependRegex.lastIndex = 0;

        if ( that.isDir(filePath) ) {
            that.findDependency(this.ls(filePath));
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
