export interface FileNode {
  name: string;
  content: string;
  type: 'file';
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  content: string;
  isError?: boolean;
}

export type CodenixServiceResponse =
  | { success: true; message: string }
  | { success: false; error: string };


export interface ConsoleLog {
  type: 'log' | 'warn' | 'error' | 'info';
  message: string[];
  timestamp: string;
}