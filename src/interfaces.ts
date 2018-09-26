import { StateMachine } from './stateMachine';

/**
 * Base for user-defined States.
 */
export interface MachineState {
}

/**
 * Base for user-defined States.
 */
export interface MachineInputSource {
}


/**
 * Set this to `once` to update the input only once at startup. Set to `always` to update it with every tick, or
 * supply your own callback to implement a custom condition.
 */
export type InputPolicy<S extends MachineState, I extends MachineInputSource, M extends StateMachine<S, I>> =
  InputPolicyCallback<S, I, M> | 'once' | 'always';

/**
 * A user-defined policy for an input polling. Must return true for the input to be polled on that specific `tick`.
 */
export type InputPolicyCallback<S extends MachineState, I extends MachineInputSource, M extends StateMachine<S, I>> =
{
  (state: Readonly<S>, m: M): boolean
};


/**
 * An activation condition, takes two arguments and must return true for the associated action to fire.
 */
export type ActivationCond<State extends MachineState, InputSource extends MachineInputSource> =
  (state: Readonly<State & InputSource>, machine: StateMachine<State, InputSource>) => boolean;

/**
 * An activation action, takes two arguments and will only be executed during a tick
 *  when the associated condition returns true.
 */
export type ActivationAction<State extends MachineState, InputSource extends MachineInputSource, fields extends keyof State> =
  (state: Readonly<State & InputSource>, machine: StateMachine<State, InputSource>)
    => Pick<State, fields> | void;


/**
 * The HistoryManager interface allows for state manipulation and the rewinding of a program.
 */
export interface IHistory<S extends MachineState, I extends MachineInputSource = any> {
  readonly tick: number;
  readonly records: ReadonlyArray<S & Readonly<I>>;
  readonly currentState: Readonly<S & I>;
  readonly initialState: Readonly<S>;
  readonly nextState: Readonly<Partial<S>> & Readonly<I>;

  /**
   * Limit the maximum number of past history states kept on record.
   */
  limit: number;

  /**
   * Rewind time to `t`, the rest of the currently executing tick will be ignored.
   *  A partial state can be passed as the second argument to mutate the rewound state and take back information to
   *  the past state.
   * @param {number} t The discrete tick in time to rewind to.
   * @param {Partial<S extends MachineState>} mutate Any mutations to apply to the state after rewinding.
   */
  rewind(t: number, mutate?: Partial<S>): void;

  /**
   * Clears the state history. Rewinds to the beginning, and the rest of the current tick will be aborted.
   */
  clear(): void;
}
