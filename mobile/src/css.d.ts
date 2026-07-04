// Ambient type declarations for CSS imports.
// Expo's bundler resolves these at runtime; this only satisfies the TypeScript compiler.
declare module '*.css';

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
