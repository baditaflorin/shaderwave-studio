/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __REPO_URL__: string;
declare const __PAYPAL_URL__: string;

declare module "fft.js" {
  export default class FFT {
    readonly size: number;
    constructor(size: number);
    createComplexArray(): number[];
    realTransform(output: number[], input: ArrayLike<number>): void;
    completeSpectrum(spectrum: number[]): void;
  }
}
