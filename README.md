# TGScripts
Pixinsight scripts by Thorsten Glebe

This repository will provide Pixinsight scripts for astronomical image processing.
Use at your own risk.

Feel free to visit my astrophoto gallery on [Astrobin](https://www.astrobin.com/users/norman123al/). 

The scripts will be provided in a dedicated subfolder (TG Scripts) of the Pixinsights SCRIPTS menu.

![Pixinsight SCRIPT menu with TG Scripts subfolder](/TGScripts_repository/images/PI_script_menu.png)

In order to add this repository to the Pixinsight update system, go to 'Manage Repositories' in the RESOURCES -> Updates menu

!['Manage Repositories' menu in Pixinsight](/TGScripts_repository/images/PI_resources_repo.png)

and add the following URL: **https://norman123al.github.io/TGScripts/TGScripts_repository/**.

Then run an update of Pixinsight system via the 'Check for Updates' menu item.

!['Check for Updates' menu in Pixinsight](/TGScripts_repository/images/PI_resources_update.png)

## Contained Pixinsight Scripts
This repository contains both new scripts written by me and existing scripts which I have reworked. Details on the scripts or the modifications w.r.t. the original versions are explained in the Pixinsight script documentation provided along with the scripts

### New Pixinsight Scripts
- **BBStarReduction.js** - a script to apply Bill Blanshan's star reduction methods (requires [StarXTerminator](https://www.rc-astro.com/resources/StarXTerminator/)).

  Known issues:
  - StarXTerminator might fail with an IO error (see console output) when exectued from the script. To solve this, start the StarXTerminator process manually once. Then the issue is gone until Pixinsight is closed. See also script documentation in Pixinsight.

- **LocalSupportMask.js** - a script to create a local support mask for Pixinsights Deconvolution process.

- **TGScriptSkeleton.js** - a script skeleton serving as a starting point for Pixinsight java script development.

### Modified Pixinsight Scripts
- **ColorMaskTG.js** - an improved version of the ColorMask script written by Rick Stevenson with improved mask generation capabilities.
