// Minimal ambient declaration to satisfy TypeScript when tailwindcss types are not available
// This prevents errors like: "Cannot find type definition file for 'tailwindcss'".

declare module 'tailwindcss' {
  const content: any;
  export = content;
}

declare module 'tailwindcss/*' {
  const content: any;
  export default content;
}
