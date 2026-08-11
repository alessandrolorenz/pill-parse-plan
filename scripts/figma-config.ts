/**
 * Figma Sync Configuration
 * File: Parser — https://www.figma.com/design/q241m9kJPYYMRd448hCbEd/Parser
 */

export const FIGMA_FILE_KEY = 'q241m9kJPYYMRd448hCbEd';
export const FIGMA_TOKEN = process.env.FIGMA_TOKEN ?? '';
export const FIGMA_API_BASE = 'https://api.figma.com/v1';

/** Maps Figma variable names → CSS custom property names */
export const TOKEN_CSS_MAP: Record<string, string> = {
  // Colors
  'color/background':         '--background',
  'color/foreground':         '--foreground',
  'color/card':               '--card',
  'color/primary':            '--primary',
  'color/primary-foreground': '--primary-foreground',
  'color/primary-light':      '--primary-light',
  'color/primary-dark':       '--primary-dark',
  'color/secondary':          '--secondary',
  'color/accent':             '--accent',
  'color/muted':              '--muted',
  'color/muted-foreground':   '--muted-foreground',
  'color/warning':            '--warning',
  'color/warning-bg':         '--warning-bg',
  'color/destructive':        '--destructive',
  'color/border':             '--border',
  // Spacing
  'spacing/4':  '--spacing-4',
  'spacing/8':  '--spacing-8',
  'spacing/12': '--spacing-12',
  'spacing/16': '--spacing-16',
  'spacing/24': '--spacing-24',
  'spacing/32': '--spacing-32',
  'spacing/48': '--spacing-48',
  // Border radius
  'radius/sm': '--radius-sm',
  'radius/md': '--radius-md',
  'radius/lg': '--radius',
};

/** Figma variable collection name */
export const TOKEN_COLLECTION_NAME = 'Design Tokens';
/** Figma mode name for light theme */
export const LIGHT_MODE_NAME = 'Light';