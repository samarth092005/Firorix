/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: string;
  readonly VITE_APP_TITLE?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_MOCK_DELAY?: string;
  readonly VITE_MOCK_DELAY_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
