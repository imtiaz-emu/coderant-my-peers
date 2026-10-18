export function checkProfileOwnership({ author, maintainer = false, files }) {
  if (maintainer) return;
  const ownProfile = `members/${author.toLowerCase()}.json`;
  for (const file of files) {
    // A rename modifies both identities, not just the destination.
    for (const filename of [file.filename, file.previous_filename].filter(Boolean)) {
      if (filename.startsWith('members/') && filename !== ownProfile) {
        throw new Error(`Only ${ownProfile} may be changed by @${author}; found ${filename}. Contact a maintainer for corrections or username changes.`);
      }
      if (filename.startsWith('companies/') || filename === 'directory/people.md') {
        throw new Error(`${filename} is generated. Edit your profile or companies.json instead.`);
      }
    }
  }
}
