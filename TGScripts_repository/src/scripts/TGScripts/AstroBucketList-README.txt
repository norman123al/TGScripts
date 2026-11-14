Astro Bucket List 0.39.0

OPEN THE MANAGER
Choose Script > TG Scripts > Astro Bucket List. The script requires
PixInsight 1.9.6 or later with V8 and its standard CatalogStarGenerator and
AnnotateImage libraries. Use the documentation button for the full guide.

COLLECTIONS
A collection is the .sol file; it owns objects independently of its named lists.
All objects shows every target once, including objects without any membership.
Delete list and Remove from list change only logical groupings; they keep the
objects and all their information in the collection. Delete object beside Add
and Edit removes the current target from the collection and every list only
after confirmation, with No as the default. Declining leaves everything intact.
Save persists these changes. A collection can have no named lists. Check objects,
then use Add selected to list, Move selected to list or Export selected. Checked
objects take priority, including hidden checks across the collection. With no
checks, these actions use highlighted rows selected with Ctrl-click or Shift-click.
Click the sole highlighted row again to deselect it, clearing the current object,
its information and single-object previews. Export checks remain intact. A plain
click on several highlighted rows first reduces them to one; another deselects
that row. Ctrl/Shift selection and checkbox actions keep their normal behavior.
Double-click still opens Finder. Sorting does not reselect a deliberately cleared
sole result. All filtered objects charts remain independent of row selection.
Choose an existing destination or Create new list and enter its name. Add keeps
all existing memberships. Move offers a Source list, including from All objects,
and reports how many selected objects belong to it. Only those memberships are
removed; selected objects outside that source and other memberships stay intact.
An object may belong to multiple lists with linked details and imaging status.
Existing destination entries are not duplicated. Cancel makes no changes.
Export selected opens the file chooser directly, writing one Stellarium list
with each selected target once. A partial export cannot overwrite the open
collection. Cancel leaves files intact; exporting retains collection edits,
memberships and checks. The Collection Export command still offers list scopes.
After applying, the destination is displayed with filters, sorting and export
checks retained. Save persists the reorganized collection.
Save asks before overwriting the current collection; declining keeps your edits
and the existing file. The first Save asks for a filename. Use Save as to create
a separate file. Save as and Export confirm existing filenames in the chooser.
Open and all save/export actions share a 32 MB limit on decoded JSON text.
The exact formatted output is checked before writing. Oversized output leaves
the destination and backup intact and your edits unsaved. Export fewer objects
or smaller lists to reduce output. UTF-8 files can occupy more bytes on disk.
Replacing a saved file keeps its exact previous contents beside it as
filename.sol.bak. Each successful save replaces this single backup with the
immediately preceding version. Save as and Export do the same when replacing
an existing destination. New filenames create no backup; cancellation leaves
both files untouched. Failed replacements attempt to restore both previous
files and report recovery paths if restoration fails. Backups with other names
are untouched. To recover, copy the .bak file to a new .sol filename and Open it.
No timestamped backup copies are created.
Use the Table, Finder chart and DSS survey image tabs in the main window.
With a Constellation filter active, choose Chart > All filtered objects on the
Finder chart tab to show all current table rows together. The selected list and
all other filters apply; export checks and highlighted rows do not limit it.
Numbered rings match an object key in table sort order. Missing coordinates are
reported and marked in the key. Coverage expands to fit the targets and their
known sizes, with the configured width as a minimum and 170 degrees as the
group limit. Close-up is omitted for group charts. Both styles and chart detail
options work; context catalog limits never exclude explicit table targets.
Filter/list/sort changes update the preview automatically. Clearing the
constellation filter restores Selected object mode. Scope is temporary and
DSS remains a single-object image. Open as image includes the full object key.
Both previews support mouse-wheel zoom around the pointer. Drag with the left
button to pan and double-click to fit the whole image. Zoom ranges from Fit
to 1600% of fit and is reported in the information block. It magnifies loaded
pixels without changing coverage, requesting data or altering collection data.
Each tab retains its view while switching tabs; a new target or changed chart
settings resets the affected view to Fit. Open as image opens the full image.
NGC/IC and Messier catalog objects start enabled when installed. Nebula contours
starts enabled with a configured valid outline file; selecting a first valid
file also enables them. Chart details can turn these defaults off.
Objects appear in a flat table with a Constellation column and no collapsible
groups. Sort by can order objects by calendar month in either direction;
unassigned months stay last. Size sorting ranks major diameters across all
constellations, with unknown sizes last. RA and Dec sorting uses numeric J2000
coordinates in either direction, with missing values last.
Find, Filter objects and Sort rows share one collapsible section. It starts
expanded; collapsing hides all three together without shrinking the window,
enlarges the table, and retains search text, filters, sorting, selection and
export checks. Filter objects and Sort rows keep their separate group titles. Find has a separate row; Clear search removes
only its text and keeps filters, sorting and checks. Filter objects has two labelled columns for Month,
Constellation, Target band, Imaging status and Object type. Collection holds
file actions, while Lists holds the selector, New list, List details and Delete
list. The smaller list selector has no redundant label and sits above its actions. Collection and Lists
are side by side. One collapsible Collection and lists section contains both groups above
all three tabs. It starts expanded; click the header to hide or restore both
without changing the active list, filters, sort order, export checks or edits.
Collection, Lists and the filter/sort groups stay compact at the left; extra
window width remains to their right. Minimum window dimensions follow the
controls, keeping the table, buttons and previews separated when resized.
Constellation offers only constellations represented in the selected list and
planning month; All months includes all represented constellations. The relative
three-month option includes all three months. Other filters do not narrow this
menu. Object type offers only types matching the selected list, Find, Month,
Constellation, Target band and Imaging status. It excludes its own current
choice so alternative matching types remain selectable. Unavailable choices
reset to All, first Constellation and then Object type. Empty matches leave
only All object types. Switching lists, editing objects and changing month
assignments refresh the choices. Sorting and hidden export checks are retained.
The Month menu includes Previous / current / next: the three planning months
around your computer's current local month, with December-January wraparound.
It uses the configured constellation months and excludes unassigned months.
The tooltip names the included months; the choice updates on table refresh.
Reset filters clears Find and all filter options, retaining the selected list, sort order
and checked objects. Sort rows offers Sort by, Then by and Finally by for up
to three criteria. Each has its own direction; None skips an optional criterion.
Each later criterion breaks ties in the preceding selected criteria. For
Dec: increasing, then Size: largest first, finally RA: increasing, equal
declinations are ordered by decreasing size, then equal sizes by increasing RA.
Missing values remain last at each level. Reset filters keeps all three sort
choices. Sorting preserves export checks.
Normal launches start with an empty list by default. Add objects, create additional lists,
or use Open and Merge lists to load your own Stellarium .sol, .ol or .json files.
Saves keep stable collection and backup filenames. New contents are validated
in local temporary storage, the previous bytes are copied to .bak, and the
collection is replaced and verified at its original path. Verified temporary
replacement and recovery files are briefly created beside the collection and
backup, then removed after success. Failed saves retain recovery
files at the location reported in the error message.
No predefined bucket list is included or loaded. Save your collection outside
the entire PixInsight installation; locations inside it are rejected. Configuration > Startup offers Remember
last opened or saved collection, off by default. Apply stores this independent
toggle in PixInsight settings beside the filename. It applies across collections
and launches, and is not stored in the .sol file or in process instances.
Enabling it remembers the current file, if any; successful Open, Save and Save as
then update the remembered path. Normal launches reopen that file when available.
A missing or unreadable file reports its full path before opening an empty list;
use Open to select its current location. The previous path is kept until Open or
Save succeeds. Adding or editing an object does not rename the collection.
Failed or cancelled actions retain the previous path. Export and Merge lists do
not replace it. Unsaved edits are never saved automatically. Turning it off
clears the remembered path and leaves the current collection open; subsequent
normal launches start empty. Cancel in Configuration leaves the setting intact.
An explicit process instance still opens its stored collection path, and that
file is remembered only when the separate toggle is enabled.

