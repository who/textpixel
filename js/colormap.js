// TextPixel - Character to Color Mapping Engine
// Deterministic, reversible ASCII (32-126) to RGB mapping

const ColorMap = (function() {
    const MIN_ASCII = 32;
    const MAX_ASCII = 126;
    const CHAR_COUNT = MAX_ASCII - MIN_ASCII + 1; // 95 characters
    const SATURATION = 70;
    const LIGHTNESS = 50;

    // Pre-computed lookup table for reverse mapping (RGB string -> char)
    let reverseLookup = null;

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

    function charToColor(char) {
        const code = char.charCodeAt(0);
        const clampedCode = Math.max(MIN_ASCII, Math.min(MAX_ASCII, code));

        // HSL formula: Hue = ((ASCII-32)/94)*360
        const hue = ((clampedCode - MIN_ASCII) / 94) * 360;

        return hslToRgb(hue, SATURATION, LIGHTNESS);
    }

    function buildReverseLookup() {
        if (reverseLookup) return reverseLookup;

        reverseLookup = new Map();
        for (let code = MIN_ASCII; code <= MAX_ASCII; code++) {
            const char = String.fromCharCode(code);
            const color = charToColor(char);
            const key = `${color.r},${color.g},${color.b}`;
            reverseLookup.set(key, char);
        }
        return reverseLookup;
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
        MIN_ASCII,
        MAX_ASCII,
        CHAR_COUNT
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorMap;
}
