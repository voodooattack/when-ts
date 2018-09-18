import { StateMachine } from './stateMachine';

/**
 * Base for user-defined States.
 */
export type MachineState = {};

/**
 * An activation condition, takes two arguments and must return true for the associated action to fire.
 */
export type ActivationCond<State extends MachineState> =
  (state: Readonly<State>, machine: StateMachine<State>) => boolean;

/**
 * An activation action, takes two arguments and will only be executed during a tick
 *  when the associated conditon returns true.
 */
export type ActivationAction<State extends MachineState> =
  (state: Readonly<State>, machine: StateMachine<State>) => Partial<State> | undefined;


/**
 * The HistoryManager interface allows for state manipulation and the rewinding of a program.
 */
export interface IHistory<S extends MachineState> {
  readonly tick: number;
  readonly records: ReadonlyArray<S>;
  readonly currentState: Readonly<S>;
  readonly initialState: Readonly<S>;
  readonly nextState: Readonly<Partial<S>>;

  /**
   * Limit the maximum number of past history states kept on record.
   */
  limit: number;

  /**
   * Rewind time by `n` ticks, the rest of the currently executing tick will be aborted.
   *  A partial state can be passed as the second argument to mutate the rewound state.
   * @param {number} n The number of ticks to rewind, defaults to Infinity.
   * @param {Partial<S extends MachineState>} mutate Any mutations to apply to the state after rewinding.
   */
  rewind(n: number, mutate?: Partial<S>): void;

  /**
   * Clears the state history. Rewinds to the beginning, and the rest of the current tick will be aborted.
   */
  clear(): void;
}
