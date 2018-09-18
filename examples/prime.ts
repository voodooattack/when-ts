import { StateMachine, when, MachineState } from 'when-ts';

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
  resetNotPrime({ counter, primes, current }: PrimeState) {
    return { counter: 2, current: current + 1 };
  }

  @when(state => state.counter >= state.current)
  capturePrime({ counter, primes, current }: PrimeState) {
    return { counter: 2, current: current + 1, primes: [...primes, current] };
  }

  @when(state => state.primes.length >= 10)
  exitMachine() {
    this.exit();
  }
}

const primeMachine = new PrimeMachine();

const result = primeMachine.run();

if (result)
  console.log(result!.primes);
