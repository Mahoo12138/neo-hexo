/**
 * @neo-hexo/core — Command Registry
 *
 * A registry for CLI commands. Plugins register commands here;
 * the CLI package reads them to dispatch user input.
 */

import { createServiceKey, type ServiceKey } from './context.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Arguments passed to a command handler. */
export interface CommandArgs {
  /** Positional arguments. */
  _: string[];
  /** Named options. */
  [key: string]: unknown;
}

/** A command handler function. */
export type CommandHandler = (args: CommandArgs) => void | Promise<void>;

/** Metadata for a registered command. */
export interface CommandEntry {
  /** Command name (e.g., 'generate', 'new'). */
  name: string;
  /** Short description shown in help. */
  description: string;
  /** Usage pattern (e.g., '<layout> [title]'). */
  usage?: string;
  /** Option definitions for help display. */
  options?: Array<{
    name: string;
    description: string;
    alias?: string;
  }>;
  /** The handler function. */
  handler: CommandHandler;
}

// ─── Service Key ─────────────────────────────────────────────────────────────

export const CommandRegistryKey: ServiceKey<CommandRegistry> = createServiceKey<CommandRegistry>('commandRegistry');

// ─── Command Registry ───────────────────────────────────────────────────────

export class CommandRegistry {
  private commands = new Map<string, CommandEntry>();

  /** Register a command. */
  register(entry: CommandEntry): void {
    this.commands.set(entry.name, entry);
  }

  /** Get a command by name. */
  get(name: string): CommandEntry | undefined {
    return this.commands.get(name);
  }

  /** Check if a command exists. */
  has(name: string): boolean {
    return this.commands.has(name);
  }

  /** Remove a command. */
  remove(name: string): boolean {
    return this.commands.delete(name);
  }

  /** List all registered commands. */
  list(): CommandEntry[] {
    return [...this.commands.values()];
  }

  /**
   * Execute a command by name.
   *
   * @throws Error if the command is not found.
   */
  async execute(name: string, args: CommandArgs): Promise<void> {
    const entry = this.commands.get(name);
    if (!entry) {
      throw new Error(`Unknown command: "${name}". Run "neo-hexo help" to see available commands.`);
    }
    await entry.handler(args);
  }
}
