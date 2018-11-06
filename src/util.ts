import { actionMetadataKey, inputMetadataKey } from './metadataKeys';
import {
  inhibitedBy,
  InputPolicy,
  MachineInputSource,
  priority,
  PriorityExpression,
  StateMachine,
  unless,
  when
} from './index';
import { ActivationCond } from './interfaces';

/** @ignore */
export type MemberOf<T extends Object> = {
  (this: T, ...args: any[]): any;
};

/** @ignore */
export type InputMapping<S, I extends MachineInputSource, K extends keyof I, T extends I[K] = any> = {
  target: any;
  key: K;
  propertyKey: string|symbol;
  policy: InputPolicy<S, I, any>;
  transform?: { (value: T): T };
}

/**
 * Unused for now, can be used by @inhibitWhen to lookup
 * inhibitor actions in the parent class(es) later on.
 */
/** @ignore */
// istanbul ignore next
export function getInheritanceTree<T>(entity: ConstructorOf<T>): Function[] {
  const tree: Function[] = [entity as any];
  const getPrototypeOf = (object: Function): void => {
    const proto = Object.getPrototypeOf(object);
    if (proto && proto.name) {
      tree.push(proto);
      getPrototypeOf(proto);
    }
  };
  getPrototypeOf(entity as any);
  return tree;
}

/** @ignore */
export type ConditionBuilder<S, I> = {
  (T: any, methodName: string | symbol, descriptor: PropertyDescriptor): ActivationCond<S, I> | void
}

export type WhenDecoratorChainResult<S, I> = {
  andWhen(cond: ActivationCond<S, I> | true): WhenDecoratorWithChain<S, I>;
  unless(condition: ActivationCond<S, I>): WhenDecoratorWithChain<S, I>;
  inhibitedBy<M>(inhibitor: keyof M): WhenDecoratorWithChain<S, I>;
  priority(p: number|PriorityExpression<S, I>): WhenDecoratorWithChain<S, I>;
}
export type WhenDecoratorWithChain<S, I> = MethodDecorator & WhenDecoratorChainResult<S, I>;

/** @ignore */
export function chainWhen<S, I>(chainedHistory: ConditionBuilder<S, I>[]): WhenDecoratorWithChain<S, I>
{
  return Object.assign(
    buildDecorator(chainedHistory),
    {
      andWhen: (...args: any[]) => (when as any)(...args, chainedHistory),
      unless: (...args: any[]) => (unless as any)(...args, chainedHistory),
      inhibitedBy: (...args: any[]) => (inhibitedBy as any)(...args, chainedHistory),
      priority: (...args: any[]) => (priority as any)(...args, chainedHistory),
    }
  );
}

/**
 * Build a decorator out of a list of conditions.
 * @param {ActivationCond[]} builders
 * @param {boolean} invert
 * @return {(_: any, _methodName: (string | symbol), descriptor: PropertyDescriptor) => void}
 */
/** @ignore */
function buildDecorator<S, I>(builders: ConditionBuilder<S, I>[]) {
  return function decorator(Type: any, methodName: string | symbol, descriptor: PropertyDescriptor)
  {
    const built = builders.map(builder => builder(Type, methodName, descriptor))
      .filter(cond => typeof cond === 'function');
    const cond = built.length > 1 ? function () {
      for (let current of built) {
        // tell TS to ignore the next line because we specifically want a non-contextual `this`
        // here and it's not worth sacrificing the overall strictness of the entire build.
        // @ts-ignore
        if (!current.apply(this, arguments))
          return false;
      }
      return true;
    } : built.pop();
    Reflect.defineMetadata(actionMetadataKey, cond, descriptor.value);
  };
}

/** @ignore */
export type ConstructorOf<T extends Object> = T extends {
  new(...args: any[]): infer T
} ? T : never;

/** @ignore */
export function getAllMethods(object: any): Function[] {
  let current = object;
  let props: string[] = [];

  do {
    let propertyNames = Object.getOwnPropertyNames(current);
    if (Reflect.hasMetadata(inputMetadataKey, current)) {
      const inputs: InputMapping<any, any, any>[] = Array.from(Reflect.getMetadata(inputMetadataKey, current));
      propertyNames = propertyNames.filter(k => !inputs.find(inp => inp.propertyKey === k));
    }
    props.push(...propertyNames);
    current = Object.getPrototypeOf(current);
  } while (current);

  return Array.from(
    new Set(props.map(p =>
                   typeof object[p] === 'function' ? object[p] : null)
                 .filter(p => p !== null)));
}

export type StateOf<M extends StateMachine<any, any>> =
  M extends StateMachine<infer S, any> ? S : never;

export type InputOf<M extends StateMachine<any, any>> =
  M extends StateMachine<any, infer I> ? I : never;