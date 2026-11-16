Astro Bucket List 0.46.0

OPEN THE MANAGER
Choose Script > TG Scripts > Astro Bucket List. The script requires
PixInsight 1.9.6 build 1718 or later with V8 and its standard SkyChartGenerator and
AnnotateImage libraries. Use the documentation button for the full guide.

OBSERVING NIGHT
Open Observing night to plan all targets currently shown in Table. Site and
limits opens Configuration > Observing. Enter latitude (north positive),
longitude (east positive), optional height and a fixed UTC offset for the night,
including daylight saving time. No site is assumed and no location is sent online.
Named profiles retain independent sites, limits and horizons. New creates a blank
site; Duplicate copies it; Delete asks for confirmation. Apply saves all profile
changes; Cancel discards every proposal. The Observing night Site selector
switches applied profiles and recalculates. Profiles remain local.
Choose an evening date; the plan covers noon to next noon in the selected site's
local time. HH:mm axis ticks have no day suffix. The axis labels the evening
date and the new date at midnight, with a vertical midnight divider. Local time
and its UTC offset are stated explicitly. Hover and table tooltips show dates.
Tonight uses today's date at the configured offset. The offset does not change
automatically with the date or during a daylight-saving transition night.
Default limits are altitude >= 30 degrees and Sun <= -18 degrees. Optional Moon
separation is off at zero and applies only while the Moon is above the horizon.
Results show peak altitude in darkness, time clearing the altitude threshold and enabled custom horizon,
dark time before Moon filtering, total usable time, the longest window and the
minimum Moon separation while the Moon is up during dark altitude windows.
Rank by usable time, peak in darkness or name. Select a result for target,
Sun and Moon altitude curves; green bands show usable intervals. Hover the
graph for concise values in the bottom message. Double-click a result for Finder.
Missing coordinates and targets without usable windows remain visible with a
reason. Date/site/filter changes discard stale results; inactive tabs pause.
Stop cancels an unfinished calculation; Recalculate retries it.
The planner uses PixInsight's local fundamental ephemerides and documented
position APIs. Two-minute samples and interpolated threshold crossings provide
approximate windows, with times rounded to minutes. It treats saved J2000 object
positions as fixed, without proper motion. Terrain and obstructions are represented only by a supplied horizon.
Atmospheric refraction, weather and sky brightness are not modeled. See PiDoc for limits.
Up to 30 profiles and their embedded horizons use AstroBucketList/observingPreferences
in per-user PixInsight settings, with a 1 MiB limit. The chosen night and results
remain in memory. Calculations make no files, downloads or external calls. Collections, metadata,
constellation months and chart presets are not changed by planning.

CUSTOM HORIZONS
Configuration > Observing contains a horizon editor and preview for each site.
Enter azimuth altitude pairs in decimal degrees: north 0, east 90, south 180,
west 270. Use 2-720 points; # starts a comment. Whitespace, commas or semicolons
separate values. The interpolated profile wraps through north. Matching 0/360
closure is accepted; conflicting duplicates are rejected.
Import a Stellarium polygonal horizon point file, not landscape.ini or a ZIP.
Match Import format to polygonal_horizon_list_mode and Rotation to
polygonal_angle_rotatez. Degrees/radians/gradians and altitude/zenith distance
are supported. The editor always shows converted azimuth/altitude degrees.
Files are limited to 128 KiB. Failed imports leave the draft intact.
The loaded filename/point count is displayed; edits show Manual profile.
Use this site's horizon enables/disables it; Clear removes it. Apply stores
points with the profile; the original file is no longer needed. Cancel discards
draft edits. Targets must clear both Minimum altitude and the enabled horizon.
The orange Horizon/min curve follows the target path. Horizon vertices are
considered between samples, but timing remains approximate. The constraint uses
the target center; allow room for large targets near obstructions. Obstructions
do not change twilight or Moon-up calculations.

