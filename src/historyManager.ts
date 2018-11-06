import { MachineInputSource, MachineState, StateMachine } from './index';
import { IHistory } from './interfaces';
import { InputMapping } from './util';

/**
 * The HistoryManager class manages the state/history of a program.
 */

/// ignore the internal implementation in the docs, because it exposes internal methods.
/** @ignore */
export class HistoryManager<S extends MachineState,
  I extends MachineInputSource,
  M extends StateMachine<S, I> = StateMachine<S, I>> implements IHistory<S>
{
  protected readonly _instance: M;
  protected readonly _inputSource?: I;
  protected readonly _inputMappings: InputMapping<S, I, any>[] = [];
  private readonly _initialState: Readonly<S & I>;
  private _previousInputs: Partial<I> = {};
  private _maxHistory: number = Infinity;
  private _tick: number = 0;
  private _nextState: Readonly<Partial<S> & I>;
  private _records: (S & Readonly<I>)[] = [];

  /**
   * Constructor with an initial state.
   * @param _instance The state machine instance.
   * @param {S} _initialState The initial program state.
   * @param _inputSource Source for inputs.
   */
  /** @ignore */
  constructor(
    instance: M,
    initialState: S,
    inputSource?: I,
    inputMappings?: Set<InputMapping<S, I, any>>
  )
  {
    this._instance = instance;
    if (inputSource && inputMappings) {
      this._inputSource = inputSource;
      this._inputMappings = Array.from(inputMappings);
    }
    this._initialState = Object.assign(Object.create(null), initialState);
    this._nextState = Object.assign(Object.create(null), this._initialState, this._collectInputs(true));
    this._nextTick();
  }

  /**
   * Get the current tick number.
   * @returns {number}
   */
  get tick() {
    return this._tick;
  }

  /**
   * Returns the next state being updated.
   * @returns {Partial<S extends MachineState>}
   */
  get nextState() {
    return this._nextState;
  }

  /**
   * Returns the entire state history.
   * @returns {ReadonlyArray<S extends MachineState>}
   */
  get records(): ReadonlyArray<S & I> {
    return this._records;
  }

  /**
   * Return the maximum number of history states to keep.
   * @returns {number}
   */
  get limit() {
    return this._maxHistory;
  }

  /**
   * Limit the number of recorded history states.
   */
  set limit(limit: number) {
    if (limit < 1) limit = 1;
    if (limit < this._maxHistory) {
      // trim back the record history.
      this._records.splice(1, this._records.length - limit);
    }
    this._maxHistory = limit;
  }

  /**
   * Returns the initial state.
   * @returns {Partial<S extends MachineState>}
   */
  get initialState(): Readonly<S> {
    return this._initialState;
  }

  /**
   * Returns the current state.
   * @returns {Partial<S extends MachineState>}
   */
  get currentState(): Readonly<S & I> {
    return this.records[this.records.length - 1];
  }

  /**
   * Returns the previous state.
   * @returns {Partial<S extends MachineState>}
   */
  get previousState(): Readonly<S> {
    return this.records[this.records.length - 2];
  }

  rewind(t: number, mutate?: Partial<S>) {

    t = Math.min(this.tick - this._records.length, t);
    t = Math.max(1, t);

    const target = this.tick - t - 1;

    if (this._records[target]) {

      const discarded = this._records.splice(target, this._records.length - target);

      if (!this.currentState) {
        this._records.push(Object.assign(Object.create(null), this._initialState));
      }

      if (mutate) {
        Object.assign(this._records[this.records.length - 1], mutate);
      }

      if (this._inputSource) {
        Object.assign(this._records[this.records.length - 1], this._collectInputs());
      }

      this._tick = t;

      this._nextState = Object.assign(Object.create(null), this.currentState);

      return discarded;
    }

    return false;
  }

  /**
   * Clears the state history. Rewinds to the beginning, and the rest of the
   * current tick will be ignored.
   */
  clear() {
    this.rewind(1);
  }

  /** @ignore */
  _mutateTick(p: Partial<S>) {
    for (let input of this._inputMappings) {
      if (input.key in p) delete (p as any)[input.key];
    }
    return Object.assign(this._nextState, p);
  }

  _nextTick() {
    let nextState = this.nextState as Readonly<Partial<S> & I>;
    if (this.tick === 0)
      nextState = Object.assign(nextState, this._records.pop() || {}); // discard old tick 0
    this._records.push(nextState as any);
    if (this.records.length > this._maxHistory) {
      this._records.splice(
        0,
        this.records.length - this._maxHistory
      );
    }
    this._beginTick(this._tick++ <= 1);
  }

  /**
   *
   * @param {boolean} patchCurrent
   * @private
   */
  protected _beginTick(patchCurrent = false) {
    const inputs =
            this._inputSource ? Object.assign(Object.create(null),
              this._previousInputs || {}, this._collectInputs(patchCurrent)) : undefined;
    this._previousInputs = inputs || this._previousInputs;
    // patch the current state with inputs on tick 1.
    // We can't do this in the constructor, unfortunately.
    if (patchCurrent && inputs) {
      Object.assign(this._records[this._records.length - 1], inputs);
    }
    const sources = [];
    if (this.previousState)
      sources.push(this.previousState);
    if (this.currentState)
      sources.push(this.currentState);
    if (inputs)
      sources.push(inputs);
    this._nextState = Object.assign(Object.create(null), ...sources);
  }

  protected _collectInputs(force: boolean = false): Partial<I> {
    if (!this._inputSource) {
      return {};
    }
    const inputSource = this._inputSource!;
    const inputs: Partial<I> = Object.assign(Object.create(null), this._previousInputs);
    for (let input of this._inputMappings) {
      let value: any;
      if (input.policy === 'always' || force)
      {
        value = inputSource[input.propertyKey as keyof I];
      }
      else if (input.policy === 'once') {
        if (this.tick === 1) // only poll inputs with a `once` policy on startup
        {
          value = (inputSource as any)[input.propertyKey];
        }
      }
      else {
        if (this.tick >= 1 && input.policy.call(null, this.currentState, this._instance)) {
          value = inputSource[input.propertyKey as keyof I];
        }
        else if (input.key in this._previousInputs) {
          value = (this._previousInputs as any)[input.key] || this.currentState[input.key as keyof I];
        }
      }
      value = input.transform ? input.transform.call(null, value) : value;
      if (value !== undefined) {
        inputs[input.key as keyof I] = value;
      }
    }
    return inputs;
  }

}
