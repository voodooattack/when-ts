/**
 * prime.ts: A `when` state machine to discover primes through brute-force.
 *
 * Build this by typing `npm run build` and run it with the following command:
 * `node dist/lib/examples/prime.js <n>` where `n` is an integer specifying the
 * maximum number of primes to look for before stopping.
 * It will find the first 10 primes if you omit the argument.
 * Output is the total time spent (in ticks), number of primes, the primes themselves,
 * and time spent finding every individual prime.
 */

import { MachineState, StateMachine, when } from '../src';

/**
 * This state object defines the variables this machine will use for its state.
 */
interface PrimeState extends MachineState {
  // total number of primes to find in a given run (readonly)
  readonly numberOfPrimes: number;
  // the current number being checked in any given `tick`
  counter: number;
  // number to start counting from
  current: number;
  // stored primes found so far
  primes: number[];
  // tick count for every prime stored
  times: number[];
}

/**
 * A simple state machine for brute-forcing primes.
 */
class PrimeMachine extends StateMachine<PrimeState> {
  constructor(public readonly numberOfPrimes: number) {
    // pass the initial state to StateMachine<>
    super({ counter: 2, current: 3, primes: [2], numberOfPrimes, times: [0] });
  }

  // increment the counter with every tick
  @when(state => state.counter < state.current)
  incrementCounterOncePerTick({ counter }: PrimeState) {
    return { counter: counter + 1 };
  }

  // this will only be triggered if the current number fails the prime check
  @when(state => state.counter < state.current && state.current % state.counter === 0)
  resetNotPrime({ current }: PrimeState) {
    return {
      counter: 2, // reset the counter
      current: current + 1 // skip this number
    };
  }

  // this will only be triggered when all checks have passed (the number is a confirmed prime)
  @when(state => state.counter === state.current)
  capturePrime({ primes, current, times }: PrimeState, { history }: PrimeMachine) {
    return {
      counter: 2, // reset the counter
      current: current + 1, // increment the target
      primes: [...primes, current], // store the new prime
      times: [...times, history.tick] // store the current tick count
    };
  }

  // this will cause execution to end when we've found the required number of primes
  @when(state => state.primes.length >= state.numberOfPrimes)
  exitMachine() {
    this.exit();
  }
}

// obtain the supplied count or default to 10
const count = process.argv[2] ? parseInt(process.argv[2], 10) : 10;
// crate an instance of the prime machine
const primeMachine = new PrimeMachine(count);
// let it execute to a conclusion
const result = primeMachine.run();

if (result) {
  // number of primes
  console.log(`N = ${primeMachine.numberOfPrimes}`);
  // total execution time
  console.log(
    `O(N) = ${primeMachine.history.tick} ticks`
  );
  // the primes themselves
  console.log(
    `P(N) =`, result!.primes
  );
  // prime times
  console.log(
    `T(P) =`,
    result.times
  );
  // time spent per prime
  console.log(
    `T(P) - T(P-1) =`,
    result.times.map(
      (t, i, a) => t - (a[--i] || 0))
  );
}
