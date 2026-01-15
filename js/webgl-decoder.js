// TextPixel - WebGL GPU-accelerated decoder
// Uses fragment shaders to convert colored pixels back to text

const WebGLDecoder = (function() {
    let gl = null;
    let program = null;
    let isInitialized = false;
    let lookupTexture = null;
    let imageTexture = null;
    let framebuffer = null;
    let outputTexture = null;

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

    // Fragment shader - finds nearest color match from lookup table
    // Outputs: R = character index (0-94), G = exact match (255 = exact, 0 = nearest)
    const fragmentShaderSource = `
        precision mediump float;

        uniform sampler2D u_image;       // Input image to decode
        uniform sampler2D u_colorLookup; // Pre-computed color lookup (95 colors)
        varying vec2 v_texCoord;

        void main() {
            // Sample the pixel color from input image
            vec4 pixelColor = texture2D(u_image, v_texCoord);
            vec3 targetRgb = pixelColor.rgb * 255.0;

            // Find nearest color in lookup table
            float bestIndex = 0.0;
            float bestDist = 999999.0;
            float exactMatch = 0.0;

            // Search through all 95 colors
            for (int i = 0; i < 95; i++) {
                float lookupX = (float(i) + 0.5) / 95.0;
                vec4 lookupColor = texture2D(u_colorLookup, vec2(lookupX, 0.5));
                vec3 lookupRgb = lookupColor.rgb * 255.0;

                // Calculate squared distance
                vec3 diff = targetRgb - lookupRgb;
                float dist = dot(diff, diff);

                if (dist < bestDist) {
                    bestDist = dist;
                    bestIndex = float(i);
                    // Check for exact match (distance < 0.5 to account for float precision)
                    exactMatch = dist < 0.5 ? 1.0 : 0.0;
                }
            }

            // Output: R = char index (0-94), G = exact match flag, B = 0, A = 255
            gl_FragColor = vec4(bestIndex / 255.0, exactMatch, 0.0, 1.0);
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
            console.warn('WebGL not available for decoder');
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
            -1, -1,  0, 1,
             1, -1,  1, 1,
            -1,  1,  0, 0,
             1,  1,  1, 0
        ]), gl.STATIC_DRAW);

        const positionLoc = gl.getAttribLocation(program, 'a_position');
        const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');

        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(texCoordLoc);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8);

        // Create textures
        lookupTexture = gl.createTexture();
        imageTexture = gl.createTexture();

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

    function decode(canvas, sourceCanvas, colorMapFn) {
        if (!isInitialized && !init(canvas)) {
            return null;
        }

        const width = sourceCanvas.width;
        const height = sourceCanvas.height;

        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);

        // Build lookup texture from current algorithm
        buildLookupTexture(colorMapFn);

        // Upload source image to texture
        gl.bindTexture(gl.TEXTURE_2D, imageTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Set up program and uniforms
        gl.useProgram(program);

        // Bind textures
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, imageTexture);
        gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, lookupTexture);
        gl.uniform1i(gl.getUniformLocation(program, 'u_colorLookup'), 1);

        // Render
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Read back results
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        // Convert pixel data to text and count exact matches
        const chars = [];
        let exactMatches = 0;
        const totalPixels = width * height;

        // WebGL reads from bottom-left, so we need to flip Y
        for (let y = height - 1; y >= 0; y--) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const charIndex = pixels[idx]; // R channel = char index
                const isExact = pixels[idx + 1] > 127; // G channel = exact match flag

                const charCode = 32 + charIndex;
                chars.push(String.fromCharCode(charCode));
                if (isExact) exactMatches++;
            }
        }

        return {
            text: chars.join(''),
            exactMatches: exactMatches,
            totalPixels: totalPixels
        };
    }

    function isAvailable() {
        const testCanvas = document.createElement('canvas');
        const testGl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
        return !!testGl;
    }

    function dispose() {
        if (gl) {
            if (lookupTexture) gl.deleteTexture(lookupTexture);
            if (imageTexture) gl.deleteTexture(imageTexture);
            if (program) gl.deleteProgram(program);
            gl = null;
            program = null;
            lookupTexture = null;
            imageTexture = null;
            isInitialized = false;
        }
    }

    return {
        init,
        decode,
        isAvailable,
        dispose
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGLDecoder;
}
