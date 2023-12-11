/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InitialConfigType } from '@lexical/react/LexicalComposer';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { $convertFromMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { LensNode } from './lens/node';
import { MentionNode } from './mentions/node';
import { initialState } from './initial_state';

const theme: InitialConfigType['theme'] = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
  quote: 'euiMarkdownFormat__blockquote',
};

const onError = (error: Error) => {
  // eslint-disable-next-line no-console
  console.log(error);
};

const EDITOR_NODES = [
  CodeNode,
  HeadingNode,
  LinkNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeHighlightNode,
  AutoLinkNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  LensNode,
  MentionNode,
];

export const editorConfig: InitialConfigType = {
  namespace: 'CasesEditor',
  theme,
  nodes: EDITOR_NODES,
  onError,
  editorState: () => $convertFromMarkdownString(initialState, TRANSFORMERS),
};
