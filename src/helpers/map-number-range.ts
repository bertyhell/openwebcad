export function mapNumberRange(
    num: number,
    startSourceRange: number,
    endSourceRange: number,
    startTargetRange: number,
    endTargetRange: number,
): number {
    // Normalize the source range so that startSourceRange < endSourceRange
    if (startSourceRange > endSourceRange) {
        [startSourceRange, endSourceRange] = [endSourceRange, startSourceRange];
    }

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
