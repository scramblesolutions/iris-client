/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string
    readonly VITE_APP_NAME: string
    readonly VITE_DEFAULT_THEME: string
    readonly VITE_DEFAULT_RELAYS: string
    readonly VITE_DEFAULT_RELAYS_JSON: string
    readonly VITE_DEFAULT_RELAYS_ARRAY: string
    readonly VITE_DEFAULT_RELAYS_ARRAY_JSON: string
    readonly VITE_DEFAULT_RELAYS_ARRAY_JSON: string
    readonly VITE_RELAY_URLS: string
    readonly VITE_RELAY_URLS_JSON: string
    readonly VITE_RELAY_URLS_ARRAY: string
    readonly VITE_RELAY_URLS_ARRAY_JSON: string
    readonly VITE_RELAY_URLS_ARRAY_JSON: string 
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}


