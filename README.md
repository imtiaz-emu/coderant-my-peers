# Coderant MY Peers

A Git-only directory for a software community in Malaysia. Find members who work
or previously worked at a company, then contact them using their chosen channel.
No website, database, or application server.

## Find someone

- **[Browse companies](companies/README.md)** to see current and former employees.
- **[Browse people](directory/people.md)** to find a member by name or GitHub username.
- Open a member's linked JSON profile for their contact information.

For example, once a member lists Grab, the generator creates
`companies/grab.md` with separate current and former employee lists.
Company pages are created only for companies referenced by actual members.

Two people may share a name: their GitHub usernames identify their separate profiles.
Employment is self-reported; check the **last verified** date before reaching out.
An entry is not a promise of a referral, and a former employee may no longer be able
to refer anyone.

### Search

Use your browser's Find command in the company or people index. GitHub's repository
code search can also search names, company IDs, roles, and locations inside
`members/` (indexing and availability may vary).

With a local clone:

```sh
git grep -in 'grab' -- members/
git grep -in 'Aisha' -- members/
```

## Add or update your profile

See **[CONTRIBUTING.md](CONTRIBUTING.md)**. Copy the
[profile template](templates/member.json) into `members/<your-github-username>.json`
and submit a pull request. Use your lowercase GitHub username, not your display
name, for the filename.

**Edit only your profile and, if needed, the company registry.** Company pages and
the people index are generated automatically after merge. There are no real member
profiles in the starter project; template details are examples only.

## How automation works

1. A pull request checks profile validity, generator tests, and profile ownership.
2. A maintainer reviews and merges it.
3. A GitHub Action regenerates the Markdown directory on the default branch.
4. The Action commits changed pages; obsolete generated company pages are removed.

Profiles are the source of truth. The generator never scrapes employment data or
contacts people. Members must update their own information when it changes.

### Local commands

Requires Node.js 20 or newer. There are no third-party runtime or test dependencies;
no `npm install` is needed.

```sh
npm test          # Test generation, validation, and profile ownership
npm run validate # Validate all profiles and company IDs without writing files
npm run generate # Rebuild company pages and the people index
npm run check    # Fail if generated files differ from source data
```

Output is sorted and deterministic. Invalid source data fails before generated
files are changed. Unknown profile fields are rejected to catch misspellings.

## Maintainer setup on GitHub

1. Create a repository, preferably **private** for a community-only directory, and
   push this project with `main` as its initial default branch.
2. Enable GitHub Actions. The update workflow requests `contents: write`; your
   organization must allow that permission.
3. Protect the default branch: require pull requests, maintainer approval, and
   the checks **Validate profiles and test generator** and **Check profile ownership**.
   Configure the approval rules so ordinary members cannot approve their own changes.
4. Require trusted maintainer review for scripts, workflows, and configuration.
   Ownership checks are not a replacement for branch protection or code review.
5. Allow the automation identity to publish generated-only commits under your
   repository's rules. If your rules prohibit direct bot commits, the included
   publishing workflow will fail explicitly: adapt it to use an approved GitHub App
   or a generated-directory PR workflow before enabling automatic publishing.
6. Merge a real member profile and confirm that the update workflow commits its
   company page. Existing branches without profiles can use **Run workflow** to
   regenerate the empty indexes.

The ownership workflow runs trusted base-branch code using `pull_request_target`;
it never checks out or executes contributor code. It checks both sides of profile
renames. Repository admins and maintainers can handle authorized corrections;
other contributors can change only their own member file. Unrelated code changes
still require maintainer review.

The publishing workflow runs only on the default branch, serializes generator
runs, and retries concurrent pushes. Its commits do not trigger another publishing
run because generated paths are excluded. GitHub also prevents normal
`GITHUB_TOKEN` pushes from triggering new workflow runs.
If concurrent generated-file edits cause a rebase conflict, the run fails rather
than overwriting them; rerun the workflow against the latest default branch.

## Privacy and upkeep

- Participation is opt-in. Submit only your own details or obtain explicit consent.
- Prefer professional HTTPS contact links. The optional `phoneNumber` field is
  opt-in: include only your own number if you are comfortable sharing it with
  everyone who can access the repository. It stays in your profile, not the
  generated indexes. Do not publish credentials, immigration information, or
  residential addresses.
- A public repository exposes profiles to indexing, scraping, and copying.
  A private repository still exposes data to everyone with access.
- Deleting a profile removes it from current generated pages, **not Git history,
  forks, or previous clones**. Contact a maintainer if sensitive data was exposed.
- Leaving the community does not require retaining a profile. Members can submit
  a removal PR or privately ask a maintainer to remove it.
- Ask members to verify details every six months. Verification dates are displayed;
  the script does not assume old employment is still accurate or automatically
  change someone's status.
