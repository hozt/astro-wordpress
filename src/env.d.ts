/**
 * @file env.d.ts
 * @description TypeScript environment type declarations for Astro.
 */
/// <reference path="../.astro/types.d.ts" />

interface Env {
  EDITOR_KEY: string;
  API_URL: string;
  [key: string]: string;
}

declare namespace App {
  interface Locals {
    cfContext: import("@cloudflare/workers-types").ExecutionContext;
    runtime: {
      env: Env;
    };
  }
}