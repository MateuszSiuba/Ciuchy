import type React from 'react';

declare global {
  namespace JSX {
    type Element = React.ReactElement<any, any>;
    interface ElementClass extends React.Component<any> {}
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}

export {};
