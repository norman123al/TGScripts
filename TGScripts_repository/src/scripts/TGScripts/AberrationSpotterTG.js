#engine v8
// V8 migration (2026-10-19); requires PixInsight 1.9.5 or later.
/*
   AberrationSpotterTG.js v2.2.0 (based on AberrationSpotter.js v0.3)

   Groups the corners of an image into a new one

   Copyright (C) 2007-2017 David Serrano

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the
   Free Software Foundation, version 3 of the License.

   This program is distributed in the hope that it will be useful, but WITHOUT
   ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
   FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
   more details.

   You should have received a copy of the GNU General Public License along with
   this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
   Changelog:
   0.3:  2017/07/08 - Unhardcode the number of channels. Tested with 1 and 3.
   0.2:  2009/07/14 - Changed AS_settings variable to the_AS_settings to avoid
         redefinition warning. Several cosmetic fixes to the dialog.
   0.1:  Initial version.

   Modified 2022 by Thorsten Glebe
   1. increased panel size max to 2048
   2. added "new instance" butten with export/import of parameters
   3. removed "delete settings" functionality (replaced by "new instance" functionality)
*/

// 2.2.0: TGScripts dialog, target selection and file opening, and view-target instances.
#define VERSION         "2.2.0"

CoreApplication.ensureMinimumVersion(1, 9, 5);
#define SURNAME         "_corners"
#define SET_PREFIX      "aberration_spotter"
#define MAX_PANEL_SIZE  2048
#define TITLE           "AberrationSpotterTG"

#feature-id AberrationSpotterTG : TG Scripts > AberrationSpotterTG

#feature-info A simple script that creates an image containing the corners \
   and, optionally, the center of another image. Useful to highlight the \
   aberrations of the optical elements used.<br><br/>\
   <br/>\
   Copyright &copy; 2007-2017 David Serrano / 2022 Thorsten Glebe

#feature-icon aberration-spotter.xpm

function AberrationSpotterData()
{
    this.hsize       = 500;   // pixels
    this.vsize       = 500;   // pixels
    this.show_center = true;
    this.sep         = 10;    // percent
    this.bgcolor     = 0.25;  // normalized value

   /*
    * Save parameters in process icon.
    */
   this.exportParameters = function()
   {
      Parameters.set("hsize"      , this.hsize);
      Parameters.set("vsize"      , this.vsize);
      Parameters.set("show_center", this.show_center);
      Parameters.set("sep"        , this.sep);
      Parameters.set("bgcolor"    , this.bgcolor);
   }

   /*
    * Restore saved parameters.
    */
   this.importParameters = function()
   {
      if(Parameters.has("hsize"))
         this.hsize = Parameters.getInteger("hsize");
      if(Parameters.has("vsize"))
         this.vsize = Parameters.getInteger("vsize");
      if (Parameters.has("show_center"))
         this.show_center = Parameters.getBoolean("show_center");
      if(Parameters.has("sep"))
         this.sep = Parameters.getInteger("sep");
      if(Parameters.has("bgcolor"))
         this.bgcolor = Parameters.getReal("bgcolor");
   }
}

var user_data = new AberrationSpotterData;

