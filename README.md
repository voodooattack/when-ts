# When: TypeScript Implementation
##### A software design pattern for building event-based recombinant state machines 

[![npm](https://img.shields.io/npm/v/when-ts.svg)](https://www.npmjs.com/package/when-ts) 
 [![GitHub license](https://img.shields.io/github/license/voodooattack/when-ts.svg)](https://github.com/voodooattack/when-ts/blob/master/LICENSE)
 [![GitHub issues](https://img.shields.io/github/issues/voodooattack/when-ts.svg)](https://github.com/voodooattack/when-ts/issues) 
 [![Build Status](https://travis-ci.org/voodooattack/when-ts.svg?branch=master)](https://travis-ci.org/voodooattack/when-ts) [![Coverage Status](https://coveralls.io/repos/github/voodooattack/when-ts/badge.svg)](https://coveralls.io/github/voodooattack/when-ts)
 ![npm type definitions](https://img.shields.io/npm/types/when-ts.svg)

### Introduction

**The latest version of this README can be found in the [`devel` branch](https://github.com/voodooattack/when-ts/blob/devel/README.md), please read the spec there if that's what you're after.** 

The spec for the abstract syntax and the design pattern itself can be found in [the spec/ subdirectory](spec/when.md). Please read the specs before delving into the implementation itself to get a good understanding of how things work``.

This is a reference implementation for a new software design pattern that allows for composable event-based state machines with complete (including temporal) control over the state.

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

The same prime machine from earlier, implemented in TypeScript. This one uses the `input` feature.

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
  public readonly primes: number;
  constructor(primes = 10) {
    this.primes = primes;
  }
}

class PrimeMachine extends StateMachine<PrimeState, IPrimeInputSource> {
  constructor(inputSource: IPrimeInputSource) {
    super({ counter: 2, current: 3, primes: [2] }, inputSource);
  }

  @when<PrimeState, IPrimeInputSource>(state => state.counter < state.current)
  incrementCounterOncePerTick({ counter }: StateObject<PrimeState, IPrimeInputSource>) {
    return { counter: counter + 1 };
  }

  @when<PrimeState, IPrimeInputSource>(state => state.counter < state.current && state.current % state.counter === 0)
  resetNotPrime({ counter, primes, current }: StateObject<PrimeState, IPrimeInputSource>) {
    return { counter: 2, current: current + 1 };
  }

  @when<PrimeState, IPrimeInputSource>(state => state.counter >= state.current)
  capturePrime({ counter, primes, current }: StateObject<PrimeState, IPrimeInputSource>) {
    return { counter: 2, current: current + 1, primes: [...primes, current] };
  }

  @when<PrimeState, IPrimeInputSource>(state => state.primes.length >= state.maxPrimes)
  exitMachine(_, m: StateMachine<PrimeState>) {
    m.exit();
  }
}

const inputSource = new PrimeInputSource(10);
const primeMachine = new PrimeMachine(inputSource);

const result = primeMachine.run();

if (result)
  console.log(result!.primes);

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
