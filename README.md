# TGScripts

**PixInsight tools for astronomical image processing, by Thorsten Glebe.**

TGScripts brings together original scripts and enhanced versions of community tools for star reduction, mask creation, narrowband processing, intensity matching, linear master blending, deconvolution, subframe quality review, and optical inspection. The collection also includes a starting point for developing your own PixInsight scripts.

[Installation](#installation) · [Script overview](#script-overview) · [Script gallery](#script-gallery) · [Help and troubleshooting](#help-and-troubleshooting) · [Credits and license](#credits-and-license)

## Installation

Install through PixInsight's update system to receive the scripts and their bundled documentation.

1. Open **Resources → Updates → Manage Repositories**.
2. Add this repository URL:

   ```text
   https://norman123al.github.io/TGScripts/TGScripts_repository/
   ```

3. Select **Resources → Updates → Check for Updates** and install the available TGScripts update. Restart PixInsight if prompted to complete installation.
4. Open a script from **Script → TG Scripts**. The newer tools appear as **Linear Master Blend**, **LRGB Deconvolution Match**, **ROI Linear Fit**, **Star Spike Protection Mask**, and **Subframe Quality Review**.

To try a newly added script before the next updater release, download or clone this repository and use **Script → Execute Script File** to open its JavaScript file from `TGScripts_repository/src/scripts/TGScripts/`.

<details>
<summary>Show installation screenshots</summary>

**Manage repositories**

![PixInsight Resources menu with Manage Repositories selected](TGScripts_repository/images/PI_resources_repo.png)

**Check for updates**

![PixInsight Resources menu with Check for Updates selected](TGScripts_repository/images/PI_resources_update.png)

</details>

### Requirements

- **PixInsight:** all current repository scripts require **PixInsight 1.9.5 or later with the V8 scripting engine**. The older scripts and their shared libraries have been migrated to V8, including their dialogs, preview controls, and process constants.
- **LRGB Deconvolution Match:** requires an installed, licensed **BlurXTerminator** with its AI model.
- **BBStarReduction:** requires [StarXTerminator](https://www.rc-astro.com/resources/StarXTerminator/) to be installed and configured with an AI model. The script requires an image or preview of at least **256 × 256 pixels**.

The packaged updater release may lag behind the repository source. To use the V8 migration before it is packaged, follow the manual execution instructions above and keep the scripts together with their `lib` folder. The update manifest currently accepts older PixInsight versions; this does not establish compatibility with the current source.

## Script overview

| Task | Script | Version | What it does | Last&nbsp;update |
| --- | --- | --- | --- | --- |
| Inspect image quality | [AberrationInspectorTG](#aberrationinspectortg) | 2.1 | Builds a configurable grid of image crops for comparing stars across the field. | 2026&#8209;10&#8209;19 |
| Compare corners | [AberrationSpotterTG](#aberrationspottertg) | 2.1 | Combines the four corners and, optionally, the center in one inspection image. | 2026&#8209;10&#8209;19 |
| Reduce stars | [BBStarReduction](#bbstarreduction) | 1.2 | Applies Bill Blanshan's three star reduction methods, with parameter previews. | 2026&#8209;10&#8209;19 |
| Select colors | [ColorMaskTG](#colormasktg) | 2.1 | Creates masks from hue, intensity, and saturation ranges. | 2026&#8209;10&#8209;19 |
| Isolate emission | [CSTG](#cstg) | 2.1 | Subtracts the broadband continuum contribution from a narrowband image. | 2026&#8209;10&#8209;19 |
| Enhance dark detail | [DarkStructureEnhanceTG](#darkstructureenhancetg) | 2.3 | Increases the visibility of dark structures such as dust lanes. | 2026&#8209;10&#8209;19 |
| Tune deconvolution | [DeconvolutionPreviewTG](#deconvolutionpreviewtg) | 2.2 | Compares deconvolution results across synthetic point spread function settings. | 2026&#8209;10&#8209;19 |
| Combine narrowband and RGB | [EmissionLineIntegrationTG](#emissionlineintegrationtg) | 2.1 | Adds continuum-subtracted narrowband emission to RGB channels. | 2026&#8209;10&#8209;19 |
| Blend linear masters | [Linear Master Blend](#linear-master-blend) | 1.20.1 | Normalizes and integrates two linear masters using measured quality and adjustable sharpness preference. | 2026&#8209;10&#8209;19 |
| Support deconvolution | [LocalSupportMask](#localsupportmask) | 2.1 | Generates a local support mask for deconvolution deringing. | 2026&#8209;10&#8209;19 |
| Match L and RGB sharpness | [LRGB Deconvolution Match](#lrgb-deconvolution-match) | 1.13.1 | Uses BlurXTerminator to match stellar halo profiles with estimated sharpening, independent FWHM checks, and blink previews. | 2026&#8209;10&#8209;19 |
| Match intensity scales | [ROI Linear Fit](#roi-linear-fit) | 1.1.6 | Measures a fit in a selected region and applies it to the full target image. | 2026&#8209;10&#8209;04 |
| Protect diffraction spikes | [Star Spike Protection Mask](#star-spike-protection-mask) | 1.7.2 | Builds a soft mask protecting bright stellar cores and their spikes. | 2026&#8209;10&#8209;10 |
| Review WBPP subframes | [Subframe Quality Review](#subframe-quality-review) | 0.16.0 | Ranks registered lights, provides blink comparisons and quality plots, and moves manually rejected originals after confirmation. | 2026&#8209;10&#8209;19 |
| Develop scripts | [TGScriptSkeleton](#tgscriptskeleton) | 1.6 | Provides a reusable dialog, image preview, and process-instance framework. | 2026&#8209;10&#8209;19 |

Versions follow the declarations in the repository source.

Dates use **YYYY-MM-DD** and reflect the latest Git commit touching each script’s main JavaScript file; documentation and shared-library changes are excluded. The ten migrated legacy scripts include the local V8 compatibility update made on **2026-10-19**.

## Script gallery

Each entry links to its source file. Most scripts also provide a documentation button in PixInsight; the bundled guides contain parameter details and examples. Screenshots show actual script interfaces, with some taken from earlier releases. Expand an interface below to view it.

### AberrationInspectorTG

**Version:** 2.1 · **Last update:** 2026-10-19

Creates an **n × n mosaic** of crops sampled across an image, including its corners, edges, and center. Use it to compare star shapes and assess field-dependent aberrations without navigating a large image. The TG version supports panels up to **2048 × 2048 pixels** and saving settings as a process icon.

Based on Mike Schuster's AberrationInspector. [Source](TGScripts_repository/src/scripts/TGScripts/AberrationInspectorTG.js)

<details>
<summary>View AberrationInspectorTG interface</summary>

![AberrationInspectorTG dialog with image selection and mosaic size controls](TGScripts_repository/doc/scripts/AberrationInspectorTG/images/AberrationInspectorTG_main_screen.png)

</details>

### AberrationSpotterTG

**Version:** 2.1 · **Last update:** 2026-10-19

Collects the **four corners of the active image**, with an optional center crop, into a single inspection image. Set the horizontal and vertical crop sizes, spacing, and background brightness to make comparisons easier. The TG version supports crops up to **2048 × 2048 pixels** and reusable process icons.

Based on David Serrano's AberrationSpotter. [Source](TGScripts_repository/src/scripts/TGScripts/AberrationSpotterTG.js)

<details>
<summary>View AberrationSpotterTG interface</summary>

![AberrationSpotterTG dialog with crop dimensions, spacing, and center toggle](TGScripts_repository/doc/scripts/AberrationSpotterTG/images/AberrationSpotterTG_main_screen.png)

</details>

### BBStarReduction

**Version:** 1.2 · **Last update:** 2026-10-19

Reduces the prominence of stars in a **stretched image** using Bill Blanshan's **Transfer, Halo, or Star** method. It automates starless-image generation with StarXTerminator and offers a preview for comparing reduction settings before applying them to the target.

Requires StarXTerminator; see [troubleshooting](#starxterminator-io-error-in-bbstarreduction) if star removal fails. [Source](TGScripts_repository/src/scripts/TGScripts/BBStarReduction.js)

<details>
<summary>View BBStarReduction interface</summary>

![BBStarReduction dialog showing the three reduction methods and preview selection](TGScripts_repository/doc/scripts/BBStarReduction/images/BBStarReduction_main_screen.png)

</details>

### ColorMaskTG

**Version:** 2.1 · **Last update:** 2026-10-19

Creates masks that select a **color range**, refined by **intensity and saturation limits**. Choose a preset color or a custom hue interval, then control mask weighting, strength, and smoothing. The expanded options include chrominance, lightness, inverse lightness, and linear mask types for selective image adjustments.

Based on Rick Stevenson's ColorMask, with fixes and additional mask-generation controls. [Source](TGScripts_repository/src/scripts/TGScripts/ColorMaskTG.js)

<details>
<summary>View ColorMaskTG interface</summary>

![ColorMaskTG dialog with hue, intensity, saturation, mask type, and blur controls](TGScripts_repository/doc/scripts/ColorMaskTG/images/ColorMaskTG_main_screen.png)

</details>

### CSTG

**Version:** 2.1 · **Last update:** 2026-10-19

Performs **continuum subtraction** to separate emission-line signal from the continuum contribution in a narrowband image. Supply a grayscale narrowband image and a corresponding broadband image or RGB channel. Optional controls include a star mask, noise reduction, and diagnostic curves for the subtraction-factor evaluation.

Based on Hartmut V. Bornemann's CS script, with process-icon support and bundled documentation. [Source](TGScripts_repository/src/scripts/TGScripts/CSTG.js)

<details>
<summary>View CSTG interface</summary>

![CSTG dialog with narrowband and broadband inputs and subtraction options](TGScripts_repository/doc/scripts/CSTG/images/CSTG_main_screen.png)

</details>

### DarkStructureEnhanceTG

**Version:** 2.3 · **Last update:** 2026-10-19

Enhances **dark structures**, such as dust lanes, using a generated mask and adjustable enhancement strength and iterations. It can also extract the mask and preview the effect on a selected image preview. The bundled guide recommends linear data; the script warns when the selected image appears nonlinear.

Based on DarkStructureEnhance by Carlos Sonnenstein and Oriol Lehmkuhl, with preview and process-icon support. [Source](TGScripts_repository/src/scripts/TGScripts/DarkStructureEnhanceTG.js)

<details>
<summary>View DarkStructureEnhanceTG interface</summary>

![DarkStructureEnhanceTG dialog with mask parameters, amount, iterations, and preview](TGScripts_repository/doc/scripts/DarkStructureEnhanceTG/images/DarkStructureEnhanceTG_main_screen.png)

</details>

### DeconvolutionPreviewTG

**Version:** 2.2 · **Last update:** 2026-10-19

Generates a comparison of deconvolution results while varying the **sigma and shape of a synthetic point spread function (PSF)**. Work on a PixInsight image preview to inspect a representative region at a useful scale. Controls include deconvolution iterations, deringing, and a local support mask; the current settings can also be applied to the selected preview.

Based on Juan M. Gómez's DeconvolutionPreview, adapted for preview-based evaluation and process-icon workflows. [Source](TGScripts_repository/src/scripts/TGScripts/DeconvolutionPreviewTG.js)

<details>
<summary>View DeconvolutionPreviewTG interface</summary>

![DeconvolutionPreviewTG dialog showing PSF parameter ranges and deringing controls](TGScripts_repository/doc/scripts/DeconvolutionPreviewTG/images/DeconvolutionPreviewTG_main_screen.png)

</details>

### EmissionLineIntegrationTG

**Version:** 2.1 · **Last update:** 2026-10-19

Combines **narrowband emission with a broadband RGB image**. It estimates and subtracts the continuum contribution, then adds the emission signal to the selected RGB channels with independent amplification controls. Start with an active RGB image and corresponding, registered narrowband data for at least one channel. The dialog provides an image preview and options to retain the emission views.

Based on Hartmut V. Bornemann's EmissionLineIntegration, with changes to speed up continuum evaluation. [Source](TGScripts_repository/src/scripts/TGScripts/EmissionLineIntegrationTG.js)

<details>
<summary>View EmissionLineIntegrationTG interface</summary>

![EmissionLineIntegrationTG dialog with RGB preview and narrowband channel controls](TGScripts_repository/images/EmissionLineIntegrationTG_main_screen.jpg)

</details>

### Linear Master Blend

**Version:** 1.20.1 · **Last update:** 2026-10-19

Normalizes and integrates **two aligned linear master images** using measured source quality. Preview automatically chooses the master with the lower combined stellar **FWHM** as the brightness reference. It matches the other master's stellar flux and local background to that reference independently in each channel.

Integration starts with a base balance of **40% PSF Signal Weight, 40% PSF SNR, and 20% inverse combined FWHM**. **Sharpness preference** (0–8, default **1**) then gives extra weight to the master with narrower stars. Set it to **0** to use the base balance alone; higher values favor sharpness more strongly and can reduce the noise benefit of the other master. Recalculate Preview after changing it. The resulting weights apply to every pixel and all RGB channels. This is a weighted average of the complete masters; including a source with broader stars can broaden the output stars, so inspect both detail and noise.

The **Output preview** supports zoom, pan, display stretching, and blinking against either master. The **Measurements** tab shows the stellar-flux fit, selected reference, noise, FWHM X/Y, PSF quality metrics, source contributions, and output measurements. Create produces a **new 32-bit floating-point linear image** using the preview's normalization and weights; both originals remain unchanged.

Use registered, cropped floating-point images with identical dimensions and matching grayscale or RGB channels, without alpha channels. Correct gradients first and provide at least **10 reliable matched stars per channel** for brightness matching. Requires PixInsight 1.9.5+ with V8. [Source](TGScripts_repository/src/scripts/TGScripts/LinearMasterBlend.js) · [Guide](TGScripts_repository/doc/scripts/LinearMasterBlend/LinearMasterBlend.html)

<details>
<summary>View Linear Master Blend interface</summary>

**Output preview**

![Linear Master Blend 1.20.0 with L_clone and RGB_registered_L selected, Sharpness preference, output preview, zoom, and blink controls](TGScripts_repository/images/LinearMasterBlend_main_screen.jpg)

**Measurements**

![Linear Master Blend 1.20.0 Measurements tab with stellar-flux fit and a table comparing the masters and output](TGScripts_repository/images/LinearMasterBlend_measurements.jpg)

</details>

### LocalSupportMask

**Version:** 2.1 · **Last update:** 2026-10-19

Creates a **local support mask for deconvolution deringing**, helping protect stars during deconvolution. Adjust mask strength, scale, smoothness, and structure growth, then inspect the mask preview. Use a **linear main image**; both grayscale and RGB are supported, with luminance data recommended in the guide.

[Source](TGScripts_repository/src/scripts/TGScripts/LocalSupportMask.js)

<details>
<summary>View LocalSupportMask interface</summary>

![LocalSupportMask dialog with mask generation controls and an image preview](TGScripts_repository/doc/scripts/LocalSupportMask/images/LocalSupportMask_main_screen.png)

</details>

### LRGB Deconvolution Match

**Version:** 1.13.1 · **Last update:** 2026-10-19

Prepares **registered linear luminance and RGB images for LRGB composition**, including data from different telescopes and original pixel scales. Choose the sharper reference yourself or let the script select it from measured stellar FWHM. Set its BlurXTerminator **Sharpen Stars** and **Adjust Star Halos**, then inspect the **Reference before/after** preview.

The script estimates **Sharpen Stars** for the other image from the measured reference sharpening and holds that estimate fixed. It optimizes only **Adjust Star Halos**, comparing flux-normalized outer stellar profiles within your chosen halo limits. The reference result stays fixed; **Sharpen Nonstellar** is shared by both images and **Automatic PSF** remains enabled. The sharpening estimate is empirical and is not clipped; matching stops if BlurXTerminator rejects it.

Use **Matched L / RGB** to blink the deconvolved luminance against luminance extracted from the deconvolved RGB image. **FWHM comparison** plots each image before/after and the final L/RGB width comparison, with fitted lines and paired-star statistics. The **BlurXTerminator report** lists the applied settings, halo mismatch, dark-ring flags, and stopping reason. **PASS** requires both halo-profile and stellar-width checks to pass, including separate RGB-channel width checks; **REVIEW** means the results need inspection.

After reviewing the previews, use the **green checkmark** to create two new linear images, or the **blue square** to apply the results to both inputs with **one Undo step per image**. Preview calculations leave the inputs unchanged. Display stretching and brightness alignment affect only previews; neither result action stretches, combines, or saves the images to disk.

Requires **PixInsight 1.9.5+ with V8** and an installed, licensed **BlurXTerminator** with its AI model. Supply registered, equally sized floating-point grayscale L and three-channel RGB images, without alpha channels or empty registration borders. At least **20 reliable common stars and 20 usable halo profiles** are required. Registration, resampling, final stretching, and LRGB combination are separate steps. [Source](TGScripts_repository/src/scripts/TGScripts/LRGBDeconvolutionMatch.js) · [Guide](TGScripts_repository/doc/scripts/LRGBDeconvolutionMatch/LRGBDeconvolutionMatch.html)

<details>
<summary>View LRGB Deconvolution Match interface</summary>

**Reference before/after**

![LRGB Deconvolution Match 1.13.0 with L_clone and RGB_registered_clone selected, reference preview, halo optimization controls, and BlurXTerminator report](TGScripts_repository/images/LRGBDeconvolutionMatch_main_screen.jpg)

**Matched L / RGB**

![LRGB Deconvolution Match 1.13.0 matched luminance and RGB luminance blink preview with the final settings and halo report](TGScripts_repository/images/LRGBDeconvolutionMatch_matched_preview.jpg)

**FWHM comparison**

![LRGB Deconvolution Match 1.13.0 FWHM comparison with before-and-after and final-image measurements, fitted lines, and match assessment](TGScripts_repository/images/LRGBDeconvolutionMatch_fwhm_comparison.jpg)

</details>

### ROI Linear Fit

**Version:** 1.1.6 · **Last update:** 2026-10-04

Matches a target image's **intensity scale** to a reference using a rectangular **region of interest (ROI)**. The script measures PixInsight's native LinearFit transformation inside that region and applies it to the **entire target**, with separate fits for RGB channels. Enter coordinates or copy them from an existing preview; inspect the fit with a scatter plot before applying it.

Use two registered main images with identical dimensions and matching color types. The reference stays unchanged; the target is modified in place with Undo support. Requires PixInsight 1.9.5+ with V8. [Source](TGScripts_repository/src/scripts/TGScripts/ROILinearFit.js)

<details>
<summary>View ROI Linear Fit interface</summary>

![ROI Linear Fit dialog with source and target selection, ROI coordinates, rejection limits, and plot settings](TGScripts_repository/images/ROILinearFit_main_screen.jpg)

</details>

### Star Spike Protection Mask

**Version:** 1.7.2 · **Last update:** 2026-10-10

Creates a **full-size grayscale protection mask for bright stars and diffraction spikes**. It follows the luminance profiles of stellar cores and spikes, with controls for star selection, spike detection, core size, mask growth, and blur. Preview the mask, compare it with the source, and optionally save the result as a 32-bit floating-point XISF image.

Designed for a **stretched stars-only image** with roughly straight spikes on two perpendicular axes. Detection uses actual pixel values, not the STF display stretch. **Black protects, white permits processing; apply the mask with Invert Mask off.** The source pixels remain unchanged. Requires PixInsight 1.9.5+ with V8. [Source](TGScripts_repository/src/scripts/TGScripts/StarSpikeProtectionMask.js)

<details>
<summary>View Star Spike Protection Mask interface</summary>

![Star Spike Protection Mask 1.7.2 settings with star selection, spike detection, growth, and blur controls](TGScripts_repository/images/StarSpikeProtectionMask_main_screen.jpg)

</details>

### Subframe Quality Review

**Version:** 0.16.0 · **Last update:** 2026-10-19

Reviews **registered light frames from a completed WeightedBatchPreprocessing (WBPP) run** to help decide which original exposures to exclude before rerunning WBPP. PixInsight's SubframeSelector measures PSF signal weight, star count, FWHM, and eccentricity, with optional center and corner measurements. Adjustable weights combine these into a relative quality score within each comparable filter/exposure group; **lower Score is better**. **Below-mean Quality** shows the percentage of assessed indicators worse than their group mean.

The **Review and measurements** table shortlists the worst **10%** by default and flags insufficient measurements for inspection. Use **Blink frame / reference** to compare an image with the best scoring subframe or the corresponding linear filter master, across the field, center, or corners. Preview stretching and brightness alignment aid comparison without changing image pixels. **Quality indicators** plots measurements by value or acquisition sequence, with optional autofocus-start markers imported from an Autorun log. Markers include the final successful focus position when available (for example, **AF 692**), while remaining positioned at the autofocus start time.

**REVIEW is a suggestion, not a rejection decision.** Mark unwanted originals manually, then use the green checkmark to inspect and confirm the move plan. Only uniquely verified original lights are moved to the chosen rejection folder, preserving relative subdirectories and recording a move journal; calibrated images, registered images, and masters remain in place. Refresh WBPP's input list before rerunning it. Measurements and pending decisions last only while the dialog stays open; saved process instances retain settings, not the measured review session.

Requires **PixInsight 1.9.5+ with V8**. Supports XISF/FITS monochrome and registered, debayered OSC lights from one telescope setup. Select the WBPP output directory and a separate original-light root. For master comparisons, retain the matching **linear, uncropped, non-drizzled integration** with the same dimensions as the registered lights. [Source](TGScripts_repository/src/scripts/TGScripts/SubframeQualityReview.js) · [Guide](TGScripts_repository/doc/scripts/SubframeQualityReview/SubframeQualityReview.html)

<details>
<summary>View Subframe Quality Review interface</summary>

**Review and measurements**

![Subframe Quality Review 0.15.2 with 53 measured luminance frames, quality weights, field and corner rankings, and review candidates](TGScripts_repository/images/SubframeQualityReview_main_screen.jpg)

**Blink frame / reference**

![Subframe Quality Review 0.15.2 blink preview with best-subframe reference, region selection, display stretch, and brightness alignment controls](TGScripts_repository/images/SubframeQualityReview_blink_preview.jpg)

**Quality indicators**

![Subframe Quality Review 0.16.0 Score plot in acquisition order with review candidates, a mean line, master comparison, and autofocus markers labeled with final focus positions](TGScripts_repository/images/SubframeQualityReview_quality_indicators.jpg)

</details>

### TGScriptSkeleton

**Version:** 1.6 · **Last update:** 2026-10-19

A **development template** for building PixInsight scripts. It provides image selection, a zoomable preview with display stretching, image statistics and properties, parameter storage in process icons, and standard reset, execution, and documentation controls. Use it as a starting point for a new tool rather than as an image-processing operation.

[Source](TGScripts_repository/src/scripts/TGScripts/TGScriptSkeleton.js)

<details>
<summary>View TGScriptSkeleton interface</summary>

![TGScriptSkeleton dialog with image preview, statistics, and properties panels](TGScripts_repository/doc/scripts/TGScriptSkeleton/images/TGScriptSkeleton_main_screen.png)

</details>

## Help and troubleshooting

### Documentation and reusable settings

Use a script's documentation or information button for parameter explanations and examples, where provided. The compiled guides are stored in [TGScripts_repository/doc/scripts](TGScripts_repository/doc/scripts). EmissionLineIntegrationTG currently has no separate bundled guide; refer to its interface tooltips and source comments.

Scripts with a **New Instance** triangle can store their settings in a PixInsight process icon. Save your process icons or project to reuse these settings in later sessions. Consult the individual guide before applying an instance to an image, since execution behavior varies by script.

### StarXTerminator I/O error in BBStarReduction

If BBStarReduction produces no visible reduction, check the PixInsight Process Console. For the documented StarXTerminator I/O error, **open the StarXTerminator process interface once**, then close it and retry BBStarReduction. You do not need to execute StarXTerminator manually. The workaround may need to be repeated after restarting PixInsight.

### Reporting a problem

Please [open an issue](https://github.com/norman123al/TGScripts/issues) with the script name and version, your PixInsight version and operating system, steps to reproduce the problem, and the relevant console error. Include whether the input is grayscale or RGB, linear or stretched, and a main image or preview.

## Repository layout

| Location | Contents |
| --- | --- |
| [TGScripts_repository/src/scripts/TGScripts](TGScripts_repository/src/scripts/TGScripts) | The 15 menu scripts. |
| [TGScripts_repository/src/scripts/TGScripts/lib](TGScripts_repository/src/scripts/TGScripts/lib) | Shared helpers and libraries used by the scripts. |
| [TGScripts_repository/doc/scripts](TGScripts_repository/doc/scripts) | Compiled PixInsight documentation and guide images. |
| [TGScripts_repository/images](TGScripts_repository/images) | Installation images and additional README screenshots. |
| [TGScripts_repository/updates.xri](TGScripts_repository/updates.xri) | PixInsight update manifest. |
| [TGScripts_docu](TGScripts_docu) | Documentation sources and generated documentation assets. |

The files in `lib/` support the menu scripts and are not standalone tools.

## Credits and license

Maintained by **Thorsten Glebe**. This collection includes original tools and adaptations of scripts by **Mike Schuster, David Serrano, Rick Stevenson, Hartmut V. Bornemann, Carlos Sonnenstein, Oriol Lehmkuhl, and Juan M. Gómez**. BBStarReduction implements star reduction methods by **Bill Blanshan**. Individual source files retain their original attribution and copyright notices.

The repository includes the [GNU General Public License v3.0](LICENSE). Linear Master Blend and LRGB Deconvolution Match have their own MIT licenses: [Linear Master Blend license](TGScripts_repository/src/scripts/TGScripts/LinearMasterBlend-LICENSE.txt) and [LRGB Deconvolution Match license](TGScripts_repository/src/scripts/TGScripts/LRGBDeconvolutionMatch-LICENSE.txt). See individual source headers for applicable notices and terms. The software is provided without warranty.

Visit Thorsten's [astrophotography gallery on AstroBin](https://www.astrobin.com/users/norman123al/).
