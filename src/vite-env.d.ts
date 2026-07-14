/// <reference types="vite/client" />


declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";
declare module "*.svg";
declare module "*.mp4";
declare module "*.mov";
declare module "*.mp3";
declare module "*.json";
declare module "*.lottie?url";
declare module "lottie-react";
declare module "react-confetti"

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string
    readonly VITE_ACTION_CABLE_URL?: string
    // add other vars you use
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
