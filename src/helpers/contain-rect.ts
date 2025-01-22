export function containRectangle(
    containedRectMinX: number,
    containedRectMinY: number,
    containedRectMaxX: number,
    containedRectMaxY: number,
    wrapperRectMinX: number,
    wrapperRectMinY: number,
    wrapperRectMaxX: number,
    wrapperRectMaxY: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
    // Calculate the width and height of the wrapper rectangle
    const wrapperWidth = wrapperRectMaxX - wrapperRectMinX;
    const wrapperHeight = wrapperRectMaxY - wrapperRectMinY;

    // Calculate the width and height of the contained rectangle
    const containedWidth = containedRectMaxX - containedRectMinX;
    const containedHeight = containedRectMaxY - containedRectMinY;

    // Edge case: if contained dimensions are zero, just center as a point
    if (containedWidth === 0 || containedHeight === 0) {
        const centerX = wrapperRectMinX + wrapperWidth / 2;
        const centerY = wrapperRectMinY + wrapperHeight / 2;
        return {
            minX: centerX,
            minY: centerY,
            maxX: centerX,
            maxY: centerY,
        };
    }

    // Compute scale factor so contained rect fits within wrapper, maintaining aspect ratio
    const scale = Math.min(
        wrapperWidth / containedWidth,
        wrapperHeight / containedHeight,
    );

    // Compute final displayed dimensions
    const displayWidth = containedWidth * scale;
    const displayHeight = containedHeight * scale;

    // Compute offsets to center the scaled rectangle
    const offsetX = wrapperRectMinX + (wrapperWidth - displayWidth) / 2;
    const offsetY = wrapperRectMinY + (wrapperHeight - displayHeight) / 2;

    // Return the final coordinates of the scaled and centered rectangle
    return {
        minX: offsetX,
        minY: offsetY,
        maxX: offsetX + displayWidth,
        maxY: offsetY + displayHeight,
    };
}
