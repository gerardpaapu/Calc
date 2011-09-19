var Calc = {};
(function () {
    /*jshint curly: false, eqnull: true */
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
        parseFactor;

    TokenTypes = {
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
        DIVIDE_OP: '/',
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

    tokenize = function (str) {
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

    Calc.parse = parse = function (str) {
        var tokens = tokenize(str),
            tree = parseCalc(tokens);

        assert(tokens.length === 0);

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
                return tokens.shift().value.slice(1);

            case TokenTypes.NUMBER:
                return Number(tokens.shift().value);
            
            case TokenTypes.OPEN_PAREN:
                tokens.shift();
                var value = parseExpression(tokens);
                assert(tokens.shift().type === TokenTypes.CLOSE_PAREN, 'expecting closing paren');
                return value;

            default: 
                throw new Error("Couldn't parse " + tokens[0].type);
        }
    };

    var renderCalc,
        evalExpression,
        evalApp,
        vars,
        split,
        indexOf,
        joinSets;

    Calc.vars = function (src) {
        return vars( parse(src).expression );
    };

    vars = function (tree) {
        switch (type(tree)) {
            case 'number': return [];
            case 'string': return [ tree ];
            default:
                return joinSets(vars(tree[1]), vars(tree[2]));
        }
    };

    split = function (target, components, unit) {
        var max = components.length,
            result = [],
            remainder = target,
            i, n, v;

        components = components.slice();
        components.sort(function (a, b) { return b - a; }); 

        for (i = 0; i < max; i++) {
            n = components[i];

            if (i < max - 1) {
                v = Math.floor(remainder / n);
                remainder %= n;
            } else {
                v = Math.ceil(remainder / n);
            }

            if (v !== 0) {
                result.push({ units: String(n) + unit || '', value: v });
            }
        }

        return result;
    };

    joinSets = function (left, right) {
        var result = left.slice(),
            i = right.length;

        while (i--) {
            if (indexOf.call(result, right[i]) == -1) {
                result.push(right[i]); 
            }
        }

        return result;
    };

    Calc.render = renderCalc = function (src, env) {
        var tokens = tokenize(src),
            tree = parseCalc(tokens),
            value = evalExpression(tree.expression, env),
            components = [],
            unit, i, qtys;

        if (tree.quantities == null)  {
            return [{ value: value }];
        } else if (!tree.quantities[0].value) {
            return [{ value: value, units: tree.quantities[0].units }]; 
        } else {
            i = tree.quantities.length;
            unit = tree.quantities[0].units;
            qtys = [];

            while (i--) {
                assert(tree.quantities[i].units === unit, 'You can\'t mix units');
                qtys[i] = tree.quantities[i].value;
            }
            
            return split(value, qtys, unit);
        }
    }; 

    evalExpression = function (exp, env) {
        switch (type(exp)) {
            case "number": return exp;
            case "string": return env[exp];
            case "array":  return evalApp(exp, env);
        }
    };

    evalApp = function (exp, env) {
        var code = exp[0],
            left = exp[1],
            right = exp[2];

        switch (code) {
            case TokenTypes.MULTIPLY_OP:
                return evalExpression(left, env) * evalExpression(right, env);

            case TokenTypes.ADD_OP:
                return evalExpression(left, env) + evalExpression(right, env);

            case TokenTypes.SUBTRACT_OP: 
                return evalExpression(left, env) - evalExpression(right, env);

            case TokenTypes.DIVIDE_OP:
                return evalExpression(left, env) / evalExpression(right, env);
        }
    };

    assert = function (test, message) {
        if (!test) {
            throw new Error(message || "Assertion failed");
        }
    };

    type = function (val) {
        return val == null  ? String(val)
            :  toString.call(val).slice(8, -1).toLowerCase();
    };

    indexOf = [].indexOf || function (needle) {
        var i, max = this.length;
        for (i = 0; i < max; i++) {
            if (i in this && this[i] === needle) {
                return i;
            }
        }

        return -1;
    };

    toString = {}.toString;
}.call(null));

/*globals module: false */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calc;
}
