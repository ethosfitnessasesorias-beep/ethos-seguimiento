/// <reference types="vite/client" />

// Importes de Vite con sufijo ?url (devuelven la ruta final del archivo).
declare module '*?url' {
  const src: string
  export default src
}
