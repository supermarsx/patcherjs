import { test, expect } from '@jest/globals';
import Constants, { type Component, type CommandType } from '../source/lib/configuration/constants.js';

const { COMPONENTS, COMMAND_TYPES } = Constants;

test('enums enforce valid values at compile time', () => {
  const comp: Component = COMPONENTS.COMMANDS;
  const cmd: CommandType = COMMAND_TYPES.TASKS;
  expect(comp).toBe('commands');
  expect(cmd).toBe('tasks');
  // @ts-expect-error - invalid component string
  const badComp: Component = 'bad';
  // @ts-expect-error - invalid command type
  const badCmd: CommandType = 'nope';
  expect(badComp).toBe('bad');
  expect(badCmd).toBe('nope');
});
