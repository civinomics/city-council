declare module jasmine {
  interface Matchers {
    canRead(path: string): boolean;
    cannotRead(path: string): boolean;
    canWrite(path: string, val?: any): boolean;
    cannotWrite(path: string, val?: any): boolean;
    canPatch(path: string, val?: any): boolean;
    cannotPatch(path: string, val?: any): boolean;

  }
}

