/// <reference types="vite/client" />


declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";
declare module "*.svg";
declare module "*.json";
declare module "lottie-react";
declare module "react-confetti"

interface ImportMetaEnv {
    readonly VITE_ACTION_CABLE_URL?: string
    readonly VITE_API_BASE_URL?: string
    // add other vars you use
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }


