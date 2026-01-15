// TextPixel - Text to Color Image Generator
// Main application entry point

document.addEventListener('DOMContentLoaded', () => {
    // Encode elements
    const textInput = document.getElementById('text-input');
    const fileInput = document.getElementById('file-input');
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');
    const canvas = document.getElementById('output-canvas');
    const stats = document.getElementById('stats');
    const ctx = canvas.getContext('2d');

    // Decode elements
    const decodeFileInput = document.getElementById('decode-file-input');
    const decodeCanvas = document.getElementById('decode-canvas');
    const decodeOutput = document.getElementById('decode-output');
    const decodeStats = document.getElementById('decode-stats');
    const decodeCtx = decodeCanvas.getContext('2d');

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
            const color = ColorMap.charToColor(char);
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

    // Handle decode file upload
    decodeFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const img = new Image();
            img.onload = () => {
                decodeImage(img);
            };
            img.src = URL.createObjectURL(file);
        }
    });

    function decodeImage(img) {
        decodeCanvas.width = img.width;
        decodeCanvas.height = img.height;
        decodeCtx.drawImage(img, 0, 0);

        const imageData = decodeCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        const totalPixels = img.width * img.height;

        let text = '';
        let exactMatches = 0;

        for (let i = 0; i < totalPixels; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const result = ColorMap.colorToChar(r, g, b);
            text += result.char;
            if (result.exact) exactMatches++;
        }

        // Trim trailing padding (spaces from square padding)
        const trimmedText = text.replace(/\s+$/, '');

        decodeOutput.value = trimmedText;

        // Calculate confidence
        const confidence = (exactMatches / totalPixels) * 100;
        let confidenceClass = 'high';
        let confidenceLabel = 'High';
        if (confidence < 99) {
            confidenceClass = 'medium';
            confidenceLabel = 'Medium';
        }
        if (confidence < 90) {
            confidenceClass = 'low';
            confidenceLabel = 'Low';
        }

        decodeStats.innerHTML = `${trimmedText.length.toLocaleString()} characters decoded from ${img.width}×${img.height} image <span class="confidence ${confidenceClass}">${confidenceLabel} (${confidence.toFixed(1)}%)</span>`;
    }

    // Initialize
    updateStats();
});
