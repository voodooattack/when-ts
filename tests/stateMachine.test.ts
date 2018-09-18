import { StateMachine, when } from '../src';

describe('StateMachine', () => {

  it('StateMachine is instantiable', () => {
    expect(new StateMachine({})).toBeInstanceOf(StateMachine);
  });

  it('Can handle a basic state machine', () => {

    type State = {
      value: number;
    }

    class TestMachine extends StateMachine<State> {
      constructor() {
        super({ value: 0 });
      }

      @when(state => state.value < 5)
      incrementOncePerTick(s: State) {
        return { value: s.value + 1 };
      }

      @when(state => state.value >= 5)
      exitWhenDone(s: State, m: TestMachine) {
        expect(m.history.tick).toEqual(6);
        m.exit();
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

      @when(true)
      incrementOncePerTick(s: State) {
        return { value: s.value + 1 };
      }

      @when((_, machine) => machine.history.tick >= 5)
      exitWhenDone(s: State, m: TestMachine) {
        if (m.history.tick >= 5 && s.cycle < 10) { // rewind the program 10 times
          // rewind the state machine with a side-effect
          m.history.rewind(Infinity, { cycle: s.cycle + 1 });
        }
        else if (s.cycle >= 10)
          m.exit(); // exit the state machine
      }
    }

    const test = new TestMachine();
    const result = test.run();

    expect(result).toEqual({ value: 4, cycle: 10 });

  });

  it('Can restart with a new state', () => {

    type State = {
      value: number;
    }


    class TestMachine extends StateMachine<State> {
      constructor() {
        super({ value: 0 });
      }

      @when(s => s.value < 5)
      incrementOncePerTick(s: State) {
        return { value: s.value + 1 };
      }

      @when(state => state.value >= 5)
      exitWhenDone(s: State, m: TestMachine) {
        if (s.value >= 100)
          m.exit();
        else
          m.reset({ value: 100 });
      }
    }

    const test = new TestMachine();
    const result = test.run();

    expect(result).toEqual({ value: 100 });

  });


  it('Can handle infinite resets', () => {

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

      @when(state => state.value >= 5)
      exitWhenDone(s: State, m: TestMachine) {
        // never do this in reality, never reference anything other than the state!
        if (rewinds++ > 100)
          m.exit({ value: null });
        m.history.clear();
        rewinds++;
      }
    }

    const test = new TestMachine();
    const result = test.run();

    expect(result).toEqual({ value: null });

  });

  it('Can rewind n ticks', () => {

    type State = {
      value: number;
    }

    let rewinds = 0;
    let series: number[] = [];

    class TestMachine extends StateMachine<State> {
      constructor() {
        super({ value: 0 });
      }

      @when(s => s.value < 3)
      incrementOncePerTick(s: State) {
        series.push(s.value);
        return { value: s.value + 1 };
      }

      @when(state => state.value >= 3)
      exitWhenDone(s: State, m: TestMachine) {
        // never do this in reality, never reference anything other than the state!
        if (++rewinds > 2)
        {
          m.exit();
          return;
        }
        m.history.rewind(2);
      }
    }

    const test = new TestMachine();
    const result = test.run();

    expect(result).toEqual({ value: 3 });
    expect(series).toEqual([0, 1, 2, 1, 2, 1, 2]);

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
      let i = Math.min(m.history.limit, m.history.tick),
        v = Math.max(m.history.tick - m.history.limit, 0);
      while(i-- > 0) {
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
      exitOnTick(s: State, m: TestMachine) {
        m.exit();
      }

    }

    const m = new TestMachine();

    while (!m.exitState) {
      expect(m.history.records.length).toBeLessThanOrEqual(1);
      expect(m.history.records).toHaveLength(1);
      m.step();
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
      @when(s => s.count < s.to)
      incrementOnceTillEqual(s: State) {
        return { count: s.count + s.inc };
      }
      @when(s => s.count >= s.to)
      exitOnEqual(s: State, m: TestMachine) {
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

});
