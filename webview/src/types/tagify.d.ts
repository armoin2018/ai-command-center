declare module '@yaireo/tagify' {
  export interface TagifySettings {
    whitelist?: string[];
    maxTags?: number;
    dropdown?: {
      maxItems?: number;
      classname?: string;
      enabled?: number;
      closeOnSelect?: boolean;
    };
    enforceWhitelist?: boolean;
    placeholder?: string;
  }

  export default class Tagify {
    constructor(element: HTMLInputElement, settings?: TagifySettings);
    value: any[];
    on(event: string, callback: (e: any) => void): void;
    addTags(tags: string[]): void;
    removeAllTags(): void;
    destroy(): void;
  }
}

declare module '@yaireo/tagify/dist/tagify.css' {
  const content: any;
  export default content;
}
