import { HistoryManager } from './historyManager';
import { ActivationAction, ActivationCond, MachineState } from './index';
import { IHistory } from './interfaces';
import { programMetadataKey } from './programMetadataKey';

/** @internal */
function getAllMethods(object: any): Function[] {
  let current = object;
  let props: string[] = [];

  do {
    props.push(...Object.getOwnPropertyNames(current));
    current = Object.getPrototypeOf(current);
  } while (current);

  return Array.from(new Set(props.map(p => typeof object[p] === 'function' ? object[p] : null)
    .filter(p => p !== null)));
}

export type RecomineMode = 'current' | 'initial';

/**
 * Your state machine should inherit the `StateMachine<YourStateInterface>` class.
 */
export class StateMachine<S extends MachineState> {
  /**
   * The active state machine program.
   * @type {Map}
   * @private
   */
  private _program: Map<ActivationCond<S>, ActivationAction<S>> = new Map();
  /**
   *
   * @type {HistoryManager<S extends MachineState>}
   * @private
   */
  private _history: HistoryManager<S> = new HistoryManager<S>(this._initialState);
  private _exitState?: Readonly<S>;

  /**
   * Constructor, requires an initial state.
   * @param {S} _initialState
   */
  constructor(protected readonly _initialState: S) {
    const properties = getAllMethods(this);
    for (let m of properties) {
      if (Reflect.hasMetadata(programMetadataKey, m)) {
        const cond = Reflect.getMetadata(programMetadataKey, m);
        this._program.set(cond, m as any);
      }
    }
  }

  /**
   * Returns the history manager object.
   * @returns {HistoryManager<S extends MachineState>}
   */
  get history(): IHistory<S> {
    return this._history;
  }

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
    const current = this._history.currentState;
    for (let [cond, body] of this._program) {
      if (cond.call(this, current, this)) {
        const newState = body.call(this, current, this);
        if (newState) {
          if (this._exitState)
            Object.assign(this._exitState, newState);
          else
            this._history._mutateTick(newState);
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
  run(forever: boolean = false) {
    while (!this._exitState) {
      const change = this.step();
      if (!forever && !change)
        return this._exitState || null;
    }
    return this._exitState;
  }

  /**
   * Resets the state machine to the initial state.
   * @param {S} initialState (optional) Restart with a different initial state.
   */
  reset(initialState: S = this._initialState) {
    this._exitState = undefined;
    this.history.rewind(Infinity, initialState);
  }


  /**
   * Call this from any action to signal program completion.
   * @param {Readonly<S extends MachineState>} exitState The exit state to return from .run.
   */
  exit(exitState?: Readonly<S>) {
    if (!this._exitState)
      this._exitState = exitState || Object.assign(Object.create(null), this._history.currentState);
  }

  /**
   * Combine this machine with a new one.
   *  (warning: shared variables in state may cause emergent behaviour)
   * @param other Other machine to combine with.
   * @param recombineCurrent Use current state of instead of initial state?
   * @return A hybrid event machine exhibiting the behaviour of both parents.
   */
  recombine<OS extends MachineState>(other: StateMachine<OS>, recombineCurrent: boolean = false)
  {
    const state = Object.assign(Object.create(null),
      recombineCurrent ? this.history.currentState : this.history.initialState,
      recombineCurrent ? other.history.currentState : other.history.initialState);
    const child = new StateMachine<OS & S>(state);
    child._program = new Map();
    for(let [cond, action] of other._program) {
      child._program.set(cond as any, action as any);
    }
    for(let [cond, action] of this._program) {
      child._program.set(cond as any, action as any);
    }
    return child;
  }

}
