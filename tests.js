var Calc = require('./calc.js');
/*globals console: false */
[
    '($area x 0.05) + 10 in kg',
    '($area % 0.96) x 1.05 in 0.96kg',
    '$area x 0.05',
    '(2 x $centreline_length) x (2 x $width)',
    '(($width x $height x 0.05) x 0.02 + 5.0) in 10m3, 20m3',
    '5 + 7',
    '5 x 7 x 10',
    '5 + 7 x 10',
    '(5 + 7) x 10'
].forEach(function (src) {
    try {
        console.log( Calc.compile(src) );
    } catch (err) {
        console.log('failed to parse', src, err.message);
    }
});
