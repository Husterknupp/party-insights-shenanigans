#!/usr/bin/env bash
# Commits refreshed output to a fixed branch and opens a PR for it.
# Reusing one branch keeps it to a single open PR: an unchanged diff is not pushed again,
# a changed diff updates the existing PR. Set DRY_RUN=1 to stop before pushing.
set -euo pipefail

BRANCH="${BRANCH:-auto/wiki-refresh}"

# .apkg files get new timestamps on every build, so only keep those whose deck content (.json) changed
git add -A -- output ':(glob,exclude)output/**/*.apkg'
while IFS= read -r -d '' json; do
  apkg="${json%.json}.apkg"
  if [ -f "$apkg" ]; then git add -- "$apkg"; fi
done < <(git diff --cached --name-only -z -- 'output/*.json')
git checkout -- output

if git diff --cached --quiet; then
  echo "No content changes."
  exit 0
fi

decks=$(git -c core.quotepath=off diff --cached --name-only -- 'output/*.json' |
  xargs -rd '\n' -n1 basename -s .json | paste -sd, - | sed 's/,/, /g')
stat=$(git -c core.quotepath=off diff --cached --stat)

git checkout -q -B "$BRANCH"
git commit -q -m "chore: refresh ${decks:-output} from Wikipedia"

open_pr=$(gh pr list --head "$BRANCH" --state open --json number -q '.[0].number')
if [ -n "$open_pr" ] && git fetch -q origin "$BRANCH" && git diff --quiet FETCH_HEAD HEAD; then
  echo "PR #$open_pr is already up to date."
  exit 0
fi

title="Wiki refresh: ${decks:-output}"
body=$(printf 'Automated refresh from Wikipedia.\n\n```\n%s\n```\n' "$stat")

if [ "${DRY_RUN:-}" = 1 ]; then
  printf 'DRY_RUN: would push %s and %s PR "%s"\n%s\n' "$BRANCH" "${open_pr:+update #$open_pr with}${open_pr:-open}" "$title" "$body"
  exit 0
fi

git push -q --force origin "$BRANCH"
if [ -n "$open_pr" ]; then
  gh pr edit "$open_pr" --title "$title" --body "$body"
  echo "Updated PR #$open_pr."
else
  gh pr create --base main --head "$BRANCH" --title "$title" --body "$body"
fi
