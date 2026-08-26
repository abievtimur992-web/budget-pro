const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Replace the income categories mapping to include a fallback
const searchString = `{categories.filter(c => c.type === 'income').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}`;
                  
const replaceString = `{categories.filter(c => c.type === 'income').length > 0 ? (
                    categories.filter(c => c.type === 'income').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  ) : (
                    <option value="" disabled>Kategoriya joq! Budjet bóliminen qosıń</option>
                  )}`;

if (content.includes(searchString)) {
    content = content.replace(searchString, replaceString);
    fs.writeFileSync('src/pages/Dashboard.tsx', content, 'utf8');
    console.log('Fixed income categories fallback!');
} else {
    console.log('Search string not found.');
}
