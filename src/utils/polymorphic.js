/**
 * Polymorphic component utilities
 *
 * Note: This file previously contained TypeScript type definitions.
 * In JavaScript, these types are not needed at runtime.
 * If you need type checking, consider using JSDoc comments or migrating to TypeScript.
 */
/**
 * This file provides helper utilities for creating polymorphic React components.
 *
 * Example usage:
 * <Component as="a" href="/home">Link</Component>
 * <Component as="button" onClick={...}>Button</Component>
 */

/**
 * Polymorphic prop helper.
 * @typedef {Object} AsProp
 * @property {React.ElementType} [as] - The component or HTML tag to render as.
 */

/**
 * Returns a polymorphic React component.
 * The returned component can render as different elements using the `as` prop.
 *
 * @template P
 * @param {(props: P & { as?: React.ElementType }) => React.ReactNode} render
 * @returns {(props: P & { as?: React.ElementType }) => React.ReactNode}
 */
export function createPolymorphicComponent(render) {
  const Component = (props) => {
    return render(props, props.ref);
  };
  Component.displayName = 'PolymorphicComponent';
  return Component;
}