EXPORT OBSERVING PLANS
Export plan offers CSV and A4 landscape PDF. Choose All results, Usable targets
only or Selected rows. Ctrl/Shift-click planning rows for multiple selection;
Table checkboxes are independent. Export follows the current ranking and stays
disabled until the plan is complete and its chosen scope is nonempty.
Reports include site coordinates, evening date, fixed UTC offset, limits,
horizon state, target names, peak altitude, durations and every usable window.
CSV adds J2000 coordinates, horizon source, local ISO timestamps and UTC times.
It uses UTF-8 and protects formula-like labels for spreadsheet use. PDF wraps
text and repeats context on each page; the limit is 200 pages. PDF times are
explicitly local, with calendar dates on peaks and windows to show midnight crossings. Narrow filters
or use CSV for larger plans. Review location details before sharing.
The chooser asks before replacing a file. Cancel writes nothing. Export does
not change the collection. CSV is generated in memory; PDF uses a temporary
AstroBucketList-plan- file in the system temporary directory, removed afterwards.
Shared verified replacement creates .tgscripts-write-/.tgscripts-recovery- files
beside the destination when needed; failures report retained recovery paths.
Exports make no .bak file. Windows file protection uses the read-only mountvol
query described below. No network connection or external PDF renderer is used.
Add to list uses the same Results scope to create a dated observing list or add
targets to an existing one. It retains metadata and other memberships and avoids
duplicates. Cancel changes nothing; confirm and Save to retain the grouping.

SAVED VIEWS
Use View preset in Find, filter and sort to recall search text, all filters and
three sort choices within the current list. Save view creates or replaces a
named preset; replacing or deleting asks for confirmation. Up to 50 presets
are stored in PixInsight's per-user settings under AstroBucketList/viewPresets.
They are shared across collections, but do not save list choice, checked object
identities or chart settings. Selected only uses the current checks. Relative
months remain relative to today. Unavailable constellation/type choices reset
to All with an explanation; the preset is retained. Manual changes show Custom
view. Startup restores the preset menu without automatically applying a view.
Presets do not change the collection or travel with .sol files/process icons.

INTERACTIVE FINDER
A short hint below the Finder chart explains hover, click, zoom, pan and fit.
The chart has no tooltip. Hover over a symbol to show its name, type, apparent
size and magnitude in that message area.
Click to select the symbol;
the actions below the chart offer Edit object and Show in table for a matching
entry, or Add object to review a new entry with the available local catalog
facts. The close-up inset also supports selection. Dragging pans without
selecting; wheel zoom and double-click Fit remain available. Empty sky clears
the selection. Hover/click do not query the network or change the collection.
Show in table reveals the entry in All objects and clears filters. Editing
keeps the Finder tab and uses the normal editor. Adding asks for a destination
from All objects, checks duplicates, and commits only on Apply. It never adds
a marker suffix or imaging status. Local Gaia XPSD stars have no source IDs:
hover shows their coordinates and magnitude, while Add leaves the identifier
for you to enter. Outline-only context is not selectable. Preview highlight
rings are not included in image/SVG/PDF export.

CHART NAVIGATION
Select a chart symbol and use Center on selection beside Back/Forward/Home
above the chart to redraw around it with the current Finder settings. Back/Forward visit earlier centers, retaining
current settings and restoring zoom/pan when those settings still match.
The home symbol returns to the table target or filtered chart and clears
history. Browsing changes neither the table nor DSS target, and never adds
objects or changes metadata. New table targets, changed filtered-group data,
double-clicking a table row and opening another collection reset browsing.
History holds at most 32 targets; a new center after Back drops the forward
branch. Navigation is local and makes no SIMBAD or DSS requests.

