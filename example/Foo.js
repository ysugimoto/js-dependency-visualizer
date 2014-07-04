//@depend Bar.js

/**
 * Example class Foo
 *
 * @class Foo
 */
function Foo() {
    this.message = 'foo';
}

Foo.prototype.echo = function() {
    console.log(this.message);
};


