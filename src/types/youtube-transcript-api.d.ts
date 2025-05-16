declare module 'youtube-transcript-api' {
  interface TranscriptItem {
    text: string;
    duration: number;
    offset: number;
  }

  export default class TranscriptAPI {
    static getTranscript(videoId: string, langCode?: string, config?: object): Promise<TranscriptItem[]>;
    static validateID(videoId: string, config?: object): Promise<boolean>;
  }
} 