CHART PRESETS AND CONFIGURATION
Open the bottom gear to edit Finder settings, DSS settings, Observing settings or General preferences
in one Configuration window. Finder chart combines appearance, coverage,
annotations, catalogs and their properties, outline source and brightness level.
Chart preset at the top stores a named copy of these same Finder settings.
It is useful for recalling different chart arrangements, not a separate set of
settings. Current choices are remembered across targets and launches without
needing to save a named preset.
Choosing a preset fills the controls below it. Save preset captures the proposed
values, including unapplied edits. Replacement and deletion ask for confirmation.
Apply commits all changes, including preset creation/replacement/deletion;
Cancel discards all proposals. Applying retains the chart center and navigation
history. Manual Finder changes show Custom settings. DSS and General are separate
and do not detach the selected Finder preset.
Up to 50 chart presets are stored under AstroBucketList/chartPresets in PixInsight's
per-user settings. Current Finder appearance, annotations, catalog properties
and DSS framing use AstroBucketList/previewPreferences. Outline source and level
use AstroBucketList/contourPath and AstroBucketList/outlineLevel. Settings are shared
across collections but excluded from SOL files and process icons. Named chart
presets exclude targets, table filters, list selection, zoom, navigation history,
DSS settings and General preferences. Table-view presets remain independent.
Unavailable local catalogs are omitted with an explanation; the saved preset
is retained. A missing/invalid custom outline file rejects loading that preset
without changing the proposal. Custom paths are references, not embedded files.

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
group limit. Close-up is omitted for group charts. All styles and chart detail
options work; context catalog limits never exclude explicit table targets.
Filter/list/sort changes update the preview automatically. Clearing the
constellation filter restores Selected object mode. Scope is temporary and
DSS remains a single-object image. Open as image includes the full object key.
Both previews support mouse-wheel zoom around the pointer. Drag with the left
button to pan and double-click to fit the whole image. Zoom ranges from Fit
to 1600% of fit and is reported in the information block. Finder redraws cached vectors at display resolution; DSS magnifies its loaded
pixels. Neither changes coverage, requests data or alters collection data.
Each tab retains its view while switching tabs; a new target or changed chart
settings resets the affected view to Fit. Open as image opens the full image.
NGC/IC and Messier catalog objects start enabled when installed. Nebula contours
starts enabled with bundled PixInsight outlines or a configured valid file.
Making an unavailable outline source available also enables them.
Chart details can turn these defaults off.
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
all three tabs. It starts expanded; click the header to hide or restore both.
Collapsing keeps the window size unchanged and gives the freed height to the
table or preview, retaining the active list, filters, sort order, checks and edits.
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
the entire PixInsight installation; locations inside it are rejected. Configuration > General > Startup offers Remember
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
tab contains Sky coverage, Fit object size, Chart style, Label density and
Close-up inset with its width. Its DSS survey image tab contains Survey field
and its own Fit object size checkbox. Its Nebula outlines group selects the
bundled outline brightness level or a custom Stellarium file. Configuration
also offers constellation planning months under General.
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
No lookup is made automatically; select SIMBAD and use Look up first for
richer catalog data.
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

VECTOR FINDER CHART EXPORT
The bottom document/save symbol exports a loaded Finder chart as SVG or PDF.
Select the Finder tab and choose a filename ending in .svg or .pdf. The native
file chooser asks before replacing a document. The exported drawing includes
the full chart, selected style, inset and object key, regardless of preview zoom.
SVG labels are converted to paths for consistent fonts and Greek characters.
PDF contains the same vector drawing on one page. Documents are 297 mm wide,
with height matching the chart; use Fit to page for other print-paper sizes.
The existing information block reports the saved filename. Export and Cancel
leave collection data unchanged. DSS retains its Open as image workflow.
PDF export uses a temporary AstroBucketList-export file in the system temporary
directory. Safe replacement uses verified .tgscripts-write and recovery files
beside the selected destination; successful exports remove them. Failures report
any retained recovery path. No collection .bak file is made for a chart export.
Preview recordings and the bounded vector tile cache remain in memory. Finder
rendering, vector zoom and SVG/PDF export make no network connections.

