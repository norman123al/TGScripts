Astro Bucket List 0.12.1

OPEN THE MANAGER
Choose Script > TG Scripts > Astro Bucket List. The script requires
PixInsight 1.9.5 or later with V8 and its standard CatalogStarGenerator and
AnnotateImage libraries. Use the documentation button for the full guide.

COLLECTIONS
Use the Table, Finder chart and DSS survey image tabs in the main window.
Objects appear in a flat table with a Constellation column and no collapsible
groups. Sort by can order objects by calendar month in either direction;
unassigned months stay last. Size sorting ranks major diameters across all
constellations, with unknown sizes last. RA and Dec sorting uses numeric J2000
coordinates in either direction, with missing values last.
Filter objects groups Constellation, Object type, Month, imaging state and Find.
Reset filters clears all five filters, retaining the selected list, sort order
and checked objects. Sort rows offers a primary Sort by and optional Then by
criterion. Each has its own direction; the second breaks ties in the first.
For Dec: increasing, then Size: largest first, equal declinations are ordered
by decreasing object size. Missing values remain last at each level. Sorting preserves export checks.
The first launch opens an empty list. Add objects, create additional lists,
or use Open and Import to load your own Stellarium .sol, .ol or .json files.
No predefined bucket list is included or loaded. Save your collection outside
the script installation directory. Normal launches reopen the last collection
saved by the manager if it is available; otherwise they open an empty list.

NEW INSTANCE
Save the collection, then drag the New Instance triangle at the lower left
onto the PixInsight workspace. The process icon stores the collection path.
Run it globally to reopen that file. Save icons with PixInsight's standard
process-icon or project commands to retain them between sessions.
The icon contains no objects, notes or unsaved edits. Save collection changes
before reopening it. If a file moves or is renamed, open it and create a new
instance; existing icons retain their saved paths.

PLAN AND TRACK
Each object has its own row, with its IAU constellation in the second column. Object type displays their saved
catalog classification. Use Month, imaging state and Find to filter them;
Find also searches object types and comments. Comments shows your
saved imaging notes; use Edit object to change them. Month/constellation source headings are hidden in the Comments preview and
tooltip; the complete original notes remain in the editor and details pane.
The lower-right Configuration gear configures constellation planning months.
Filters shows explicit filter mentions from comments unless you enter your
own value through Edit object > Filters. Edited values, including a deliberately
blank value, are saved with the collection.
Apparent size shows measured major and minor diameters in arcminutes. Use
Update catalogs for the selected object, missing sizes, or an entire list.
Edit object lets you enter a manual size that catalog updates preserve.
Edit object provides editable imaging dates and catalog information. Entering
a date marks the object as imaged. Edited catalog text survives lookups;
Use catalog text restores the retrieved summary. Save retains these fields.
Leftover hollow circles are removed from comments. Save after opening a
collection to retain any automatic cleanup.
Add object rejects duplicates anywhere in the collection, including known
catalog aliases, and identifies the lists containing the existing object.
Checkboxes select objects for export. Ctrl-click individual rows or Shift-click
a range, then choose Check selected to check those highlighted rows. Existing
checks are retained, including hidden objects. Highlighting alone does not check
an object. The footer counts highlighted rows and export checks separately.
Sorting retains highlights; filtering retains only highlights still visible.
Edit object, Remove from list and previews use the current row.
Check shown checks all filtered rows;
Uncheck all clears the selection. Export > Checked objects writes each target
once into a new Stellarium list. Use Edit object to record imaging status.
Import merges one or more files. Export also supports the selected list or all lists.
Keep the manager's saved collection as your master: Stellarium may discard
manager-specific notes and imaging status when it re-exports the file.

CATALOGS AND CHARTS
Look up and Update catalogs refresh SIMBAD coordinates, types and available
apparent dimensions. Manual sizes and personal imaging information are retained. DSS2 Red finder images also require internet access.
Styled sky charts use configured local Gaia catalogs or bundled
bright stars and work offline. Finder coverage defaults to the larger of the
object diameter and 5 degrees (maximum 120 degrees), with Fit object size off.
NGC/IC and Fainter NGC/IC control that catalog and its magnitude depth.
The current normal and faint magnitude limits appear below the controls.
Caldwell, Collinder clusters, Supernova remnants and Mandel-Wilson nebulae
have independent checkboxes. Unavailable catalogs are disabled. All use local
bundled data, and optional catalogs start unchecked. Known sizes set the initial DSS survey width;
manual widths remain available within its limits.
Choose Chart style: Modern Editorial uses a dark sky, sans-serif labels and
a cool accent; Vintage Atlas uses ivory paper, sepia markings, serif labels
and fine double rules. The style is remembered locally and applies to Open as
image. Both show identical sky positions and catalog data, with a center
crosshair, separate title band, coordinates, symbol key and angular scale.
Changing style clears only the finder preview; choose Create chart again.
Constellation borders is enabled by default. Dashed lines show the region
boundaries using local bundled data, with colors matching the chosen style.
Solid lines connect constellation stars. Toggle borders and choose Create
chart to update the preview. Border visibility retains field width and DSS.
Use the main preview tabs to access charts and survey images. Spaced labels keep dense fields readable. Previews stay in their tabs.
DSS requests always use the maximum 120-arcminute width for objects larger
than that limit, even when Fit object size is unchecked.
Open as image creates an independent image for saving in PixInsight.
