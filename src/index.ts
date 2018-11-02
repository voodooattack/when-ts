import 'reflect-metadata';
import { actionMetadataKey, inputMetadataKey, priorityMetadataKey } from './metadataKeys';
import { ActivationCond, InputPolicy, MachineInputSource, MachineState, PriorityExpression } from './interfaces';
import { StateMachine } from './stateMachine';
import { chainWhen, ConditionBuilder, ConstructorOf, InputMapping, WhenDecoratorWithChain } from './util';

export * from './stateMachine';
export * from './interfaces';

/**
 * Builds a condition for the final decorator.
 */

// noinspection JSCommentMatchesSignature
/**
 * A TypeScript decorator to declare a method as an action with one or more attached a conditions.
 * @param cond A condition to match against every tick or true.
 */
export function when<S extends MachineState, I extends MachineInputSource = any>(
  cond: ActivationCond<S, I> | true,
  chainedHistory: ConditionBuilder<S, I>[] = []
): WhenDecoratorWithChain<S, I> {
  // convenience shortcut for `@when(true)`
  const fixed: ActivationCond<S, I> = cond === true ? () => true : cond;
  return chainWhen<S, I>([...chainedHistory, () => fixed]);
}


// noinspection JSCommentMatchesSignature
/**
 * A chainable TypeScript decorator to declare a method as an action with one or more inhibitor
 * conditions.
 * An inhibitor prevents the execution of the action for one tick if the others can activate.
 * @param {ActivationCond<S>[]} inhibitor The inhibiting member action.
 * @return {WhenDecoratorWithChain<S>}
 */
export function unless<S extends MachineState, I extends MachineInputSource = any>(
  inhibitor: ActivationCond<S, I>,
  chainedHistory: ConditionBuilder<S, I>[] = []
): WhenDecoratorWithChain<S, I> {
  return chainWhen<S, I>([
    () => function () {
      // @ts-ignore
      return !inhibitor.apply(this, arguments);
    }, ...chainedHistory
  ]);
}

// noinspection JSCommentMatchesSignature
/**
 * A chainable TypeScript decorator to declare a method as an action with one or more inhibitor
 * actions.
 * An inhibitor prevents the execution of the action for one tick if the others can activate.
 * @param {string} inhibitorAction The name of the inhibiting member action.
 * @return {WhenDecoratorWithChain<S>}
 */
export function inhibitedBy<S extends MachineState, I extends MachineInputSource = any,
  M extends StateMachine<S, I> = any>
(
  inhibitorAction: keyof M,
  chainedHistory: ConditionBuilder<S, I>[] = []
): WhenDecoratorWithChain<S, I> {
  const findCond = (instance: M) => {
    const method = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(instance), inhibitorAction);
    if (!method || !method.value) {
      throw new Error(`@inhibitedBy: could not find method ${inhibitorAction.toString()} in ${instance.constructor.name}`);
    }
    return Reflect.getMetadata(actionMetadataKey, method.value);
  };
  return chainWhen<S, I>([
    (type: ConstructorOf<M>/*, __: string | symbol, _descriptor: PropertyDescriptor*/) => {
      // FIXME: this could probably be done in a better way
      let cond: ActivationCond<S, I>;
      return function () {
        // ony evaluate the activation condition at run time
        // @ts-ignore
        cond = cond || findCond(this);
        if (!cond) {
          throw new Error(`@inhibitedBy: could not find activation condition for ${inhibitorAction.toString()} in ${type.constructor.name}`);
        }
        // @ts-ignore
        return !cond.apply(this, arguments);
      };
    },
    ...chainedHistory
  ]);
}

/**
 * Mark a property as a state machine input. This will poll the target with every tick and
 * update the provided rename in the state.
 * @param policy {'once'|'always'|}
 * @param transform An optional transformation function to transform the value.
 * @param rename A new name for the variable in the state object.
 */
export function input<S extends MachineState, I extends MachineInputSource,
  M extends StateMachine<S, I> = any,
  K extends keyof I = any, T extends I[K] = any>
(
  policy: InputPolicy<S, I, M> = 'always',
  transform?: { (value: T): T },
  rename?: K
): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol) {
    let set: Set<InputMapping<S, I, K, any>> = Reflect.getMetadata(inputMetadataKey, target);
    if (!set) {
      set = new Set();
    }
    set.add({ target, key: rename || propertyKey as any, propertyKey, transform, policy });
    Reflect.defineMetadata(inputMetadataKey, set, target);
  };
}

export function priority<
  S extends MachineState, I extends MachineInputSource = any,
  M extends StateMachine<S, I> = any>
(
  priority: number| PriorityExpression<S, I>,
  chainedHistory: ConditionBuilder<S, I>[] = []
): WhenDecoratorWithChain<S, I> {
  function definePriority(_: ConstructorOf<M>, __: string | symbol, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(priorityMetadataKey, priority, descriptor.value);
  }
  return chainWhen<S, I>([definePriority, ...chainedHistory]);
}

export type StateObject<
  S extends MachineState,
  I extends MachineInputSource = any> = S & Readonly<I>;