var path    = require('path');
var fs      = require('fs');
var LIBPATH = path.resolve(__dirname, '../example');
var OUTPUT  = path.resolve(__dirname, '../asset');

var depends = [
    "var dependencies = {",
    "    links:",
    "        ["
];

function ls(dir) {
    return fs.readdirSync(dir);
}

function isDir(p) {
    var stat = fs.statSync(p);

    return stat.isDirectory();
}

function findDependency(p) {
    ls(p).forEach(function(file) {
        var filePath  = path.resolve(p, file),
            regex     = /\/\/@depend\s(.+)(?:\.js)?/g,
            klass     = path.basename(file),
            buffer,
            ext,
            match;

        regex.lastIndex = 0;
        ext = path.extname(file);
        klass = klass.replace(new RegExp(ext + '$'), '');

        if ( isDir(filePath) ) {
            findDependency(filePath);
        } else {
            buffer = fs.readFileSync(filePath);
            if ( null !== (match = /@class\s(.+)/.exec(buffer)) ) {
                klass = match[1];
                ext = path.extname(match[1]);
                klass = klass.replace(new RegExp(ext + '$'), '');
            }

            while ( null !== (match = regex.exec(buffer)) ) {
                ext = path.extname(match[1]);
                depends.push(JSON.stringify({source: klass, dest: path.basename(match[1]).replace(new RegExp(ext + '$'), '')}) + ',');
            }
        }
    });
}

findDependency(LIBPATH);

depends.push(
    "        ]",
    "};"
);

fs.writeFileSync(OUTPUT + '/origin.js', depends.join('\n'), {encoding: 'utf8'});