function AS_engine()
{
    var rect = new Rect;   // for creating previews...
    var points;            // ...we'll move rect to these points
    var dest_points;       // points in the destination image
    var win;               // original window
    var sep;               // user_data.sep translated into pixels
    // randomized ids, to avoid clashing with (maybe) existing ones
    var preview_ids = new Array (
        "UL_so8fh", "UR_so8fh",
        "LL_so8fh", "LR_so8fh",
        "C_so8fh"
    );

    // --------- set_win -----------
    this.set_win = function (w)
    {
        if ((w == null || w.isNull))
        {
            throw Error ("Invalid/No image window.");
        }

        this.win = w;
    }

    // --------- calc_sep -----------
    this._calc_sep = function()
    {
        if (user_data.show_center)
        {
            this.sep = Math.floor (
                Math.min (user_data.hsize, user_data.vsize) * user_data.sep / 100
            );
            if (this.sep < 1) this.sep = 1;
        } else {
            this.sep = 1;
        }
    }

    // --------- create_points -----------
    // creates points in both the original and destination images
    this._create_points = function()
    {
        var img = this.win.mainView.image;
        if (!user_data.show_center) {
            preview_ids.pop();     // remove "C" from its elements
        }

        this.nchannels = img.numberOfChannels;
        this.has_colour = 1 != this.nchannels;

        // source points
        this.points = new Array;
        this.points[preview_ids[0]] = new Point (0, 0);
        this.points[preview_ids[1]] = new Point (img.width - user_data.hsize, 0);
        this.points[preview_ids[2]] = new Point (0, img.height - user_data.vsize);
        this.points[preview_ids[3]] = new Point (
            img.width  - user_data.hsize,
            img.height - user_data.vsize
        );
        if (user_data.show_center) {
            this.points[preview_ids[4]] = new Point (
                Math.floor (img.bounds.center.x - user_data.hsize / 2),
                Math.floor (img.bounds.center.y - user_data.vsize / 2)
            );
        }

        // destination points
        this.dest_points = new Array;
        this.dest_points[preview_ids[0]] = new Point (0, 0);
        this.dest_points[preview_ids[1]] = new Point (user_data.hsize + this.sep, 0);
        this.dest_points[preview_ids[2]] = new Point (0, user_data.vsize + this.sep);
        this.dest_points[preview_ids[3]] = new Point (
            user_data.hsize + this.sep,
            user_data.vsize + this.sep
        );
        if (user_data.show_center)
        {
            this.dest_points[preview_ids[4]] = new Point (Math.floor (
                // dest image isn't created yet, so we have to guess its center
                // we'll use the same operation to create the image later
                (2 * user_data.hsize + this.sep) / 2 - (user_data.hsize / 2)
            ), Math.floor (
                (2 * user_data.vsize + this.sep) / 2 - (user_data.vsize / 2)
            ));
        }
    }

    // --------- create_previews -----------
    this._create_previews = function()
    {
        rect.width  = user_data.hsize;
        rect.height = user_data.vsize;

        for (var i in preview_ids)
        {
            var str = preview_ids[i];
            rect.moveTo(this.points[str]);
            this.win.createPreview (rect, str);
        }
    }

    // --------- join_previews -----------
    this._join_previews = function()
    {
        var v = this.win.mainView;
        // create destination image
        var dest = new ImageWindow (
            2 * user_data.hsize + this.sep,
            2 * user_data.vsize + this.sep,
            this.nchannels, v.image.bitsPerSample,
            v.image.sampleType == PixelSampleType.Float,
            this.has_colour, v.id + SURNAME
        );
        with (dest.mainView)
        {
            beginProcess (UndoFlag.NoSwapFile);
            with (image)
            {
                fill (user_data.bgcolor);

                // copy previews into the destination image. Not the central one
                for (var i = 0; i < 4; i++)
                {
                    selectedPoint = this.dest_points[preview_ids[i]];
                    apply (this.win.previewById (preview_ids[i]).image);
                }
                resetSelections();

                // fill the center and put the central image over it
                if (user_data.show_center)
                {
                    var p = this.dest_points[preview_ids[4]];

                    // but only draw the "border" if separation is less than 100%
                    if (user_data.sep < 100) {
                        selectedRect = new Rect (
                            p.x - 1,
                            p.y - 1,
                            p.x + user_data.hsize + 1,
                            p.y + user_data.vsize + 1
                        );
                        fill (user_data.bgcolor);
                    }

                    selectedPoint = p;
                    apply (this.win.previewById (preview_ids[4]).image);
                }
            }
            endProcess();
        }
        dest.show();
    }

    // --------- destroy_all -----------
    this._destroy_all = function()
    {
        this.points = null;
        this.dest_points = null;
        for (var i = 0; i < preview_ids.length; i++)
        {
            this.win.deletePreview(this.win.previewById (preview_ids[i]));
        }
        rect = null;

    }

    // --------- work -----------
    this.work = function()
    {
        this._calc_sep();
        this._create_points();
        this._create_previews();
        this._join_previews();
        this._destroy_all();
    }
}
// Match the compact native controls used by recent TGScripts dialogs.
const AS_SCRIPT_FILE = #__FILE__;

function AS_group(parent, title)
{
    var group = new GroupBox(parent);
    group.title = title;
    group.sizer = new VerticalSizer;
    group.sizer.margin = 10;
    group.sizer.spacing = 8;
    return group;
}

function AS_tool(parent, resource, tip, handler)
{
    var button = new ToolButton(parent);
    button.icon = parent.scaledResource(resource);
    button.setScaledFixedSize(24, 24);
    button.toolTip = tip;
    button.onClick = handler;
    return button;
}

function AS_showDocumentation()
{
    var relative = "/scripts/AberrationSpotterTG/AberrationSpotterTG.html";
    var dir = AS_SCRIPT_FILE.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
    var candidates = [CoreApplication.docDirPath + relative,
        File.fullPath(dir + "/../../../doc" + relative),
        dir + "/doc" + relative, dir + "/AberrationSpotterTG.html"];
    for (var i = 0; i < candidates.length; ++i)
        if (File.exists(candidates[i]))
        {
            Dialog.openBrowser(candidates[i], TITLE + " — User Guide");
            return;
        }
    (new MessageBox("The AberrationSpotterTG user guide is missing. Check that the TGScripts installation includes its documentation.",
                    TITLE, StdIcon.Warning, StdButton.Ok)).execute();
}

