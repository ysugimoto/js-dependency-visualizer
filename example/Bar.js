//@depend Baz.js

/**
 * Example class Bar
 *
 * @class Bar
 */
function Bar() {
    this.mersage = 'bar';
}

Bar.prototype.echo = function() {
    console.log(this.message);
};
