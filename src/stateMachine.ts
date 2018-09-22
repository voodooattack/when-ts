import { actionMetadataKey, inputMetadataKey } from './actionMetadataKey';
import { HistoryManager } from './historyManager';
import { ActivationAction, ActivationCond, MachineState } from './index';
import { IHistory } from './interfaces';
import { getAllMethods, StateOf } from './util';

export type StateCombiner<M1 extends StateMachine<S1>,
  M2 extends StateMachine<S2>,
  S1 extends MachineState = StateOf<M1>,
  S2 extends MachineState = StateOf<M2>> =
  {
    (params: {
        first: M1,
        second: M2,
        precedence: 'first' | 'second'
      }
    ): (S1 & S2)
  };

/**
 * Your state machine should inherit the `StateMachine<YourStateInterface>` class.
 */
export class StateMachine<S extends MachineState> {
  /**
   * The active state machine program.
   * @type {Map}
   * @private
   */
  private _program: Map<ActivationCond<S>,
    ActivationAction<S, any>> = new Map();

  /**
   * Constructor, requires an initial state.
   * @param {S} _initialState
   */
  protected constructor(_initialState: S) {
    const properties = getAllMethods(this);
    for (let m of properties) {
      if (Reflect.hasMetadata(actionMetadataKey, m)) {
        const cond = Reflect.getMetadata(actionMetadataKey, m);
        this._program.set(cond, m as any);
      }
    }
    // load any inputs defined through the `@input` decorator.
    const inputs = Reflect.getMetadata(inputMetadataKey, Object.getPrototypeOf(this));
    this._history = new HistoryManager<S>(
      this, _initialState, inputs || new Set()
    );
  }

  /**
   *
   * @type {HistoryManager<S extends MachineState>}
   * @private
   */
  private _history: HistoryManager<S>;

  /**
   * Returns the history manager object.
   * @returns {HistoryManager<S extends MachineState>}
   */
  get history(): IHistory<S> {
    return this._history;
  }

  private _exitState?: Readonly<S>;

  /**
   * The state at program exit. Returns `undefined` unless the program has ended.
   * @returns {Readonly<S extends MachineState> | undefined}
   */
  get exitState() {
    return this._exitState;
  }

  /**
   * Advance a single tick and return.
   * @returns {number} Number of actions fired during this tick.
   */
  step() {
    let fired = 0;
    const current = this._history.currentState
    for (let [cond, body] of this._program) {
      if (cond.call(this, current, this)) {
        const newState = body.call(this, current, this);
        if (newState) {
          this._history._mutateTick(newState);
          if (this._exitState)
            Object.assign(this._exitState, newState);
        }
        fired++;
      }
    }
    this._history._nextTick();
    return fired;
  }

  /**
   * A blocking call that evaluates the state machine until it exits.
   * @param {boolean} forever Should we keep going even if the machine stops reacting?
   * @returns {Readonly<S extends MachineState>|null} Returns the machine's exit state,
   *  or null if the machine halted.
   */
  run(forever: boolean = false): S {
    while (!this._exitState) {
      const change = this.step();
      if (!forever && !change) {
        break;
      }
    }
    return this._exitState || Object.assign(
      Object.create(null),
      this._history.nextState
    );
  }

  /**
   * Resets the state machine to the initial state.
   * @param {S} initialState (optional) Restart with a different initial state.
   */
  reset(initialState: S = this.history.initialState) {
    this._exitState = undefined;
    this.history.rewind(Infinity, initialState);
  }


  /**
   * Call this from any action to signal program completion.
   * @param {Readonly<S extends MachineState>} exitState The exit state to
   *  return from `.run.`
   */
  exit(exitState?: Readonly<S>) {
    if (!this._exitState) {
      this._exitState = exitState || Object.assign(
        Object.create(null),
        this._history.currentState
      );
    }
  }

  /**
   * Combine this machine with a new one. (warning: shared variables in state
   * may cause emergent behaviour, calls to `exit()` from one machine may abort
   * early for the other)
   * @param other Other machine to combine with.
   * @param precedence Which machine takes precedence when there's a conflict in
   *  state variables. Defaults to 'this'.
   * @param initialState A combined state to use for the new machine, or a
   *  custom function to combine the states. You may supply a string
   *  {'current'|'initial'} to perform automatic conversion.
   *    Defaults to 'current'.
   * @return A hybrid event machine exhibiting the behaviour of both parents.
   */
  // FIXME: write more comprehensive tests, but for now recombination is
  // not part of the core functionality
  /* istanbul ignore next */
  recombine<T extends StateMachine<OS>, OS extends MachineState = StateOf<T>>(
    other: T,
    precedence: 'this' | 'other' = 'this',
    initialState: (OS & S) |
      StateCombiner<StateMachine<S>, StateMachine<OS>> |
      'current' | 'initial'      = 'initial'
  )
  {
    const state = typeof initialState === 'function' ?
      initialState({
        first: this,
        second: other,
        precedence: precedence === 'this' ? 'first' : 'second'
      }) : (typeof initialState === 'string' ? Object.assign(
        Object.create(null),
        initialState === 'current' ?
          (precedence === 'this' ? other
            : this).history.currentState
          :
          (precedence === 'this' ? other
            : this).history.initialState,
        initialState === 'current' ?
          (precedence === 'this' ? this
            : other).history.currentState
          :
          (precedence === 'this' ? this
            : other).history.initialState
        )
        : initialState);
    const child = new StateMachine<OS & S>(state);
    const program = child._program = new Map();
    for (let [cond, action] of other._program) {
      program.set(cond as any, action as any);
    }
    for (let [cond, action] of this._program) {
      program.set(cond as any, action as any);
    }
    return child;
  }

}
