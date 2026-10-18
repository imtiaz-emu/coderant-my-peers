# Contributing

## Create your own profile on GitHub

1. Read the [privacy guidance](README.md#privacy-and-upkeep).
2. Open the [template](templates/member.json) and copy its contents.
3. Choose **Add file > Create new file** in the repository (or in your fork).
4. Name it `members/<your-lowercase-github-username>.json`.
5. Replace all example details. Remove employment entries that do not apply and
   omit `phoneNumber` if you do not want to share it.
6. Submit a pull request. Do not include generated Markdown changes.

Members with the same name have different files because GitHub usernames are
unique. The ownership check compares your filename with the pull request author's
GitHub login. Maintainers may submit authorized changes on behalf of a member.

## Profile fields

| Field | Required | Meaning |
| --- | --- | --- |
| `github` | Yes | Your lowercase GitHub username, matching the filename |
| `name` | Yes | Your preferred display name; need not be unique |
| `location` | No | Optional city or region; not a street address |
| `contact` | Yes | Absolute HTTPS link to your chosen contact channel, without embedded credentials |
| `phoneNumber` | No | Phone number as a string, preferably including the country code; share only if comfortable exposing it to everyone with repository access |
| `lastVerified` | Yes | Date you verified the profile, `YYYY-MM-DD`; not a future date |
| `employment` | Yes | Array of current/former employment records; may be empty |

Each employment record has:

| Field | Meaning |
| --- | --- |
| `company` | Canonical company ID from [companies.json](companies.json), e.g. `grab` |
| `role` | Your role or a concise summary of roles |
| `status` | Exactly `current` or `former` |
| `openToReferralRequests` | JSON boolean `true` or `false`; your preference for this company |

All text must be non-empty, single-line, and without surrounding whitespace.
Unknown fields are rejected. Do not add private details in extra fields.

`phoneNumber` accepts spaces, hyphens, and other phone formatting. Omit the field
rather than using an empty string or `null`. It is visible in your profile only,
not copied into generated company pages or the people index. The HTTPS `contact`
link is still required. A shared phone number remains in Git history even after
you remove it from your current profile.

Use one record per company/status pair. Summarize multiple historical roles in
one former record. You may list several current companies and may have both a
former and current record at a company you rejoined. Exact employment dates are
intentionally not collected.

## Add a company

Reuse the existing company ID if possible. Do not create separate IDs for spelling,
capitalization, office location, or an abbreviation of the same company.
Maintainers should resolve ambiguous organizations before merging.

If the company is missing, add an entry to [companies.json](companies.json) in the
same pull request:

```json
{
  "example-tech": {
    "name": "Example Tech"
  },
  "grab": {
    "name": "Grab"
  }
}
```

This illustrates a registry shape; preserve the other existing entries.
IDs use lowercase ASCII letters, numbers, and single separating hyphens.
Display names must be unique ignoring case. The company page is generated only
when at least one profile references it. No one manually maintains employee lists.

## Update or remove your profile

- Change your own JSON file and update `lastVerified`.
- When changing jobs, change the old company's status to `former`, review its
  referral preference, and add the new company as `current`.
- To leave the directory, delete your JSON file through a pull request.
- For GitHub username changes, ask a maintainer to rename the file and update
  `github`: ordinary contributors cannot modify another username's profile.
- To correct someone else's profile, contact them or a maintainer instead of
  editing their information without consent.

Removal affects the current directory, not past Git history or copies.

## Optional local validation

With Node.js 20+:

```sh
npm run validate
npm test
```

No dependency installation is necessary. Maintainers working on the generator
should also run `npm run generate` and `npm run check`.

## Contact etiquette

Honor referral preferences, introduce yourself, and include the relevant job link.
Do not send bulk messages or treat membership as an obligation to refer.
