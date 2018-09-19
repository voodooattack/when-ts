import { MachineState, StateMachine, when } from '../src';
describe('Recombination', () => {
  it('Can calculate a prime', () => {

    interface PrimeState extends MachineState {
      counter: number;
      current: number;
      primes: number[];
    }

    class PrimeMachine extends StateMachine<PrimeState> {
      constructor() {
        super({ counter: 2, current: 3, primes: [2] });
      }

      @when(state => state.counter < state.current)
      incrementCounterOncePerTick({ counter }: PrimeState) {
        return { counter: counter + 1 };
      }

      @when(state => state.counter < state.current && state.current % state.counter === 0)
      resetNotPrime({ current }: PrimeState) {
        return { counter: 2, current: current + 1 };
      }

      @when(state => state.counter >= state.current)
      capturePrime({ primes, current }: PrimeState) {
        return { counter: 2, current: current + 1, primes: [...primes, current] };
      }

      @when(state => state.primes.length >= 10)
      exitMachine() {
        this.exit({ counter: 0, current: 0, primes: this.history.nextState.primes! });
      }
    }

    const primeMachine = new PrimeMachine();

    const result = primeMachine.run();

    console.log(result!.primes);

    expect(result).not.toBeFalsy();
    expect(result!.primes).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
  });
});
