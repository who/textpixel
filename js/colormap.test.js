// Roundtrip tests: encode text → image → decode → compare
import { describe, it, expect } from 'vitest';

// Import ColorMap - need to handle IIFE module pattern
const ColorMap = await import('./colormap.js').then(m => m.default || m);

describe('ColorMap roundtrip tests', () => {
    // Test all algorithms
    const algorithms = ['hsl', 'rgb', 'semantic', 'frequency'];

    algorithms.forEach(algorithm => {
        describe(`${algorithm} algorithm`, () => {
            it('should roundtrip a simple text', () => {
                ColorMap.setAlgorithm(algorithm);

                const originalText = 'Hello World!';
                const decoded = encodeDecodeRoundtrip(originalText);

                expect(decoded).toBe(originalText);
            });

            it('should roundtrip all printable ASCII characters', () => {
                ColorMap.setAlgorithm(algorithm);

                // All printable ASCII characters (32-126)
                let originalText = '';
                for (let i = 32; i <= 126; i++) {
                    originalText += String.fromCharCode(i);
                }

                const decoded = encodeDecodeRoundtrip(originalText);

                expect(decoded).toBe(originalText);
            });

            it('should roundtrip repeated characters', () => {
                ColorMap.setAlgorithm(algorithm);

                const originalText = 'aaabbbccc   111222333!!!@@@###';
                const decoded = encodeDecodeRoundtrip(originalText);

                expect(decoded).toBe(originalText);
            });

            it('should handle single character', () => {
                ColorMap.setAlgorithm(algorithm);

                const originalText = 'X';
                const decoded = encodeDecodeRoundtrip(originalText);

                expect(decoded).toBe(originalText);
            });

            it('should handle spaces only', () => {
                ColorMap.setAlgorithm(algorithm);

                const originalText = '     ';
                const decoded = encodeDecodeRoundtrip(originalText);

                expect(decoded).toBe(originalText);
            });

            it('should handle mixed content', () => {
                ColorMap.setAlgorithm(algorithm);

                const originalText = 'The quick brown fox jumps over the lazy dog. 0123456789 !@#$%^&*()';
                const decoded = encodeDecodeRoundtrip(originalText);

                expect(decoded).toBe(originalText);
            });
        });
    });

    describe('color uniqueness', () => {
        algorithms.forEach(algorithm => {
            it(`${algorithm}: each character should have a unique color`, () => {
                ColorMap.setAlgorithm(algorithm);

                const colorToChar = new Map();

                for (let code = 32; code <= 126; code++) {
                    const char = String.fromCharCode(code);
                    const color = ColorMap.charToColor(char);
                    const colorKey = `${color.r},${color.g},${color.b}`;

                    if (colorToChar.has(colorKey)) {
                        const existing = colorToChar.get(colorKey);
                        throw new Error(
                            `Color collision: "${char}" (${code}) and "${existing.char}" (${existing.code}) both map to RGB(${colorKey})`
                        );
                    }

                    colorToChar.set(colorKey, { char, code });
                }

                expect(colorToChar.size).toBe(95); // 95 printable ASCII chars
            });
        });
    });
});

/**
 * Simulates encoding text to an image and decoding it back.
 * This is a CPU-based simulation of the roundtrip process.
 */
function encodeDecodeRoundtrip(text) {
    // Encode: convert each character to RGB
    const pixels = [];
    for (let i = 0; i < text.length; i++) {
        const color = ColorMap.charToColor(text[i]);
        pixels.push({ r: color.r, g: color.g, b: color.b });
    }

    // Decode: convert each RGB back to character
    let decoded = '';
    for (const pixel of pixels) {
        const result = ColorMap.colorToChar(pixel.r, pixel.g, pixel.b);
        if (!result.exact) {
            throw new Error(
                `Non-exact match for pixel RGB(${pixel.r},${pixel.g},${pixel.b}). Got "${result.char}" instead.`
            );
        }
        decoded += result.char;
    }

    return decoded;
}
