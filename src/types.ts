export interface EnvLine {
  type: 'variable' | 'comment' | 'blank';
  raw: string;
  key?: string;
  value?: string;
  inlineComment?: string;
}

export interface EnvVariable {
  key: string;
  value: string;
  inlineComment?: string;
}

export interface EnvFile {
  name: string;
  filename: string;
  path: string;
  lines: EnvLine[];
  variables: EnvVariable[];
}

export interface EnviState {
  version: number;
  active: string | null;
  environments: string[];
  lastSwitch: string | null;
}

export interface DiffResult {
  key: string;
  status: 'same' | 'different' | 'only_left' | 'only_right';
  leftValue?: string;
  rightValue?: string;
}

export interface ValidationResult {
  environment: string;
  missing: string[];
  empty: string[];
  total: number;
}

export type ExportFormat = 'dotenv' | 'json' | 'shell' | 'docker' | 'yaml';

export class EnviError extends Error {
  public hint?: string;
  constructor(message: string, hint?: string) {
    super(message);
    this.name = 'EnviError';
    this.hint = hint;
  }
}
