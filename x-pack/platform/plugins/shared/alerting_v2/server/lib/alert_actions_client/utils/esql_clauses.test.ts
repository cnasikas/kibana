/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { buildEpisodeDotIdInClause, buildEpisodeIdsInClause } from './esql_clauses';

const render = (clause: ReturnType<typeof buildEpisodeIdsInClause>): string =>
  esql`FROM stream | WHERE (${clause})`.toRequest().query;

/**
 * Table-driven suite. The two builders differ only in the field name
 * they emit (`.alert-actions` uses the flat `episode_id`, `.rule-events`
 * uses the dotted `episode.id`); the accumulator behaviour they share
 * gets asserted once per row here instead of copy-pasted across two
 * near-identical describe blocks.
 */
describe.each([
  ['buildEpisodeIdsInClause', buildEpisodeIdsInClause, 'episode_id'],
  ['buildEpisodeDotIdInClause', buildEpisodeDotIdInClause, 'episode.id'],
] as const)('%s', (_name, buildClause, field) => {
  it('renders the inert `FALSE` seed when no episode_ids are provided', () => {
    // The empty case has to short-circuit to FALSE so the surrounding
    // `(... AND ${clause})` filter matches no rows instead of every row.
    // (`esql` collapses redundant outer parens, so we don't assert on them.)
    const rendered = render(buildClause([]));

    expect(rendered).toMatch(/WHERE\s+FALSE/);
    expect(rendered).not.toContain(`${field} ==`);
  });

  it('chains a single episode_id onto the FALSE seed via OR', () => {
    const rendered = render(buildClause(['ep-1']));

    expect(rendered).toContain(`FALSE OR ${field} == "ep-1"`);
  });

  it('chains multiple episode_ids in input order', () => {
    const rendered = render(buildClause(['ep-1', 'ep-2', 'ep-3']));

    expect(rendered).toContain(
      `FALSE OR ${field} == "ep-1" OR ${field} == "ep-2" OR ${field} == "ep-3"`
    );
  });
});
