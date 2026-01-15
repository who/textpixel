// TextPixel - Text to Color Image Generator
// Main application entry point

document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const fileInput = document.getElementById('file-input');
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');
    const canvas = document.getElementById('output-canvas');
    const stats = document.getElementById('stats');
    const ctx = canvas.getContext('2d');

    // Handle file upload
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                textInput.value = event.target.result;
                updateStats();
            };
            reader.readAsText(file);
        }
    });

    // Update stats on text input
    textInput.addEventListener('input', updateStats);

    // Generate image
    generateBtn.addEventListener('click', generateImage);

    // Download image
    downloadBtn.addEventListener('click', downloadImage);

    function updateStats() {
        const text = textInput.value;
        const charCount = text.length;
        if (charCount === 0) {
            stats.textContent = '';
            return;
        }
        const size = Math.ceil(Math.sqrt(charCount));
        stats.textContent = `${charCount.toLocaleString()} characters → ${size}×${size} pixels`;
    }

    function charToColor(char) {
        // Map printable ASCII (32-126) to HSL color space
        const code = char.charCodeAt(0);
        const minCode = 32;
        const maxCode = 126;
        const clampedCode = Math.max(minCode, Math.min(maxCode, code));

        // Calculate hue (0-360) based on ASCII position
        const hue = ((clampedCode - minCode) / (maxCode - minCode)) * 360;
        const saturation = 70;
        const lightness = 50;

        return hslToRgb(hue, saturation, lightness);
    }

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

    function generateImage() {
        const text = textInput.value;
        if (!text) {
            alert('Please enter some text first.');
            return;
        }

        const charCount = text.length;
        const size = Math.ceil(Math.sqrt(charCount));

        canvas.width = size;
        canvas.height = size;

        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;

        for (let i = 0; i < size * size; i++) {
            const char = i < text.length ? text[i] : ' ';
            const color = charToColor(char);
            const idx = i * 4;
            data[idx] = color.r;
            data[idx + 1] = color.g;
            data[idx + 2] = color.b;
            data[idx + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
        downloadBtn.disabled = false;
    }

    function downloadImage() {
        const link = document.createElement('a');
        link.download = 'textpixel.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // Initialize
    updateStats();
});
