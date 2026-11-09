# Certified PixInsight Developer Program compliance

The user requires compliance with the current Certified PixInsight Developer Program Rules for all work in this project, in every chat. Apply this requirement to scripts, shared libraries, documentation, repository layout, installation, and releases.

Read the applicable current rules before making relevant changes or preparing a release. The official rules are authoritative. The requirements below capture the project's known obligations and supplement the complete rules.

- Certified PixInsight Developer Program Rules: https://pixinsight.com/security/cpd-rules/
- PixInsight Update Repository Reference: https://pixinsight.com/doc/docs/PIRepositoryReference/PIRepositoryReference.html
- If the official rules cannot be retrieved, use the user's supplied review notice and available official documentation for the work they cover, and report any unresolved verification limits.

## Deployment and ownership

- Correct the repository source layout before rebuilding a distribution archive.
- Build TGScripts update packages from the intended files under `TGScripts_repository/src/scripts` and `TGScripts_repository/doc/scripts`. Validate every archive member against the allowed deployment directories and intended ownership.
- Never deploy `doc/pidoc`, `doc/source`, or a root `images` directory. Keep PiDoc sources and their input images in `TGScripts_docu/pidoc`. Keep script documentation images in `doc/scripts/<script>/images` and README installation screenshots in `TGScripts_docu/images`.
- Never create, modify, replace, or delete PixInsight core-owned files. Limit updater removal entries to files and directories owned by TGScripts. In particular, never add `doc/pidoc` to a manifest removal list.
- The general deployment directories specified by PixInsight are `bin`, `rsc/icons`, `rsc/cursors`, `rsc/images`, `src/scripts`, `doc/docs`, `doc/tools`, and `doc/scripts`. Inclusion in this list does not grant ownership of existing files.

## Script behavior, identity, and documentation

- Give products distinct names that cannot be confused with PixInsight's tools. Keep filenames, feature identifiers, menu entries, help paths, and documentation consistent when renaming.
- Document every network connection, external executable launched, and file-storage location outside the PixInsight installation, including temporary files and recovery data.
- Use supported, documented PixInsight interfaces. Document launches of the PixInsight executable through its command-line interface, including the purpose of `--yield` when opening a reviewed WBPP instance.
- Start HTTP User-Agent identification with `CoreApplication.agentName`, followed by the script name and version.
- Run installation-provided executables from their trusted installation paths. For gnuplot, use `CoreApplication.binDirPath`. Never run or reuse an executable from the shared temporary directory. Remove unused unsafe helpers from release contents.

## Release verification and signing

- Check packaged paths, archive contents against source files, documentation references, and the manifest checksum before declaring a release ready.
- Sign changed scripts and manifests with the appropriate developer identity. A manifest change invalidates its previous signature. Report any pending signing step explicitly.
- Includes from PixInsight's `src/scripts` tree are internal script components and affect the consuming script's signature. Revalidate compatibility and signatures after relevant PixInsight updates, and re-sign when those included files change.
- Distinguish completion of a particular review item from compliance with the entire program. Resolve and verify the outstanding findings in the November 9, 2026 review before claiming full compliance.

# SubframeQualityReview release policy

Use MAJOR.MINOR.PATCH versioning starting with 0.40.0.

- Increment PATCH for bug fixes and performance improvements.
- Increment MINOR for new features or meaningful behavior changes, resetting PATCH to zero.
- Use 1.0.0 for a stable release milestone. Subsequent incompatible changes increment MAJOR and reset MINOR and PATCH.

Keep the script header, SQR_VERSION, PiDoc source, generated HTML, staged script, and release archive version consistent. Generate documentation with the PixInsight PiDoc compiler.

The repository script is TGScripts_repository/src/scripts/TGScripts/SubframeQualityReview.js. Its PiDoc source is TGScripts_docu/pidoc/SubframeQualityReview.pidoc, and its generated HTML is TGScripts_repository/doc/scripts/SubframeQualityReview/SubframeQualityReview.html. Keep authoring sources outside the deployment tree. Update manifests and repository distribution archives when requested as part of release work.
