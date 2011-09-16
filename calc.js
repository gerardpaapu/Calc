// Calc
// ----
//
// A dumb/simple embeddable language for performing simple calculations
// It's so simple that you know it won't throw errors or run forever.
//
// e.g. ($area % 0.96) x 1.05 units 0.96
//      $area x 0.05 
//      (2 x $centreline_length) x (2 x $width)
//
// calc     := exp 'in' qtys | exp
// qtys     := qty ',' qtys | qty  
// qty      := number unit | unit
// expr     := term '+' term | term '-' term | term
// term     := factor 'x' term | factor '%' term | factor
// factor   := number | reference | '(' expr ')' 
//
// Examples
// --------
//
// These are examples of inputs compiled to javascript.
//
// ($area % 0.96) x 1.05 units 0.96
// function (env) { return ((env.area/0.96)*1.05); }
//
// $area x 0.05
// function (env) { return (env.area*0.05); }
//
// (2 x $centreline_length) x (2 x $width)
// function (env) { return ((2*env.centreline_length)*(2*env.width)); }
/*jshint curly: false */
var Calc = {};
(function () {
    var TokenTypes,
        SIMPLE_TOKENS,
        KEYWORDS,
        PATTERNS,
        tokenize,
        readToken,
        assert,
        type,
        toString,

        parse,
        parseCalc,
        parseUnits,
        parseQuantity,
        parseExpression,
        parseTerm,
        parseFactor,

        compileCalc,
        compileExpression,
        compileApp,
        compileOp;

    Calc.TokenTypes = TokenTypes = {
        OPEN_PAREN: 'OPEN_PAREN',
        CLOSE_PAREN: 'CLOSE_PAREN',
        NUMBER: 'NUMBER',
        REFERENCE: 'REFERENCE',
        DIVIDE_OP: 'DIVIDE_OP',
        MULTIPLY_OP: 'MULTIPLY_OP',
        ADD_OP: 'ADD_OP',
        SUBTRACT_OP: 'SUBTRACT_OP',
        UNITS_KW: 'UNIT_KW',
        UNIT: 'UNIT', 
        COMMA: 'COMMA'
    }; 

    SIMPLE_TOKENS = {
        DIVIDE_OP: '%',
        MULTIPLY_OP: 'x',
        COMMA: ',',
        ADD_OP: '+',
        SUBTRACT_OP: '-',
        OPEN_PAREN: '(',
        CLOSE_PAREN: ')',
        UNITS_KW: 'in'
    };

    PATTERNS = {
        NUMBER: /^-?(0|([1-9]\d*))(\.\d+)?((e|E)(\+|\-)\d+)?/,
        REFERENCE: /^\$(\w+)/,
        UNIT: /^[a-z]+\d?/
    };

    Calc.tokenize = tokenize = function (str) {
        var tokens = [], i;
        for (i = 0; i < str.length; i = readToken(tokens, str, i)) { }
        return tokens;
    };

    readToken = function (tokens, str, i) {
        var char, head, match, slice, key, end;

        char = str.charAt(i);

        if (char == ' ' || char == '\t' || char == '\n') {
            return i + 1;
        }

        head = str.slice(i);

        for (key in SIMPLE_TOKENS) if (SIMPLE_TOKENS.hasOwnProperty(key)) {
            assert(key in TokenTypes, key + ' is a TokenType');

            end = i + SIMPLE_TOKENS[key].length; 
            slice = str.slice(i, end); 

            if (slice === SIMPLE_TOKENS[key]) {
                tokens.push({ type: TokenTypes[key] });
                return end;
            }
        }

        for (key in PATTERNS) if (PATTERNS.hasOwnProperty(key)) { 
            assert(key in TokenTypes, key + ' is a TokenType');

            match = PATTERNS[key].exec(head);

            if (match) {
                tokens.push({ type: TokenTypes[key], value: match[0]});
                return i + match[0].length; 
            }
        }

        throw new Error("Couldn't tokenize " + str + " @ " + i + "'" + char + "'");
    };

    Calc.parse = function (str) {
        var tokens = tokenize(str);
        return Calc.parseTokens(tokens);
    };

    Calc.parseTokens = function (tokens) {
        var tree = parseCalc(tokens);
        assert(tokens.length === 0, 'Should have consumed all the tokens');
        return tree;
    };

    parseCalc = function (tokens) {
        var expr = parseExpression(tokens), 
            unit = null,
            unitlist = null;

        if (tokens.length > 0) {
            assert(tokens.shift().type === TokenTypes.UNITS_KW, 'expected "in" keyword');
            unitlist = [];
            unitlist.push(parseQuantity( tokens ));
        }

        while (tokens.length > 0) {
            assert(tokens.shift().type === TokenTypes.COMMA, 'expected comma');
            unitlist.push( parseQuantity(tokens) );
        }

        return {
            expression: expr,
            quantities: unitlist
        };
    };

    parseQuantity = function (tokens) {
        var qty = { units: null, value: null },
            first = tokens.shift(),
            second;

        switch (first.type) {
            case TokenTypes.NUMBER:
                second = tokens.shift(); 
                return {
                    value: first.value,
                    units: second.value
                };

            case TokenTypes.UNIT:
                return { units: first.value };

            default:
                throw new Error('Quantity Expected');
        } 
    };

    parseExpression = function (tokens) {
        var left = parseTerm(tokens),
            operator = tokens.length > 0 && tokens[0].type,
            right;

        switch (operator) {
            case TokenTypes.ADD_OP:
            case TokenTypes.SUBTRACT_OP:
                tokens.shift();
                right = parseTerm(tokens);
                return [operator, left, right];

            default:
                return left;
        }
    };

    parseTerm = function (tokens) {
        var left = parseFactor(tokens),
            operator = tokens.length > 0 && tokens[0].type,
            right;

        switch (operator) {
            case TokenTypes.MULTIPLY_OP:
            case TokenTypes.DIVIDE_OP:
                tokens.shift();
                right = parseTerm(tokens);
                return [operator, left, right];

            default:
                return left;
        }
    };

    parseFactor = function (tokens) {
        switch (tokens[0].type) {
            case TokenTypes.REFERENCE:
                return [TokenTypes.REFERENCE, tokens.shift().value];

            case TokenTypes.NUMBER:
                return Number(tokens.shift().value);
            
            case TokenTypes.OPEN_PAREN:
                tokens.shift();
                var value = parseExpression(tokens);
                assert(tokens.shift().type === TokenTypes.CLOSE_PAREN, 'expecting closing paren');
                return value;

            default: 
                throw new Error('Couldn\'t parse ' + tokens[0].type);
        }
    };


    Calc.compile = function (str) {
        var tree = Calc.parse(str);
        return compileCalc(tree);
    };

    compileCalc = function (tree) {
        if (tree.quantities === null) {  
            return ['function (env) { return ', compileExpression(tree.expression), '; }'].join('');
        } else {
            return ['function (env) { return ', compileExpression(tree.expression), ' + "', tree.quantities[0].units, '"; }'].join('');
        }
    };

    compileExpression = function (exp) {
        switch (type(exp)) {
            case "number":
                return exp.toString(10);

            case "array":
                return compileApp(exp);
        }
    };

    compileOp = function (op, left, right) {
        return [ '(', compileExpression(left), op, compileExpression(right), ')' ].join('');   
    };

    compileApp = function (exp) {
        var code = exp[0],
            left = exp[1],
            right = exp[2];

        switch (code) {
            case TokenTypes.REFERENCE:
                return 'env.' + left.slice(1);

            case TokenTypes.MULTIPLY_OP:
                return compileOp('*', left, right);

            case TokenTypes.ADD_OP:
                return compileOp('+', left, right);

            case TokenTypes.SUBTRACT_OP: 
                return compileOp('-', left, right);

            case TokenTypes.DIVIDE_OP:
                return compileOp('/', left, right);
        }
    };

    assert = function (test, message) {
        if (!test) {
            throw new Error(message || "Assertion failed");
        }
    };

    type = function (val) {
        /*jshint eqnull: true */
        return val == null  ? String(val)
            :  toString.call(val).slice(8, -1).toLowerCase();
    };

    toString = {}.toString;
}.call(null));
/*globals module: false */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calc;
}
