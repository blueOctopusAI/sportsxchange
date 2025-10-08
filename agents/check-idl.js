#!/usr/bin/env node

import fs from 'fs';

const idl = JSON.parse(fs.readFileSync('../target/idl/sportsxchange.json', 'utf8'));

console.log('IDL Structure:');
console.log('- Instructions:', idl.instructions?.length || 0);
console.log('- Accounts:', idl.accounts?.length || 0);

if (idl.accounts && idl.accounts.length > 0) {
    console.log('\nAccount definitions:');
    idl.accounts.forEach(acc => {
        console.log(`  ${acc.name}:`, acc.type ? 'HAS TYPE' : 'MISSING TYPE');
    });
}

console.log('\nFirst account detail:');
console.log(JSON.stringify(idl.accounts?.[0], null, 2));
