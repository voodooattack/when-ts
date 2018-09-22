/** @internal */
import { actionMetadataKey } from './actionMetadataKey';
import { exceptWhen, inhibitedBy, when } from './index';
import { ActivationCond } from './interfaces';

export type MemberOf<T extends Object> = {
  (this: T, ...args: any[]): any;
};

/**
 * Unused for now
 */
/** @internal */
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

export type ConditionBuilder<S> = {
  (T: any, methodName: string | symbol, descriptor: PropertyDescriptor): ActivationCond<S>
};
export type WhenDecoratorChainResult<S> = {
  andWhen(cond: ActivationCond<S> | true): WhenDecoratorWithChain<S>;
  exceptWhen(condition: ActivationCond<S>): WhenDecoratorWithChain<S>;
  inhibitedBy<M>(exclude: keyof M): WhenDecoratorWithChain<S>;
}
export type WhenDecoratorWithChain<S> = MethodDecorator & WhenDecoratorChainResult<S>;

/** @internal */
export function chainWhen<S>(chainedHistory: ConditionBuilder<S>[]): WhenDecoratorWithChain<S>
{
  return Object.assign(
    buildDecorator(chainedHistory),
    {
      andWhen: (...args: any[]) => (when as any)(...args, chainedHistory),
      exceptWhen: (...args: any[]) => (exceptWhen as any)(...args, chainedHistory),
      inhibitedBy: (...args: any[]) => (inhibitedBy as any)(...args, chainedHistory)
    }
  );
}

/**
 * Build a decorator out of a list of conditions.
 * @param {ActivationCond<S>[]} builders
 * @param {boolean} invert
 * @return {(_: any, _methodName: (string | symbol), descriptor: PropertyDescriptor) => void}
 * @internal
 */
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

export type ConstructorOf<T extends Object> = T extends {
  new(...args: any[]): infer T
} ? T : never;