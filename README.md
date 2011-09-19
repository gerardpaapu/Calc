Calc
----

A dumb/simple embeddable language for performing simple calculations
It's so simple that you know it won't throw errors or run forever.

        ($area / 0.96) x 1.05 in 0.96kg
        $area x 0.05 
        (2 x $centreline_length) x (2 x $width)

The first part of a Calc program is an expression, which can contain
numbers or variables with basic mathematical operators.

Variables are a word with a '$' at the start e.g. '$width'  

The operators are '+' for addition, '-' for subtraction, 'x' for
multiplication and '/' for division. Expressions may also be surrounded
by parentheses e.g. '(4 + 5) * 6'.

Optionally, a Calc program may end with quantities prefaced by the 'in'
keyword. A quantity is a number, a unit, or a number followed by a unit
e.g. 56, kg or 56kg.

A unit is any number of letters, optionally followed by a number.
e.g. kg, L, m3

If a quantity contains a number the result will be expressed in whole
multiples of that number, e.g. '4.5 in 1.5' -> '3 x 1.5'

If there are multiple quantities, the result will be split among them
e.g. '4.5 in 1.5, 3' -> '1 x 1.5', '1 x 3'

Calc.render(src, variables) -> [{ value: Number, units: String? }, ...]
==

Render the Calc program 'src' with the variables in 'variables', returns
an array of { value: Number, unit: String or null }.

Calc.vars(src) -> [ String, ... ]
==

Returns a list of the variables that the Calc program 'src' requires to
be defined.

Calc.parse(src) -> Tree
==

Returns the parse tree for the Calc program 'src', for debuggery or
meta-whatever. 

A BNF grammar for Calc:
==

    calc   := exp 'in' qtys | exp
    qtys   := qty ',' qtys | qty  
    qty    := number unit | unit
    expr   := term '+' term | term '-' term | term
    term   := factor 'x' term | factor '/' term | factor
    factor := number | reference | '(' expr ')' 
