# `Walker` Traversal API

The ES|QL AST `Walker` is a utility that traverses the ES|QL AST. The developer
can provide a set of callbacks which are called when the walker visits a
specific type of node.

The `Walker` utility allows to traverse the AST starting from any node, not just
the root node.

## Low-level API

To start a new _walk_ you create a `Walker` instance and call the `walk()` method
with the AST node to start the walk from.

```ts
import { Walker } from '@kbn/esql-ast';

const walker = new Walker({
  /**
   * Visit commands
   */
  visitCommand: (node: ESQLCommand) => {
    // Called for every command node.
  },
  visitCommandOption: (node: ESQLCommandOption) => {
    // Called for every command option node.
  },

  /**
   * Visit expressions
   */
  visitFunction: (fn: ESQLFunction) => {
    // Called every time a function expression is visited.
    console.log('Function:', fn.name);
  },
  visitSource: (source: ESQLSource) => {
    // Called every time a source identifier expression is visited.
    console.log('Source:', source.name);
  },
  visitQuery: (node: ESQLAstQueryExpression) => {
    // Called for every query node.
  },
  visitColumn: (node: ESQLColumn) => {
    // Called for every column node.
  },
  visitLiteral: (node: ESQLLiteral) => {
    // Called for every literal node.
  },
  visitListLiteral: (node: ESQLList) => {
    // Called for every list literal node.
  },
  visitTimeIntervalLiteral: (node: ESQLTimeInterval) => {
    // Called for every time interval literal node.
  },
  visitInlineCast: (node: ESQLInlineCast) => {
    // Called for every inline cast node.
  },
});

walker.walk(ast);
```

It is also possible to provide a single `visitAny` callback that is called for
any node type that does not have a specific visitor.

```ts
import { Walker } from '@kbn/esql-ast';

const walker = new Walker({
  visitAny: (node: ESQLProperNode) => {
    // Called for any node type that does not have a specific visitor.
  },
});

walker.walk(ast);
```

Additionally, the `visitSingleAstItem` callback is called for every AST node
even if it has a specific visitor function for that node type.

### Callback API

Each visitor callback receives three arguments: (1) the node being
visited, (2) the parent node of the visited node, and (3) the walker
context.

```ts
const walker = new Walker({
  visitCommand: (node, parent, walker) => {
    // ...
  },
});
```

### Aborting the walk

By default, the walker traverses the entire AST exactly once. However, you can
abort the walk early by calling the `walker.abort()` method from within
any of the visitor callbacks. This will stop the walk immediately and no further
nodes will be visited.

```ts
const walker = new Walker({
  visitCommand: (node, parent, walker) => {
    // Do something
    // ...
    if (/* some condition */) {
      // Abort the walk
      walker.abort();
    }
  },
});
```

## High-level API

There are few high-level utility functions that are implemented on top of the
low-level API, for your convenience:

- `Walker.walk` &mdash; Walks the AST and calls the appropriate visitor functions.
- `Walker.commands` &mdash; Walks the AST and extracts all command statements.
- `Walker.params` &mdash; Walks the AST and extracts all parameter literals.
- `Walker.find` &mdash; Finds and returns the first node that matches the search criteria.
- `Walker.findAll` &mdash; Finds and returns all nodes that match the search criteria.
- `Walker.match` &mdash; Matches a single node against a template object.
- `Walker.matchAll` &mdash; Matches all nodes against a template object.
- `Walker.findFunction` &mdash; Finds the first function that matches the predicate or name.
- `Walker.replace` &mdash; Replaces the first node that matches the search criteria with a new node.
- `Walker.replaceAll` &mdash; Replaces all nodes that match the search criteria with a new node.
- `Walker.hasFunction` &mdash; Searches for at least one occurrence of a function or expression in the AST.
- `Walker.parent` &mdash; Returns the parent node of the given node.
- `Walker.parents` &mdash; Returns all parent nodes of the given node as a list.
- `Walker.visitComments` &mdash; Visits all comments in the AST.

The `Walker.walk()` method is simply a sugar syntax around the low-level
`new Walker().walk()` method.

The `Walker.commands()` method returns a list of all commands. This also
includes nested commands, once they become supported in ES|QL.

The `Walker.params()` method collects all param literals, such as unnamed `?` or
named `?param`, or ordered `?1`.

The `Walker.find()` and `Walker.findAll()` methods are used to search for nodes
in the AST that match a specific criteria. The criteria is specified using a
predicate function.

The `Walker.match()` and `Walker.matchAll()` methods are also used to search for
nodes in the AST, but unlike `find` and `findAll`, they use a template object
to match the nodes.

The `Walker.replace()` and `Walker.replaceAll()` methods are used to
replace nodes in the AST that match a specific criteria. The criteria is
specified either a predicate function or a template object. The first
method replaces the first occurrence of a node that matches the criteria, while
the second method replaces all occurrences of nodes that match the criteria. The
nodes are replaced in-place, meaning that the original AST is modified.

The `Walker.findFunction()` is a simple utility to find the first function that
matches a predicate. The `Walker.hasFunction()` returns `true` if at least one
function or expression in the AST matches the predicate.

The `Walker.visitComments()` method is used to visit all comments in the AST.
You specify a callback that is called for each comment node.
