var defaults = { src: "", dest: "" };
var aliases  = { "-s": "src", "-d": "dest", "-h": "help", "-v": "verbose" };

function Argv(args) {
    this.args = args;
}

Argv.prototype.get = function(key) {
    return ( key in this.args ) ? this.args[key] : null;
};

Argv.parse = function() {
    var argv   = [].slice.call(process.argv, 2),
        parsed = {};

    argv.forEach(function(arg) {
        var pv;

        if ( /^\-\-/.test(arg) ) {
            pv = arg.replace(/^\-\-/, '').trim().split("=");
            if ( pv[0] in defaults ) {
                parsed[pv[0]] = pv[1];
            }
         } else if ( arg.slice(0, 2) in aliases ) {
            parsed[aliases[arg.slice(0, 2)]] = arg.slice(2) || true;
         }
    });

    Object.keys(defaults).forEach(function(k) {
        if ( !(k in parsed) ) {
          parsed[k] = defaults[k];
        }
    });

    return new Argv(parsed);
};

module.exports = Argv;
