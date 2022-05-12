const fs = require('fs');

fs.writeFileSync('a.js', `const a = ${Math.random()};`);
