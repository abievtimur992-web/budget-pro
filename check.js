const fs = require('fs');
const content = fs.readFileSync('src/pages/Analytics.tsx', 'utf8');
console.log("Contains Шығын?", content.includes('Шығын'));
console.log("Contains РЁС‹Т“С‹РЅ?", content.includes('РЁС‹Т“С‹РЅ'));
