import { input, MachineInputSource, StateMachine, StateObject, unless, when } from '../src';

describe('StateMachine', () => {

  it('Can handle a basic state machine', () => {

    type State = {
      value: number;
    }

    class TestMachine extends StateMachine<State> {
      constructor() {
        super({ value: 0 });
      }

      @when<State>(state => state.value >= 5)
      exitWhenDone(_: State, m: TestMachine) {
        // this should execute on tick 6
        expect(m.history.tick).toEqual(6);
        m.exit();
      }

      @when<State>(state => state.value < 5)
      incrementOncePerTick(s: State) {
        return { value: s.value + 1 };
      }

    }

    const test = new TestMachine();
    const result = test.run();

    expect(result).toEqual({ value: 5 });
  });

  it('Has functioning rewind with side-effects', () => {

    type State = {
      value: number;
      cycle: number;
    }

    class TestMachine extends StateMachine<State> {
      constructor() {
        super({ value: 0, cycle: 0 });
      }

      @when<State>(s => s.value < 5)
      incrementOncePerTick(s: State) {
        return { value: s.value + 1 };
      }

      @unless<State>(s => s.value < 5)
      exitWhenDone(s: State, m: TestMachine) {
        if (s.cycle < 10) { // rewind the program 10 times
          // rewind the state machine with a side-effect
          m.history.rewind(Infinity, { cycle: s.cycle + 1 });
        }
        else {
          // exit the state machine with the currently saved state
          // note that any state mutations applied within this tick
          // will be ignored!
          m.exit();
          // // you can mitigate this behaviour by using:
          // m.exit(m.history.nextState as State);
        }
      }
    }

    const test = new TestMachine();
    const result = test.run(true);

    // expected: the state machine will exit with the last *saved* state, with value equal to 5.
    expect(result).toEqual({ value: 5, cycle: 10 });

  });

  it('Can restart with a new state', () => {

    type State = {
      value: number;
    }

    class TestMachine extends StateMachine<State> {
      constructor() {
        super({ value: 0 });
      }

      @when<State>(s => s.value < 5)
      incrementOncePerTick(s: State) {
        return { value: s.value + 1 };
      }

      @when<State>(state => state.value >= 5)
      exitWhenDone(s: State, m: TestMachine) {
        if (s.value >= 100) {
          m.exit();
        }
        else {
          m.reset({ value: 100 });
        }
      }
    }

    const test = new TestMachine();
    const result = test.run();

    expect(result).toEqual({ value: 100 });

  });


  it('Can handle resets', () => {

    type State = {
      value: number | null;
    }

    let rewinds = 0;

    class TestMachine extends StateMachine<State> {
      constructor() {
        super({ value: 0 });
      }

      @when(true)
      incrementOncePerTick(s: State) {
        return { value: s.value! + 1 };
      }

      @when<State>(state => state.value !== null && state.value >= 5)
      exitWhenDone(_: State, m: TestMachine) {
        // never do this in reality, never reference anything other than the state!
        if (rewinds++ > 100) {
          m.exit({ value: null });
        }
        m.history.clear();
        rewinds++;
      }
    }

    const test = new TestMachine();
    const result = test.run();

    expect(result).toEqual({ value: null });

  });

  it('Can rewind n times', () => {

    type State = {
      value: number;
    }

    let rewinds = 0;
    let series: [number, number][] = [];

    class TestMachine extends StateMachine<State> {
      constructor() {
        super({ value: 0 });
      }

      @when<State>(true)
      incrementOncePerTick(s: State, m: TestMachine) {
        // never do this in reality, never reference or modify anything other than the state!
        series.push([s.value, m.history.tick]);
        return { value: s.value + 1 };
      }

      @when<State>((_, machine) => machine.history.tick === 4)
      exitWhenDone(_: State, m: TestMachine) {
        // never do this in reality, never reference or modify anything other than the state!
        if (++rewinds >= 2)
        {
          m.exit();
          return;
        }
        m.history.rewind(2);
      }
    }

    const test = new TestMachine();
    const result = test.run(true);

    expect(result).toEqual({ value: 3 });
    expect(series).toEqual([[0, 1], [1, 2], [2, 3], [3, 4], [1, 2], [2, 3], [3, 4]]);

  });

  it('Can discard old states', () => {

    type State = {
      value: number;
    }

    let historyLength = 4;

    class TestMachine extends StateMachine<State> {
      constructor() {
        super({ value: 0 });
        this.history.limit = historyLength;
      }

      @when(true)
      incrementOncePerTick(s: State) {
        return { value: s.value + 1 };
      }
    }

    const m = new TestMachine();

    while (m.history.tick < 5) {
      expect(m.history.records.length).toBeLessThanOrEqual(historyLength);
      const expected: State[] = [];
      let i = Math.min(m.history.limit, m.history.tick);
      let v = Math.max(m.history.tick - m.history.limit, 0);
      while (i-- > 0) {
        expected.push({ value: v++ });
      }
      expect(m.history.records).toEqual(expected);
      m.step();
    }

  });

  it('Can run with history disabled', () => {

    type State = {
      value: number;
    }


    class TestMachine extends StateMachine<State> {
      constructor() {
        super({ value: 0 });
        this.history.limit = 0;
      }

      @when(true)
      incrementOncePerTick(s: State) {
        return { value: s.value + 1 };
      }

      @when((_, m) => m.history.tick >= 5)
      exitOnTick(_: State, m: TestMachine) {
        m.exit();
      }

    }

    const m = new TestMachine();

    while (!m.exitState) {
      m.step();
      expect(m.history.records).toHaveLength(1);
    }

    expect(m.exitState).toEqual({ value: 4 });

  });

  it('Can reset', () => {

    type State = {
      inc: number;
      to: number;
      count: number
    }

    class TestMachine extends StateMachine<State> {
      constructor() {
        super({ inc: 1, to: 10, count: 0 });
        this.history.limit = 0;
      }

      @when<State>(s => s.count < s.to)
      incrementOnceTillEqual(s: State) {
        return { count: s.count + s.inc };
      }

      @when<State>(s => s.count >= s.to)
      exitOnEqual(_: State, m: TestMachine) {
        m.exit();
      }
    }

    const m = new TestMachine();

    while (m.history.tick < 3) {
      m.step();
    }

    expect(m.history.currentState).toEqual({ inc: 1, to: 10, count: 2 });

    m.reset({ inc: 2, to: 8, count: 0 });

    expect(m.run()).toEqual({ inc: 2, to: 8, count: 8 });

    m.reset({ inc: 1, to: 10, count: 0 });
    expect(m.run()).toEqual({ inc: 1, to: 10, count: 10 });

    m.reset({ inc: 1, to: 10, count: 0 });
    expect(m.run()).toEqual({ inc: 1, to: 10, count: 10 });

  });


  it('@andWhen works', () => {

    type State = {
      count: number;
      inc: number;
      to: number;
    }

    class TestMachine extends StateMachine<State> {
      constructor() {
        super({ inc: 1, to: 10, count: 0 });
        this.history.limit = 0;
      }

      @when<State>(s => s.count < s.to)
      keepMe() {
        /// empty rule to make the machine run to its conclusion
      }

      @when<State>(s => s.count < s.to)
        .andWhen((_s, m) => m.history.tick % 2 === 0)
      incrementOnceTillEqual(s: State) {
        return { count: s.count + s.inc };
      }

      @when<State>(s => s.count >= s.to)
      exitOnEqual(_: State, m: TestMachine) {
        m.exit();
      }
    }

    const m = new TestMachine();

    expect(m.run()).toEqual({ inc: 1, to: 10, count: 10 });
    expect(m.history.tick).toEqual(22);

  });

  it('@unless works', () => {

    type State = {
      count: number;
      inc: number;
      to: number;
    }

    class TestMachine extends StateMachine<State> {
      constructor() {
        super({ inc: 1, to: 10, count: 0 });
        this.history.limit = 0;
      }

      @when<State>(true).unless(s => s.count >= s.to)
      incrementOnceTillEqual(s: State) {
        return { count: s.count + s.inc };
      }

      @when<State>(s => s.count >= s.to)
      exitOnEqual(_: State, m: TestMachine) {
        m.exit();
      }
    }

    const m = new TestMachine();

    while (m.history.tick < 3) {
      m.step();
    }

    expect(m.history.currentState).toEqual({ inc: 1, to: 10, count: 2 });

    m.reset({ inc: 2, to: 8, count: 0 });

    expect(m.run()).toEqual({ inc: 2, to: 8, count: 8 });

    m.reset({ inc: 1, to: 10, count: 0 });
    expect(m.run()).toEqual({ inc: 1, to: 10, count: 10 });

    m.reset({ inc: 1, to: 10, count: 0 });
    expect(m.run()).toEqual({ inc: 1, to: 10, count: 10 });

  });

  it('@inhibitedBy works', () => {

    type State = {
      count: number;
      inc: number;
      to: number;
    }

    class TestMachine extends StateMachine<State> {
      constructor() {
        super({ inc: 1, to: 10, count: 0 });
        this.history.limit = 0;
      }

      @when<State>(s => s.count < s.to)
        .inhibitedBy('runsEveryOtherTime')
      incrementOnceTillEqual(s: State) {
        return { count: s.count + s.inc };
      }

      @when<State>((_s, m) => m.history.tick % 4 === 0)
      runsEveryOtherTime(s: State, _m: TestMachine) {
        return { count: s.count - s.inc };
      }

      @when<State>(s => s.count >= s.to)
      exitOnEqual(_: State, m: TestMachine) {
        m.exit();
      }
    }

    const m = new TestMachine();

    expect(m.run()).toEqual({ inc: 1, to: 10, count: 10 });
    expect(m.history.tick).toEqual(20);

  });

  it('@input works', () => {

    interface IFactorialInputs extends MachineInputSource {
      readonly externalCounter: number;
    }

    class FactorialInputs implements IFactorialInputs {
      internalCounter: number = 0;

      // polled with every tick.
      @input<FactorialState, FactorialInputs>('always')
      get externalCounter() {
        return this.internalCounter;
      }

      update() { this.internalCounter++; }
    }

    type FactorialState = {
      currentValue: number;
    }

    class FactorialMachine extends StateMachine<FactorialState, IFactorialInputs> {

      /// define an external counter, this can be the last known value for a
      // real-time signal, the state of an external system, the health of an
      // NPC, or anything not computationally expensive that can be
      constructor(inputSource: IFactorialInputs) {
        /* we set this external input here to satisfy TypeScript,
         * but it will be overwritten anyway */
        super({ currentValue: 1 }, inputSource);
      }

      @when<FactorialState, FactorialInputs>((_, machine) => machine.history.tick <= 10)
      tryToOverwriteInput() {
        return { externalCounter: null };
      }

      @when<FactorialState, FactorialInputs>(state => state.externalCounter <= 5 && state.externalCounter > 0)
      incrementalFactorial(s: StateObject<FactorialState, FactorialInputs>) {
        return { currentValue: s.currentValue * s.externalCounter };
      }

    }

    const inputSource = new FactorialInputs();

    const test = new FactorialMachine(inputSource);

    do {
      inputSource.update();
    } while (test.step());


    expect(test.exitState).toBeTruthy();
    expect(test.exitState).toHaveProperty('externalCounter', inputSource.internalCounter - 1);
    expect(test.exitState).toHaveProperty('currentValue', 120);
  });

  it('@input policies work', () => {

    interface IBlankMachineInputs {
      fixed: number;
      increments: number;
      random: number;
    }

    type BlankState = {
      tick: number;
    };

    class BlankMachine extends StateMachine<BlankState, IBlankMachineInputs> {

      constructor(inputSource: IBlankMachineInputs) {
        super({ tick: 0 }, inputSource);
      }

      @when<BlankState>(true)
      keepMe(_: any, m: BlankMachine) {
        return { tick: m.history.tick };
      }

      @when<BlankState>((_, m) => m.history.tick > 5)
      exitMachine(_: any, m: BlankMachine) {
        m.exit();
      }
    }

    class BlankMachineInputs implements IBlankMachineInputs {

      private _fixed = 10;
      private _increments = 0;
      private _random = 0;

      // polled once at startup.
      @input<BlankState, IBlankMachineInputs>('once')
      get fixed() {
        return this._fixed;
      }

      // polled every other time and once at the beginning
      @input<BlankState, IBlankMachineInputs>(
        (_, m) => m.history.tick % 2 === 0
      )
      get increments() {
        return this._increments;
      }

      // polled with every tick.
      @input<BlankState, IBlankMachineInputs>('always')
      get random() {
        return this._random;
      }

      snapshot(tick: number) {
        return {
          tick,
          fixed: this._fixed,
          increments: this._increments,
          random: this._random
        };
      }

      seed() {
        this._random = Math.round(Math.random() * 1000);
      }

      update(tick: number): StateObject<BlankState, IBlankMachineInputs> {
        let old = this.snapshot(tick);
        this._fixed = 10;
        this._increments++;
        this._random = Math.round(Math.random() * 1000);
        if (old.tick % 2 !== 0) old.increments = old.increments === 0 ?  0 : old.increments - 1;
        return { ...old, tick };
      }
    }

    const inputSource = new BlankMachineInputs();
    const expectedHistory: StateObject<BlankState, IBlankMachineInputs>[] = [];
    const test = new BlankMachine(inputSource);

    expectedHistory.push(inputSource.snapshot(0)); // initial state

    inputSource.seed();

    expectedHistory.push(inputSource.snapshot(1));

    while (test.step()) {
      expectedHistory.push(inputSource.update(test.history.tick));
    }

    // On the last tick, the handler won't fire and update the tick.
    expectedHistory[expectedHistory.length -1].tick--;

    expect(test.history.records).toEqual(expectedHistory);
  });

});
