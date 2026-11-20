# Review changed inputs before retaining a bank

Use this only for `review_required` from `--check-product`. Explicit refresh always
uses generation; do not reuse an earlier review token to avoid that request.

1. Read the saved bank and every reported changed input. Follow their effects into
   relevant shared implementation and configuration. The fingerprints identify changed
   files, not the exact old source text: do not assume a Git diff against HEAD or main
   equals the difference from the cached version. Use Git history when helpful, but
   assess the questions against current code.
2. Check every question's prompt, options, correct answer IDs, both explanations,
   references, and diagram against the current behaviour. A comment-only or formatting
   change is a candidate for retention, not permission to skip this check. Wording
   changes can alter eligibility, pricing, payment instructions, or other product meaning.
3. If any assessed behaviour changed, evidence is missing, or validity is uncertain,
   regenerate the whole bank through the normal validate/save flow. Do not edit a few
   answers or prose fields and call it retention. Moved references needing new paths
   or scope changes also use regeneration in this milestone.
4. Only if the complete assessment remains valid, locate references in current files
   and correct any shifted line numbers. Write a temporary JSON review receipt:

   ```json
   {
     "bankId": "payments",
     "reviewToken": "<exact token returned by the current check>",
     "confirmed": true,
     "references": [
       { "questionId": "retry", "referenceIndex": 0, "line": 24 }
     ]
   }
   ```

   `referenceIndex` is zero-based within that question's reference array. Include
   each needed line correction once; use an empty array only if all references are
   already accurate. Do not set `confirmed` until reviewing all assessment content.
5. Run `RUNTIME --retain-product RECEIPT --repo PROJECT`. It verifies the bank/source
   token, applies only valid reference-line corrections, and refreshes fingerprints
   atomically. It cannot determine factual correctness or whether prose is cosmetic;
   the agent owns that decision. If the token is stale, check and review again rather
   than copying a new token into an old decision. Delete the temporary receipt after
   success or abandonment. Launch only after successful retention or regeneration.

The same process applies to general banks and recorded supporting dependencies.
No full dependency graph is inferred. Files changed after the final check may still
require a new review at launch; active assessments remain stable after launch.

## Decision examples

- A comment is inserted above an unchanged retry constant. Inspect the surrounding
  implementation, questions and explanations. If all remain accurate, retain with
  updated reference lines; the comment alone does not justify automatic approval.
- A shared policy changes refund eligibility from 30 days to 14 days. A question about
  a 20-day refund now has a different answer. Regenerate, even if the code diff is
  only a number or user-facing sentence.
- A helper changes but you cannot establish whether a diagram or failure scenario
  remains accurate. Regenerate rather than guessing that the change is harmless.
