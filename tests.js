var Calc = require('./calc.js');
/*globals console: false */
[
    '($area x 0.05) + 10 in kg',
    '($area / 0.96) x 1.05 in 0.96kg',
    '$area x 0.05',
    '(2 x $centreline_length) x (2 x $width)',
    '(($width x $height x 0.05) x 0.02 + 5.0) in 10m3, 20m3',
    '5 + 7',
    '5 x 7 x 10',
    '5 + 7 x 10',
    '(5 + 7) x 10'
].forEach(function (src) {
    console.log( src );
    console.log( 'parse tree:', Calc.parse(src) );
    console.log( 'vars:', Calc.vars(src) );
    console.log( 'render:', Calc.render(src, {
        area: 20,
        centreline_length: 34,
        width: 6,
        height: 9
    }) );
});
