
import fs from 'fs';

const eqs = JSON.parse(fs.readFileSync('tools/equations.json', 'utf-8'));

// Fisher-Yates shuffle
for (let i = eqs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eqs[i], eqs[j]] = [eqs[j], eqs[i]];
}

const selected = eqs.slice(0, 366); // Leap year support :)

const content = `export const EQUATIONS = ${JSON.stringify(selected, null, 2)};`;

fs.writeFileSync('src/shared/equations.ts', content);
console.log(`Wrote ${selected.length} equations to src/shared/equations.ts`);
