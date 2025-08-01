/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type GenericCallback = (callback: () => void) => void;

export interface ArgumentProps {
  /** Handler to invoke when error has thrown in the argument form */
  renderError: () => void;
}

export interface ArgumentHandlers {
  /** Handler to invoke when an argument form has finished rendering */
  done: () => void;
  /** Handler to invoke when an argument form is removed */
  onDestroy: GenericCallback;
}

export interface UpdatePropsRef<Props extends {} = {}> {
  updateProps: (newProps: Props) => void;
}

// eslint-disable-next-line @typescript-eslint/no-shadow
export interface ArgumentSpec<ArgumentConfig = {}> {
  /** The argument type */
  name: string;
  /** The name to display */
  displayName: string;
  /** A description of what is rendered */
  help: string;
  /**
   * A function that renders a compact, non-collapsible argument form
   * If template is also provided, then this form goes in the accordion header
   * */
  simpleTemplate?: (
    domNode: HTMLElement,
    config: ArgumentConfig,
    handlers: ArgumentHandlers,
    // @ts-expect-error upgrade typescript v4.9.5
    onMount: (ref: UpdatePropsRef<ArgumentConfig> | null) => void
  ) => void;
  /**
   * A function that renders a complex/large argument
   * This is nested in an accordian so it can be expanded/collapsed
   */
  template?: (
    domNode: HTMLElement,
    config: ArgumentConfig,
    handlers: ArgumentHandlers,
    // @ts-expect-error upgrade typescript v4.9.5
    onMount: (ref: UpdatePropsRef<ArgumentConfig> | null) => void
  ) => void;
}

// eslint-disable-next-line @typescript-eslint/no-shadow
export type ArgumentFactory<ArgumentConfig = {}> = () => ArgumentSpec<ArgumentConfig>;

// Settings for the argument to display in the sidebar
export interface ArgumentConfig<Arguments = {}> {
  /** The name of the function argument configured by this argument form */
  name: keyof Arguments;
  /** The name to display */
  displayName: string;
  /** The argument type */
  argType: string;
  /** A description of the argument */
  help?: string;
}
