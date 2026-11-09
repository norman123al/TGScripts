# TGScripts

**PixInsight tools for astronomical image processing, by Thorsten Glebe.**

A collection of tools for imaging-target planning, image processing, quality review, and PixInsight script development.

[Installation](#installation) · [Script overview](#script-overview) · [Script gallery](#script-gallery) · [Help and troubleshooting](#help-and-troubleshooting) · [Credits and license](#credits-and-license)

## Installation

Install through PixInsight's update system to receive the scripts and their bundled documentation.

1. Open **Resources → Updates → Manage Repositories**.
2. Add this repository URL:

   ```text
   https://norman123al.github.io/TGScripts/TGScripts_repository/
   ```

3. Select **Resources → Updates → Check for Updates** and install the available TGScripts update. Restart PixInsight if prompted to complete installation.
4. Open a script from **Script → TG Scripts**.

To try a newly added script before the next updater release, download or clone this repository and use **Script → Execute Script File** to open its JavaScript file from `TGScripts_repository/src/scripts/TGScripts/`.

<details>
<summary>Show installation screenshots</summary>

**Manage repositories**

![PixInsight Resources menu with Manage Repositories selected](TGScripts_docu/images/PI_resources_repo.png)

**Check for updates**

![PixInsight Resources menu with Check for Updates selected](TGScripts_docu/images/PI_resources_update.png)

</details>

### Requirements

- **PixInsight:** version **1.9.5 or later with the V8 scripting engine**; **Subframe Quality Review requires 1.9.6 or later with ImageAnalysis installed**.
- **LRGB Deconvolution Match:** requires an installed, licensed **BlurXTerminator** with its AI model.
- **BBStarReduction:** [StarXTerminator](https://www.rc-astro.com/resources/StarXTerminator/) for automatic star removal, or an existing matching starless image.

The packaged updater release may lag behind the repository source. For manual execution, keep each script with its bundled helpers and the `lib` folder. The update manifest may accept older PixInsight versions; the current scripts require the version listed above.

## Script overview

| Task | Script | Version | What it does | Last&nbsp;update |
| --- | --- | --- | --- | --- |
| Inspect image quality | [AberrationInspectorTG](#aberrationinspectortg) | 2.2.0 | Builds a configurable grid of image crops for comparing stars across the field. | 2026&#8209;10&#8209;30 |
| Compare corners | [AberrationSpotterTG](#aberrationspottertg) | 2.2.0 | Combines the four corners and, optionally, the center in one inspection image. | 2026&#8209;10&#8209;30 |
| Plan imaging targets | [Astro Bucket List](#astro-bucket-list) | 0.35.0 | Organizes Stellarium target lists, tracks imaging status, and displays finder charts and DSS images. | 2026&#8209;11&#8209;02 |
| Reduce stars | [BBStarReduction](#bbstarreduction) | 1.3.0 | Applies Bill Blanshan's three methods using automatic or existing starless data, with comparison previews. | 2026&#8209;10&#8209;30 |
| Select colors | [ColorMaskTG](#colormasktg) | 2.2.0 | Creates masks from hue, intensity, and saturation ranges. | 2026&#8209;10&#8209;30 |
| Isolate emission | [CSTG](#cstg) | 2.2.0 | Subtracts the broadband continuum contribution from a narrowband image. | 2026&#8209;10&#8209;30 |
| Enhance dark detail | [DarkStructureEnhanceTG](#darkstructureenhancetg) | 2.4.0 | Enhances dark structures in stretched images, with a parameter comparison grid. | 2026&#8209;10&#8209;30 |
| Tune deconvolution | [DeconvolutionPreviewTG](#deconvolutionpreviewtg) | 2.3.0 | Compares synthetic PSF settings on a preview and applies deconvolution to the full image. | 2026&#8209;10&#8209;30 |
| Combine narrowband and RGB | [EmissionLineIntegrationTG](#emissionlineintegrationtg) | 2.2.1 | Adds continuum-subtracted narrowband emission to RGB channels. | 2026&#8209;10&#8209;30 |
| Blend linear masters | [Linear Master Blend](#linear-master-blend) | 1.20.1 | Normalizes and integrates two linear masters using measured quality and adjustable sharpness preference. | 2026&#8209;10&#8209;19 |
| Support deconvolution | [LocalSupportMask](#localsupportmask) | 2.2.0 | Generates a local support mask for deconvolution deringing. | 2026&#8209;10&#8209;30 |
| Match L and RGB sharpness | [LRGB Deconvolution Match](#lrgb-deconvolution-match) | 1.14.3 | Uses BlurXTerminator to match stellar halo profiles with estimated sharpening, independent FWHM checks, and blink previews. | 2026&#8209;11&#8209;05 |
| Match intensity scales | [ROI Linear Fit](#roi-linear-fit) | 1.1.6 | Measures a fit in a selected region and applies it to the full target image. | 2026&#8209;10&#8209;04 |
| Protect diffraction spikes | [Star Spike Protection Mask](#star-spike-protection-mask) | 1.7.2 | Builds a soft mask protecting bright stellar cores and their spikes. | 2026&#8209;10&#8209;10 |
| Review WBPP subframes | [Subframe Quality Review](#subframe-quality-review) | 0.55.1 | Ranks and blinks WBPP subframes, recommends rejections with an SNR limit, and exports reviewed WBPP setups. | 2026&#8209;11&#8209;08 |
| Develop scripts | [TGScriptSkeleton](#tgscriptskeleton) | 1.6 | Provides a reusable dialog, image preview, and process-instance framework. | 2026&#8209;10&#8209;19 |

Versions follow the declarations in the repository source.

Dates use **YYYY-MM-DD** and reflect the latest Git commit touching each script’s main JavaScript file; documentation and shared-library changes are excluded.

## Script gallery

Short descriptions below cover each script’s purpose and main features; follow the guide links for usage and parameter details. Expand an entry to view its interface. Astro Bucket List screenshots show **0.33.2**, captured on **2026-11-01**; some other examples show earlier releases.

### AberrationInspectorTG

**Version:** 2.2.0 · **Last update:** 2026-10-30

Builds a **grid of image crops** to compare star shapes across the field and reveal optical aberrations. Offers adjustable panel size, spacing, and background brightness.

[Source](TGScripts_repository/src/scripts/TGScripts/AberrationInspectorTG.js) · [Guide](TGScripts_repository/doc/scripts/AberrationInspectorTG/AberrationInspectorTG.html)

<details>
<summary>View AberrationInspectorTG interface</summary>

![AberrationInspectorTG 2.2.0 dialog with image selection, mosaic layout, appearance, and output dimensions](TGScripts_repository/doc/scripts/AberrationInspectorTG/images/AberrationInspectorTG_main_screen.jpg)

</details>

### AberrationSpotterTG

**Version:** 2.2.0 · **Last update:** 2026-10-30

Combines the **four image corners and an optional center crop** into one inspection image. Adjustable crop sizes, spacing, and background brightness make field comparisons easier.

[Source](TGScripts_repository/src/scripts/TGScripts/AberrationSpotterTG.js) · [Guide](TGScripts_repository/doc/scripts/AberrationSpotterTG/AberrationSpotterTG.html)

<details>
<summary>View AberrationSpotterTG interface</summary>

![AberrationSpotterTG 2.2.0 dialog with image selection, corner and center panels, spacing, and output dimensions](TGScripts_repository/doc/scripts/AberrationSpotterTG/images/AberrationSpotterTG_main_screen.jpg)

</details>

### Astro Bucket List

**Version:** 0.35.0 · **Last update:** 2026-11-02

Plans imaging targets with **Stellarium-compatible observing lists**, constellation and month filters, flexible sorting, and broadband/narrowband classification. Imports a chosen source list into a named destination with collection-wide duplicate matching. Keeps collection objects independently of logical lists, tracks imaging status and notes, merges collections, and exports selected targets. Deleting a list retains its objects; the separate Delete object action requires confirmation. Includes SIMBAD lookups, customizable finder charts for individual or filtered targets, and DSS survey previews.

[Source](TGScripts_repository/src/scripts/TGScripts/AstroBucketList.js) · [Guide](TGScripts_repository/doc/scripts/AstroBucketList/AstroBucketList.html) · [PiDoc source](TGScripts_docu/pidoc/AstroBucketList.pidoc)

<details>
<summary>View Astro Bucket List interface</summary>

**Target table**

![Astro Bucket List with Andromeda targets, search and filters, multi-level sorting, and imaging notes](TGScripts_repository/doc/scripts/AstroBucketList/images/AstroBucketList_main_screen.jpg)

**Finder chart — filtered targets in Andromeda**

![Astro Bucket List finder chart with numbered targets, constellation outlines, and a target key](TGScripts_repository/doc/scripts/AstroBucketList/images/AstroBucketList_finder_chart.jpg)

**DSS survey — NGC 7640**

![Astro Bucket List DSS2 Red survey preview of NGC 7640](TGScripts_repository/doc/scripts/AstroBucketList/images/AstroBucketList_dss_survey.jpg)

</details>

### BBStarReduction

**Version:** 1.3.0 · **Last update:** 2026-10-30

Reduces stars in **stretched images** using Bill Blanshan’s Transfer, Halo, and Star methods. Supports StarXTerminator or an existing starless image, comparison grids, and output to a new image or the original.

[Source](TGScripts_repository/src/scripts/TGScripts/BBStarReduction.js) · [Guide](TGScripts_repository/doc/scripts/BBStarReduction/BBStarReduction.html)

<details>
<summary>View BBStarReduction interface</summary>

![BBStarReduction 1.3.0 dialog with existing starless image option, reduction methods, comparison preview, and output controls](TGScripts_repository/doc/scripts/BBStarReduction/images/BBStarReduction_main_screen.jpg)

</details>

### ColorMaskTG

**Version:** 2.2.0 · **Last update:** 2026-10-30

Creates **color-selective grayscale masks** from RGB images. Combines hue presets or custom ranges with intensity and saturation limits, adjustable weighting, strength, and smoothing.

[Source](TGScripts_repository/src/scripts/TGScripts/ColorMaskTG.js) · [Guide](TGScripts_repository/doc/scripts/ColorMaskTG/ColorMaskTG.html)

<details>
<summary>View ColorMaskTG interface</summary>

![ColorMaskTG 2.2.0 dialog with RGB selection, hue presets, intensity and saturation limits, and mask output controls](TGScripts_repository/doc/scripts/ColorMaskTG/images/ColorMaskTG_main_screen.jpg)

</details>

### CSTG

**Version:** 2.2.0 · **Last update:** 2026-10-30

Isolates **narrowband emission through continuum subtraction** using a matching broadband image or RGB channel. Includes automatic subtraction-factor estimation, optional star masking, noise reduction, and diagnostic plots.

[Source](TGScripts_repository/src/scripts/TGScripts/CSTG.js) · [Guide](TGScripts_repository/doc/scripts/CSTG/CSTG.html)

<details>
<summary>View CSTG interface</summary>

![CSTG 2.2.0 dialog with narrowband, broadband and mask inputs, continuum estimate, noise reduction, and diagnostic plot](TGScripts_repository/doc/scripts/CSTG/images/CSTG_main_screen.jpg)

</details>

### DarkStructureEnhanceTG

**Version:** 2.4.0 · **Last update:** 2026-10-30

Enhances **dust lanes and other dark structures in stretched images** using a generated mask. Provides adjustable strength and scale, comparison grids, and optional mask output.

[Source](TGScripts_repository/src/scripts/TGScripts/DarkStructureEnhanceTG.js) · [Guide](TGScripts_repository/doc/scripts/DarkStructureEnhanceTG/DarkStructureEnhanceTG.html)

<details>
<summary>View DarkStructureEnhanceTG interface</summary>

![DarkStructureEnhanceTG 2.4.0 dialog with stretched-image selection, structure mask, enhancement, comparison preview, and output controls](TGScripts_repository/doc/scripts/DarkStructureEnhanceTG/images/DarkStructureEnhanceTG_main_screen.jpg)

</details>

### DeconvolutionPreviewTG

**Version:** 2.3.0 · **Last update:** 2026-10-30

Helps tune **deconvolution for linear images** by comparing synthetic PSF settings in a preview grid. Includes deringing and local support-mask controls, then applies the chosen settings to the full image.

[Source](TGScripts_repository/src/scripts/TGScripts/DeconvolutionPreviewTG.js) · [Guide](TGScripts_repository/doc/scripts/DeconvolutionPreviewTG/DeconvolutionPreviewTG.html)

<details>
<summary>View DeconvolutionPreviewTG interface</summary>

![DeconvolutionPreviewTG 2.3.0 dialog with target and preview selection, PSF ranges, deringing, support mask, and full-image output](TGScripts_repository/doc/scripts/DeconvolutionPreviewTG/images/DeconvolutionPreviewTG_main_screen.jpg)

</details>

### EmissionLineIntegrationTG

**Version:** 2.2.1 · **Last update:** 2026-10-30

Adds **continuum-subtracted narrowband emission to RGB images**, with independent amplification for each channel. Includes before/after previews, optional star masking, and separate emission-image output.

[Source](TGScripts_repository/src/scripts/TGScripts/EmissionLineIntegrationTG.js) · [Guide](TGScripts_repository/doc/scripts/EmissionLineIntegrationTG/EmissionLineIntegrationTG.html)

<details>
<summary>View EmissionLineIntegrationTG interface</summary>

![EmissionLineIntegrationTG 2.2.1 dialog with RGB and narrowband inputs, amplification, optional mask, and output controls](TGScripts_repository/doc/scripts/EmissionLineIntegrationTG/images/EmissionLineIntegrationTG_main_screen.jpg)

</details>

### Linear Master Blend

**Version:** 1.20.1 · **Last update:** 2026-10-19

Combines **two aligned linear masters** using automatic brightness and background matching, measured quality weights, and an adjustable sharpness preference. Provides blink previews and measurement comparisons before creating a new integrated image.

[Source](TGScripts_repository/src/scripts/TGScripts/LinearMasterBlend.js) · [Guide](TGScripts_repository/doc/scripts/LinearMasterBlend/LinearMasterBlend.html)

<details>
<summary>View Linear Master Blend interface</summary>

**Output preview**

![Linear Master Blend 1.20.0 with L_clone and RGB_registered_L selected, Sharpness preference, output preview, zoom, and blink controls](TGScripts_repository/doc/scripts/LinearMasterBlend/images/LinearMasterBlend_main_screen.jpg)

**Measurements**

![Linear Master Blend 1.20.0 Measurements tab with stellar-flux fit and a table comparing the masters and output](TGScripts_repository/doc/scripts/LinearMasterBlend/images/LinearMasterBlend_measurements.jpg)

</details>

### LocalSupportMask

**Version:** 2.2.0 · **Last update:** 2026-10-30

Generates **stellar support masks for deconvolution deringing** from linear grayscale or RGB images. Offers adjustable strength, scale, growth, and smoothing, with intermediate and mask-overlay previews.

[Source](TGScripts_repository/src/scripts/TGScripts/LocalSupportMask.js) · [Guide](TGScripts_repository/doc/scripts/LocalSupportMask/LocalSupportMask.html)

<details>
<summary>View LocalSupportMask interface</summary>

![LocalSupportMask 2.2.0 dialog with target selection, mask parameters, and separate preview-image controls](TGScripts_repository/doc/scripts/LocalSupportMask/images/LocalSupportMask_main_screen.jpg)

</details>

### LRGB Deconvolution Match

**Version:** 1.14.3 · **Last update:** 2026-11-05

Matches **stellar sharpness and halos in registered linear L and RGB images** using BlurXTerminator. Provides automatic sharpening estimates, halo optimization, blink comparisons, FWHM plots, and a match-quality report in a resizable dialog with collapsible settings.

[Source](TGScripts_repository/src/scripts/TGScripts/LRGBDeconvolutionMatch.js) · [Guide](TGScripts_repository/doc/scripts/LRGBDeconvolutionMatch/LRGBDeconvolutionMatch.html)

<details>
<summary>View LRGB Deconvolution Match interface</summary>

Screenshots show **1.13.0**, before the current dialog layout.

**Reference before/after**

![LRGB Deconvolution Match 1.13.0 with L_clone and RGB_registered_clone selected, reference preview, halo optimization controls, and BlurXTerminator report](TGScripts_repository/doc/scripts/LRGBDeconvolutionMatch/images/LRGBDeconvolutionMatch_main_screen.jpg)

**Matched L / RGB**

![LRGB Deconvolution Match 1.13.0 matched luminance and RGB luminance blink preview with the final settings and halo report](TGScripts_repository/doc/scripts/LRGBDeconvolutionMatch/images/LRGBDeconvolutionMatch_matched_preview.jpg)

**FWHM comparison**

![LRGB Deconvolution Match 1.13.0 FWHM comparison with before-and-after and final-image measurements, fitted lines, and match assessment](TGScripts_repository/doc/scripts/LRGBDeconvolutionMatch/images/LRGBDeconvolutionMatch_fwhm_comparison.jpg)

</details>

### ROI Linear Fit

**Version:** 1.1.6 · **Last update:** 2026-10-04

Matches a target’s **intensity scale to a reference** using a selected region of interest, then applies the fit to the full image. Supports RGB channels, preview-based region selection, scatter plots, and Undo.

[Source](TGScripts_repository/src/scripts/TGScripts/ROILinearFit.js) · [Guide](TGScripts_repository/doc/scripts/ROILinearFit/ROILinearFit.html)

<details>
<summary>View ROI Linear Fit interface</summary>

![ROI Linear Fit dialog with source and target selection, ROI coordinates, rejection limits, and plot settings](TGScripts_repository/doc/scripts/ROILinearFit/images/ROILinearFit_main_screen.jpg)

</details>

### Star Spike Protection Mask

**Version:** 1.7.2 · **Last update:** 2026-10-10

Creates **soft protection masks for bright stars and diffraction spikes** from stretched stars-only images. Includes star and spike detection controls, adjustable mask growth and blur, previews, and XISF export.

[Source](TGScripts_repository/src/scripts/TGScripts/StarSpikeProtectionMask.js) · [Guide](TGScripts_repository/doc/scripts/StarSpikeProtectionMask/StarSpikeProtectionMask.html)

<details>
<summary>View Star Spike Protection Mask interface</summary>

![Star Spike Protection Mask 1.7.2 settings with star selection, spike detection, growth, and blur controls](TGScripts_repository/doc/scripts/StarSpikeProtectionMask/images/StarSpikeProtectionMask_main_screen.jpg)

</details>

### Subframe Quality Review

**Version:** 0.55.1 · **Last update:** 2026-11-08

Helps select **WBPP subframes to keep or reject** with four quality rankings, field/corner measurements, sky and guiding indicators, quality plots, and mosaic blink comparisons. Recommends rejections by testing trial stacks against a chosen SNR preservation limit, with optional object ROI measurements. Imports WBPP setups, exports reviewed setups excluding rejected lights, and supports confirmed, reversible moves of rejected originals.

[Source](TGScripts_repository/src/scripts/TGScripts/SubframeQualityReview.js) · [Guide](TGScripts_repository/doc/scripts/SubframeQualityReview/SubframeQualityReview.html)

<details>
<summary>View Subframe Quality Review interface</summary>

Captured from **0.45.14** on **2026-11-07**, reviewing 40 blue-filter, 180-second subframes of **NGC 7814**. These examples predate the current controls for WBPP import/export, rejection recommendations, and corner mosaic blinking.

**Review and measurements**

![Subframe Quality Review 0.45.14 with R1–R4 rankings, review candidates, and field and corner measurements](TGScripts_repository/doc/scripts/SubframeQualityReview/images/SubframeQualityReview_main_screen.jpg)

**Blink frame / reference**

![Subframe Quality Review 0.45.14 NGC 7814 blink preview with a best-subframe reference, region controls, and display stretching](TGScripts_repository/doc/scripts/SubframeQualityReview/images/SubframeQualityReview_blink_preview.jpg)

**Score plot**

![Subframe Quality Review 0.45.14 Score plot with 40 subframes in value order, review candidates, selected frame, and mean](TGScripts_repository/doc/scripts/SubframeQualityReview/images/SubframeQualityReview_quality_indicators.jpg)

**Sky brightness**

![Subframe Quality Review 0.45.14 sky-brightness plot with SQM 19.10 reference, Bortle 6 quality bands, mean, and master comparison](TGScripts_repository/doc/scripts/SubframeQualityReview/images/SubframeQualityReview_sky_background.jpg)

**Field FWHM — quality bands**

![Subframe Quality Review 0.45.14 field-FWHM plot with quality bands, mean, and master comparison](TGScripts_repository/doc/scripts/SubframeQualityReview/images/SubframeQualityReview_fwhm_indicators.jpg)

**FWHM grading settings**

![Subframe Quality Review 0.45.14 FWHM grading with telescope and observing conditions, relative thresholds, and calculated pixel limits](TGScripts_repository/doc/scripts/SubframeQualityReview/images/SubframeQualityReview_fwhm_grading.jpg)

**Field eccentricity**

![Subframe Quality Review 0.45.14 field-eccentricity plot with quality bands, review candidates, mean, and master comparison](TGScripts_repository/doc/scripts/SubframeQualityReview/images/SubframeQualityReview_eccentricity.jpg)

**Guiding indicators — average error**

![Subframe Quality Review 0.45.14 guide-average error in arcseconds for 40 subframes, with quality bands and mean](TGScripts_repository/doc/scripts/SubframeQualityReview/images/SubframeQualityReview_guiding_indicators.jpg)

**Correlation plot**

![Subframe Quality Review 0.45.14 field FWHM versus PSF signal weight, with Pearson correlation and highlighted review candidates](TGScripts_repository/doc/scripts/SubframeQualityReview/images/SubframeQualityReview_correlation_plot.jpg)

</details>

### TGScriptSkeleton

**Version:** 1.6 · **Last update:** 2026-10-19

Provides a **starting point for PixInsight script development** with image selection, zoomable previews, display stretching, image statistics, reusable process icons, and standard dialog controls.

[Source](TGScripts_repository/src/scripts/TGScripts/TGScriptSkeleton.js) · [Guide](TGScripts_repository/doc/scripts/TGScriptSkeleton/TGScriptSkeleton.html)

<details>
<summary>View TGScriptSkeleton interface</summary>

![TGScriptSkeleton dialog with image preview, statistics, and properties panels](TGScripts_repository/doc/scripts/TGScriptSkeleton/images/TGScriptSkeleton_main_screen.png)

</details>

## Help and troubleshooting

### Documentation and reusable settings

Use a script's documentation or information button for parameter explanations and examples, where provided. The compiled guides are stored in [TGScripts_repository/doc/scripts](TGScripts_repository/doc/scripts), including the new [EmissionLineIntegrationTG guide](TGScripts_repository/doc/scripts/EmissionLineIntegrationTG/EmissionLineIntegrationTG.html).

Scripts with a **New Instance** triangle can store their settings in a PixInsight process icon. Save your process icons or project to reuse these settings in later sessions. Consult the individual guide before applying an instance to an image, since execution behavior varies by script.

### StarXTerminator in BBStarReduction

If automatic star removal fails, check the PixInsight Process Console and confirm that StarXTerminator is installed, licensed, and configured with its AI model. The automatic mode requires a target of at least **512 × 512 pixels**. Alternatively, enable **Use an existing starless image** and select a matching starless view.

### Reporting a problem

Please [open an issue](https://github.com/norman123al/TGScripts/issues) with the script name and version, your PixInsight version and operating system, steps to reproduce the problem, and the relevant console error. Include whether the input is grayscale or RGB, linear or stretched, and a main image or preview.

## Repository layout

| Location | Contents |
| --- | --- |
| [TGScripts_repository/src/scripts/TGScripts](TGScripts_repository/src/scripts/TGScripts) | The 16 menu scripts, with script-specific helpers and data. |
| [TGScripts_repository/src/scripts/TGScripts/lib](TGScripts_repository/src/scripts/TGScripts/lib) | Shared helpers and libraries used by the scripts. |
| [TGScripts_docu/pidoc](TGScripts_docu/pidoc) | PiDoc sources and their input images for the script guides. |
| [TGScripts_repository/doc/scripts](TGScripts_repository/doc/scripts) | Compiled PixInsight documentation, with guide and gallery images in each script's images folder. |
| [TGScripts_docu/images](TGScripts_docu/images) | Installation screenshots for the README. |
| [TGScripts_repository/updates.xri](TGScripts_repository/updates.xri) | PixInsight update manifest. |
| [TGScripts_docu](TGScripts_docu) | Documentation sources and generated documentation assets. |

Build update packages from the src/scripts and doc/scripts subtrees of TGScripts_repository. TGScripts_docu contains documentation authoring and website assets. The installed guides use the PiDoc styles and utilities supplied by PixInsight.

The files in `lib/` support the menu scripts and are not standalone tools.

## Credits and license

Maintained by **Thorsten Glebe**. This collection includes original tools and adaptations of scripts by **Mike Schuster, David Serrano, Rick Stevenson, Hartmut V. Bornemann, Carlos Sonnenstein, Oriol Lehmkuhl, and Juan M. Gómez**. BBStarReduction implements star reduction methods by **Bill Blanshan**. Individual source files retain their original attribution and copyright notices.

The repository includes the [GNU General Public License v3.0](LICENSE). Astro Bucket List, Linear Master Blend and LRGB Deconvolution Match have their own MIT licenses: [Astro Bucket List license](TGScripts_repository/src/scripts/TGScripts/AstroBucketList-LICENSE.txt), [Linear Master Blend license](TGScripts_repository/src/scripts/TGScripts/LinearMasterBlend-LICENSE.txt) and [LRGB Deconvolution Match license](TGScripts_repository/src/scripts/TGScripts/LRGBDeconvolutionMatch-LICENSE.txt). See individual source headers for applicable notices and terms. The software is provided without warranty.

Visit Thorsten's [astrophotography gallery on AstroBin](https://www.astrobin.com/users/norman123al/).
