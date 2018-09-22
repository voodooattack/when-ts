import 'reflect-metadata';
import { actionMetadataKey, inputMetadataKey } from './actionMetadataKey';
import { ActivationAction, ActivationCond, MachineState } from './interfaces';
import { StateMachine } from './stateMachine';
import { chainWhen, ConditionBuilder, ConstructorOf, WhenDecoratorWithChain } from './util';

export * from './stateMachine';
export * from './interfaces';

export type InhibitedActionCallback<M extends StateMachine<any>, S extends MachineState> =
  (type: ConstructorOf<M>) => ActivationAction<S, any>;

/**
 * Builds a condition for the final decorator.
 */

// noinspection JSCommentMatchesSignature
/**
 * A TypeScript decorator to declare a method as an action with one or more attached a conditions.
 * @param cond A condition to match against every tick or true.
 * @ignore chainedHistory
 */
export function when<S extends MachineState>(
  cond: ActivationCond<S> | true,
  chainedHistory: ConditionBuilder<S>[] = []
): WhenDecoratorWithChain<S> {
  // convenience shortcut for `@when(true)`
  const fixed: ActivationCond<S> = cond === true ? () => true : cond;
  return chainWhen<S>([...chainedHistory, () => fixed]);
}


// noinspection JSCommentMatchesSignature
/**
 * A chainable TypeScript decorator to declare a method as an action with one or more inhibitor
 * conditions.
 * An inhibitor prevents the execution of the action for one tick if the others can activate.
 * @param {ActivationCond<S>[]} inhibitor The inhibiting member action.
 * @ignore chainedHistory
 * @return {WhenDecoratorWithChain<S>}
 */
export function exceptWhen<S extends MachineState>(
  inhibitor: ActivationCond<S>,
  chainedHistory: ConditionBuilder<S>[] = []
): WhenDecoratorWithChain<S> {
  return chainWhen<S>([
    () => function () {
      // @ts-ignore
      return !inhibitor.apply(this, arguments);
    }, ...chainedHistory
  ]);
}

/**
 * A chainable TypeScript decorator to declare a method as an action with one or more inhibitor
 * actions.
 * An inhibitor prevents the execution of the action for one tick if the others can activate.
 * @param {InhibitedActionCallback<S>} inhibitorAction The inhibiting member action.
 * @param chainedHistory
 * @return {WhenDecoratorWithChain<S>}
 */
export function inhibitedBy<S extends MachineState, M extends StateMachine<S> = any>(
  inhibitorAction: keyof M,
  /** @ignore */
  chainedHistory: ConditionBuilder<S>[] = []
): WhenDecoratorWithChain<S> {
  const findCond = (instance: M) => {
    const method = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(instance), inhibitorAction);
    if (!method || !method.value) {
      throw new Error(`@inhibitedBy: could not find method ${inhibitorAction.toString()} in ${instance.constructor.name}`);
    }
    return Reflect.getMetadata(actionMetadataKey, method.value);
  };
  return chainWhen<S>([
    (type: ConstructorOf<M>/*, __: string | symbol, _descriptor: PropertyDescriptor*/) => {
      // FIXME: this could probably be done in a better way
      let cond: ActivationCond<S>;
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
    ...chainedHistory,
  ]);
}

/**
 * Mark a property as a state machine input.
 * @param key
 */
// TODO: Finish inputs, disabling coverage for now
/* istanbul ignore next */
export function input<S extends MachineState = any>(
  key: keyof S
): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol) {
    Reflect.defineMetadata(inputMetadataKey, { target, key, propertyKey }, target);
  };
}
