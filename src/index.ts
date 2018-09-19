import 'reflect-metadata';

import { ActivationCond, MachineState } from './interfaces';
import { programMetadataKey } from './programMetadataKey';

export * from './stateMachine';
export * from './interfaces';

/**
 * A TypeScript decorator to declare a method as an action with an attached a condition.
 * @param {ActivationCond<S extends MachineState> | boolean} cond The condition to check on every tick.
 */
export function when<S extends MachineState = any>(cond: ActivationCond<S> | boolean): MethodDecorator {
  // convenience shortcut for `@when(true)`
  cond = cond === true ? () => true : cond;
  return function (_, _methodName: string | symbol, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(programMetadataKey, cond, descriptor.value);
    return descriptor;
  };
}
