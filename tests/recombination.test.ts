import { MachineState, StateMachine, when } from '../src';

describe('Recombination', () => {

  interface CommonState extends MachineState {
    sharedValue?: number;
  }

  interface StateA extends CommonState {
    valueA: number;
  }

  interface StateB extends CommonState {
    valueB: number;
  }

  class TestMachineA extends StateMachine<StateA> {
    constructor() {
      super({ valueA: 0 });
    }

    @when(true)
    incrementOncePerTick(s: StateA) {
      return { valueA: s.valueA + (s.sharedValue || 1) };
    }

    @when(state => state.valueA >= 5)
    exitMachine() {
      this.exit();
    }

  }

  class TestMachineB extends StateMachine<StateB> {
    constructor() {
      super({ valueB: 0 });
    }

    @when(true)
    incrementOncePerTick(s: StateB) {
      return { valueB: s.valueB + ((s.sharedValue || 1) ** 2) };
    }


    @when(state => state.valueB >= 10)


    @when(state => state.valueB >= 10)
    exitMachine() {
      this.exit();
    }
  }

  it('Can handle basic recombination', () => {
    const testA = new TestMachineA();
    const testB = new TestMachineB();

    const resultA = testA.run();
    const resultB = testB.run();

    expect(resultA).toEqual({ valueA: 5 });
    expect(resultB).toEqual({ valueB: 10 });

    const testC = testA.recombine(testB);
    const resultC = testC.run();

    expect(resultC).toEqual({ valueA: 5, valueB: 5 });
  });

  class TestMachineC extends StateMachine<CommonState> {
    constructor() {
      super({ sharedValue: 0 });
    }

    @when(true)
    incrementOncePerTick(s: StateB) {
      return { sharedValue: s.sharedValue! + 10 };
    }
  }

  it('Recombination can introduce emergent behaviour', () => {
    const testA = new TestMachineA();
    const testB = new TestMachineB();

    const resultA = testA.run();
    const resultB = testB.run();

    expect(resultA).toEqual({ valueA: 5 });
    expect(resultB).toEqual({ valueB: 10 });

    const testC = testA.recombine(testB).recombine(new TestMachineC());
    const resultC = testC.run();

    expect(resultC).toEqual({ sharedValue: 20, valueA: 31, valueB: 101 });
  });

});
