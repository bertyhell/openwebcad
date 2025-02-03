import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
    test: {
        alias: {
            './src/drawControllers/screenCanvasController': resolve(
                './tests/mocks/drawControllers/screenCanvas.drawController.ts',
            ),
        },
    },
});