NEW INSTANCE
Save the collection, then drag the New Instance triangle at the lower left
onto the PixInsight workspace. The process icon stores the collection path.
Run it globally to reopen that file. Save icons with PixInsight's standard
process-icon or project commands to retain them between sessions.
The icon contains no objects, notes or unsaved edits. Save collection changes
before reopening it. If a file moves or is renamed, open it and create a new
instance; existing icons retain their saved paths.

PLAN AND TRACK
Target band classifies each object as Broadband, Narrowband or Unclassified.
Galaxies (including starburst galaxies), star clusters, reflection nebulae,
dark nebulae and integrated flux nebulae (IFN) always classify as Broadband
in Automatic mode. SIMBAD SBG and saved Catalog object (SBG) labels
are recognized as Starburst galaxy without another lookup. Their
Ha, OIII or SII filters are optional additions and remain saved unchanged.
For other targets, positive filter mentions take priority over metadata;
narrowband wins for mixed mentions such as HaRGB or LRGB plus OIII.
Galaxies, reflection/dark nebulae, star clusters and IFN suggest broadband;
emission nebulae, HII regions, planetary nebulae and SNR suggest narrowband.
Generic metadata remains Unclassified. The Target band filter can find these
objects. Edit object offers Automatic, Broadband and Narrowband; manual choices
survive catalog updates. Save and export retain the value and automatic/manual
mode. Manual overrides also take priority over these Broadband object-type rules.
Automatic values are refreshed from metadata without dirtying the list.
Object information shows matching identifiers and display names only once.
Each object has its own row, with its IAU constellation in the second column. Object type displays their saved
catalog classification. Use Month, imaging state and Find to filter them;
Find also searches object types and comments. Enter in Find refreshes results
without opening a dialog. A sole visible result becomes the preview target
automatically when coordinates are valid; export checks and highlighted rows
are unchanged. All objects displays each target once across list memberships. Comments shows your
saved imaging notes; use Edit object to change them. Generated month/constellation headings containing source-line references are
removed from comments throughout the table, editor, object details and exports.
The lower-right Configuration gear opens a separate window. Its Finder chart
group contains Sky coverage, Fit object size, Chart style, Label density and
Close-up inset with its width. Its DSS survey image group contains Survey field
and its own Fit object size checkbox. It also offers the Stellarium outline
file and constellation planning months.
Apply commits proposed settings; Cancel discards them. Only applied month
assignments modify the collection; chart settings and outline preferences do not.
Filters shows explicit filter mentions from comments unless you enter your
own value through Edit object > Filters. Edited values, including a deliberately
blank value, are saved with the collection.
Apparent size shows measured major and minor diameters in arcminutes. Use
Update catalogs for the selected object, missing sizes, or an entire list.
Edit object lets you enter a manual size that catalog updates preserve.
Catalog information combines the object description and catalog facts in one
editable field, with matching lines reported once. Imported descriptions are
retained here; Comments remains separate for imaging notes. Save persists
consolidation prepared when opening a collection. List descriptions are unchanged.
Edit object provides editable imaging dates and catalog information. Entering
a date marks the object as imaged. Edited catalog text survives lookups;
Use catalog text restores the retrieved summary. Save retains these fields.
Leftover hollow circles and generated source headings are removed from comments.
Save after opening a collection to retain any automatic cleanup.
Duplicate warnings identify the existing entry, catalog match and containing
lists. Open existing object reveals it in All objects, clears Find and filters,
and opens its editor without copying or adding the new entry. Sorting and
checked objects are retained. Back to new object keeps the entered form and
table view intact. Find includes stored catalog aliases with flexible spacing.
Find ignores the hidden trailing marker suffix in identifiers; real mentions of
marker in names, comments and other searchable text remain searchable.
Add object rejects duplicates anywhere in the collection, including known
catalog aliases, and identifies the lists containing the existing object.
When Find has no matching rows, Add searched object opens the editor with the
search text as its catalog identifier. From All objects, Add to list starts with
Choose a list and requires an explicit destination before Apply. An active named
list is preselected. No list — collection only remains an explicit choice,
including when no lists exist. Choose Look up or enter coordinates manually.
Apply checks for duplicates before closing.
Cancel leaves the collection unchanged. A successful search-based addition
clears view filters and highlights the new entry, retaining sort order and
export checks. Save persists the entry. Search alone performs no lookup.
SIMBAD lookups request full type descriptions. The script includes 226 catalog
type definitions for offline interpretation of saved codes: rG, for example,
displays as Radio galaxy and is a broadband target. Generated type lines are
made readable without changing personal prose or manual Object types. Unknown
future descriptions or codes are retained rather than guessed.

