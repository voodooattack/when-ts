import { MachineState, StateMachine, when } from '../src';

interface PrimeState extends MachineState {
  counter: number;
  current: number;
  primes: number[];
  readonly numberOfPrimes: number;
}

// this state machine will perpetually discover primes up to the specified count
class PrimeMachine extends StateMachine<PrimeState> {
  constructor(public readonly numberOfPrimes: number) {
    super({ counter: 2, current: 3, primes: [2], numberOfPrimes });
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

  @when(state => state.primes.length >= state.numberOfPrimes)
  exitMachine() {
    this.exit();
  }
}

const primeMachine = new PrimeMachine(10);

const result = primeMachine.run();

if (result) {
  console.log(`${primeMachine.numberOfPrimes} prime numbers found:`,
    result!.primes, `in ${primeMachine.history.tick} ticks.`
  );
}