CATALOGS AND CHARTS
Look up and Update catalogs search PixInsight's local indexes first and use
SIMBAD for missing names or unavailable local indexes. Lookup source also
offers explicit SIMBAD choices for richer descriptions, types and apparent
sizes, even for locally known targets. Local indexes do not provide sizes.
The source choice is retained for this manager session. Multiple exact local
matches require a choice in the editor; bulk updates skip and report them.
Local refreshes preserve richer existing classifications and descriptions.
Manual metadata, including unsaved edits and deliberately cleared fields, is
retained. Edited coordinates are preserved; the reset symbol beside Enter
explicitly adopts the latest catalog position. Only coordinates still equal
to their saved catalog baseline refresh automatically from SIMBAD. Positions
without a baseline are retained conservatively; missing components are filled.
Display names, comments, filter information, imaging status and date, list
memberships, manual type/size/band classifications and edited Catalog information
survive refreshes. Cancel leaves the collection unchanged; Apply and Save retain
editor changes. Local catalog lookup needs no network connection. SIMBAD and
DSS survey images require internet access.
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
The main Finder tab contains navigation, information and the interactive preview.
The bottom gear opens Configuration. Its Finder chart tab combines presets,
appearance, annotations, the catalog checklist and properties, and nebula outlines.
Annotations and catalogs are arranged side by side. Compact Chart style and Label
density controls are aligned below the geometric settings. Apply commits the
proposal and redraws affected previews; Cancel retains current settings, presets
and the loaded chart. Unchanged Apply reuses the image. Previews pause while the
window is open. The DSS survey image tab in Configuration contains survey framing;
General contains the startup preference and constellation-month assignments.
Choose Chart style: Modern Editorial uses a dark sky, sans-serif labels and
a cool accent; Vintage Atlas uses ivory paper, sepia markings, serif labels
and fine double rules; Observing Atlas uses white paper, black stars with halos
and colored symbols for different object types. The style is remembered locally
and applies to the preview, Open as image and vector export. All styles show
identical sky positions and catalog data, with a center
crosshair, separate title band, coordinates, symbol key and angular scale.
Changing style updates the Finder preview automatically.
Constellation borders in Chart details is enabled by default. Dashed lines show the region
boundaries using local bundled data, with colors matching the chosen style.
Solid lines connect constellation stars. Border visibility retains field width and DSS.
The bottom All details symbol selects or deselects every available catalog and
annotation, including constellation borders and Messier. It is enabled only on
Finder. Its pressed state reports whether every available detail is selected,
and the tooltip describes the next action.
It skips unavailable choices and also toggles Milky Way shading. It remembers
the same annotation, catalog and shading preferences as Configuration, retaining
other appearance settings, catalog label choices and magnitude properties.
Chart details optionally adds star names, catalog magnitudes and object type,
angular size and magnitude where available. Sparse/Normal/Detailed controls
label density without removing object markers. Magnitude passbands depend on
the source catalog. Nebula contours uses the OpenNGC-Outlines and Nebula-Outlines
databases supplied with PixInsight by default. No separate file or download is
needed. Configuration offers All levels, Faintest extent, Standard (default)
and Brightest parts. If a level is absent, PixInsight uses the nearest available
level. Only represented objects have contours, so some fields contain none.
Choose file optionally selects a local Stellarium/SkyChart outlines.dat file
as an explicit override. Status reports the bundled source, validated filename
and contour count, or a missing/invalid file. Tooltips identify the file format,
full path and errors. Brightness level is disabled for custom files.
Use bundled deselects the custom file without deleting it. Apply saves the
source and brightness level locally and updates Finder; Cancel discards proposed
changes. A deliberately disabled contours option stays off when switching
between available sources. If the selected source is unavailable, contours is
disabled. The chart information block reports the source and contour count.
Outline settings do not modify collection data or DSS. PixInsight's installed
catalog files and configuration are never changed by this script.
Close-up inset adds a separate square projection beside the unobscured
overview. Its preferred width starts at 2 degrees and applies to all targets.
If too large for the overview, the current chart uses half the overview width,
at least 0.1 degrees, without replacing that preference. A 0.1-degree overview
temporarily hides the inset; a wider overview restores the saved choice.
Applied details and close-up choices survive target selection and restarting,
and work with all three styles. Open as image includes them. With the inset enabled
the image is 2080 pixels wide; otherwise it is 1440 pixels wide. Its height
adapts to the symbol legend and any filtered-object key.
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
Downloads explicitly require TLS with server certificate and hostname checks,
HTTP 200, the expected response type and a bounded nonempty body. SIMBAD object
records and coordinates are validated before use. DSS GIF framing, dimensions
and native decoding are checked before caching; a SHA-256 digest in memory
detects changes to temporary DSS files before cache reuse. These services have
no publisher-supplied cryptographic digest or signature available to the script.
Local cache hashes do not independently authenticate the publisher's payload;
the CPD interpretation for these live responses requires PTeam clarification.
On Windows, file protection runs the operating system utility mountvol.exe from the Windows System32 directory, using the read-only /L option to identify volumes and reject alternate drive mappings. It does not change mounts, request administrator privileges, process images, or use a command shell.
Replacing a text or data file briefly creates verified .tgscripts-write- and .tgscripts-recovery- files with unique names beside that file. The outside directory entry is replaced without writing through a pre-existing hard link. Successful operations remove these temporary files. If restoration fails, the error identifies the retained recovery file; keep it until the previous contents have been recovered.
Collection and preview writes reject installation locations. On Windows, use direct local drive paths; network shares, substituted drives, symbolic links, junctions and ambiguous device names are refused. Cloud placeholders are supported. Linux/macOS checks resolve links and compare installation directory identities.
Local catalog lookup and bundled outline queries use PixInsight's installed libraries and configured databases without a network connection. They remain in the installation under their existing licenses. An explicit SIMBAD choice, a missing local match or unavailable local indexes triggers SIMBAD; ambiguous local matches require a choice and do not trigger fallback. SIMBAD lookups use HTTPS connections to simbad.cfa.harvard.edu and simbad.cds.unistra.fr and send object identifiers. DSS previews use archive.stsci.edu and send target coordinates and field dimensions. Requests identify PixInsight through CoreApplication.agentName followed by AstroBucketList/0.46.0.
Save validation and recovery files use AstroBucketList-save-<unique-id> directories under the operating system temporary directory. Preview GIF and PNG files use AstroBucketList-<unique-id> filenames there. Successful saves remove their temporary copies, and closing the manager removes its preview files. The collection and its .bak backup use the selected destination. Preferences use PixInsight's per-user settings database.