Re-evaluate beside Object type proposes a more precise type from saved catalog
metadata, current Catalog information, imported descriptions and Comments.
Review its supporting text in the hint tooltip before Apply. Conflicting or
unrecognized evidence leaves the type unchanged; candidate status is retained.
No lookup is made automatically; use Look up first for fresh SIMBAD data.
Display name has its own Use catalog identifier action. Compact RA and Dec
fields share a row. Enter beside RA/Dec provides separate hours/minutes/seconds
and sign/degrees/minutes/seconds controls for manual J2000 coordinate entry,
including targets without a catalog position. Unchanged axes retain their
original precision. Choose beside Imaged on offers Year, Month and Day selectors,
Today, Clear date, Apply and Cancel. Day limits include leap years; selecting a
date marks the object as imaged. Clearing the date retains its imaged flag.

New objects use clean Stellarium labels without an added marker suffix.
Add/Edit object includes an editable Stellarium label and Use catalog identifier
for repairing existing labels. Apply, Save and reimport the collection into
Stellarium to see the repair. The catalog identity, duplicates, memberships and
imaging data are retained independently of custom label text.
Normally leave Use coordinate marker off for recognized objects such as NGC 936
and NGC 1232: their clean identifiers select the native catalog objects directly.
Enable it only when Stellarium cannot resolve a name, for example an obscure
catalog object or a manually entered position without a recognized name.
Double-clicking the imported entry then creates and selects a named marker at
the saved RA/Dec instead of potentially selecting a nearby star. Stellarium
requires and displays the word marker for this fallback. It is off by default.
Highlight all can mark saved coordinates with clean labels, even for unknown
names; the coordinate-marker option is unnecessary just to highlight a list.

