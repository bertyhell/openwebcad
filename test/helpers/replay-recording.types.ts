export interface Recording {
    title: string;
    selectorAttribute: string;
    steps: Step[];
}

export interface Step {
    type: string;
    width?: number;
    height?: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    isLandscape?: boolean;
    url?: string;
    assertedEvents?: AssertedEvent[];
    target?: string;
    selectors?: string[][];
    offsetY?: number;
    offsetX?: number;
    key?: string;
}

export interface AssertedEvent {
    type: string;
    url: string;
    title: string;
}
