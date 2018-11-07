# When: TypeScript Implementation
##### A software design pattern for building event-based recombinant state machines 

[![npm](https://img.shields.io/npm/v/when-ts.svg)](https://www.npmjs.com/package/when-ts) 
 [![GitHub license](https://img.shields.io/github/license/voodooattack/when-ts.svg)](https://github.com/voodooattack/when-ts/blob/master/LICENSE)
 [![GitHub issues](https://img.shields.io/github/issues/voodooattack/when-ts.svg)](https://github.com/voodooattack/when-ts/issues) 
 [![Build Status](https://travis-ci.org/voodooattack/when-ts.svg?branch=master)](https://travis-ci.org/voodooattack/when-ts) [![Coverage Status](https://coveralls.io/repos/github/voodooattack/when-ts/badge.svg)](https://coveralls.io/github/voodooattack/when-ts)
 ![npm type definitions](https://img.shields.io/npm/types/when-ts.svg)

### Introduction

**The latest version of this README can be found in the [`devel` branch](https://github.com/voodooattack/when-ts/blob/devel/README.md), please read the spec there if that's what you're after.** 

The spec for the abstract syntax and the design pattern itself can be found in [the spec subdirectory](spec/when.md). Please read the specs before delving into the implementation itself to get a good understanding of how things work.

This is a reference implementation for a new software design pattern that allows for composable event-based state machines with complete (including temporal) control over the state.


#### Features:

- Discrete: if your actions only deal with the state object, then every state transition is 100% predictable.
- Temporal: time can be rewound at any given moment (tick) by default, and the state machine will transition to a previously known state in time, along with any future information in the form of an optional state mutation to apply.
- Recombinant: the pattern is based on [gene expression](https://en.wikipedia.org/wiki/Gene_expression), and since state machines are composed of events (`condition -> action` pairs) that are quite similar to how real genes are theorised to work (`activation region -> coding region`), this means that genetic recombination can be applied to `when` state machines by transferring new events from one machine to another. Mutating the machine (DNA) by transferring condition/action pairs (genes) from one machine to the other to introduce new behaviour.

#### Possible Proposals

Here are some possible expansions on the idea. These require further discussion before they're mature enough to include:

- Sexual reproduction of state machines: possible use of a similar mechanic to the one used in organic cells to combine two different programs (DNA) by randomly selecting an equal half of each.  
- Mutation: Possible, but difficult since we can't swap code like basepairs. The simplest possible mutation would be a random swap of conditions between two randomly selected actions. 

This would all lead to more emergent behaviour in agents produced by recombination.

## When: TypeScript Implementation

### Installation

You need to install `reflect-metadata` in your project.

`npm install when-ts reflect-metadata`

Additionally, you must add the following to your project's `tsconfig.json` for the TypeScript decorator to work:

```json
{
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true
}
```

### API

See the [API documentation](https://voodooattack.github.io/when-ts/) for more information.

### Usage

Some examples are located in in [examples/](examples).

#### Simple example:

```typescript
import { StateMachine, MachineState, when } from 'when-ts';

interface State extends MachineState { // the state of our program
  value: number; // a counter that will be incremented once per tick
}

class TestMachine extends StateMachine<State> {
  constructor() {
    super({ value: 0 }); // pass the initial state to the event machine
  }

  @when<State>(true) // define a condition for this block to execute, in this case always
  reportOncePerTick(s: State, m: TestMachine) {
    console.log(`beginning tick #${m.history.tick} with state`, s);
  }

  @when<State>(state => state.value < 5)
  incrementOncePerTick(s: State) {
    return { value: s.value + 1 };
  }

  @when<State>(state => state.value >= 5) 
  exitWhenDone(s: State, m: TestMachine) {
    console.log(`finished on tick #${m.history.tick}, exiting`, s);
    m.exit(); // exit the state machine
  }
}

const test = new TestMachine();

const result = test.run(); // this will block until the machine exits, unlike `.step()`

console.log('state machine exits with:', result);
```

#### Brute-forcing primes 

The same prime machine from the spec, implemented in TypeScript. This one uses the `input` feature.

A better implementation exists in [examples/prime.ts](examples/prime.ts)!

```typescript
import { StateMachine, when, input, MachineState, MachineInputSource, StateObject } from 'when-ts';

interface PrimeState extends MachineState {
  counter: number;
  current: number;
  primes: number[];
}

interface IPrimeInputSource extends MachineInputSource {
  readonly maxPrimes: number; 
}

class PrimeInputSource implements IPrimeInputSource {
  @input('once') // mark as an input that's only read during startup.
  public readonly maxPrimes: number;
  constructor(primes = 10) {
    this.maxPrimes = primes;
  }
}

class PrimeMachine extends StateMachine<PrimeState, IPrimeInputSource> {
  constructor(inputSource: IPrimeInputSource) {
    // pass the initial state
    super({ counter: 2, current: 3, primes: [2] }, inputSource);
  }

  // increment the counter with every tick
  @when<PrimeState, IPrimeInputSource>(state => state.counter < state.current)
    .unless(state => state.primes.length >= state.maxPrimes)
  incrementCounterOncePerTick({ counter }: StateObject<PrimeState, IPrimeInputSource>) {
    return { counter: counter + 1 };
  }

  @when<PrimeState, IPrimeInputSource>(state => state.counter < state.current && state.current % state.counter === 0)
    .unless(state => state.primes.length >= state.maxPrimes)
  resetNotPrime({ counter, primes, current }: StateObject<PrimeState, IPrimeInputSource>) {
    return { counter: 2, current: current + 1 };
  }

  @when<PrimeState, IPrimeInputSource>(state => state.counter >= state.current)
    .unless(state => state.primes.length >= state.maxPrimes)
  capturePrime({ counter, primes, current }: StateObject<PrimeState, IPrimeInputSource>) {
    return { counter: 2, current: current + 1, primes: [...primes, current] };
  }

  // this explicit exit clause is not required because `unless` will cause the machine to implicitly exit above
  //  @when<PrimeState, IPrimeInputSource>(state => state.primes.length >= state.maxPrimes)
  //  exitMachine(_, m: StateMachine<PrimeState>) {
  //    m.exit();
  //  }
}

const inputSource = new PrimeInputSource(10);
const primeMachine = new PrimeMachine(inputSource);

const result = primeMachine.run();

if (result)
  console.log(result!.primes);

```

Output: 

```json
{ 
  "counter": 2,
  "current": 30,
  "primes": [ 2, 3, 5, 7, 11, 13, 17, 19, 23, 29 ]
}
```

### Contributions

All contributions and pull requests are welcome. 

If you have something to suggest or an idea you'd like to discuss, then please submit an issue or a pull request. 

Note: All active development happens in the `devel` branch. Please commit your changes using `npm run commit` to trigger `conventional-changelog`. 

### License (MIT)

Copyright (c) 2018 Abdullah A. Hassan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
