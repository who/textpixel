// TextPixel - WebGL GPU-accelerated encoder
// Uses fragment shaders to convert text to colored pixels

const WebGLEncoder = (function() {
    let gl = null;
    let program = null;
    let isInitialized = false;
    let lookupTexture = null;
    let dataTexture = null;

    // Vertex shader - simple pass-through
    const vertexShaderSource = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;

        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `;

    // Fragment shader - looks up color from pre-computed lookup texture
    const fragmentShaderSource = `
        precision mediump float;

        uniform sampler2D u_charData;    // Character codes as texture
        uniform sampler2D u_colorLookup; // Pre-computed color lookup (95 colors)
        uniform vec2 u_resolution;       // Output size
        uniform float u_textLength;      // Actual text length

        void main() {
            // Calculate pixel index (flip Y since WebGL has origin at bottom-left)
            vec2 pixelCoord = floor(gl_FragCoord.xy);
            float flippedY = u_resolution.y - 1.0 - pixelCoord.y;
            float idx = flippedY * u_resolution.x + pixelCoord.x;

            // Sample character code from data texture
            float dataWidth = ceil(sqrt(u_textLength));
            float dataX = mod(idx, dataWidth) / dataWidth;
            float dataY = floor(idx / dataWidth) / dataWidth;
            vec4 charData = texture2D(u_charData, vec2(dataX + 0.5/dataWidth, dataY + 0.5/dataWidth));

            // Character code is stored in red channel (0-255 maps to 0-1)
            float charCode = charData.r * 255.0;

            // Clamp to ASCII range 32-126, then normalize to 0-94 for lookup
            float normalized = clamp(charCode - 32.0, 0.0, 94.0);

            // Lookup color from pre-computed texture (95 entries)
            float lookupX = (normalized + 0.5) / 95.0;
            vec4 color = texture2D(u_colorLookup, vec2(lookupX, 0.5));

            // If past text length, use space color (index 0)
            if (idx >= u_textLength) {
                color = texture2D(u_colorLookup, vec2(0.5 / 95.0, 0.5));
            }

            gl_FragColor = vec4(color.rgb, 1.0);
        }
    `;

    function createShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    function createProgram(vertexShader, fragmentShader) {
        const prog = gl.createProgram();
        gl.attachShader(prog, vertexShader);
        gl.attachShader(prog, fragmentShader);
        gl.linkProgram(prog);

        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(prog));
            gl.deleteProgram(prog);
            return null;
        }
        return prog;
    }

    function init(canvas) {
        if (isInitialized) return true;

        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            console.warn('WebGL not available');
            return false;
        }

        const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            return false;
        }

        program = createProgram(vertexShader, fragmentShader);
        if (!program) {
            return false;
        }

        // Set up vertex buffer for full-screen quad
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,  0, 0,
             1, -1,  1, 0,
            -1,  1,  0, 1,
             1,  1,  1, 1
        ]), gl.STATIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, 'a_position');
        const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');

        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(texCoordLoc);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8);

        // Create textures
        lookupTexture = gl.createTexture();
        dataTexture = gl.createTexture();

        isInitialized = true;
        return true;
    }

    function buildLookupTexture(colorMapFn) {
        // Build 95-color lookup texture (ASCII 32-126)
        const lookupData = new Uint8Array(95 * 4);

        for (let i = 0; i < 95; i++) {
            const char = String.fromCharCode(32 + i);
            const color = colorMapFn(char);
            lookupData[i * 4] = color.r;
            lookupData[i * 4 + 1] = color.g;
            lookupData[i * 4 + 2] = color.b;
            lookupData[i * 4 + 3] = 255;
        }

        gl.bindTexture(gl.TEXTURE_2D, lookupTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 95, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, lookupData);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    function encode(canvas, text, colorMapFn) {
        if (!isInitialized && !init(canvas)) {
            return false;
        }

        const charCount = text.length;
        const size = Math.ceil(Math.sqrt(charCount));

        canvas.width = size;
        canvas.height = size;
        gl.viewport(0, 0, size, size);

        // Build lookup texture from current algorithm
        buildLookupTexture(colorMapFn);

        // Create data texture with character codes
        const dataSize = Math.ceil(Math.sqrt(charCount));
        const charData = new Uint8Array(dataSize * dataSize * 4);

        for (let i = 0; i < dataSize * dataSize; i++) {
            const char = i < text.length ? text[i] : ' ';
            const code = char.charCodeAt(0);
            charData[i * 4] = code;     // Store char code in red channel
            charData[i * 4 + 1] = 0;
            charData[i * 4 + 2] = 0;
            charData[i * 4 + 3] = 255;
        }

        gl.bindTexture(gl.TEXTURE_2D, dataTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, dataSize, dataSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, charData);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Set up program and uniforms
        gl.useProgram(program);

        // Bind textures
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, dataTexture);
        gl.uniform1i(gl.getUniformLocation(program, 'u_charData'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, lookupTexture);
        gl.uniform1i(gl.getUniformLocation(program, 'u_colorLookup'), 1);

        // Set uniforms
        gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), size, size);
        gl.uniform1f(gl.getUniformLocation(program, 'u_textLength'), charCount);

        // Render
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        return true;
    }

    function isAvailable() {
        // Test WebGL availability without fully initializing
        const testCanvas = document.createElement('canvas');
        const testGl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
        return !!testGl;
    }

    function dispose() {
        if (gl) {
            if (lookupTexture) gl.deleteTexture(lookupTexture);
            if (dataTexture) gl.deleteTexture(dataTexture);
            if (program) gl.deleteProgram(program);
            gl = null;
            program = null;
            lookupTexture = null;
            dataTexture = null;
            isInitialized = false;
        }
    }

    return {
        init,
        encode,
        isAvailable,
        dispose
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGLEncoder;
}
