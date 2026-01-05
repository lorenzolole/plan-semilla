const fs = require('fs');
const path = require('path');

// Configuration: Mapping keys to JSON files
const fileMapping = {
    'sp500': 'VOO_monthly_close.json',
    'sp500_index': '^GSPC_monthly_close.json',
    'nasdaq': 'QQQ_monthly_close.json',
    'nasdaq_index': '^NDX_monthly_close.json',
    'vt': 'VT_monthly_close.json',
    'smh': 'SMH_monthly_close.json',
    'schd': 'SCHD_monthly_close.json',
    'vnq': 'VNQ_monthly_close.json',
    'vwo': 'VWO_monthly_close.json',
    'bitcoin': 'BTC-USD_monthly_close.json',
    'ethereum': 'ETH-USD_monthly_close.json',
    'solana': 'SOL-USD_monthly_close.json',
    'bonosTesoro': 'TLT_monthly_close.json',
    'gold': 'GLD_monthly_close.json',
    'silver': 'SLV_monthly_close.json'
};

const internalDataDir = path.join(__dirname, 'data/Update Historical Data');
const targetFile = path.join(__dirname, 'historical_data.js');

// Helper to read JSON
function readJson(filename) {
    const filePath = path.join(internalDataDir, filename);
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// 1. Read existing file
// NOTE: Since the current file is broken (syntax error), we cannot reliably extract from it if the broken part prevents parsing.
// HOWEVER, we know the "broken" part is likely at the very end.
// The blocks we need to preserve are mostly intact in the upper/middle parts?
// Actually, if I overwrote it with a broken file, I might have lost the clean original versions unless I extract them carefully.
// BUT, the previous `historical_data.js` (before my first successful write) had the data.
// The *current* `historical_data.js` has the *new* data but a broken end.
// AND it has the preserved blocks (inflacion, utils, etc.) copied from the *original* file.
// So I can extract them from the *current* broken file, assuming they are complete blocks.

const existingContent = fs.readFileSync(targetFile, 'utf8');

// Helper to extract a block starting with a specific string and ending with a matching brace/bracket
function extractBlockByStart(content, startString) {
    const startIndex = content.indexOf(startString);
    if (startIndex === -1) return null;

    let braceCount = 0;
    let inBlock = false;
    let endIndex = -1;

    // Simple parser to find the end of the block (assuming valid JS)
    for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '{' || content[i] === '[') {
            braceCount++;
            inBlock = true;
        } else if (content[i] === '}' || content[i] === ']') {
            braceCount--;
            if (inBlock && braceCount === 0) {
                endIndex = i + 1; // Include the closing brace
                break;
            }
        }
    }

    if (endIndex !== -1) {
        return content.substring(startIndex, endIndex);
    }
    return null;
}

// 2. Extract preserved data sections (Manual Arrays)
// Since the file is huge, regex might be slow or fail stack size, but let's try regex for these specific small arrays
// CAUTION: The current file has `fondoLiquidez = [...]` inside `historicalData`?
// No, my previous script put them INSIDE `historicalData` object.
// So I should look for them inside `const historicalData = { ... }`.
// Actually, I can just use the manual regex approach again, it should find them.

const manualDataRegex = {
    fondoLiquidez: /"fondoLiquidez":\s*\[([\s\S]*?)\]/,
    bonosUI: /"bonosUI":\s*\[([\s\S]*?)\]/,
    dolarUruguay: /"dolarUruguay":\s*\[([\s\S]*?)\]/
};

const preservedData = {};
for (const [key, regex] of Object.entries(manualDataRegex)) {
    const match = existingContent.match(regex);
    if (!match) {
        console.error(`Failed to extract ${key}`);
        process.exit(1);
    }
    try {
        // match[1] is the content inside [ ... ]
        // The file is JSON format inside the JS object now
        preservedData[key] = JSON.parse(`[${match[1]}]`);
    } catch (e) {
        console.error(`Error parsing ${key} data:`, e.message);
        process.exit(1);
    }
}

