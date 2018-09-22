# When: TypeScript Reference Implementation
##### A software design pattern for building event-based recombinant state machines 

[![npm](https://img.shields.io/npm/v/when-ts.svg)](https://www.npmjs.com/package/when-ts) 
 [![GitHub license](https://img.shields.io/github/license/voodooattack/when-ts.svg)](https://github.com/voodooattack/when-ts/blob/master/LICENSE)
 [![GitHub issues](https://img.shields.io/github/issues/voodooattack/when-ts.svg)](https://github.com/voodooattack/when-ts/issues) 
 [![Build Status](https://travis-ci.org/voodooattack/when-ts.svg?branch=master)](https://travis-ci.org/voodooattack/when-ts) [![Coverage Status](https://coveralls.io/repos/github/voodooattack/when-ts/badge.svg)](https://coveralls.io/github/voodooattack/when-ts)
 ![npm type definitions](https://img.shields.io/npm/types/when-ts.svg)

### Introduction

This is a reference implementation for a new software design pattern that allows for composable event-based state machines with complete (including temporal) control over their state.

Please note that this spec and reference implementation are still in alpha and the specs are not yet final. 

#### Features:

- Discrete: if your actions only deal with the state object, then every state transition is 100% predictable.
- Temporal: time can be rewound at any given moment (tick) by default, and the state machine will transition to a previously known state in time, along with any future information in the form of an optional state mutation to apply.
- Recombinant: the pattern is based on [gene expression](https://en.wikipedia.org/wiki/Gene_expression), and since state machines are composed of events (`condition -> action` pairs) that are quite similar to how real genes are theorised to work (`activation region -> coding region`), this means that genetic recombination can be applied to `when` state machines by transferring new events from one machine to another. Mutating the machine (DNA) by transferring events (genes) from one machine to the other will introduce new behaviour.

#### Possible Proposals

Here are some possible expansions on the idea. These require further discussion before they're mature enough to include:

- Inhibitors that can suppress an action: these would inhibit a certain event and prevent it from triggering. Alternatively, the possibility for an action to disable/inhibit another action during a tick could be introduced. 
- Sexual reproduction of state machines: possible use of a similar mechanic to the one used in organic cells to combine two different programs (DNA) by randomly selecting an equal half of each.  
- Mutation: Possible, but difficult since we can't swap code like basepairs. The simplest possible mutation would be a random swap of conditions between two randomly selected actions. 

This would all lead to more emergent behaviour in agents produced by recombination.

#### Pattern

*The following is a description of the pattern itself, and not this specific implementation.*

This pattern itself is completely generic and can be implemented in any programming language available today with varying degrees of ease, depending on the features of the target language.

##### Program state

A `MachineState` consists of user-defined global variables (and is passed to every condition and action as the first argument in the reference implementation).

An external tick counter (`history.tick`) exists and can be considered part of the state (but is not included inside the state object). It is a special variable that is automatically incremented with every new tick. Can be used to reference discrete points in time.

##### Conditions and Actions

All when programs consist of `condition` and `action` pairs. The condition is a and expression that must evaluate to a boolean value.

When a `condition` evaluates to `true`, the associated `action` is then executed. 

`actions` can modify the variables in the global state, but any modifications they make during a `tick` will be applied to the `state` only on the next `tick`.

If a conflict between two or more `actions` trying to modify the same variable during a `tick` happens, the last `action` to be invoked will override the previous value set by any earlier `actions` during the current `tick`.   

##### Main loop

The goal of the main loop is to move execution forward by mutating the current `state`.

To do this, `when` implements a loop that constantly evaluates a set of rules (`program`). Every iteration of this loop is called a `tick`, and whenever a condition evaluates to `true`, the `action` associated with the condition is evaluated. `actions` can modify non-constant global variables with values for the next `state`.

Note that any new mutations caused by actions will only appear during the next `tick`. This is to prevent interactions between different `actions` during the same `tick`.

If multiple actions try to modify the same variable during the same `tick`, the last `action` to execute takes precedence.

##### Finite State Machines

By default, the state machines built with `when` will be finite, this means that the main loop will halt by default if it exhausts all possible conditions and none evaluate to `true` and trigger an action during the same `tick`. 

This prevents the program from running forever by default, and can be disabled as needed.

#### State Manager

- A State Manager (`history`) is accessible from events. It is responsible for managing an array of previous states (`history.records`), in which states are recorded as the program advances.

- A state machine can exit by calling `exit()` from any event, the returned value is the last recorded state. A single argument can be passed to `exit()` to override the returned state.

- Events can use `history.tick` to access the current tick counter.

- Events can access the last recorded states from `history.currentState`.

- Events can access the next state being actively mutated by the current tick through the read-only property `history.nextState`.

- The state can be rewound to a previously recorded state using the `history.rewind(n)` method. `history.rewind(2)` will cause the program to rewind by two full ticks (the tick counter will be decremented as needed). If this occurs inside an event handler, further events will not be processed.

- `history.rewind` accepts a second parameter with optional variable to pass after rewinding to the past state, `history.rewind(2, { backToTheFuture: true })` will rewind and mutate the past state by setting the variable `backToTheFuture` to `true`.

- State history can be erased at any time using `history.clear();`.

- State recording can be configured or disabled at any time by manipulating `history.limit`.

- Setting a finite `limit` during startup is strongly advised. `history.limit` defaults to `Infinity`.

**Examples of `limit`:**

- `history.limit = Infinity;` Record an infinite amount of state. (This is the default, which may cause memory issues if your state objects are very big and/or your program stays running for a long time)

- `history.limit = 4;` Only record the most recent 4 states. Discards any stored older states.

- `history.limit = 0;` No further state recording allowed, and acts the same as `history.limit = 1`. Discards any older history, and `history.record` will only show the previous state.

#### External inputs

`when` supports external inputs via the `@input` decorator. External inputs are readonly variables that are recorded as part of the state, but never manually  

#### Note on Recombination

This is not part of the current spec, but is currently offered by the TypeScript reference implementation. You can combine any two machines by calling `machine1.recombine(machine2)`, see the [TypeScript API documentation](https://voodooattack.github.io/when-ts/) for more details.

##### How it can be useful for emergent behaviour:

For emergent behaviour to be meaningful, the machines in questions must attribute the same 'meaning' to the same variable names. 

A `health` variable for an NPC will usually have the same meaning for two different state machines when it comes to behaviour, and for the sake of argument, let us assume two different behaviours in two different machines: 

1. A machine has a `when` clause that causes the NPC to flee on low health (by controlling movement).
2. Another machine attacks on low health (controlling a bow and arrow)

When both traits are present in a single machine, the NPC will potentially exhibit both behaviour simultaneously and run away while shooting, once they have low health.

#### Abstract Syntax 

Here are some abstract syntax examples for a full pseudo-language based on this pattern. In this theoretical language, the program itself is a state machine, variables of the `MachineState` are global variables, and all of the primitives described above are part of the language itself.

You can read about the original idea (slightly outdated) [in this proposal](https://gist.github.com/voodooattack/ccb1d18112720a8de5be660dbb80541c).

This is mostly pseudo-javascript with two extra `when` and `exit` keywords, and using a hypothetical decorator syntax to specify action metadata. The decorators are completely optional, and the currently proposed ones are:

- `@forever()` Must be defined a the start of the program, and tells the state machine not to halt due to inactivity. In this case, the machine must explicitly end its execution via a call to `exit()`. Accepts no arguments. 
- `@name('action_name')` Associate a name with an action to be make it possible for inhibitors to reference it elsewhere. Can only be used once per action.
- `@unless(expression)` Prevents this action from triggering if `expression` evaluates to true. Can be used multiple times with the same action.
- `@inhibitedBy('action_name')` Prevents this action from triggering if another by `action_name` will execute during this tick. Can be used multiple times with the same action and different inhibitors.

The above decorators may only precede a `when` block, and will only apply to the next encountered `when` block. 

##### Examples

- A prime number generator: 
  
```javascript
let counter = 2; // starting counting up from 2
let current = 3; // start looking at 3
let primes = []; // array to store saved primes

// increment the counter with every tick till we hit the potential prime
@name('increment')
@unless(primes.length >= 10)
when(counter < current) {
  counter++;
}

// not a prime number, reset and increment current search
@name('resetNotAPrime')
@unless(primes.length >= 10)
when(counter < current && current % counter === 0) {
  counter = 2;
  current++;
}

// if this is ever triggered, then we're dealing with a prime.
@name('capturePrime')
@unless(primes.length >= 10)
when(counter >= current) {
  // save the prime
  primes.push(current);
  // print it to the console
  console.log(current);
  // reset the variables and look for the next one
  counter = 2;
  current++;
}
```

To make this same machine with an explicit exit clause, simply remove all `@unless` decorators and add `@forever` at the beginning.

To make this machine exit, you must add the following anywhere in the file:
```js
// exit when we've found enough primes
@name('exitOnceDone')
when(primes.length >= 10) {
  exit();  
}
```

With either option, the predicted exit state after the machine exits should be: 

```json
{ 
  "counter": 2,
  "current": 30,
  "primes": [ 2, 3, 5, 7, 11, 13, 17, 19, 23, 29 ]
}
```

Note: more complex examples are coming soon.

## TypeScript Reference Implementation

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

- Simple example:

```typescript
import { EventMachine, when } from 'when-ts';

type State = { // the state of our program
  value: number; // a counter that will be incremented once per tick
}

class TestMachine extends EventMachine<State> {
  constructor() {
    super({ value: 0 }); // pass the initial state to the event machine
  }

  @when<State>(true) // define a condition for this block to execute, in this case always
  reportOncePerTick(s: State, m: TestMachine) {
    console.log(`beginning tick #${m.history.tick} with state`, s);
  }

  @when<State>(state => state.value < 5) currentValue
  incrementOncePerTick(s: State) { currentValue
    return { value: s.value + 1 };
  }

  @when<State>(state => state.value >= 5) currentValue
  exitWhenDone(s: State, m: TestMachine) {
    console.log(`finished on tick #${m.history.tick}, exiting`, s);
    m.exit(); // exit the state machine
  }
}

const test = new TestMachine();

const result = test.run(); // this does will block until the machine exits, unlike `.step()`

console.log('state machine exits with:', result);
```

- The same prime machine from earlier, implemented in TypeScript:

A better implementation exists in [examples/prime.ts](examples/prime.ts)!

```typescript
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

  @when<PrimeState>(state => state.counter < state.current)
  incrementCounterOncePerTick({ counter }: PrimeState) {
    return { counter: counter + 1 };
  }

  @when<PrimeState>(state => state.counter < state.current && state.current % state.counter === 0)
  resetNotPrime({ counter, primes, current }: PrimeState) {
    return { counter: 2, current: current + 1 };
  }

  @when<PrimeState>(state => state.counter >= state.current)
  capturePrime({ counter, primes, current }: PrimeState) {
    return { counter: 2, current: current + 1, primes: [...primes, current] };
  }

  @when<PrimeState>(state => state.primes.length >= 10)
  exitMachine(_, m: StateMachine<PrimeState>) {
    m.exit();
  }
}

const primeMachine = new PrimeMachine();

const result = primeMachine.run();

if (result)
  console.log(result!.primes);

```

### Contributions

All contributions and pull requests are welcome. 

If you have something to suggest or an idea you'd like to discuss, then please submit an issue or a pull request. 

Please make sure that test coverage does not drop below the set limits in `package.json`.

*Note: Active development happens in the `devel` branch.*

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
