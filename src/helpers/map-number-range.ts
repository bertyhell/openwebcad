/**
 * Convert numbers in a specific range to another range
 * This is moslty used to convert screen space coordinates to world space coordinates and vice versa
 */
export function mapNumberRange(
    num: number,
    startSourceRange: number,
    endSourceRange: number,
    startTargetRange: number,
    endTargetRange: number,
): number {
    // Handle the case where source range has zero length
    if (startSourceRange === endSourceRange) {
        return startTargetRange;
    }

    return (
        startTargetRange +
        ((num - startSourceRange) * (endTargetRange - startTargetRange)) /
            (endSourceRange - startSourceRange)
    );
}
