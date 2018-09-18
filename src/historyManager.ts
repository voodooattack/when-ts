import { type } from 'os';
import { MachineState } from './index';
import { IHistory } from './interfaces';

/**
 * The HistoryManager class manages the state/history of a program.
 */
export class HistoryManager<S extends MachineState> implements IHistory<S> {
  private _records: S[] = [];
  private _tick: number = 0;
  private _nextState: Partial<S>;
  private _maxHistory: number = Infinity;

  /**
   * Constrctor with an initial state.
   * @param {S} _initialState The initial program state.
   */
  constructor(protected readonly _initialState: S) {
    this._nextState = _initialState;
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
   * Return the maximum number of history states to keep.
   * @returns {number}
   */
  get limit() { return this._maxHistory }

  /**
   * Limit the number of recorded history states.
   */
  set limit(limit: number) {
    if (limit < 1) limit = 1;
    if (limit < this._maxHistory) {
      // trim back the record history.
      this._records.splice(0, this._records.length - limit);
    }
    this._maxHistory = limit;
  }

  /**
   * Rewind time by `n` ticks, the rest of the currently executing tick will be aborted.
   *  A partial state can be passed as the second argument to mutate the rewound state.
   * @param {number} n The number of ticks to rewind, defaults to Infinity.
   * @param {Partial<S extends MachineState>} mutate Any mutations to apply to the state after rewinding.
   */
  rewind(n: number, mutate?: Partial<S>) {
    if (n <= this._maxHistory && Number.isFinite(n)) {
      this._records.splice(n, this.records.length - n);
      this._tick -= n;
    } else {
      this._records.splice(0, this._records.length);
      this._tick = 0;
      this._records.push(this._initialState);
    }

    if (mutate) {
      this._records[this._records.length - 1] = Object.assign(Object.create(null),
        this.currentState, mutate);
    }

    this._resetTick();
  }

  /**
   * Clears the state history. Rewinds to the beginning, and the rest of the current tick will be aborted.
   */
  clear() {
    this.rewind(Infinity);
  }

  /**
   * Returns the entire state history.
   * @returns {ReadonlyArray<S extends MachineState>}
   */
  get records(): ReadonlyArray<S> {
    return this._records;
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
  get currentState(): Readonly<S> {
    return this.records[this.records.length - 1];
  }

  /**
   * Returns the next state being updated.
   * @returns {Partial<S extends MachineState>}
   */
  get nextState(): Readonly<Partial<S>> {
    return this._nextState;
  }

  protected _resetTick() {
    this._nextState = Object.assign(Object.create(null), this.records[this.records.length - 1]);
  }

  /** @internal */
  _mutateTick(p: Partial<S>) {
    return Object.assign(this._nextState, p);
  }

  /** @internal */
  _nextTick() {
    const nextState = this.nextState as Readonly<S>;
    this._records.push(nextState);
    if (this.records.length > this._maxHistory)
      this._records.splice(0, this.records.length - this._maxHistory);
    this._resetTick();
    this._tick++;
  }

}