Selected only in Filter objects limits the view to checked objects, together
with the current list and other filters. Highlighting alone does not count.
Unchecking an object removes its row after the click finishes. Turn the option
off to choose more objects; Reset filters turns it off without clearing checks.
The option and checks are temporary and clear when another collection opens.
Edit object includes a List memberships checklist. Apply saves all checked
memberships with the edited fields; Cancel discards the changes. Unchecking
every list keeps the object in the collection. Removing it from the active
list switches to All objects. Create new lists in the main window.
Checkboxes select objects for list actions and export. Ctrl-click individual rows or Shift-click
a range, then choose Check selected to check those highlighted rows. Existing
checks are retained, including hidden objects. Highlighting alone does not check
an object. The footer counts highlighted rows and export checks separately.
Sorting retains highlights; filtering retains only highlights still visible.
Edit object, Delete object, Remove from list and previews use the current row.
Check shown checks all filtered rows;
Uncheck all clears the selection. Export > Checked objects writes each target
once into a new Stellarium list. Use Edit object to record imaging status.
Import list lets you choose one source list from a .sol, .ol or .json file and
merge its objects into a new named list or an existing destination. If the file
contains multiple lists, choose which one to import. A single source list is
selected automatically. Its saved name supplies the editable new-list name.
Changing source updates an untouched suggested name, preserving custom names.
For ungrouped objects the filename supplies the initial name. New list names
must be nonempty and distinct; choose an existing destination to reuse its name.
Duplicates are merged across the selected source and the whole collection.
Existing targets are reused, with one membership each in the destination.
Current values win conflicts; missing data and distinct text are merged. Other
source lists and collection settings are excluded. Repeating an import into
the same destination does not duplicate memberships or text. Cancel and failed
validation leave the collection unchanged. After import, Table displays the
destination with filters cleared, retaining sort choices and checked objects.
Save persists the result; the source file and current collection path stay intact.
Merge lists imports one or more saved .sol files into the current collection.
It deduplicates matching objects across all lists, retaining their memberships.
Distinct comments, catalog information, filters and aliases are combined. Current
single-value fields and manual choices win conflicts; missing data is filled.
An incoming unmarked copy never clears an imaged flag. Reimporting the same
data does not repeat objects or text. The source files remain unchanged; use
Save to persist the combined collection. Export also supports the selected list or Entire collection.
Keep the manager's saved collection as your master: Stellarium may discard
manager-specific notes and imaging status when it re-exports the file.

