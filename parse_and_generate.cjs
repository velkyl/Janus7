const fs = require('fs');
const path = require('path');

const dirs = ['ui', 'phase7', 'phase8', 'templates'];

let generatedJson = {};
let outputDiffs = '';

function generateKey(filepath, text) {
    let base = 'JANUS7';
    if (filepath.includes('phase7')) base += '.Phase7';
    else if (filepath.includes('phase8')) base += '.Phase8';
    else base += '.UI';

    let component = path.basename(filepath)
        .replace(/\.hbs|\.html|\.js/g, '')
        .replace(/^Janus/, '')
        .replace(/App$/, '')
        .replace(/[^a-zA-Z0-9]/g, '');
    if (!component) component = 'General';

    component = component.charAt(0).toUpperCase() + component.slice(1);

    let nameWords = text.replace(/[^a-zA-ZäöüÄÖÜß]/g, ' ')
        .trim().split(/\s+/).filter(w => w.length > 0).slice(0, 4);

    let name = nameWords.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    if (!name) name = 'Text';

    let key = `${base}.${component}.${name}`;
    let i = 2;
    while (generatedJson[key] && generatedJson[key] !== text) {
        key = `${base}.${component}.${name}${i}`;
        i++;
    }
    return key;
}

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

const filesToProcess = [];
dirs.forEach(dir => walkDir(dir, (f) => {
    if (f.endsWith('.hbs') || f.endsWith('.html') || f.endsWith('.js')) {
        filesToProcess.push(f);
    }
}));

const textRegex = />([^<a-zA-Z0-9]*[a-zA-ZäöüÄÖÜß]+[^<{]*)+</g;
const titleRegex = /title="([^"]*[a-zA-ZäöüÄÖÜß]{3,}[^"]*)"/g;

filesToProcess.forEach(filepath => {
    let content = fs.readFileSync(filepath, 'utf8');
    let replacements = [];

    if (filepath.endsWith('.hbs') || filepath.endsWith('.html')) {
        let match;
        while ((match = textRegex.exec(content)) !== null) {
            let rawMatch = match[0];
            let innerText = match[1];
            let text = innerText.trim();
            // Reject technical strings, Handlebars expressions, HTML entities, and short words
            if (text && !text.includes('{{') && !text.includes('}}') && !text.includes('&') && /[a-zA-ZäöüÄÖÜß]/.test(text) && text.length > 2) {
                // Reject if it's likely a technical class like "fas fa-sync" or pure symbols
                if (!/^[a-z0-9-]+$/.test(text)) {
                    let key = generateKey(filepath, text);
                    generatedJson[key] = text;
                    replacements.push({
                        original: rawMatch,
                        replacement: rawMatch.replace(text, `{{localize "${key}"}}`)
                    });
                }
            }
        }

        while ((match = titleRegex.exec(content)) !== null) {
            let rawMatch = match[0];
            let text = match[1].trim();
            if (text && !text.includes('{{') && !text.includes('}}') && text.length > 2) {
                let key = generateKey(filepath, text);
                generatedJson[key] = text;
                replacements.push({
                    original: rawMatch,
                    replacement: `title="{{localize "${key}"}}"`
                });
            }
        }
    } else if (filepath.endsWith('.js')) {
        let lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            if (line.includes('console.') || line.includes('Error(') || line.includes('logger.') || line.includes('.debug(') || line.includes('JANUS7.') || line.includes('localize(')) continue;

            const propRegex = /(title|label|name|hint|tooltip):\s*(['"])([^'"]*[a-zA-ZäöüÄÖÜß]{3,}[^'"]*)\2/g;
            let match;
            while ((match = propRegex.exec(line)) !== null) {
                let rawMatch = match[0];
                let prop = match[1];
                let text = match[3];
                // Further filter technical strings
                if (text && !text.includes('{{') && !text.includes('.hbs') && !text.includes('janus7') && !text.includes('/') && !text.includes('.') && text.length > 2) {
                     let key = generateKey(filepath, text);
                     generatedJson[key] = text;
                     replacements.push({
                         original: rawMatch,
                         replacement: `${prop}: game.i18n.localize("${key}")`
                     });
                }
            }
        }
    }

    if (replacements.length > 0) {
        const uniqueReplacements = [];
        const seen = new Set();
        for (const r of replacements) {
            if (!seen.has(r.original)) {
                seen.add(r.original);
                uniqueReplacements.push(r);
            }
        }

        outputDiffs += `\n### File: ${filepath}\n\`\`\`text\n`;
        let lines = content.split('\n');

        uniqueReplacements.forEach(r => {
             for (let i = 0; i < lines.length; i++) {
                 if (lines[i].includes(r.original)) {
                     outputDiffs += `<<<<<<< SEARCH\n${lines[i]}\n=======\n${lines[i].replace(r.original, r.replacement)}\n>>>>>>> REPLACE\n\n`;
                     lines[i] = lines[i].replace(r.original, r.replacement);
                 }
             }
        });
        outputDiffs += `\`\`\`\n`;
    }
});

fs.writeFileSync('output_diffs.md', outputDiffs);
fs.writeFileSync('output_json.json', JSON.stringify(generatedJson, null, 2));

console.log(`Extraction complete. Found ${Object.keys(generatedJson).length} strings.`);
