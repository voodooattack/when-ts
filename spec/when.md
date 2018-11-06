# When: recombinant event-based state machines.
 
## Features:

- Discrete: if your actions only deal with the state object, then every state transition is 100% predictable.
- Temporal: time can be rewound at any given moment (tick) by default, and the state machine will transition to a previously known state in time, along with any future information in the form of an optional state mutation to apply.
- Recombinant: the pattern is based on [gene expression](https://en.wikipedia.org/wiki/Gene_expression), and since state machines are composed of events (`condition -> action` pairs) that are quite similar to how real genes are theorised to work (`activation region -> coding region`), this means that genetic recombination can be applied to `when` state machines by transferring new events from one machine to another. Mutating the machine (DNA) by transferring events (genes) from one machine to the other will introduce new behaviour.

### Possible Proposals

Here are some possible expansions on the idea. These require further discussion before they're mature enough to include:

- Sexual reproduction of state machines: possible use of a similar mechanic to the one used in organic cells to combine two different programs (DNA) by randomly selecting an equal half of each.  
- Mutation: Possible, but difficult since we can't swap code like basepairs. The simplest possible mutation would be a random swap of conditions between two randomly selected actions. 

This would all lead to more emergent behaviour in agents produced by recombination.

### Pattern

*The following is a description of the pattern itself, and not any specific implementation.*

This pattern itself is completely generic and can be implemented in any programming language available today with varying degrees of ease, depending on the features of the target language.

#### Program state

A `MachineState` consists of user-defined global variables (and is passed to every condition and action as the first argument in the reference implementation).

An external tick counter (`history.tick`) exists and can be considered part of the state (but is not included inside the state object). It is a special variable that is automatically incremented with every new tick. Can be used to reference discrete points in time.

#### Conditions and Actions

All when programs consist of `condition` and `action` pairs. The condition is a and expression that must evaluate to a boolean value.

When a `condition` evaluates to `true`, the associated `action` is then executed. 

`actions` can modify the variables in the current state, but any modifications they make during a `tick` will be applied to the `state` only on the next `tick`.

If a conflict between two or more `actions` trying to modify the same variable during a `tick` happens, the last `action` to be invoked will override the previous value set by any earlier `actions` during the current `tick`.   

#### Main loop

The goal of the main loop is to move execution forward by mutating the current `state`.

To do this, `when` implements a loop that constantly evaluates a set of rules (`program`). Every iteration of this loop is called a `tick`, and whenever a condition evaluates to `true`, the `action` associated with the condition is evaluated. `actions` can modify non-constant global variables with values for the next `state`.

Note that any new mutations caused by actions will only appear during the next `tick`. This is to prevent interactions between different `actions` during the same `tick`.

If multiple actions try to modify the same variable during the same `tick`, the last `action` to execute takes precedence.

#### Finite State Machines

By default, the state machines built with `when` will be finite, this means that the main loop will halt by default if it exhausts all possible conditions and none evaluate to `true` and trigger an action during the same `tick`. 

This prevents the program from running forever by default, and can be disabled as needed.

### State Manager

- A State Manager (`history`) is accessible from events. It is responsible for managing an array of previous states (`history.records`), in which states are recorded as the program advances.

- A state machine can exit by calling `exit()` from any event, the returned value is the last recorded state. A single argument can be passed to `exit()` to override the returned state.

- Events can use `history.tick` to access the current tick counter.

- Events can access the last recorded states from `history.currentState`.

- Events can access the next state being actively mutated by the current tick through the read-only property `history.nextState`.

- The state can be rewound to a previously recorded state using the `history.rewind(t)` method. `history.rewind(2)` will cause the program to rewind to the discrete tick `t` (the tick counter will be decremented as needed). If this occurs inside an event handler, further events will not be processed.

- `history.rewind` accepts a second parameter with optional variable to pass after rewinding to the past state, `history.rewind(2, { backToTheFuture: true })` will rewind to tick `2` and mutate the past state by setting the variable `backToTheFuture` to `true`.

- State history can be erased at any time using `history.clear();`.

- State recording can be configured or disabled at any time by manipulating `history.limit`.

- Setting a finite `limit` during startup is strongly advised. `history.limit` defaults to `Infinity`.

**Examples of `limit`:**

- `history.limit = Infinity;` Record an infinite amount of state. (This is the default, which may cause memory issues if your state objects are very big and/or your program stays running for a long time)

- `history.limit = 4;` Only record the most recent 4 states. Discards any stored older states.

- `history.limit = 0;` No further state recording allowed, and acts the same as `history.limit = 1`. Discards any older history, and `history.record` will only show the previous state.

### External inputs

`when` supports external inputs via the `@input` decorator. External inputs are readonly variables that are recorded as part of the state, but never manually updated.  

### Note on Recombination

This is not part of the current spec, but is currently offered by the TypeScript reference implementation. You can combine any two machines by calling `machine1.recombine(machine2)`, see the [TypeScript API documentation](https://voodooattack.github.io/when-ts/) for more details.

#### How it can be useful for emergent behaviour:

For emergent behaviour to be meaningful, the machines in questions must attribute the same 'meaning' to the same variable names. 

A `health` variable for an NPC will usually have the same meaning for two different state machines when it comes to behaviour, and for the sake of argument, let us assume two different behaviours in two different machines: 

1. A machine has a `when` clause that causes the NPC to flee on low health (by controlling movement).
2. Another machine attacks on low health (controlling a bow and arrow)

When both traits are present in a single machine, the NPC will potentially exhibit both behaviour simultaneously and run away while shooting, once they have low health.

### Abstract Syntax 

Here are some abstract syntax examples for a full pseudo-language based on this pattern. In this theoretical language, the program itself is a state machine, variables of the `MachineState` are global variables, and all of the primitives described above are part of the language itself.

This is mostly pseudo-javascript with two extra `when` and `exit` keywords, and using a hypothetical decorator syntax to specify action metadata. 

The decorators are completely optional, and the currently proposed ones are:

#### Action decorators:

Action decorators may only precede a `when` block, and will only apply to that block.

- `@name(action_name)` Associate a name with an action to be make it possible for inhibitors to reference it elsewhere. Can only be used once per action.

- `@unless(expression)` Prevents this action from triggering if `expression` evaluates to true. Can be used multiple times with the same action.

- `@inhibitedBy(action_name)` Prevents this action from triggering if another by `action_name` will execute during this tick. Can be used multiple times with the same action and different inhibitors.

- `@priority(expression)` Sets a priority for the action. (Default is 0) This will influence the order of evaluation inside the main loop. Actions with lower priority values are evaluated last, while actions with higher priority values are evaluated first, meaning that they will take precedence if there's a conflict from multiple actions trying to update the same variable during the same tick. Can be a literal numeric value or an expression that returns a signed numeric value.

#### Control decorators:

- `@forever()` Must be defined at the very beginning of the program, and tells the state machine not to halt due to inactivity. In this case, the machine must explicitly end its execution via a call to `exit()`. Accepts no arguments.

- `@input(policy?: 'once'|'always'|function, input_name?)` Implementation dependent. Defaults to `once`. Must precede a constant/readonly variable declaration. Tells `when` to poll an external value and record its value as part of the state. The interpretation of what an input is depends on the implementation. It can be a command-line argument, a memory address, or an hardware interrupt. The `policy` argument specifies how frequently the polling is done: `once` is exactly once at startup, `always` is once per `tick`. `function` is user-defined function that implements custom logic and returns a boolean. 

### Examples

- A prime number generator: 
  
```typescript
// maximum number of primes to brute-force before exiting, 
// note that this variable is a readonly external input, 
// and is read only once on startup.
@input('once') 
const maxPrimes: number = 10; 

let counter = 2; // starting counting up from 2
let current = 3; // start looking at 3
let primes = []; // array to store saved primes

// increment the counter with every tick till we hit the potential prime
@name('increment')
@unless(primes.length >= maxPrimes)
when(counter < current) {
  counter++;
}

// not a prime number, reset and increment current search
@name('resetNotAPrime')
@unless(primes.length >= maxPrimes)
when(counter < current && current % counter === 0) {
  counter = 2;
  current++;
}

// if this is ever triggered, then we're dealing with a prime.
@name('capturePrime')
@unless(primes.length >= maxPrimes)
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