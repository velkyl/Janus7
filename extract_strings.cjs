const fs = require('fs');
const path = require('path');

const directories = ['ui', 'phase7', 'phase8', 'templates'];
const targetRegex = />([^<a-zA-Z0-9]*[a-zA-ZäöüÄÖÜß]+[^<{]*)+</g;
const stringRegex = /['"]([^'"]*[a-zA-ZäöüÄÖÜß]{3,}[^'"]*)['"]/g; // Rough heuristic for JS strings

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const stringsFound = [];

directories.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    walkDir(dir, (filepath) => {
        if (!filepath.endsWith('.html') && !filepath.endsWith('.hbs') && !filepath.endsWith('.js')) return;
        const content = fs.readFileSync(filepath, 'utf8');

        let match;
        if (filepath.endsWith('.hbs') || filepath.endsWith('.html')) {
            while ((match = targetRegex.exec(content)) !== null) {
                let text = match[1].trim();
                // Exclude handlebars logic or already localized strings or numbers or pure symbols
                if (text && !text.includes('{{') && !text.includes('}}') && text.match(/[a-zA-ZäöüÄÖÜß]/) && text.length > 2) {
                     stringsFound.push({ file: filepath, text, match: match[0] });
                }
            }
        }
    });
});

console.log(`Found ${stringsFound.length} potential strings in HBS/HTML.`);
// write results to a json file to inspect
fs.writeFileSync('strings.json', JSON.stringify(stringsFound, null, 2));
