/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly FRC_API_KEY: string;
  readonly FRC_ENDPOINT?: "global" | "eu";
  readonly PUBLIC_FRC_SITEKEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
