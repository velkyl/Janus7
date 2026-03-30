const fs = require('fs');
const data = JSON.parse(fs.readFileSync('strings.json'));
data.slice(0, 50).forEach(d => console.log(d.file, d.text));