LOAD THE SAVED COLLECTION IN STELLARIUM
1. Save the collection in Astro Bucket List and note the .sol path in Collection.
   For a subset, use Export > Selected list only or Checked objects instead.
2. In desktop Stellarium, press Alt+B to open Observing lists.
3. Click the import button (Import observing list), choose the saved .sol file
   and Open it. Use the Stellarium Single Observing List (*.sol) filter if needed.
4. Choose a named list from Stellarium's dropdown. Every list in the saved
   collection is imported, including multiple lists stored in one .sol file.
5. Double-click an object to select it and move the sky view to its position.
Ungrouped targets appear in Stellarium in Objects without a list. This export
view is not a logical group when reopened in Astro Bucket List. Selected-object
and selected-list exports contain only objects in their chosen scope.
Save and import again to transfer later changes. If Stellarium asks to replace
a list with the same internal identifier, accept to update it or decline to
keep its current contents. Keep the Astro Bucket List collection as your master
for imaging notes and flags. Full instructions and source links are in PiDoc.

OBJECT TYPE
Add object and Edit object provide an editable Object type dropdown. Select a
common astronomical classification or enter your own label. Existing custom
types in the collection are also offered. Apply updates the table, type filter,
Find and automatic target-band classification. Manual types survive catalog
updates and saving/reopening. Use catalog type or clear the field to restore
the latest catalog classification. Cancel keeps the stored type unchanged.

CATALOGS AND CHARTS
Look up and Update catalogs refresh SIMBAD coordinates, types and available
apparent dimensions. Manual sizes and personal imaging information are retained. DSS2 Red finder images also require internet access.
Styled sky charts use configured local Gaia catalogs or bundled
bright stars and work offline. Finder coverage defaults to 45 degrees, with
Fit object size off. DSS defaults to fitting, with a 30-arcminute fallback for
unknown sizes. Preferences apply to all targets and are remembered between
launches. Chart details displays Annotations and Catalogs horizontally. The catalog checklist
shows each catalog's purpose: Messier, NGC/IC, Caldwell, Collinder clusters,
Green supernova remnants, WISE H II regions and Mandel-Wilson IFN. All use local
bundled data. Messier and NGC/IC start enabled; unavailable choices cannot be checked.
Select a row to adjust Labels and, where supported, the faintest Magnitude:
Automatic adapts to sky coverage, Custom specifies a limit, No limit includes
all magnitudes. Missing magnitudes are retained. SNR, WISE H II and IFN catalogs
have no magnitude data, so those controls are disabled. These are display
properties and do not modify catalog files or collection metadata.
Select Finder chart or DSS survey image to load the current target automatically.
Settings changes update the active preview after a short delay combining quick
edits. Hidden tabs defer work; an unchanged loaded preview is reused. Busy or
modal dialogs defer requests, and closing cancels pending work. Errors appear
in the single information block with Retry, without a popup or retry loop.
Double-click a table object to open Finder. Use Edit object to edit its data.
Only actual content changes trigger the close/save prompt. Loading and cleaning
metadata, no-op Apply, view changes and local preferences keep the collection
clean. Saving establishes a new baseline; failed saves retain unsaved changes.
Collapsing Object information keeps the window size and enlarges the table.
With fitting enabled, known sizes determine the DSS width; manual preferences are retained.
The Finder tab uses its area for information and the preview. The bottom Chart
details symbol opens a separate window with annotations, the catalog checklist
and properties arranged side by side. Apply commits details and redraws Finder;
Cancel retains the loaded chart and its details. Unchanged Apply reuses the image.
The symbol is enabled only on Finder, and previews pause while the window is open. The DSS tab contains information
and the survey image. All chart settings are edited in Configuration. Compact
Chart style and Label density controls are at the bottom of the Finder chart
group, aligned with the numeric fields.
Choose Chart style: Modern Editorial uses a dark sky, sans-serif labels and
a cool accent; Vintage Atlas uses ivory paper, sepia markings, serif labels
and fine double rules. The style is remembered locally and applies to Open as
image. Both show identical sky positions and catalog data, with a center
crosshair, separate title band, coordinates, symbol key and angular scale.
Changing style updates the Finder preview automatically.
Constellation borders in Chart details is enabled by default. Dashed lines show the region
boundaries using local bundled data, with colors matching the chosen style.
Solid lines connect constellation stars. Border visibility retains field width and DSS.
The bottom All details symbol selects or deselects every available catalog and
annotation, including constellation borders and Messier. It is enabled only on
Finder. Its pressed state reports whether every available detail is selected,
and the tooltip describes the next action.
It skips unavailable choices and leaves Chart settings, catalog label choices
and magnitude properties unchanged.
Chart details optionally adds star names, catalog magnitudes and object type,
angular size and magnitude where available. Sparse/Normal/Detailed controls
label density without removing object markers. Magnitude passbands depend on
the source catalog. Nebula contours reads a local Stellarium/SkyChart
outlines.dat file; common installation paths are detected. Open Configuration
with the bottom gear to choose or clear the file. In that separate window,
Choose file sits beside Outline file. Status shows Loaded after validation,
No outline file selected, File missing or Not loaded. Tooltips identify the
Stellarium outline format and show the full path and any error. Clear file
stages an empty selection. Apply deselects it and turns contours off without
deleting the file; Cancel retains the current selection. The path or
cleared choice is remembered across launches. Nebula contours starts enabled
with a valid loaded file; Chart details can turn it off. Without a valid file this option is disabled, and only
boundaries represented in the file can be drawn.
Close-up inset adds a separate square projection beside the unobscured
overview. Its preferred width starts at 2 degrees and applies to all targets.
If too large for the overview, the current chart uses half the overview width,
at least 0.1 degrees, without replacing that preference. A 0.1-degree overview
temporarily hides the inset; a wider overview restores the saved choice.
Optional details and close-up choices survive target selection during this session and
work with both styles. Open as image includes them. With the inset enabled
the chart is 2080 by 960 pixels; otherwise it is 1440 by 960.
Use the main preview tabs to access charts and survey images. Spaced labels keep dense fields readable. Previews stay in their tabs.
DSS requests always use the maximum 120-arcminute width for objects larger
than that limit, even when Fit object size is unchecked.
Set Sky coverage (0.1 to 120 degrees) and Survey field (5 to 120 arcminutes)
in Configuration, even without selecting a target. Widths are read-only while
Fit object size is checked; the values shown are fallbacks for unknown sizes.
Uncheck fitting to edit a width. Fitting, the DSS maximum and close-up bounds
change only the displayed field; preferences remain intact for the next target.
Apply saves all preview preferences locally and updates the active preview;
hidden previews update when selected. Cancel changes neither active nor saved
preferences. Selecting a target or reopening the script retains these choices.
These preferences do not modify the collection or its process-instance path.
The bottom Open as image symbol beside the gear creates an independent image
from the active preview for saving in PixInsight. It is enabled only on Finder
or DSS with a loaded image and is disabled on Table.