function AS_run(target)
{
    if (target == null || target.isNull)
        throw Error("Select a target image or click Open image first.");
    var image = target.mainView.image;
    if (user_data.hsize > image.width || user_data.vsize > image.height)
        throw Error("The panel size exceeds the target image dimensions (" + image.width + " × " + image.height + " pixels). Reduce the panel width or height.");
    var worker = new AS_engine;
    worker.set_win(target);
    worker.work();
}

var AS_dialog = class extends Dialog
{
    constructor()
    {
        super();
        this.windowTitle = TITLE + " " + VERSION;
        this.setScaledMinWidth(620);

        this.intro = new Label(this);
        this.intro.wordWrapping = true;
        this.intro.text = "Inspect the four corners of an image in a compact montage, with an optional center panel.";

        this.targetGroup = AS_group(this, "Target image");
        this.target_ViewList = new ViewList(this.targetGroup);
        this.target_ViewList.getMainViews();
        this.target_ViewList.toolTip = "Select the open image to inspect. You can also open a file after launching the script.";
        this.target_ViewList.onViewSelected = view => this.selectTarget(view.isNull ? null : view.window);
        this.openImage_Button = new PushButton(this.targetGroup);
        this.openImage_Button.text = "Open image…";
        this.openImage_Button.onClick = () => this.openImage();
        this.openImage_Button.toolTip = "Open an image file and select it as the target.";
        var targetRow = new HorizontalSizer;
        targetRow.spacing = 8;
        targetRow.add(this.target_ViewList, 100);
        targetRow.add(this.openImage_Button);
        this.targetInfo = new Label(this.targetGroup);
        this.targetInfo.wordWrapping = true;
        this.targetInfo.minHeight = this.font.height;
        this.targetGroup.sizer.add(targetRow);
        this.targetGroup.sizer.add(this.targetInfo);

        this.panelGroup = AS_group(this, "Panel size");
        this.hsize_NC = this.number(this.panelGroup, "Width (px):", user_data.hsize, 2, MAX_PANEL_SIZE, 0,
            "Width of each corner and center panel in pixels.", value => { user_data.hsize = value; this.updateStatus(); });
        this.vsize_NC = this.number(this.panelGroup, "Height (px):", user_data.vsize, 2, MAX_PANEL_SIZE, 0,
            "Height of each corner and center panel in pixels.", value => { user_data.vsize = value; this.updateStatus(); });
        this.panelGroup.sizer.add(this.hsize_NC);
        this.panelGroup.sizer.add(this.vsize_NC);

        this.montageGroup = AS_group(this, "Montage appearance");
        this.sc_CB = new CheckBox(this.montageGroup);
        this.sc_CB.text = "Show center panel";
        this.sc_CB.checked = user_data.show_center;
        this.sc_CB.toolTip = "Overlay a center panel at the center of the four corners. Without it, the corners have a one-pixel gap.";
        this.sc_CB.onCheck = checked => {
            user_data.show_center = checked;
            this.sep_NC.enabled = checked;
            this.updateStatus();
        };
        this.sep_NC = this.number(this.montageGroup, "Separation (%):", user_data.sep, 0, 100, 0,
            "Gap between the corner panels, as a percentage of the smaller panel dimension. Used when the center panel is shown.",
            value => { user_data.sep = value; this.updateStatus(); });
        this.sep_NC.enabled = user_data.show_center;
        this.bc_NC = this.number(this.montageGroup, "Background brightness:", user_data.bgcolor, 0, 1, 2,
            "Brightness of the gaps and center border: 0 is black and 1 is white.", value => { user_data.bgcolor = value; });
        this.montageGroup.sizer.add(this.sc_CB);
        this.montageGroup.sizer.add(this.sep_NC);
        this.montageGroup.sizer.add(this.bc_NC);

        this.status = new Label(this);
        this.status.wordWrapping = true;
        this.status.minHeight = 2 * this.font.height;
        this.instanceButton = AS_tool(this, ":/process-interface/new-instance.png",
            "Drag to save the panel settings as a process icon. Apply the icon to an image later. A target is not required.", () => {});
        this.instanceButton.onMousePress = () => { Parameters.clear(); user_data.exportParameters(); this.newInstance(); };
        this.resetButton = AS_tool(this, ":/process-interface/reset.png",
            "Reset panel and appearance settings. The selected target is retained.", () => this.resetSettings());
        this.applyButton = AS_tool(this, ":/process-interface/execute.png",
            "Apply to the selected image. Create a corner montage and keep this dialog open.", () => this.applyTarget());
        this.closeButton = AS_tool(this, ":/process-interface/cancel.png", "Close AberrationSpotterTG.", () => this.cancel());
        this.helpButton = AS_tool(this, ":/process-interface/browse-documentation.png", "Open the PiDoc user guide.", AS_showDocumentation);
        var actions = new HorizontalSizer;
        actions.spacing = 8;
        actions.add(this.instanceButton);
        actions.add(this.resetButton);
        actions.addStretch();
        actions.add(this.applyButton);
        actions.add(this.closeButton);
        actions.add(this.helpButton);

        this.sizer = new VerticalSizer;
        this.sizer.margin = 10;
        this.sizer.spacing = 8;
        this.sizer.add(this.intro);
        this.sizer.add(this.targetGroup);
        this.sizer.add(this.panelGroup);
        this.sizer.add(this.montageGroup);
        this.sizer.add(this.status);
        this.sizer.add(actions);
        this.selectTarget(ImageWindow.activeWindow);
        this.adjustToContents();
        this.setFixedSize();
    }

    number(parent, label, value, low, high, precision, tip, handler)
    {
        var control = new NumericControl(parent);
        control.label.text = label;
        control.label.setScaledFixedWidth(160);
        control.edit.setScaledFixedWidth(70);
        control.slider.setRange(0, high == MAX_PANEL_SIZE ? MAX_PANEL_SIZE - 2 : 100);
        control.slider.setScaledMinWidth(220);
        control.setRange(low, high);
        control.setPrecision(precision);
        control.setReal(precision > 0);
        control.setValue(value);
        control.toolTip = tip;
        control.onValueUpdated = handler;
        return control;
    }

    selectTarget(target)
    {
        this.targetWindow = target != null && !target.isNull ? target : null;
        if (this.targetWindow != null)
            this.target_ViewList.currentView = this.targetWindow.mainView;
        this.updateStatus();
    }

    updateStatus()
    {
        if (!this.status)
            return;
        var target = this.targetWindow;
        if (target == null || target.isNull)
            this.targetInfo.text = "Select an open image, or use Open image to load a file.";
        else
        {
            var image = target.mainView.image;
            this.targetInfo.text = image.width + " × " + image.height + " pixels · " +
                image.numberOfChannels + (image.numberOfChannels == 1 ? " channel" : " channels");
        }
        var gap = user_data.show_center ? Math.max(1, Math.floor(Math.min(user_data.hsize, user_data.vsize) * user_data.sep / 100)) : 1;
        this.status.text = "Output: " + (2 * user_data.hsize + gap) + " × " + (2 * user_data.vsize + gap) +
            " pixels · four corners" + (user_data.show_center ? " + center" : "") +
            ".\nApply creates a new image. New Instance saves the settings for later.";
    }

    openImage()
    {
        var chooser = new OpenFileDialog;
        chooser.caption = "Open target image";
        chooser.multipleSelections = false;
        chooser.loadImageFilters();
        if (!chooser.execute())
            return;
        try
        {
            var windows = ImageWindow.open(chooser.filePath);
            if (windows.length == 0)
                throw Error("The file contains no image.");
            for (var i = 0; i < windows.length; ++i)
                windows[i].show();
            this.target_ViewList.getMainViews();
            this.selectTarget(windows[0]);
        }
        catch (error) { this.showError(error); }
    }

    applyTarget()
    {
        try { AS_run(this.targetWindow); }
        catch (error) { this.showError(error); }
    }

    showError(error)
    {
        (new MessageBox(String(error.message || error), TITLE, StdIcon.Warning, StdButton.Ok)).execute();
    }

    resetSettings()
    {
        user_data = new AberrationSpotterData;
        this.hsize_NC.setValue(user_data.hsize);
        this.vsize_NC.setValue(user_data.vsize);
        this.sep_NC.setValue(user_data.sep);
        this.bc_NC.setValue(user_data.bgcolor);
        this.sc_CB.checked = user_data.show_center;
        this.sep_NC.enabled = user_data.show_center;
        this.updateStatus();
    }
};

function main()
{
    if (Parameters.isGlobalTarget || Parameters.isViewTarget)
        user_data.importParameters();
    if (Parameters.isViewTarget)
        AS_run(Parameters.targetView.window);
    else
        (new AS_dialog).execute();
}

main();
