const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (file.endsWith('.js')) {
            let buffer = fs.readFileSync(fullPath);
            
            // Check for BOM (EF BB BF)
            if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
                buffer = buffer.slice(3);
            }
            
            let content = buffer.toString('utf8');
            
            // Check for double encoding (e.g. Ã¼ instead of ü)
            // A common pattern is C3 83 followed by some byte.
            // We can try to decode it as if it was Windows-1252 and then treat as UTF-8 again.
            // Or just do replacements for common ones.
            
            const fixes = {
                'Ã¤': 'ä', 'Ã¶': 'ö', 'Ã¼': 'ü',
                'Ã„': 'Ä', 'Ã–': 'Ö', 'Ãœ': 'Ü',
                'ÃŸ': 'ß', 'Â·': '·',
                'â•': '═', 'â•—': '╗', 'â•š': '╚', 'â•': '═',
                'â€“': '–', 'â€”': '—', 'â€™': '’', 'â€œ': '“', 'â€\u009d': '”'
            };
            
            let fixed = false;
            for (const [mangled, correct] of Object.entries(fixes)) {
                if (content.includes(mangled)) {
                    content = content.split(mangled).join(correct);
                    fixed = true;
                }
            }
            
            // Also handle the case where it was read as UTF-16? 
            // Probably not likely here.
            
            fs.writeFileSync(fullPath, content, 'utf8');
            if (fixed) console.log(`Fixed mangling in ${fullPath}`);
            else console.log(`Ensured UTF-8 (no BOM) for ${fullPath}`);
        }
    }
}

const targetDir = process.argv[2];
if (targetDir) {
    processDir(targetDir);
}
