
function generate() {
    const ops = ['+', '-', '*', '/'];
    const eqs = new Set();

    // Method 1: A op B = C (Length 8)
    // 2+2=4 (5)
    // 10+10=20 (8)
    // 100-20=80 (9)
    // 99*9=891 (8)

    for (let a = 0; a <= 999; a++) {
        for (let b = 0; b <= 999; b++) {
            for (const op of ops) {
                let res;
                if (op === '+') res = a + b;
                if (op === '-') res = a - b;
                if (op === '*') res = a * b;
                if (op === '/') {
                    if (b === 0 || a % b !== 0) continue;
                    res = a / b;
                }
                if (res < 0) continue;

                const eq = `${a}${op}${b}=${res}`;
                if (eq.length === 8) {
                    if (isValid(eq)) eqs.add(eq);
                }
            }
        }
    }

    // Method 2: A op B op C = D (Length 8)
    // 1+2+3=6 (7)
    // 1+2+3=10 (8) -> A=1, B=2, C=3? No 6. 
    // 2*3+4=10 (8)
    for (let a = 0; a <= 20; a++) {
        for (let b = 0; b <= 20; b++) {
            for (let c = 0; c <= 20; c++) {
                for (const op1 of ops) {
                    for (const op2 of ops) {
                        let res;
                        // Evaluate A op1 B op2 C
                        // Naive evaluation for specific cases to avoid 'eval' issues or order of ops complexity if simple
                        // Let's use precedence: * / first
                        // Valid combos: 
                        // + + : (a+b)+c
                        // + - : (a+b)-c
                        // + * : a+(b*c)
                        // + / : a+(b/c)
                        // ...

                        // Helper to calc
                        const calc = (x, y, o) => {
                            if (o === '+') return x + y;
                            if (o === '-') return x - y;
                            if (o === '*') return x * y;
                            if (o === '/') return (y !== 0 && x % y === 0) ? x / y : null;
                            return null;
                        };

                        if ((op1 === '*' || op1 === '/') && (op2 === '+' || op2 === '-')) {
                            // (a op1 b) op2 c
                            const r1 = calc(a, b, op1);
                            if (r1 === null) continue;
                            res = calc(r1, c, op2);
                        } else if ((op2 === '*' || op2 === '/') && (op1 === '+' || op1 === '-')) {
                            // a op1 (b op2 c)
                            const r2 = calc(b, c, op2);
                            if (r2 === null) continue;
                            res = calc(a, r2, op1);
                        } else {
                            // Left to right for equal precedence (+,- or *,/)
                            const r1 = calc(a, b, op1);
                            if (r1 === null) continue;
                            res = calc(r1, c, op2);
                        }

                        if (res !== null && res >= 0 && Number.isInteger(res)) {
                            const eq = `${a}${op1}${b}${op2}${c}=${res}`;
                            if (eq.length === 8) {
                                if (isValid(eq)) eqs.add(eq);
                            }
                        }
                    }
                }
            }
        }
    }

    const list = Array.from(eqs);
    console.log(JSON.stringify(list, null, 2));
}

function isValid(eq) {
    const parts = eq.split(/[\+\-\*\/=]/);
    for (const p of parts) {
        if (p.length > 1 && p.startsWith('0')) return false;
    }
    return true;
}

generate();
