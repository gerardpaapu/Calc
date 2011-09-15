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
// calc     := exp 'units' unitlist | exp
// unitlist := number ',' unitlist | number 
// expr     := term | term '+' term | term '-' term 
// term     := factor | factor 'x' factor | factor '%' factor
// factor   := number | '(' expr ')' 
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

        parse,
        parseCalc,
        parseUnitlist,
        parseExpression,
        parseTerm,
        parseFactor;

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
        UNITS_KW: 'units'
    };

    PATTERNS = {
        NUMBER: /^-?(0|([1-9]\d*))(\.\d+)?((e|E)(\+|\-)\d+)?/,
        REFERENCE: /^\$(\w+)/
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
            unitlist = null;

        if (tokens.length) {
            assert(tokens[0].type === TokenTypes.UNITS_KW, 'expected "unit" keyword');
            unitlist = parseUnitList(tokens);
        }

        return {
            expression: expr,
            units: unitlist
        };
    };

    parseUnitList = function (tokens) {
        var units = [];
        
        assert(tokens[0].type === TokenTypes.UNITS_KW, 'Unexpected: ' + tokens[0].type);
        tokens.shift();
        assert(tokens[0].type === TokenTypes.NUMBER, 'Unexpected: ' + tokens[0].type);
        units.push(Number(tokens.shift().value));

        while (tokens.length > 0 &&
               tokens[0].type === TokenTypes.COMMA) {
            assert(tokens[0].type === TokenTypes.NUMBER);
            units.push(tokens.shift().value);
        } 

        return units;
    };

    parseExpression = function (tokens) {
        var left = parseTerm(tokens),
            operator = tokens.lengt > 0 && tokens[0].type,
            right;

        switch (operator) {
            case TokenTypes.ADD_OP:
            case TokenTypes.SUBTRACT_OP:
                tokens.shift(); // consume the operator
                right = parseTerm(tokens);
                return [operator, left, right];

            default:
                return left;
        }
    };

    parseTerm = function (tokens) {
        var left = parseFactor(tokens),
            operator = tokens[0].type,
            right;

        switch (operator) {
            case TokenTypes.MULTIPLY_OP:
            case TokenTypes.DIVIDE_OP:
                tokens.shift();
                right = parseFactor(tokens);
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
                throw new Error(tokens[0].type);
        }
    };

    var compileCalc,
        compileExpression,
        compileApp;

    Calc.compile = function (str) {
        tree = Calc.parse(str);
        return compileCalc(tree);
    };

    compileCalc = function (tree) {
        return ["function (env) { return ", compileExpression(tree.expression), "; }"].join('');
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
        return val == global ? "global"
            :  val == null  ? String(val)
            :  toString.call(val).slice(8, -1).toLowerCase();
    };
    
}.call(null));
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calc;
}
