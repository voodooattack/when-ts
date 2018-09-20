import { MachineState, StateMachine, when } from '../src';

describe('Recombination', () => {

  interface CommonState extends MachineState {
    sharedValue?: string;
  }

  interface StateA extends CommonState {
    valueA: string;
  }

  interface StateB extends CommonState {
    valueB: string;
  }

  class TestMachineA extends StateMachine<StateA> {
    constructor() {
      super({ valueA: '' });
    }

    @when((_, m) => m.history.tick <= 5)
    incrementAOncePerTick(s: StateA) {
      return { valueA: s.valueA + (s.sharedValue || 'a') };
    }

  }

  class TestMachineB extends StateMachine<StateB> {
    constructor() {
      super({ valueB: '' });
    }

    @when((_, m) => m.history.tick <= 10)
    incrementBOncePerTick(s: StateB) {
      return { valueB: s.valueB + (s.sharedValue || 'b') };
    }

  }

  class TestMachineC extends StateMachine<Required<CommonState>> {
    constructor() {
      super({ sharedValue: 'c' });
    }

    @when((_, m) => m.history.tick <= 10)
    incrementSharedPerTick(s: Required<CommonState>) {
      return { sharedValue: s.sharedValue === 'c' ? 'd' : 'c' };
    }
  }

  it('Can handle basic recombination', () => {
    const testA = new TestMachineA();
    const testB = new TestMachineB();
    const testC = testA.recombine(testB);
    expect(testC).toBeInstanceOf(new StateMachine<StateA & StateB>({} as any).constructor);
    const resultC = testC.run();
    expect(resultC).toEqual({ valueA: 'a'.repeat(5), valueB: 'b'.repeat(10) });
  });

  it('Recombination can introduce new behaviour', () => {
    const testA = new TestMachineA();
    const testB = new TestMachineB();

    const testAll = testA.recombine(testB).recombine(new TestMachineC());

    const resultA = testA.run();
    const resultB = testB.run();

    expect(resultA).toEqual({ valueA: 'a'.repeat(5) });
    expect(resultB).toEqual({ valueB: 'b'.repeat(10) });

    const resultAll = testAll.run();

    expect(resultAll).toEqual({ sharedValue: 'c', valueA: 'cdcdc', valueB: 'cdcdcdcdcd' });
  });

});
