import 'reflect-metadata';
import { actionMetadataKey, inputMetadataKey } from './actionMetadataKey';
import { ActivationCond, MachineState } from './interfaces';

export * from './stateMachine';
export * from './interfaces';

/**
 * A TypeScript decorator to declare a method as an action with an attached a condition.
 * @param {ActivationCond<S extends MachineState> | boolean} cond The condition to check on every tick.
 */
export function when<S extends MachineState = any>(
  cond: ActivationCond<S> | true
): MethodDecorator {
  // convenience shortcut for `@when(true)`
  cond = cond === true ? () => true : cond;
  return function (_, _methodName: string | symbol, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(actionMetadataKey, cond, descriptor.value);
  };
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