This product is based on software from the PixInsight project, developed
by Pleiades Astrophoto and its contributors (https://pixinsight.com/).

SIMBAD data licensing
Program code is MIT-licensed. SIMBAD-derived object-type tables are licensed
separately under ODbL v1.0, https://opendatacommons.org/licenses/odbl/1-0/.
The installed script directory includes AstroBucketList-DataNotices.txt,
AstroBucketList-ODbL-1.0.txt and AstroBucketList-SIMBAD-otypes.json with provenance,
the complete license and a machine-readable redistribution copy. This JSON
file is not a runtime dependency. SIMBAD is operated at CDS, Strasbourg, France.
Citation: Wenger et al. (2000), A&AS 143, 9–22, doi:10.1051/aas:2000332.

FINDER PROJECTION AND SKY APPEARANCE
Configuration offers Automatic, Gnomonic and Stereographic projection.
Automatic uses Gnomonic through 20 degrees and Stereographic for wider fields;
the close-up chooses independently. Manual choices apply to both maps. The
requested width is the true horizontal angle, and the scale bar is measured at
the center. Filtered-object fitting uses the selected projection on both axes.
Very large groups may require narrower filters or a different projection.
Milky Way shading starts enabled and uses PixInsight's local MilkyWay database
of Gaia DR3 integrated-starlight contours. No download or configuration change
is made. Missing data disables the controls and is reported in the chart while
retaining the preference. Shading strength is 5–30% per overlapping brightness
level (default 10%). This schematic background is independent of nebula outlines.
Star density offers Sparse, Normal and Dense; the alternatives to
Normal shift the magnitude limit by one magnitude brighter or fainter. The
faintest limit is magnitude 15, subject to available local catalog stars.
Star size scales symbols and halos from 50–200% (default 100%) without changing
counts or coverage. Catalog star colors are optional and off by default. Stars
without color indices keep their neutral style color; Observing Atlas normally
uses black stars. Star density is independent of label density and DSO limits.
These preferences persist in PixInsight settings and apply to all targets,
previews, image output and SVG/PDF exports. They do not alter collection data.
All details includes the available Milky Way layer, persisting its on/off choice
while preserving shading strength, star appearance and projection.
