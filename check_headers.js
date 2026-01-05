const fs = require('fs');
const path = require('path');

const dataDir = path.join(process.cwd(), 'server', 'data');

try {
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));

    if (files.length === 0) {
        console.log('No CSV files found in server/data');
    } else {
        files.forEach(file => {
            const filePath = path.join(dataDir, file);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.split('\n');
                if (lines.length > 0) {
                    console.log(`\nFile: ${file}`);
                    console.log(`Headers: ${lines[0]}`);
                    // Print first row of data to see values
                    if (lines.length > 1) {
                        console.log(`Sample Row: ${lines[1]}`);
                    }
                }
            } catch (err) {
                console.error(`Error reading ${file}: ${err.message}`);
            }
        });
    }
} catch (err) {
    console.error(`Error accessing directory: ${err.message}`);
}