// Extract Logic Blocks
const inflacionUYBlock = extractBlockByStart(existingContent, 'const inflacionUruguay =');
const inflacionUSBlock = extractBlockByStart(existingContent, 'const inflacionUSA =');
const financialUtilsBlock = extractBlockByStart(existingContent, 'const FinancialUtils =');
const metaBlock = extractBlockByStart(existingContent, 'const historicalAssetMeta =');
const mappingBlock = extractBlockByStart(existingContent, 'const assetNameToKey =');

if (!inflacionUYBlock || !inflacionUSBlock || !financialUtilsBlock || !metaBlock || !mappingBlock) {
    console.error("Failed to find one of the logic blocks.");
    process.exit(1);
}

// 3. Build new historicalData object
const newHistoricalData = {};

// Add JSON data
for (const [key, filename] of Object.entries(fileMapping)) {
    try {
        console.log(`Processing ${key} from ${filename}...`);
        newHistoricalData[key] = readJson(filename);
    } catch (e) {
        console.error(`Error processing ${key}:`, e.message);
        process.exit(1);
    }
}

// Add Preserved data
newHistoricalData.fondoLiquidez = preservedData.fondoLiquidez;
newHistoricalData.bonosUI = preservedData.bonosUI;
newHistoricalData.dolarUruguay = preservedData.dolarUruguay;

// 4. Generate Updated assetConfig structure
const assetConfigContent = `const assetConfig = {
    // Dividend yields (annual %) - added to price returns for Total Return simulation
    dividendYields: {
        sp500: 1.5,
        sp500_index: 1.5,
        nasdaq: 0.6,
        nasdaq_index: 0.6,
        vt: 2.0,
        smh: 0.7,
        schd: 3.4,
        vnq: 3.8,
        vwo: 2.8,
        bonosTesoro: 0,
        gold: 0,
        silver: 0,
        bitcoin: 0,
        ethereum: 0,
        solana: 0,
        fondoLiquidez: 0,
        bonosUI: 0,
        dolarUruguay: 0
    },

    // Asset types for proper inflation adjustment
    assetTypes: {
        sp500: 'equity_usd',
        sp500_index: 'equity_usd',
        nasdaq: 'equity_usd',
        nasdaq_index: 'equity_usd',
        vt: 'equity_usd',
        smh: 'equity_usd',
        schd: 'equity_usd',
        vnq: 'equity_usd',
        vwo: 'equity_usd',
        bitcoin: 'crypto_usd',
        ethereum: 'crypto_usd',
        solana: 'crypto_usd',
        gold: 'commodity_usd',
        silver: 'commodity_usd',
        bonosTesoro: 'bond_usd',
        fondoLiquidez: 'money_market_uyu',
        bonosUI: 'bond_uyu_indexed',
        dolarUruguay: 'forex'
    }
};`;

// 5. Construct the file content
// We manually reconstruct keyToAssetName to avoid extraction issues
const keyToAssetBlock = `const keyToAssetName = Object.fromEntries(
    Object.entries(assetNameToKey).map(([name, key]) => [key, name])
);`;

let output = `// Base de datos de precios históricos mensuales
// Formato: { "date": "YYYY-MM", "price": number }
// Precios ajustados por dividendos y splits (Total Return) cuando sea posible

const historicalData = ${JSON.stringify(newHistoricalData, null, 4)};

// Uruguay CPI (IPC)
${inflacionUYBlock}

// US CPI Index
${inflacionUSBlock}

// Asset-specific configurations
${assetConfigContent}

// Helper functions for financial calculations
${financialUtilsBlock}

// Asset metadata for display
${metaBlock}

// Mapping from UI asset names to historicalData keys
${mappingBlock}

// Reverse mapping: key to display name
${keyToAssetBlock}
`;

// 6. Write to file
fs.writeFileSync(targetFile, output);
console.log(`Successfully rebuilt ${targetFile} with ${Object.keys(newHistoricalData).length} assets.`);