Network and temporary storage
On Windows, file protection runs the operating system utility mountvol.exe from the Windows System32 directory, using the read-only /L option to identify volumes and reject alternate drive mappings. It does not change mounts, request administrator privileges, process images, or use a command shell.
Replacing a text or data file briefly creates verified .tgscripts-write- and .tgscripts-recovery- files with unique names beside that file. The outside directory entry is replaced without writing through a pre-existing hard link. Successful operations remove these temporary files. If restoration fails, the error identifies the retained recovery file; keep it until the previous contents have been recovered.
Collection and preview writes reject installation locations. On Windows, use direct local drive paths; network shares, substituted drives, symbolic links, junctions and ambiguous device names are refused. Cloud placeholders are supported. Linux/macOS checks resolve links and compare installation directory identities.
SIMBAD lookups use HTTPS connections to simbad.cfa.harvard.edu and simbad.cds.unistra.fr and send object identifiers. DSS previews use archive.stsci.edu and send target coordinates and field dimensions. Requests identify PixInsight through CoreApplication.agentName followed by AstroBucketList/0.39.0.
Save validation and recovery files use AstroBucketList-save-<unique-id> directories under the operating system temporary directory. Preview GIF and PNG files use AstroBucketList-<unique-id> filenames there. Successful saves remove their temporary copies, and closing the manager removes its preview files. The collection and its .bak backup use the selected destination. Preferences use PixInsight's per-user settings database.
