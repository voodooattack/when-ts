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

import { input, MachineState, StateMachine, StateObject, when } from '../src';

interface IPrimeInputSource {
  // total number of primes to find in a given run (readonly)
  readonly numberOfPrimes: number;
}

class PrimeInputSource implements IPrimeInputSource {
  @input<PrimeState, PrimeState>('once')
  public readonly numberOfPrimes: number = 10;

  constructor(numberOfPrimes: number = 10)
  {
    this.numberOfPrimes = numberOfPrimes;
  }
}

/**
 * This state object defines the variables this machine will use for its state.
 */
interface PrimeState extends MachineState {
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
  constructor(inputSource: PrimeInputSource) {
    // pass the initial state to the StateMachine
    super({ counter: 2, current: 3, primes: [2], times: [0] }, inputSource);
  }

  // increment the counter with every tick
  @when<PrimeState, IPrimeInputSource>(state => state.counter < state.current)
  // this inhibit cause execution to end when we've found the required number of primes
    .unless(state => state.primes.length >= state.numberOfPrimes)
  incrementCounterOncePerTick({ counter }: StateObject<PrimeState, IPrimeInputSource>) {
    return { counter: counter + 1 };
  }

  // this will only be triggered if the current number fails the prime check
  @when<PrimeState, IPrimeInputSource>(
    state => state.counter < state.current && state.current % state.counter === 0)
    .unless(state => state.primes.length >= state.numberOfPrimes)
  resetNotPrime({ current }: StateObject<PrimeState, IPrimeInputSource>) {
    return {
      counter: 2, // reset the counter
      current: current + 1 // skip this number
    };
  }

  // this will only be triggered when all checks have passed (the number is a confirmed prime)
  @when<PrimeState, IPrimeInputSource>(state => state.counter === state.current)
    .unless(state => state.primes.length >= state.numberOfPrimes)
  capturePrime({ primes, current, times }: StateObject<PrimeState, IPrimeInputSource>, { history }: PrimeMachine) {
    return {
      counter: 2, // reset the counter
      current: current + 1, // increment the target
      primes: [...primes, current], // store the new prime
      times: [...times, history.tick] // store the current tick count
    };
  }
}

// obtain the supplied count or default to 10
const count = process.argv[2] ? parseInt(process.argv[2], 10) : 10;
// crate an instance of the prime machine
const primeMachine = new PrimeMachine(new PrimeInputSource(count));
// let it execute to a conclusion
const result = primeMachine.run();

if (result) {
  // number of primes
  console.log(`N = ${count}`);
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
