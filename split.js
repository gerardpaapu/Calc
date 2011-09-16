function split(target, components, unit) {
    var max = components.length,
        result = [],
        remainder = target,
        i, n, v, k;

    components = components.slice();
    components.sort(function (a, b) { return b - a; }); 

    for (i = 0; i < max; i++) {
        n = components[i];
        k = unit ? (String(n) + ' ' + unit) : String(n);

        if (i < max - 1) {
            v = Math.floor(remainder / n);
            remainder %= n;
        } else {
            v = Math.ceil(remainder / n);
        }

        result.push({ units: k, value: v});
    }

    return result;
}

var i = 0, max = 101;
for (i = 0; i < max; i++) {
    console.log(split(i, [1, 2, 4], 'cats'));
}
