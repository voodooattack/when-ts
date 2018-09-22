import { actionMetadataKey } from './actionMetadataKey';
import { inhibitedBy, StateMachine, unless, when } from './index';
import { ActivationCond } from './interfaces';

/** @ignore */
export type MemberOf<T extends Object> = {
  (this: T, ...args: any[]): any;
};

/** @ignore */
export type InputMapping<S, K extends keyof S, T extends S[K] = any> = {
  target: any;
  key: K;
  propertyKey: string|symbol;
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
export type ConditionBuilder<S> = {
  (T: any, methodName: string | symbol, descriptor: PropertyDescriptor): ActivationCond<S>
}

export type WhenDecoratorChainResult<S> = {
  andWhen(cond: ActivationCond<S> | true): WhenDecoratorWithChain<S>;
  unless(condition: ActivationCond<S>): WhenDecoratorWithChain<S>;
  inhibitedBy<M>(inhibitor: keyof M): WhenDecoratorWithChain<S>;
}
export type WhenDecoratorWithChain<S> = MethodDecorator & WhenDecoratorChainResult<S>;

/** @ignore */
export function chainWhen<S>(chainedHistory: ConditionBuilder<S>[]): WhenDecoratorWithChain<S>
{
  return Object.assign(
    buildDecorator(chainedHistory),
    {
      andWhen: (...args: any[]) => (when as any)(...args, chainedHistory),
      unless: (...args: any[]) => (unless as any)(...args, chainedHistory),
      inhibitedBy: (...args: any[]) => (inhibitedBy as any)(...args, chainedHistory)
    }
  );
}

/**
 * Build a decorator out of a list of conditions.
 * @param {ActivationCond<S>[]} builders
 * @param {boolean} invert
 * @return {(_: any, _methodName: (string | symbol), descriptor: PropertyDescriptor) => void}
 */
/** @ignore */
function buildDecorator<S>(builders: ConditionBuilder<S>[]) {
  return function decorator(Type: any, methodName: string | symbol, descriptor: PropertyDescriptor)
  {
    const built = builders.map(builder => builder(Type, methodName, descriptor));
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
    props.push(...Object.getOwnPropertyNames(current));
    current = Object.getPrototypeOf(current);
  } while (current);

  return Array.from(
    new Set(props.map(p =>
                   typeof object[p] === 'function' ? object[p] : null)
                 .filter(p => p !== null)));
}

export type StateOf<M extends StateMachine<any>> =
  M extends StateMachine<infer S> ? S : never;