// Collision utility module for pixel-perfect collision detection

// Cache for storing pixel data from images
const pixelDataCache = new Map();

// Off-screen canvas for reading pixel data
let offscreenCanvas = null;
let offscreenCtx = null;

/**
 * Initialize the off-screen canvas for pixel data extraction
 */
function initOffscreenCanvas() {
    if (!offscreenCanvas) {
        offscreenCanvas = document.createElement('canvas');
        offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
    }
}

/**
 * Extract and cache pixel data from an image
 * @param {HTMLImageElement} img - The image to extract pixel data from
 * @param {number} width - Width to draw the image
 * @param {number} height - Height to draw the image
 * @returns {ImageData} The pixel data
 */
export function getPixelData(img, width, height) {
    if (!img || !img.complete) {
        return null;
    }

    // Create a cache key based on image src and dimensions
    const cacheKey = `${img.src}_${width}_${height}`;

    if (pixelDataCache.has(cacheKey)) {
        return pixelDataCache.get(cacheKey);
    }

    initOffscreenCanvas();

    // Set canvas size to match entity dimensions
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;

    if (width === 0 || height === 0) {
        return null;
    }

    // Draw the image to the off-screen canvas
    offscreenCtx.clearRect(0, 0, width, height);
    offscreenCtx.drawImage(img, 0, 0, width, height);

    // Extract pixel data
    const imageData = offscreenCtx.getImageData(0, 0, width, height);

    // Cache the pixel data
    pixelDataCache.set(cacheKey, imageData);

    return imageData;
}

/**
 * Check if a pixel is non-transparent
 * @param {ImageData} imageData - The image pixel data
 * @param {number} x - X coordinate within the image
 * @param {number} y - Y coordinate within the image
 * @returns {boolean} True if pixel is non-transparent (alpha > 0)
 */
function isPixelOpaque(imageData, x, y) {
    if (!imageData || x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) {
        return false;
    }

    const index = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
    const alpha = imageData.data[index + 3];

    return alpha > 0;
}

/**
 * Perform pixel-perfect collision detection between two entities
 * @param {Object} entityA - First entity with x, y, width, height, img
 * @param {Object} entityB - Second entity with x, y, width, height, img
 * @returns {boolean} True if non-transparent pixels overlap
 */
export function pixelPerfectCollision(entityA, entityB) {
    // First, do a quick bounding box check
    const ax = entityA.x;
    const ay = entityA.y;
    const aw = entityA.width;
    const ah = entityA.height;

    const bx = entityB.x;
    const by = entityB.y;
    const bw = entityB.width;
    const bh = entityB.height;

    // Bounding box collision check
    if (ax >= bx + bw || ax + aw <= bx || ay >= by + bh || ay + ah <= by) {
        return false;
    }

    // If BOTH entities don't have images, use bounding box collision
    if (!entityA.img && !entityB.img) {
        return true;
    }

    // If only one entity has an image, check if the non-image entity's area
    // overlaps with a non-transparent pixel of the image entity
    if (!entityA.img && entityB.img) {
        // Entity A (e.g., bullet) has no image, check its area against B's pixels
        const dataB = getPixelData(entityB.img, bw, bh);
        if (!dataB) return true; // Fall back to bounding box

        // Sample multiple points across the bullet's area (corners, edges, center)
        const samplePoints = [
            // Corners
            { x: ax, y: ay },
            { x: ax + aw, y: ay },
            { x: ax, y: ay + ah },
            { x: ax + aw, y: ay + ah },
            // Edge midpoints
            { x: ax + aw / 2, y: ay },
            { x: ax + aw / 2, y: ay + ah },
            { x: ax, y: ay + ah / 2 },
            { x: ax + aw, y: ay + ah / 2 },
            // Center
            { x: ax + aw / 2, y: ay + ah / 2 }
        ];

        // Check if any sample point overlaps with non-transparent pixel
        for (const point of samplePoints) {
            const localX = point.x - bx;
            const localY = point.y - by;
            if (isPixelOpaque(dataB, localX, localY)) {
                return true;
            }
        }

        return false;
    }

    if (entityA.img && !entityB.img) {
        // Entity B (e.g., bullet) has no image, check its area against A's pixels
        const dataA = getPixelData(entityA.img, aw, ah);
        if (!dataA) return true; // Fall back to bounding box

        // Sample multiple points across the bullet's area
        const samplePoints = [
            // Corners
            { x: bx, y: by },
            { x: bx + bw, y: by },
            { x: bx, y: by + bh },
            { x: bx + bw, y: by + bh },
            // Edge midpoints
            { x: bx + bw / 2, y: by },
            { x: bx + bw / 2, y: by + bh },
            { x: bx, y: by + bh / 2 },
            { x: bx + bw, y: by + bh / 2 },
            // Center
            { x: bx + bw / 2, y: by + bh / 2 }
        ];

        // Check if any sample point overlaps with non-transparent pixel
        for (const point of samplePoints) {
            const localX = point.x - ax;
            const localY = point.y - ay;
            if (isPixelOpaque(dataA, localX, localY)) {
                return true;
            }
        }

        return false;
    }

    // Both entities have images - do full pixel-perfect collision
    const dataA = getPixelData(entityA.img, aw, ah);
    const dataB = getPixelData(entityB.img, bw, bh);

    // If we can't get pixel data, fall back to bounding box collision
    if (!dataA || !dataB) {
        return true;
    }

    // Calculate the overlapping region
    const overlapLeft = Math.max(ax, bx);
    const overlapTop = Math.max(ay, by);
    const overlapRight = Math.min(ax + aw, bx + bw);
    const overlapBottom = Math.min(ay + ah, by + bh);

    // Check each pixel in the overlapping region
    for (let x = overlapLeft; x < overlapRight; x++) {
        for (let y = overlapTop; y < overlapBottom; y++) {
            // Convert to local coordinates for each entity
            const localXA = x - ax;
            const localYA = y - ay;
            const localXB = x - bx;
            const localYB = y - by;

            // Check if both pixels are non-transparent
            if (isPixelOpaque(dataA, localXA, localYA) &&
                isPixelOpaque(dataB, localXB, localYB)) {
                return true; // Collision detected!
            }
        }
    }

    return false; // No pixel overlap found
}

/**
 * Clear the pixel data cache (useful for memory management)
 */
export function clearPixelCache() {
    pixelDataCache.clear();
}
