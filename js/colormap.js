// TextPixel - Character to Color Mapping Engine
// Deterministic, reversible ASCII (32-126) to RGB mapping

const ColorMap = (function() {
    const MIN_ASCII = 32;
    const MAX_ASCII = 126;
    const CHAR_COUNT = MAX_ASCII - MIN_ASCII + 1; // 95 characters

    // Current algorithm
    let currentAlgorithm = 'hsl';

    // Pre-computed lookup tables for reverse mapping (per algorithm)
    const reverseLookups = {};

    // Algorithm definitions
    const algorithms = {
        hsl: {
            name: 'Distributed Hue (HSL)',
            description: 'Maps characters across the color spectrum using HSL',
            charToColor: function(char) {
                const code = char.charCodeAt(0);
                const clampedCode = Math.max(MIN_ASCII, Math.min(MAX_ASCII, code));
                const hue = ((clampedCode - MIN_ASCII) / 94) * 360;
                return hslToRgb(hue, 70, 50);
            }
        },
        rgb: {
            name: 'Direct RGB',
            description: 'Maps ASCII directly to RGB channels',
            charToColor: function(char) {
                const code = char.charCodeAt(0);
                const clampedCode = Math.max(MIN_ASCII, Math.min(MAX_ASCII, code));
                const normalized = clampedCode - MIN_ASCII;
                // Spread across RGB space
                const r = (normalized * 2.7) % 256;
                const g = (normalized * 7.3) % 256;
                const b = (normalized * 13.1) % 256;
                return {
                    r: Math.round(r),
                    g: Math.round(g),
                    b: Math.round(b)
                };
            }
        },
        semantic: {
            name: 'Semantic Grouping',
            description: 'Similar characters get similar colors',
            charToColor: function(char) {
                const code = char.charCodeAt(0);
                let hue, sat = 70, light = 50;

                if (code >= 65 && code <= 90) {
                    // Uppercase A-Z: warm reds/oranges
                    hue = ((code - 65) / 26) * 60; // 0-60
                    sat = 80;
                } else if (code >= 97 && code <= 122) {
                    // Lowercase a-z: cool blues/greens
                    hue = 180 + ((code - 97) / 26) * 60; // 180-240
                    sat = 80;
                } else if (code >= 48 && code <= 57) {
                    // Numbers 0-9: purples
                    hue = 270 + ((code - 48) / 10) * 30; // 270-300
                    sat = 75;
                } else if (code === 32) {
                    // Space: light gray
                    return { r: 200, g: 200, b: 200 };
                } else {
                    // Punctuation/symbols: yellows/greens
                    hue = 60 + ((code - MIN_ASCII) / CHAR_COUNT) * 120; // 60-180
                    sat = 60;
                }

                return hslToRgb(hue, sat, light);
            }
        },
        frequency: {
            name: 'Frequency Optimized',
            description: 'Common characters get more distinct colors',
            charToColor: function(char) {
                // Common English characters get evenly spaced hues
                const frequencyOrder = ' etaoinshrdlcumwfgypbvkjxqz0123456789ETAOINSHRDLCUMWFGYPBVKJXQZ.,!?;:\'"()-';
                const code = char.charCodeAt(0);
                const clampedCode = Math.max(MIN_ASCII, Math.min(MAX_ASCII, code));
                const charStr = String.fromCharCode(clampedCode);

                let idx = frequencyOrder.indexOf(charStr);
                if (idx === -1) {
                    // Fall back to position in ASCII range for unlisted chars
                    idx = frequencyOrder.length + (clampedCode - MIN_ASCII);
                }

                const hue = (idx / (frequencyOrder.length + 20)) * 360;
                return hslToRgb(hue, 75, 50);
            }
        }
    };

    function hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;

        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    function setAlgorithm(name) {
        if (algorithms[name]) {
            currentAlgorithm = name;
        }
    }

    function getAlgorithm() {
        return currentAlgorithm;
    }

    function getAlgorithms() {
        return Object.keys(algorithms).map(key => ({
            id: key,
            name: algorithms[key].name,
            description: algorithms[key].description
        }));
    }

    function charToColor(char) {
        return algorithms[currentAlgorithm].charToColor(char);
    }

    function buildReverseLookup() {
        if (reverseLookups[currentAlgorithm]) {
            return reverseLookups[currentAlgorithm];
        }

        const lookup = new Map();
        for (let code = MIN_ASCII; code <= MAX_ASCII; code++) {
            const char = String.fromCharCode(code);
            const color = charToColor(char);
            const key = `${color.r},${color.g},${color.b}`;
            lookup.set(key, char);
        }
        reverseLookups[currentAlgorithm] = lookup;
        return lookup;
    }

    function colorToChar(r, g, b) {
        const lookup = buildReverseLookup();
        const key = `${r},${g},${b}`;

        // Exact match
        if (lookup.has(key)) {
            return { char: lookup.get(key), exact: true };
        }

        // Nearest match for lossy formats (JPEG)
        let bestChar = ' ';
        let bestDist = Infinity;

        for (const [colorKey, char] of lookup) {
            const [cr, cg, cb] = colorKey.split(',').map(Number);
            const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
            if (dist < bestDist) {
                bestDist = dist;
                bestChar = char;
            }
        }

        return { char: bestChar, exact: false };
    }

    function getColorLegend() {
        const legend = [];
        for (let code = MIN_ASCII; code <= MAX_ASCII; code++) {
            const char = String.fromCharCode(code);
            const color = charToColor(char);
            legend.push({ char, code, color });
        }
        return legend;
    }

    return {
        charToColor,
        colorToChar,
        getColorLegend,
        setAlgorithm,
        getAlgorithm,
        getAlgorithms,
        MIN_ASCII,
        MAX_ASCII,
        CHAR_COUNT
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorMap;
}
