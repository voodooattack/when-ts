import { actionMetadataKey, inputMetadataKey } from './actionMetadataKey';
import { HistoryManager } from './historyManager';
import { ActivationAction, ActivationCond, MachineInputSource, MachineState } from './index';
import { IHistory } from './interfaces';
import { getAllMethods, InputOf, StateOf } from './util';

export type StateCombiner<M1 extends StateMachine<S1, I1>,
  M2 extends StateMachine<S2, I2>,
  S1 extends MachineState = StateOf<M1>,
  S2 extends MachineState = StateOf<M2>,
  I1 extends MachineState = InputOf<M1>,
  I2 extends MachineState = InputOf<M2>> =
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
export class StateMachine<S extends MachineState, I extends MachineInputSource = MachineInputSource> {
  /**
   * The active state machine program.
   * @type {Map}
   * @private
   */
  private _program: Map<ActivationCond<S, I>,
    ActivationAction<S, I, any>> = new Map();
  private readonly _history: HistoryManager<S, I, this>;
  private _exitState?: Readonly<S & I>;

  /**
   * Constructor, requires an initial state.
   * @param {S} initialState The initial state for this machine.
   * @param inputSource Machine inputs.
   */
  protected constructor(initialState: S, inputSource?: I) {
    const properties = getAllMethods(this);
    for (let m of properties) {
      if (Reflect.hasMetadata(actionMetadataKey, m)) {
        const cond = Reflect.getMetadata(actionMetadataKey, m);
        this._program.set(cond, m as any);
      }
    }
    this._history = new HistoryManager<S, I, this>(this, initialState, inputSource,
      inputSource ? Reflect.getMetadata(inputMetadataKey, inputSource) : []
    );
  }

  /**
   * The state at program exit. Returns `undefined` unless the program has ended.
   * @returns {Readonly<S extends MachineState> | undefined}
   */
  get exitState() {
    return this._exitState;
  }

  get history(): IHistory<S> {
    return this._history;
  }

  /**
   * Advance a single tick and return.
   * @returns {number} Number of actions fired during this tick.
   */
  step() {
    let fired = 0;
    if(this.history.tick < 1)
      this._history._nextTick();
    const currentTick = this.history.tick;
    for (let [cond, body] of this._program) {
      if (this.history.tick !== currentTick && !this.exitState) {
        // abort current tick on rewind.
        // always report at least 1 action fired in this case.
        return Math.max(1, fired);
      }
      if (this.exitState)
        break;
      if (cond.call(this, this.history.currentState, this)) {
        const newState = body.call(this, this.history.currentState, this);
        if (newState) {
          this._history._mutateTick(newState);
        }
        fired++;
      }
    }
    this._history._nextTick();
    if (fired === 0)
      this._exitState = this.history.currentState as any;
    return fired;
  }

  /**
   * A blocking call that evaluates the state machine until it exits.
   * @param {boolean} forever Should we keep going even if the machine stops reacting?
   * @returns {Readonly<S extends MachineState>|null} Returns the machine's exit state,
   *  or null if the machine halted.
   */
  run(forever: boolean = false): Readonly<S & I> {
    while (!this._exitState) {
      const change = this.step();
      if (!forever && !change) {
        break;
      }
    }
    return this._exitState || this._history.currentState;
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
    if (exitState) {
      this._exitState = Object.assign(Object.create(null), this.history.currentState, exitState);
    }
    else {
      this._exitState = this.history.currentState as any;
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
      StateCombiner<StateMachine<S, any>, StateMachine<OS, any>> |
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
