#engine v8
#include "lib/TGFileProtection.js"
#ifndef ABL_LIBRARY
#feature-id AstroBucketList : TG Scripts > Astro Bucket List
#feature-info Maintain astronomical imaging bucket lists with saved views; exchange Stellarium SOL files, look up local catalog and SIMBAD objects, navigate interactive finder charts, save chart presets, export SVG/PDF charts, view DSS images, plan observing windows with local ephemerides, saved sites and custom horizons, export CSV/PDF plans, and retain imaging status.
CoreApplication.ensureMinimumVersion( 1, 9, 6, 0, 1718 );
#endif

/* Astro Bucket List 0.47.1 — PixInsight 1.9.6 build 1719+, PJSR V8.
 * Copyright (c) 2026 Thorsten Glebe. Program code: SPDX-License-Identifier: MIT
 * SIMBAD-derived type data: ODbL-1.0; see AstroBucketList-DataNotices.txt.
 * Collection files are written only by explicit Save / Export actions.
 */
// BEGIN ABL_PORTABLE
// Constellation tables and the portable list model live here so the
// portable model has no generated or separate runtime copy. Tests read this
// section directly; native filesystem operations use the shared guard above.
// Astro Bucket List 0.47.1. IAU boundaries: Roman (1987), CDS VI/42, via Astropy.
// https://github.com/astropy/astropy/tree/main/astropy/coordinates/data
var ABL_CONSTELLATIONS = {
  "And": "Andromeda",
  "Ant": "Antlia",
  "Aps": "Apus",
  "Aql": "Aquila",
  "Aqr": "Aquarius",
  "Ara": "Ara",
  "Ari": "Aries",
  "Aur": "Auriga",
  "Boo": "Bo\u00f6tes",
  "CMa": "Canis Major",
  "CMi": "Canis Minor",
  "CVn": "Canes Venatici",
  "Cae": "Caelum",
  "Cam": "Camelopardalis",
  "Cap": "Capricornus",
  "Car": "Carina",
  "Cas": "Cassiopeia",
  "Cen": "Centaurus",
  "Cep": "Cepheus",
  "Cet": "Cetus",
  "Cha": "Chamaleon",
  "Cir": "Circinus",
  "Cnc": "Cancer",
  "Col": "Columba",
  "Com": "Coma Berenices",
  "CrA": "Corona Australis",
  "CrB": "Corona Borealis",
  "Crt": "Crater",
  "Cru": "Crux ",
  "Crv": "Corvus",
  "Cyg": "Cygnus",
  "Del": "Delphinus",
  "Dor": "Dorado",
  "Dra": "Draco",
  "Equ": "Equuleus",
  "Eri": "Eridanus",
  "For": "Fornax",
  "Gem": "Gemini",
  "Gru": "Grus",
  "Her": "Hercules",
  "Hor": "Horologium",
  "Hya": "Hydra",
  "Hyi": "Hydrus",
  "Ind": "Indus",
  "LMi": "Leo Minor",
  "Lac": "Lacerta",
  "Leo": "Leo",
  "Lep": "Lepus",
  "Lib": "Libra",
  "Lup": "Lupus",
  "Lyn": "Lynx",
  "Lyr": "Lyra",
  "Men": "Mensa",
  "Mic": "Microscopium",
  "Mon": "Monoceros",
  "Mus": "Musca",
  "Nor": "Norma",
  "Oct": "Octans",
  "Oph": "Ophiuchus",
  "Ori": "Orion",
  "Pav": "Pavo",
  "Peg": "Pegasus",
  "Per": "Perseus",
  "Phe": "Phoenix",
  "Pic": "Pictor",
  "PsA": "Pisces Austrinus",
  "Psc": "Pisces",
  "Pup": "Puppis",
  "Pyx": "Pyxis",
  "Ret": "Reticulum",
  "Scl": "Sculptor",
  "Sco": "Scorpius",
  "Sct": "Scutum",
  "Ser": "Serpens",
  "Sex": "Sextans",
  "Sge": "Sagitta",
  "Sgr": "Sagittarius",
  "Tau": "Taurus",
  "Tel": "Telescopium",
  "TrA": "Triangulum Australe",
  "Tri": "Triangulum",
  "Tuc": "Tucana",
  "UMa": "Ursa Major",
  "UMi": "Ursa Minor",
  "Vel": "Vela",
  "Vir": "Virgo",
  "Vol": "Volans",
  "Vul": "Vulpecula"
};
var ABL_DEFAULT_MONTHS = {
  "And": 10,
  "Aql": 8,
  "Aqr": 9,
  "Ari": 11,
  "Aur": 12,
  "Boo": 5,
  "CMa": 1,
  "CMi": 1,
  "CVn": 4,
  "Cam": 11,
  "Cap": 8,
  "Cas": 10,
  "Cep": 9,
  "Cet": 10,
  "Cnc": 2,
  "Col": 12,
  "Com": 4,
  "CrB": 5,
  "Crt": 3,
  "Crv": 4,
  "Cyg": 8,
  "Del": 8,
  "Dra": 5,
  "Equ": 8,
  "Eri": 11,
  "For": 11,
  "Gem": 1,
  "Her": 6,
  "Hya": 2,
  "LMi": 3,
  "Lac": 9,
  "Leo": 3,
  "Lep": 12,
  "Lib": 5,
  "Lyn": 2,
  "Lyr": 7,
  "Mon": 1,
  "Oph": 6,
  "Ori": 12,
  "Peg": 9,
  "Per": 11,
  "PsA": 9,
  "Psc": 10,
  "Pup": 1,
  "Scl": 10,
  "Sco": 6,
  "Sct": 7,
  "SerCap": 5,
  "SerCau": 7,
  "Sex": 3,
  "Sge": 8,
  "Sgr": 7,
  "Tau": 11,
  "Tri": 11,
  "UMa": 3,
  "UMi": 5,
  "Vir": 4,
  "Vul": 8
};
var ABL_BOUNDARIES = [
   [0,24,88,"UMi"],
   [8,14.5,86.5,"UMi"],
   [21,23,86.1667,"UMi"],
   [18,21,86,"UMi"],
   [0,8,85,"Cep"],
   [9.1667,10.6667,82,"Cam"],
   [0,5,80,"Cep"],
   [10.6667,14.5,80,"Cam"],
   [17.5,18,80,"UMi"],
   [20.1667,21,80,"Dra"],
   [0,3.5083,77,"Cep"],
   [11.5,13.5833,77,"Cam"],
   [16.5333,17.5,75,"UMi"],
   [20.1667,20.6667,75,"Cep"],
   [7.9667,9.1667,73.5,"Cam"],
   [9.1667,11.3333,73.5,"Dra"],
   [13,16.5333,70,"UMi"],
   [3.1,3.4167,68,"Cas"],
   [20.4167,20.6667,67,"Dra"],
   [11.3333,12,66.5,"Dra"],
   [0,0.3333,66,"Cep"],
   [14,15.6667,66,"UMi"],
   [23.5833,24,66,"Cep"],
   [12,13.5,64,"Dra"],
   [13.5,14.4167,63,"Dra"],
   [23.1667,23.5833,63,"Cep"],
   [6.1,7,62,"Cam"],
   [20,20.4167,61.5,"Dra"],
   [20.5367,20.6,60.9167,"Cep"],
   [7,7.9667,60,"Cam"],
   [7.9667,8.4167,60,"UMa"],
   [19.7667,20,59.5,"Dra"],
   [20,20.5367,59.5,"Cep"],
   [22.8667,23.1667,59.0833,"Cep"],
   [0,2.4333,58.5,"Cas"],
   [19.4167,19.7667,58,"Dra"],
   [1.7,1.9083,57.5,"Cas"],
   [2.4333,3.1,57,"Cas"],
   [3.1,3.1667,57,"Cam"],
   [22.3167,22.8667,56.25,"Cep"],
   [5,6.1,56,"Cam"],
   [14.0333,14.4167,55.5,"UMa"],
   [14.4167,19.4167,55.5,"Dra"],
   [3.1667,3.3333,55,"Cam"],
   [22.1333,22.3167,55,"Cep"],
   [20.6,21.9667,54.8333,"Cep"],
   [0,1.7,54,"Cas"],
   [6.1,6.5,54,"Lyn"],
   [12.0833,13.5,53,"UMa"],
   [15.25,15.75,53,"Dra"],
   [21.9667,22.1333,52.75,"Cep"],
   [3.3333,5,52.5,"Cam"],
   [22.8667,23.3333,52.5,"Cas"],
   [15.75,17,51.5,"Dra"],
   [2.0417,2.5167,50.5,"Per"],
   [17,18.2333,50.5,"Dra"],
   [0,1.3667,50,"Cas"],
   [1.3667,1.6667,50,"Per"],
   [6.5,6.8,50,"Lyn"],
   [23.3333,24,50,"Cas"],
   [13.5,14.0333,48.5,"UMa"],
   [0,1.1167,48,"Cas"],
   [23.5833,24,48,"Cas"],
   [18.175,18.2333,47.5,"Her"],
   [18.2333,19.0833,47.5,"Dra"],
   [19.0833,19.1667,47.5,"Cyg"],
   [1.6667,2.0417,47,"Per"],
   [8.4167,9.1667,47,"UMa"],
   [0.1667,0.8667,46,"Cas"],
   [12,12.0833,45,"UMa"],
   [6.8,7.3667,44.5,"Lyn"],
   [21.9083,21.9667,44,"Cyg"],
   [21.875,21.9083,43.75,"Cyg"],
   [19.1667,19.4,43.5,"Cyg"],
   [9.1667,10.1667,42,"UMa"],
   [10.1667,10.7833,40,"UMa"],
   [15.4333,15.75,40,"Boo"],
   [15.75,16.3333,40,"Her"],
   [9.25,9.5833,39.75,"Lyn"],
   [0,2.5167,36.75,"And"],
   [2.5167,2.5667,36.75,"Per"],
   [19.3583,19.4,36.5,"Lyr"],
   [4.5,4.6917,36,"Per"],
   [21.7333,21.875,36,"Cyg"],
   [21.875,22,36,"Lac"],
   [6.5333,7.3667,35.5,"Aur"],
   [7.3667,7.75,35.5,"Lyn"],
   [0,2,35,"And"],
   [22,22.8167,35,"Lac"],
   [22.8167,22.8667,34.5,"Lac"],
   [22.8667,23.5,34.5,"And"],
   [2.5667,2.7167,34,"Per"],
   [10.7833,11,34,"UMa"],
   [12,12.3333,34,"CVn"],
   [7.75,9.25,33.5,"Lyn"],
   [9.25,9.8833,33.5,"LMi"],
   [0.7167,1.4083,33,"And"],
   [15.1833,15.4333,33,"Boo"],
   [23.5,23.75,32.0833,"And"],
   [12.3333,13.25,32,"CVn"],
   [23.75,24,31.3333,"And"],
   [13.9583,14.0333,30.75,"CVn"],
   [2.4167,2.7167,30.6667,"Tri"],
   [2.7167,4.5,30.6667,"Per"],
   [4.5,4.75,30,"Aur"],
   [18.175,19.3583,30,"Lyr"],
   [11,12,29,"UMa"],
   [19.6667,20.9167,29,"Cyg"],
   [4.75,5.8833,28.5,"Aur"],
   [9.8833,10.5,28.5,"LMi"],
   [13.25,13.9583,28.5,"CVn"],
   [0,0.0667,28,"And"],
   [1.4083,1.6667,28,"Tri"],
   [5.8833,6.5333,28,"Aur"],
   [7.8833,8,28,"Gem"],
   [20.9167,21.7333,28,"Cyg"],
   [19.2583,19.6667,27.5,"Cyg"],
   [1.9167,2.4167,27.25,"Tri"],
   [16.1667,16.3333,27,"CrB"],
   [15.0833,15.1833,26,"Boo"],
   [15.1833,16.1667,26,"CrB"],
   [18.3667,18.8667,26,"Lyr"],
   [10.75,11,25.5,"LMi"],
   [18.8667,19.2583,25.5,"Lyr"],
   [1.6667,1.9167,25,"Tri"],
   [0.7167,0.85,23.75,"Psc"],
   [10.5,10.75,23.5,"LMi"],
   [21.25,21.4167,23.5,"Vul"],
   [5.7,5.8833,22.8333,"Tau"],
   [0.0667,0.1417,22,"And"],
   [15.9167,16.0333,22,"Ser"],
   [5.8833,6.2167,21.5,"Gem"],
   [19.8333,20.25,21.25,"Vul"],
   [18.8667,19.25,21.0833,"Vul"],
   [0.1417,0.85,21,"And"],
   [20.25,20.5667,20.5,"Vul"],
   [7.8083,7.8833,20,"Gem"],
   [20.5667,21.25,19.5,"Vul"],
   [19.25,19.8333,19.1667,"Vul"],
   [3.2833,3.3667,19,"Ari"],
   [18.8667,19,18.5,"Sge"],
   [5.7,5.7667,18,"Ori"],
   [6.2167,6.3083,17.5,"Gem"],
   [19,19.8333,16.1667,"Sge"],
   [4.9667,5.3333,16,"Tau"],
   [15.9167,16.0833,16,"Her"],
   [19.8333,20.25,15.75,"Sge"],
   [4.6167,4.9667,15.5,"Tau"],
   [5.3333,5.6,15.5,"Tau"],
   [12.8333,13.5,15,"Com"],
   [17.25,18.25,14.3333,"Her"],
   [11.8667,12.8333,14,"Com"],
   [7.5,7.8083,13.5,"Gem"],
   [16.75,17.25,12.8333,"Her"],
   [0,0.1417,12.5,"Peg"],
   [5.6,5.7667,12.5,"Tau"],
   [7,7.5,12.5,"Gem"],
   [21.1167,21.3333,12.5,"Peg"],
   [6.3083,6.9333,12,"Gem"],
   [18.25,18.8667,12,"Her"],
   [20.875,21.05,11.8333,"Del"],
   [21.05,21.1167,11.8333,"Peg"],
   [11.5167,11.8667,11,"Leo"],
   [6.2417,6.3083,10,"Ori"],
   [6.9333,7,10,"Gem"],
   [7.8083,7.925,10,"Cnc"],
   [23.8333,24,10,"Peg"],
   [1.6667,3.2833,9.9167,"Ari"],
   [20.1417,20.3,8.5,"Del"],
   [13.5,15.0833,8,"Boo"],
   [22.75,23.8333,7.5,"Peg"],
   [7.925,9.25,7,"Cnc"],
   [9.25,10.75,7,"Leo"],
   [18.25,18.6622,6.25,"Oph"],
   [18.6622,18.8667,6.25,"Aql"],
   [20.8333,20.875,6,"Del"],
   [7,7.0167,5.5,"CMi"],
   [18.25,18.425,4.5,"Ser"],
   [16.0833,16.75,4,"Her"],
   [18.25,18.425,3,"Oph"],
   [21.4667,21.6667,2.75,"Peg"],
   [0,2,2,"Psc"],
   [18.5833,18.8667,2,"Ser"],
   [20.3,20.8333,2,"Del"],
   [20.8333,21.3333,2,"Equ"],
   [21.3333,21.4667,2,"Peg"],
   [22,22.75,2,"Peg"],
   [21.6667,22,1.75,"Peg"],
   [7.0167,7.2,1.5,"CMi"],
   [3.5833,4.6167,0,"Tau"],
   [4.6167,4.6667,0,"Ori"],
   [7.2,8.0833,0,"CMi"],
   [14.6667,15.0833,0,"Vir"],
   [17.8333,18.25,0,"Oph"],
   [2.65,3.2833,-1.75,"Cet"],
   [3.2833,3.5833,-1.75,"Tau"],
   [15.0833,16.2667,-3.25,"Ser"],
   [4.6667,5.0833,-4,"Ori"],
   [5.8333,6.2417,-4,"Ori"],
   [17.8333,17.9667,-4,"Ser"],
   [18.25,18.5833,-4,"Ser"],
   [18.5833,18.8667,-4,"Aql"],
   [22.75,23.8333,-4,"Psc"],
   [10.75,11.5167,-6,"Leo"],
   [11.5167,11.8333,-6,"Vir"],
   [0,0.3333,-7,"Psc"],
   [23.8333,24,-7,"Psc"],
   [14.25,14.6667,-8,"Vir"],
   [15.9167,16.2667,-8,"Oph"],
   [20,20.5333,-9,"Aql"],
   [21.3333,21.8667,-9,"Aqr"],
   [17.1667,17.9667,-10,"Oph"],
   [5.8333,8.0833,-11,"Mon"],
   [4.9167,5.0833,-11,"Eri"],
   [5.0833,5.8333,-11,"Ori"],
   [8.0833,8.3667,-11,"Hya"],
   [9.5833,10.75,-11,"Sex"],
   [11.8333,12.8333,-11,"Vir"],
   [17.5833,17.6667,-11.6667,"Oph"],
   [18.8667,20,-12.0333,"Aql"],
   [4.8333,4.9167,-14.5,"Eri"],
   [20.5333,21.3333,-15,"Aqr"],
   [17.1667,18.25,-16,"Ser"],
   [18.25,18.8667,-16,"Sct"],
   [8.3667,8.5833,-17,"Hya"],
   [16.2667,16.375,-18.25,"Oph"],
   [8.5833,9.0833,-19,"Hya"],
   [10.75,10.8333,-19,"Crt"],
   [16.2667,16.375,-19.25,"Sco"],
   [15.6667,15.9167,-20,"Lib"],
   [12.5833,12.8333,-22,"Crv"],
   [12.8333,14.25,-22,"Vir"],
   [9.0833,9.75,-24,"Hya"],
   [1.6667,2.65,-24.3833,"Cet"],
   [2.65,3.75,-24.3833,"Eri"],
   [10.8333,11.8333,-24.5,"Crt"],
   [11.8333,12.5833,-24.5,"Crv"],
   [14.25,14.9167,-24.5,"Lib"],
   [16.2667,16.75,-24.5833,"Oph"],
   [0,1.6667,-25.5,"Cet"],
   [21.3333,21.8667,-25.5,"Cap"],
   [21.8667,23.8333,-25.5,"Aqr"],
   [23.8333,24,-25.5,"Cet"],
   [9.75,10.25,-26.5,"Hya"],
   [4.7,4.8333,-27.25,"Eri"],
   [4.8333,6.1167,-27.25,"Lep"],
   [20,21.3333,-28,"Cap"],
   [10.25,10.5833,-29.1667,"Hya"],
   [12.5833,14.9167,-29.5,"Hya"],
   [14.9167,15.6667,-29.5,"Lib"],
   [15.6667,16,-29.5,"Sco"],
   [4.5833,4.7,-30,"Eri"],
   [16.75,17.6,-30,"Oph"],
   [17.6,17.8333,-30,"Sgr"],
   [10.5833,10.8333,-31.1667,"Hya"],
   [6.1167,7.3667,-33,"CMa"],
   [12.25,12.5833,-33,"Hya"],
   [10.8333,12.25,-35,"Hya"],
   [3.5,3.75,-36,"For"],
   [8.3667,9.3667,-36.75,"Pyx"],
   [4.2667,4.5833,-37,"Eri"],
   [17.8333,19.1667,-37,"Sgr"],
   [21.3333,23,-37,"PsA"],
   [23,23.3333,-37,"Scl"],
   [3,3.5,-39.5833,"For"],
   [9.3667,11,-39.75,"Ant"],
   [0,1.6667,-40,"Scl"],
   [1.6667,3,-40,"For"],
   [3.8667,4.2667,-40,"Eri"],
   [23.3333,24,-40,"Scl"],
   [14.1667,14.9167,-42,"Cen"],
   [15.6667,16,-42,"Lup"],
   [16,16.4208,-42,"Sco"],
   [4.8333,5,-43,"Cae"],
   [5,6.5833,-43,"Col"],
   [8,8.3667,-43,"Pup"],
   [3.4167,3.8667,-44,"Eri"],
   [16.4208,17.8333,-45.5,"Sco"],
   [17.8333,19.1667,-45.5,"CrA"],
   [19.1667,20.3333,-45.5,"Sgr"],
   [20.3333,21.3333,-45.5,"Mic"],
   [3,3.4167,-46,"Eri"],
   [4.5,4.8333,-46.5,"Cae"],
   [15.3333,15.6667,-48,"Lup"],
   [0,2.3333,-48.1667,"Phe"],
   [2.6667,3,-49,"Eri"],
   [4.0833,4.2667,-49,"Hor"],
   [4.2667,4.5,-49,"Cae"],
   [21.3333,22,-50,"Gru"],
   [6,8,-50.75,"Pup"],
   [8,8.1667,-50.75,"Vel"],
   [2.4167,2.6667,-51,"Eri"],
   [3.8333,4.0833,-51,"Hor"],
   [0,1.8333,-51.5,"Phe"],
   [6,6.1667,-52.5,"Car"],
   [8.1667,8.45,-53,"Vel"],
   [3.5,3.8333,-53.1667,"Hor"],
   [3.8333,4,-53.1667,"Dor"],
   [0,1.5833,-53.5,"Phe"],
   [2.1667,2.4167,-54,"Eri"],
   [4.5,5,-54,"Pic"],
   [15.05,15.3333,-54,"Lup"],
   [8.45,8.8333,-54.5,"Vel"],
   [6.1667,6.5,-55,"Car"],
   [11.8333,12.8333,-55,"Cen"],
   [14.1667,15.05,-55,"Lup"],
   [15.05,15.3333,-55,"Nor"],
   [4,4.3333,-56.5,"Dor"],
   [8.8333,11,-56.5,"Vel"],
   [11,11.25,-56.5,"Cen"],
   [17.5,18,-57,"Ara"],
   [18,20.3333,-57,"Tel"],
   [22,23.3333,-57,"Gru"],
   [3.2,3.5,-57.5,"Hor"],
   [5,5.5,-57.5,"Pic"],
   [6.5,6.8333,-58,"Car"],
   [0,1.3333,-58.5,"Phe"],
   [1.3333,2.1667,-58.5,"Eri"],
   [23.3333,24,-58.5,"Phe"],
   [4.3333,4.5833,-59,"Dor"],
   [15.3333,16.4208,-60,"Nor"],
   [20.3333,21.3333,-60,"Ind"],
   [5.5,6,-61,"Pic"],
   [15.1667,15.3333,-61,"Cir"],
   [16.4208,16.5833,-61,"Ara"],
   [14.9167,15.1667,-63.5833,"Cir"],
   [16.5833,16.75,-63.5833,"Ara"],
   [6,6.8333,-64,"Pic"],
   [6.8333,9.0333,-64,"Car"],
   [11.25,11.8333,-64,"Cen"],
   [11.8333,12.8333,-64,"Cru"],
   [12.8333,14.5333,-64,"Cen"],
   [13.5,13.6667,-65,"Cir"],
   [16.75,16.8333,-65,"Ara"],
   [2.1667,3.2,-67.5,"Hor"],
   [3.2,4.5833,-67.5,"Ret"],
   [14.75,14.9167,-67.5,"Cir"],
   [16.8333,17.5,-67.5,"Ara"],
   [17.5,18,-67.5,"Pav"],
   [22,23.3333,-67.5,"Tuc"],
   [4.5833,6.5833,-70,"Dor"],
   [13.6667,14.75,-70,"Cir"],
   [14.75,17,-70,"TrA"],
   [0,1.3333,-75,"Tuc"],
   [3.5,4.5833,-75,"Hyi"],
   [6.5833,9.0333,-75,"Vol"],
   [9.0333,11.25,-75,"Car"],
   [11.25,13.6667,-75,"Mus"],
   [18,21.3333,-75,"Pav"],
   [21.3333,23.3333,-75,"Ind"],
   [23.3333,24,-75,"Tuc"],
   [0.75,1.3333,-76,"Tuc"],
   [0,3.5,-82.5,"Hyi"],
   [7.6667,13.6667,-82.5,"Cha"],
   [13.6667,18,-82.5,"Aps"],
   [3.5,7.6667,-85,"Men"],
   [0,24,-90,"Oct"]
];

/* Astro Bucket List 0.47.1 — portable data model and astronomy functions.
 * Copyright (c) 2026 Thorsten Glebe. SPDX-License-Identifier: MIT
 * This section has no GUI or filesystem dependencies; shared by PJSR V8 and tests.
 */
var ABL = (function () {
   'use strict';
   const VERSION = '0.47.1', EXT = '_astroBucketList';
   const MONTHS = ['Unassigned','January','February','March','April','May','June',
      'July','August','September','October','November','December'];
   const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
   const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
   const copy = x => JSON.parse(JSON.stringify(x));
   const text = x => x === undefined || x === null ? '' : String(x);
   const uuid = () => '{xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx}'.replace(/[xy]/g,c=>{
      let r=Math.floor(Math.random()*16);return (c==='x'?r:(r&3)|8).toString(16);});
   const today = () => {let d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
   const stamp = () => new Date().toISOString().slice(0,19).replace('T',' ');
   const norm = s => text(s).trim().replace(/\s+marker$/i,'').replace(/\s+/g,'').toUpperCase()
      .replace(/^SH2-/,'SH2-').replace(/^(PN|SNR)G0+(?=\d)/,'$1G').replace(/([+-])0+(?=\d)/g,'$1');
   const html = s => text(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

   // Return decimal degrees, or null for missing/invalid input. Numeric input
   // is degrees; sexagesimal RA without a degree suffix is hours. Stored SOL
   // fields may retain their original strings; geometry uses position().
   function coordinate(value,ra) {
      if(typeof value==='number') {
         if(!Number.isFinite(value)||(!ra&&Math.abs(value)>90))return null;
         return ra?(value%360+360)%360:value;
      }
      let s=text(value).trim().replace(/−/g,'-');
      if(!s)return null;
      if(!ra&&/h/i.test(s))return null;
      if(/^[+-]?\d+(?:\.\d*)?$/.test(s))return coordinate(Number(s),ra);
      s=s.replace(/[°º]/g,'d').replace(/[′’']/g,'m').replace(/[″”"]/g,'s');
      const hours=ra&&!/d/i.test(s),limit=ra?(hours?24:360):90;
      let m=s.match(/^([+-]?)(\d+(?:\.\d*)?)(?:[hd:]|\s+)\s*(\d+(?:\.\d*)?)(?:[m:]|\s+)\s*(\d+(?:\.\d*)?)s?$/i);
      if(!m)return null;
      let a=Number(m[2]),b=Number(m[3]),c=Number(m[4]);
      if(b>=60||c>=60||a>limit||a===limit&&(b!==0||c!==0)||hours&&m[1]==='-')return null;
      let n=(a+b/60+c/3600)*(m[1]==='-'?-1:1)*(hours?15:1);
      return coordinate(n,ra);
   }
   function formatRA(n,precision=2) {
      if(!Number.isFinite(n))return '';
      let scale=Math.pow(10,precision),t=Math.round(((n%360+360)%360)*240*scale)%(86400*scale);
      let h=Math.floor(t/(3600*scale)),m=Math.floor(t%(3600*scale)/(60*scale)),s=t%(60*scale)/scale;
      return String(h).padStart(2,'0')+'h'+String(m).padStart(2,'0')+'m'+s.toFixed(precision).padStart(precision?precision+3:2,'0')+'s';
   }
   function formatDec(n,precision=1) {
      if(!Number.isFinite(n)||Math.abs(n)>90)return '';
      let scale=Math.pow(10,precision),t=Math.round(Math.abs(n)*3600*scale),d=Math.floor(t/(3600*scale)),m=Math.floor(t%(3600*scale)/(60*scale)),s=t%(60*scale)/scale;
      return (n<0?'-':'+')+String(d).padStart(2,'0')+'d'+String(m).padStart(2,'0')+'m'+s.toFixed(precision).padStart(precision?precision+3:2,'0')+'s';
   }
   function position(o) {return {ra:coordinate(o.ra,true),dec:coordinate(o.dec,false)};}
   function precess1875(ra,dec) {
      // IAU 1976 mean-equatorial precession J2000 -> B1875, for Roman's table.
      const t=(2405889.258550475-2451545)/36525,rad=Math.PI/180,as=rad/3600;
      const zeta=(2306.2181*t+.30188*t*t+.017998*t*t*t)*as;
      const z=(2306.2181*t+1.09468*t*t+.018203*t*t*t)*as;
      const theta=(2004.3109*t-.42665*t*t-.041833*t*t*t)*as;
      const a=ra*rad+zeta,d=dec*rad;
      const A=Math.cos(d)*Math.sin(a),B=Math.cos(theta)*Math.cos(d)*Math.cos(a)-Math.sin(theta)*Math.sin(d);
      const C=Math.sin(theta)*Math.cos(d)*Math.cos(a)+Math.cos(theta)*Math.sin(d);
      return {ra:((Math.atan2(A,B)+z)/rad+360)%360,dec:Math.asin(Math.max(-1,Math.min(1,C)))/rad};
   }
   // Roman's boundaries are expressed at B1875, so precess before the lookup.
   // Planning months are a separate user mapping, not a visibility calculation.
   function constellation(ra,dec) {
      if(!Number.isFinite(ra)||!Number.isFinite(dec)||Math.abs(dec)>90)return '';
      let p=precess1875(ra,dec),h=p.ra/15;
      for(let b of ABL_BOUNDARIES)if(h>=b[0]&&h<b[1]&&p.dec>=b[2])return b[3];
      return '';
   }
   function normalizeConstellation(s) {
      s=text(s).trim();
      // Recognize decomposed accents, plain ASCII and the formerly misencoded
      // label explicitly: host string extensions can differ from ECMAScript
      // Unicode normalization. Displays always use the canonical name above.
      if(/^bo(?:o\u0308?|\u00c3\u00b6)tes$/i.test(s))return 'Boo';
      return Object.keys(ABL_CONSTELLATIONS).find(k=>k.toLowerCase()===s.toLowerCase()||ABL_CONSTELLATIONS[k].toLowerCase()===s.toLowerCase())||'';
   }
   function monthKey(code,ra) {return code==='Ser'?(Number.isFinite(ra)&&ra>=255?'SerCau':'SerCap'):code;}
   function meta(o) {if(!plain(o[EXT]))o[EXT]={};return o[EXT];}
   // Collection metadata owns the object inventory and planning-month map.
   // Object metadata uses the same extension key on each individual target.
   function config(doc) {
      if(!plain(doc[EXT]))doc[EXT]={};
      let c=doc[EXT];c.schemaVersion=2;
      if(!plain(c.constellationMonths))c.constellationMonths=copy(ABL_DEFAULT_MONTHS);
      if(!own(c,'objects'))c.objects=[];
      if(typeof c.unlistedListId!=='string'||!c.unlistedListId)c.unlistedListId=uuid();
      return c;
   }
   // Return one reference per membership, plus one with listId='' for each
   // ungrouped target. Callers needing unique targets should use records().
   function refs(doc) {
      let result=[],listed=new Set;
      for(let id of Object.keys(doc.observingLists))for(let object of doc.observingLists[id].objects){result.push({listId:id,object});listed.add(meta(object).objectId);}
      for(let object of doc[EXT]?.objects||[])if(!listed.has(meta(object).objectId))result.push({listId:'',object});
      return result;
   }
   // Stellarium uses designation as both a label and a lookup key. Preserve
   // our catalog identity separately when the user chooses a different label.
   function catalogIdentifier(o) {
      return text(meta(o).catalogIdentifier||o.designation).trim().replace(/\s+marker$/i,'');
   }
   function setStellariumLabel(o,identifier,label) {
      let m=meta(o);identifier=text(identifier).trim().replace(/\s+marker$/i,'');label=text(label).trim()||identifier;
      o.designation=label;
      if(identifier&&norm(identifier)!==norm(label))m.catalogIdentifier=identifier;else delete m.catalogIdentifier;
      let marker=/marker/i.test(label);
      o.type=marker?'CustomObject':m.catalogClass||(o.type&&o.type!=='CustomObject'?o.type:'Nebula');o.isVisibleMarker=marker;
      return o;
   }
   function identifiers(o) {
      let m=meta(o),ids=[catalogIdentifier(o),m.catalogMainId].concat(Array.isArray(m.aliases)?m.aliases:[]);
      return ids.filter(x=>typeof x==='string'&&x.trim()).map(norm);
   }
   function same(a,b) {
      let am=meta(a),bm=meta(b);
      if(am.objectId&&bm.objectId&&am.objectId===bm.objectId)return true;
      let aa=identifiers(a),bb=identifiers(b);
      const primaryA=norm(catalogIdentifier(a)),primaryB=norm(catalogIdentifier(b));
      if(primaryA&&primaryA===primaryB)return true;
      // Arp, HCG and other group identifiers can be shared by distinct members.
      // Require one primary identifier, not just two intersecting alias lists.
      if((primaryA&&bb.indexOf(primaryA)>=0)||(primaryB&&aa.indexOf(primaryB)>=0)){
         let p=position(a),q=position(b);
         if(p.ra===null||p.dec===null||q.ra===null||q.dec===null)return true;
         let dr=Math.abs((p.ra-q.ra+540)%360-180)*Math.cos(p.dec*Math.PI/180);
         if(Math.hypot(dr,p.dec-q.dec)<1/60)return true;
      }
      // Catalogs can assign the same nominal center to distinct dark clouds.
      // Coordinates alone must not merge two differently named targets.
      if(aa.length||bb.length)return false;
      if(a.type==='CustomObject'||b.type==='CustomObject'||(a.type==='Star')!==(b.type==='Star'))return false;
      let p=position(a),q=position(b);
      if(p.ra===null||p.dec===null||q.ra===null||q.dec===null)return false;
      let dr=Math.abs((p.ra-q.ra+540)%360-180)*Math.cos(p.dec*Math.PI/180);
      return Math.hypot(dr,p.dec-q.dec)<1/3600;
   }
   // Narrow identity comparisons to plausible matches. same() still decides
   // whether a shared catalog name denotes one object or different group members.
   function objectMatchIndex() {
      const buckets=new Map;
      function keys(o) {
         const ids=identifiers(o),keys=ids.map(id=>'id:'+id);
         if(!ids.length)keys.push('unnamed'); // same() can match these by position alone.
         if(meta(o).objectId)keys.push('uuid:'+meta(o).objectId);
         return keys;
      }
      return {
         add(o,entry) {
            for(const key of keys(o)){
               if(!buckets.has(key))buckets.set(key,new Set);
               buckets.get(key).add(entry);
            }
         },
         candidates(o) {
            const found=new Set;
            for(const key of keys(o))for(const entry of buckets.get(key)||[])found.add(entry);
            return found;
         }
      };
   }
   function linkObjects(doc) {
      const inventory=config(doc),registry=[],canonical=new Map,index=objectMatchIndex();
      // Rebuild shared in-memory objects after parsing or JSON copying. Visit
      // the inventory first so its values take priority over list copies.
      // List-only imports also populate the inventory here. List memberships
      // then reference the canonical objects; JSON serialization duplicates
      // their data because Stellarium requires inline objects in each list.
      for(let o of inventory.objects.concat(Object.values(doc.observingLists).flatMap(l=>l.objects))){
         // Multiple aliases can match. Keep the earliest inventory entry,
         // independently of the order in which the index finds candidates.
         let first=registry.length;
         for(const i of index.candidates(o))if(i<first&&same(registry[i],o))first=i;
         if(first===registry.length){
            let m=meta(o);if(typeof m.objectId!=='string'||!m.objectId)m.objectId=uuid();
            registry.push(o);index.add(o,first);
         }else{
            const match=registry[first];
            if(match!==o&&JSON.stringify(match)!==JSON.stringify(o)){
               Object.assign(match,mergeObjectData(match,o));
               index.add(match,first); // Later copies can use aliases learned by this merge.
            }
         }
         canonical.set(o,registry[first]);
      }
      inventory.objects=registry;
      for(let list of Object.values(doc.observingLists))list.objects=list.objects.map(o=>canonical.get(o));
   }
   function newDocument() {let d={defaultListOlud:'',observingLists:{},shortName:'Observing list for Stellarium',version:'2.1'};config(d);return d;}
   // Validate an independent copy without reconciling object metadata. Single-
   // list imports must choose their scope before copies from other lists can
   // contribute values. File I/O also enforces the serialized-text size limit.
   function validateDocument(raw) {
      if(!plain(raw)||!plain(raw.observingLists))throw Error('This file does not contain Stellarium observingLists.');
      let doc=copy(raw),ids=Object.keys(doc.observingLists);
      if(ids.length>1001)throw Error('This file contains too many lists (limit 1,000 logical lists).');
      const inventory=config(doc);
      if(!Array.isArray(inventory.objects)||inventory.objects.length>100000)throw Error('Invalid collection object inventory (limit 100,000 objects).');
      const validateEntry=(o,label)=>{
         if(!plain(o))throw Error('An invalid object occurs in '+label+'.');
         if(!text(o.designation).trim()&&!text(o.name).trim()&&position(o).ra===null)throw Error('An object has neither a name nor coordinates in '+label+'.');
         let m=meta(o);m.imaged=m.imaged===true;m.imagedOn=text(m.imagedOn);
      };
      for(let o of inventory.objects)validateEntry(o,'the collection');
      for(let id of ids){let list=doc.observingLists[id];
         if(!plain(list)||!Array.isArray(list.objects))throw Error('Invalid object array in list '+id+'.');
         if(list.objects.length>100000)throw Error('A list exceeds the 100,000-object limit.');
         if(typeof list.name!=='string')list.name='Imported list';
         for(let o of list.objects)validateEntry(o,list.name);
         // Absorb the marked export view into the inventory, then remove the
         // view. Its marker, rather than its name, distinguishes it from a
         // user-created list named "Objects without a list".
         if(list[EXT]?.collectionView===true){for(let o of list.objects)inventory.objects.push(o);delete doc.observingLists[id];if(doc.defaultListOlud===id)doc.defaultListOlud='';}
      }
      if(Object.keys(doc.observingLists).length>1000)throw Error('This file contains too many lists (limit 1,000).');
      if(typeof doc.shortName!=='string')doc.shortName='Observing list for Stellarium';
      if(typeof doc.version!=='string')doc.version='2.1';
      return doc;
   }
   // Opening or merging a full collection still restores its shared inventory.
   function normalizeDocument(raw) {
      let doc=validateDocument(raw);
      linkObjects(doc);if(config(doc).objects.length>100000)throw Error('The collection exceeds the 100,000-object limit.');return doc;
   }
   function parseDocument(s) {return normalizeDocument(JSON.parse(text(s).replace(/^\uFEFF/,'')));}
   function parseListImport(s) {return validateDocument(JSON.parse(text(s).replace(/^\uFEFF/,'')));}
   function addList(doc,name) {
      name=text(name).trim();if(!name)throw Error('Enter a list name.');
      let id=uuid();doc.observingLists[id]={name,description:'','creation date':stamp(),'last edit':stamp(),objects:[],sorting:''};return id;
   }
   // Capture every member in the inventory before removing its grouping,
   // including when the caller supplies an ordinary list-only SOL document.
   function deleteList(doc,id){
      if(!own(doc.observingLists,id))return false;
      linkObjects(doc);delete doc.observingLists[id];
      if(doc.defaultListOlud===id)doc.defaultListOlud='';return true;
   }
   // Removing the final membership still leaves the target in the inventory.
   function removeFromList(doc,listId,id){
      let list=doc.observingLists[listId];if(!list)return false;
      linkObjects(doc);let count=list.objects.length;
      list.objects=list.objects.filter(o=>meta(o).objectId!==id);
      if(count===list.objects.length)return false;list['last edit']=stamp();return true;
   }
   // Delete the target from both the inventory and every list membership.
   // Unlike membership removal, this discards object data. The UI must obtain
   // confirmation before calling this operation on the live collection.
   function deleteObject(doc,id){
      linkObjects(doc);let inventory=config(doc),count=inventory.objects.length;
      inventory.objects=inventory.objects.filter(o=>meta(o).objectId!==id);
      if(count===inventory.objects.length)return false;
      for(let list of Object.values(doc.observingLists)){let before=list.objects.length;list.objects=list.objects.filter(o=>meta(o).objectId!==id);if(before!==list.objects.length)list['last edit']=stamp();}
      return true;
   }
   // Work on a copy so validation, new-list creation and removals are atomic.
   // Memberships share stable target IDs; retain complete object metadata.
   function transferObjects(doc,ids,options={}) {
      let mode=options.mode,sourceId=options.sourceId||'',wanted=Array.from(new Set(ids));
      if(!['add','move'].includes(mode))throw Error('Choose Add or Move.');
      if(!wanted.length)throw Error('Select one or more rows first.');
      let next=copy(doc);linkObjects(next);let lists=next.observingLists;
      if(sourceId&&!own(lists,sourceId))throw Error('The source list is no longer available.');
      if(mode==='move'&&!sourceId)throw Error('Select a named source list before moving objects.');
      let pool=sourceId?lists[sourceId].objects:refs(next).map(r=>r.object);
      let selected=wanted.map(id=>pool.find(o=>meta(o).objectId===id));
      if(selected.some(o=>!o))throw Error('Some selected objects are no longer in the source list.');
      let destinationId=options.destinationId||'',created=own(options,'newListName');
      if(created){
         if(destinationId)throw Error('Choose an existing destination or create a new list.');
         let name=text(options.newListName).trim();if(!name)throw Error('Enter a new list name.');
         if(Object.keys(lists).some(id=>text(lists[id].name).trim().toLowerCase()===name.toLowerCase()))throw Error('A list with this name already exists. Select it as the destination.');
         if(Object.keys(lists).length>=1000)throw Error('The collection already contains the maximum of 1,000 lists.');
         destinationId=addList(next,name);
      }else if(!destinationId||!own(lists,destinationId))throw Error('Choose a destination list.');
      if(destinationId===sourceId)throw Error('Choose a destination different from the source list.');
      let destination=lists[destinationId],added=0,alreadyPresent=0;
      for(let o of selected){
         if(destination.objects.some(existing=>same(existing,o))){++alreadyPresent;continue;}
         if(destination.objects.length>=100000)throw Error('The destination exceeds the 100,000-object limit.');
         destination.objects.push(o);++added;
      }
      let moved=mode==='move'?wanted.length:0;
      if(moved){let selectedIds=new Set(wanted);lists[sourceId].objects=lists[sourceId].objects.filter(o=>!selectedIds.has(meta(o).objectId));lists[sourceId]['last edit']=stamp();}
      if(added)destination['last edit']=stamp();
      return {doc:next,destinationId,added,alreadyPresent,moved,created,changed:created||added>0||moved>0};
   }
   // Keep current scalar values, fill missing values, and union
   // extension arrays. Define properties explicitly so imported prototype-like
   // keys remain data rather than changing the prototype of a destination.
   function mergeMissing(current,incoming) {
      const absent=v=>v===undefined||v===null||typeof v==='string'&&!v.trim();
      if(absent(current))return incoming===undefined?current:copy(incoming);
      if(plain(current)&&plain(incoming)){
         let result=copy(current);
         for(let key of Object.keys(incoming)){
            let value=own(result,key)?mergeMissing(result[key],incoming[key]):copy(incoming[key]);
            Object.defineProperty(result,key,{value,enumerable:true,writable:true,configurable:true});
         }
         return result;
      }
      if(Array.isArray(current)&&Array.isArray(incoming)){
         let result=copy(current),seen=new Set(result.map(v=>JSON.stringify(v)));
         for(let value of incoming)if(!seen.has(JSON.stringify(value))){seen.add(JSON.stringify(value));result.push(copy(value));}
         return result;
      }
      return copy(current);
   }
   function mergeText(current,incoming,filters=false) {
      let original=text(current).trim(),parts=original.split(filters?/[;\r\n]+/:/\r?\n/),seen=new Set;
      const key=s=>s.trim().replace(/\s+/g,' ').toLowerCase();
      for(let part of parts)if(key(part))seen.add(key(part));
      let added=[];
      for(let part of text(incoming).split(filters?/[;\r\n]+/:/\r?\n/))if(key(part)&&!seen.has(key(part))){seen.add(key(part));added.push(part.trim());}
      return original+(original&&added.length?(filters?'; ':'\n'):'')+added.join(filters?'; ':'\n');
   }
   // Reconcile the shared object, not just the member of the destination list.
   // Text and aliases accumulate; coordinates, type, dates and explicit manual
   // choices retain the current value when both copies provide one.
   function mergeObjectData(current,incoming) {
      let a=copy(current),b=copy(incoming);consolidateObjectInformation(a);consolidateObjectInformation(b);
      let am=meta(a),bm=meta(b),result=mergeMissing(a,b),m=meta(result);
      if(text(a.designation).trim()&&(own(am,'catalogIdentifier')||own(bm,'catalogIdentifier')))m.catalogIdentifier=catalogIdentifier(a);
      m.objectId=am.objectId||bm.objectId||uuid();
      for(let [field,isRA] of [['ra',true],['dec',false]])if(coordinate(a[field],isRA)===null&&coordinate(b[field],isRA)!==null)result[field]=copy(b[field]);
      const unspecified=v=>!text(v).trim()||/^(?:unknown|unspecified|custom\s*object|catalog object\s*\(\?\))$/i.test(text(v).trim());
      if(unspecified(a.objtype)&&!unspecified(b.objtype))result.objtype=b.objtype;
      let name=text(am.displayName||a.name||a.nameI18n||bm.displayName||b.name||b.nameI18n).trim();
      if(name){result.name=a.name||name;result.nameI18n=a.nameI18n||name;if(own(am,'displayName')||own(bm,'displayName'))m.displayName=name;}
      if(own(am,'notes')||own(bm,'notes'))m.notes=mergeText(cleanNotes(am.notes),cleanNotes(bm.notes));
      if(own(am,'filters')||own(bm,'filters'))m.filters=mergeText(am.filters,bm.filters,true);
      setCatalogInformation(result,mergeObjectInformation(a,b));
      let aliases=[],seen=new Set;
      for(let id of [].concat(am.aliases||[],bm.aliases||[],catalogIdentifier(a),catalogIdentifier(b),am.catalogMainId||[],bm.catalogMainId||[])){
         if(typeof id==='string'&&norm(id)&&norm(id)!==norm(catalogIdentifier(result))&&!seen.has(norm(id))){seen.add(norm(id));aliases.push(id.trim());}
      }
      if(aliases.length||own(am,'aliases')||own(bm,'aliases'))m.aliases=aliases;
      m.imaged=am.imaged===true||bm.imaged===true;
      m.imagedOn=m.imaged?(am.imaged&&text(am.imagedOn).trim()?am.imagedOn:bm.imaged?text(bm.imagedOn):''):'';
      // Sizes and classifications are atomic values: never combine a major
      // axis from one measurement with an incompatible minor axis from another.
      if(own(am,'angularSize'))m.angularSize=copy(am.angularSize);
      else if(validSize(catalogSize(a)))delete m.angularSize;
      if(validSize(catalogSize(a)))m.catalogAngularSize=copy(catalogSize(a));
      else if(validSize(bm.catalogAngularSize))m.catalogAngularSize=copy(bm.catalogAngularSize);
      if(plain(am.targetBand)&&am.targetBand.mode==='manual')m.targetBand=copy(am.targetBand);
      else if(plain(bm.targetBand)&&bm.targetBand.mode==='manual')m.targetBand=copy(bm.targetBand);
      else if(own(am,'targetBand')||own(bm,'targetBand')){m.targetBand={mode:'auto'};m.targetBand.value=targetBand(result).value;}
      return result;
   }
   // Build a copy only after every file validates. A registry indexed by
   // catalog identifiers avoids scanning every object for every membership.
   // Redirects reconcile alias bridges without leaving two canonical objects.
   function importDocuments(doc,raws) {
      const incoming=raws.map(x=>typeof x==='string'?parseDocument(x):normalizeDocument(x));
      let next=normalizeDocument(doc),registry=[],index=objectMatchIndex(),listMembers=new Map,addedLists=0,merged=new Set;
      const root=entry=>{while(entry.parent)entry=entry.parent;return entry;};
      function register(object,existing){
         let candidates=new Set(Array.from(index.candidates(object),root));
         let matches=Array.from(candidates).filter(entry=>same(entry.object,object)).sort((a,b)=>a.order-b.order),entry=matches[0];
         if(!entry){entry={object:mergeObjectData(object,{}),existing,previousLists:new Set,ids:new Set,order:registry.length};registry.push(entry);}
         else{
            for(let other of matches.slice(1)){
               entry.object=mergeObjectData(entry.object,other.object);other.parent=entry;entry.existing=entry.existing||other.existing;
               for(let id of other.ids)entry.ids.add(id);for(let id of other.previousLists)entry.previousLists.add(id);
            }
            entry.object=mergeObjectData(entry.object,object);
            if(!existing&&entry.existing)merged.add(entry);
         }
         entry.ids.add(meta(object).objectId);index.add(entry.object,entry);return entry;
      }
      for(let object of config(next).objects)register(object,true);
      for(let id of Object.keys(next.observingLists)){
         let members=[];for(let object of next.observingLists[id].objects){let entry=register(object,true);entry.previousLists.add(id);members.push(entry);}
         listMembers.set(id,members);
      }
      for(let source of incoming){
         for(let key of Object.keys(source))if(key!=='observingLists'){
            let incomingValue=source[key];if(key===EXT){incomingValue=copy(incomingValue);delete incomingValue.objects;delete incomingValue.unlistedListId;}
            let value=own(next,key)?mergeMissing(next[key],incomingValue):copy(incomingValue);
            Object.defineProperty(next,key,{value,enumerable:true,writable:true,configurable:true});
         }
         for(let object of config(source).objects)register(object,false);
         for(let id of Object.keys(source.observingLists)){
            let list=source.observingLists[id];
            if(!own(next.observingLists,id)){
               let fresh=copy(list);fresh.objects=[];
               Object.defineProperty(next.observingLists,id,{value:fresh,enumerable:true,writable:true,configurable:true});listMembers.set(id,[]);++addedLists;
            }else{
               let old=next.observingLists[id],mergedList=mergeMissing(old,Object.assign({},list,{objects:[]}));
               mergedList.description=mergeText(old.description,list.description);next.observingLists[id]=mergedList;
            }
            for(let object of list.objects)listMembers.get(id).push(register(object,false));
         }
      }
      if(Object.keys(next.observingLists).length>1000)throw Error('The merged collection would exceed 1,000 lists.');
      let duplicatesRemoved=0,addedMemberships=0;
      for(let [id,members] of listMembers){
         let seen=new Set,objects=[];
         for(let entry of members){entry=root(entry);if(seen.has(entry)){++duplicatesRemoved;continue;}seen.add(entry);objects.push(entry.object);if(!entry.previousLists.has(id))++addedMemberships;}
         if(objects.length>100000)throw Error('A merged list would exceed 100,000 objects.');
         next.observingLists[id].objects=objects;next.observingLists[id]['last edit']=stamp();
      }
      let roots=registry.filter(entry=>!entry.parent),idMap=Object.create(null);
      if(roots.length>100000)throw Error('The merged collection would exceed 100,000 objects.');
      config(next).objects=roots.map(entry=>entry.object);
      for(let entry of registry)for(let id of entry.ids)idMap[id]=meta(root(entry).object).objectId;
      cleanDocumentNotes(next);
      return {doc:next,addedLists,addedObjects:roots.filter(entry=>!entry.existing).length,addedMemberships,
         mergedObjects:new Set(Array.from(merged).map(root)).size,duplicatesRemoved,idMap};
   }

   // Reconcile only entries within one selected source scope. Inline list data
   // must not inherit fields from another list or the source inventory. For an
   // ungrouped import, compare identities to exclude listed inventory objects
   // without first merging those objects' metadata with the other lists.
   function importListObjects(doc,listId) {
      let objects;
      if(listId!==undefined)objects=doc.observingLists[listId].objects;
      else{
         let listed=Object.values(doc.observingLists).flatMap(l=>l.objects);
         objects=config(doc).objects.filter(o=>!listed.some(other=>same(o,other)));
      }
      let isolated=newDocument();config(isolated).objects=objects;
      return config(normalizeDocument(isolated)).objects;
   }
   // Count each list independently: preparing the selector must not merge data
   // across lists. Keep IDs distinct even when two lists share a display name.
   function importListChoices(doc) {
      let choices=Object.keys(doc.observingLists).map(id=>({sourceListId:id,name:doc.observingLists[id].name,count:importListObjects(doc,id).length}));
      let unlisted=importListObjects(doc);
      if(unlisted.length)choices.push({sourceUnlisted:true,name:'Objects without a list',count:unlisted.length});
      return choices;
   }
   // Validate the destination without creating a list or changing collection
   // data. The dialog and model share this validation so rejected names remain
   // editable and programmatic imports enforce the same requirements.
   function importListDestination(doc,options={}) {
      let created=own(options,'newListName'),id=options.destinationId||'',name='';
      if(created){
         if(id)throw Error('Choose an existing destination or create a new list.');
         name=text(options.newListName).trim();if(!name)throw Error('Enter a new list name.');
         if(Object.values(doc.observingLists).some(l=>text(l.name).trim().toLowerCase()===name.toLowerCase()))throw Error('A list with this name already exists. Select it as the destination or enter a different name.');
         if(Object.keys(doc.observingLists).length>=1000)throw Error('The collection already contains the maximum of 1,000 lists.');
      }else{
         if(!id||!own(doc.observingLists,id))throw Error('Choose a destination list.');
         name=doc.observingLists[id].name;
      }
      return {id,name,created};
   }
   // Import only the chosen source membership into one destination. Build a
   // minimal import document so other source lists, unselected inventory and
   // source collection settings cannot enter the current collection. Delegate
   // object reconciliation to the same merge used by ordinary list imports.
   function importObjectsAsList(doc,raw,options={}) {
      let source=typeof raw==='string'?parseListImport(raw):validateDocument(raw),choices=importListChoices(source),choice;
      if(options.sourceUnlisted===true&&own(options,'sourceListId'))throw Error('Choose one list from the import file.');
      if(options.sourceUnlisted===true)choice=choices.find(c=>c.sourceUnlisted);
      else if(own(options,'sourceListId'))choice=choices.find(c=>own(c,'sourceListId')&&c.sourceListId===options.sourceListId);
      else if(choices.length===1)choice=choices[0];
      if(!choice)throw Error(choices.length?'Choose a list from the import file.':'This file contains no lists or objects to import.');
      let destination=importListDestination(doc,options),id=destination.id;
      if(destination.created)do{id=uuid();}while(own(doc.observingLists,id));
      let objects=importListObjects(source,choice.sourceUnlisted?undefined:choice.sourceListId);
      let prepared=newDocument();config(prepared).constellationMonths={};config(prepared).objects=objects.slice();
      Object.defineProperty(prepared.observingLists,id,{enumerable:true,writable:true,configurable:true,value:{name:destination.name,description:'','creation date':stamp(),'last edit':stamp(),objects:objects.slice(),sorting:''}});
      let result=importDocuments(doc,[prepared]),ids=Array.from(new Set(objects.map(o=>result.idMap[meta(o).objectId]||meta(o).objectId)));
      return Object.assign(result,{destinationId:id,destinationName:destination.name,sourceName:choice.name,objectIds:ids,importedCount:ids.length,destinationCount:records(result.doc,id).length});
   }

   // Build a separate SOL document. Omitted/null ids exports the collection;
   // an array selects named lists and must also restrict the saved inventory,
   // otherwise a partial export would include unrelated collection objects.
   function exportDocument(doc,ids) {
      let d=copy(doc);linkObjects(d);
      if(ids){
         for(let id of Object.keys(d.observingLists))if(ids.indexOf(id)<0)delete d.observingLists[id];
         if(!Object.keys(d.observingLists).length)throw Error('Select at least one list to export.');
         let wanted=new Set(Object.values(d.observingLists).flatMap(l=>l.objects.map(o=>meta(o).objectId)));
         config(d).objects=config(d).objects.filter(o=>wanted.has(meta(o).objectId));
      }
      if(!own(d.observingLists,d.defaultListOlud))d.defaultListOlud='';
      cleanDocumentNotes(d);consolidateDocumentInformation(d);
      // Persist a classification snapshot on the export copy. Automatic
      // values are recalculated from metadata; viewing never dirties a list.
      for(let r of refs(d)){let c=targetBand(r.object);meta(r.object).targetBand={mode:c.mode,value:c.value};}
      let unlisted=refs(d).filter(r=>!r.listId).map(r=>r.object);
      // Expose ungrouped targets to Stellarium through a marked observing list.
      // normalizeDocument() restores them as ungrouped objects when reopened.
      // An empty collection still needs one observing list for SOL export.
      if(!ids&&(unlisted.length||!Object.keys(d.observingLists).length)){
         let id=config(d).unlistedListId;while(own(d.observingLists,id))id=uuid();config(d).unlistedListId=id;
         d.observingLists[id]={name:'Objects without a list',description:'Collection objects without a logical list membership.',objects:unlisted,sorting:'',[EXT]:{collectionView:true}};
         if(!d.defaultListOlud)d.defaultListOlud=id;
      }
      return d;
   }
   // Export the supplied IDs once each in a new Stellarium list, including
   // ungrouped targets. The UI resolves checks versus highlighted rows before
   // calling this function; neither selection state is persisted here.
   function exportObjects(doc,ids) {
      let d=copy(doc);linkObjects(d);let wanted=new Set(ids),seen=new Set,objects=[];
      for(let r of refs(d)){let id=meta(r.object).objectId;if(wanted.has(id)&&!seen.has(id)){seen.add(id);objects.push(r.object);}}
      if(!objects.length)throw Error('Check at least one object to export.');
      d.observingLists={};config(d).objects=objects;let id=addList(d,'Selected objects');d.observingLists[id].objects=objects;d.defaultListOlud=id;return exportDocument(d);
   }
   // Apply an object-metadata patch, including notes or imaging state, through
   // the collection references. Ungrouped targets are updated too; timestamps
   // change only on lists that contain the target.
   function setState(doc,id,patch) {
      let count=0;
      for(let r of refs(doc))if(meta(r.object).objectId===id){
         for(let k of Object.keys(patch))meta(r.object)[k]=k==='notes'?cleanNotes(patch[k]):copy(patch[k]);
         r.listId&& (doc.observingLists[r.listId]['last edit']=stamp());++count;
      }
      return count;
   }
   // Keep the matching entry and its memberships with the validation error.
   // The UI can explain an alias match and navigate to it without adding,
   // merging, or overwriting any object data.
   function duplicateMatches(doc,object) {
      let matches=[];
      for(let r of refs(doc))if(same(r.object,object)){
         let id=meta(r.object).objectId,match=matches.find(m=>id?m.id===id:m.object===r.object);
         if(!match){
            let incoming=identifiers(object),stored=identifiers(r.object);
            match={id,object:r.object,listIds:[],listNames:[],identifier:stored.find(v=>incoming.includes(v))||''};matches.push(match);
         }
         if(r.listId&&!match.listIds.includes(r.listId)){match.listIds.push(r.listId);match.listNames.push(text(doc.observingLists[r.listId].name));}
      }
      return matches;
   }
   function validateNewObject(doc,listId,object) {
      let matches=duplicateMatches(doc,object);
      if(matches.length){
         let names=Array.from(new Set(matches.reduce((a,m)=>a.concat(m.listNames),[])));
         let entries=matches.map(m=>objectHeading(catalogIdentifier(m.object),meta(m.object).displayName||m.object.name));
         let error=Error('This object is already in the collection'+(names.length?', in '+names.join(', '):', without a list membership')+'. Existing entry: '+entries.join('; ')+'.');
         error.code='ABL_DUPLICATE_OBJECT';error.matches=matches;throw error;
      }
      if(listId&&!doc.observingLists[listId])throw Error('The selected list is no longer available.');
   }
   function addObject(doc,listId,object) {
      validateNewObject(doc,listId,object);let l=doc.observingLists[listId];
      let o=copy(object);consolidateObjectInformation(o);if(!meta(o).objectId)meta(o).objectId=uuid();
      if(own(meta(o),'notes'))meta(o).notes=cleanNotes(meta(o).notes);
      if(config(doc).objects.length>=100000)throw Error('The collection already contains 100,000 objects.');
      config(doc).objects.push(o);if(l){l.objects.push(o);l['last edit']=stamp();}return o;
   }
   function replaceObject(doc,id,replacement,listIds) {
      let others=refs(doc).filter(r=>meta(r.object).objectId!==id);
      if(others.some(r=>same(r.object,replacement)))throw Error('That identifier belongs to another object. Edit the existing object instead.');
      // Validate the complete membership change before replacing metadata.
      // Omitted listIds retains memberships for callers that edit data only.
      let memberships=listIds===undefined?null:new Set(listIds),target;
      if(memberships){
         target=refs(doc).find(r=>meta(r.object).objectId===id)?.object;
         if(!target)throw Error('The object is no longer in the collection.');
         for(let listId of memberships){let list=doc.observingLists[listId];
            if(!list)throw Error('A selected list is no longer available.');
            if(list.objects.length>=100000&&!list.objects.some(o=>meta(o).objectId===id))throw Error('A selected list exceeds the 100,000-object limit.');}
      }
      replacement=copy(replacement);consolidateObjectInformation(replacement);
      for(let r of refs(doc))if(meta(r.object).objectId===id){let old=r.object;
         delete old.description;delete meta(old).description;
         for(let k of Object.keys(replacement))old[k]=copy(replacement[k]);
         if(own(meta(old),'notes'))meta(old).notes=cleanNotes(meta(old).notes);
         meta(old).objectId=id;if(r.listId)doc.observingLists[r.listId]['last edit']=stamp();}
      if(memberships){
         // Keep the inventory reference even when the final membership is
         // unchecked. Newly selected lists share that same edited object.
         let inventory=config(doc).objects;if(!inventory.some(o=>meta(o).objectId===id))inventory.push(target);
         for(let listId of Object.keys(doc.observingLists)){let list=doc.observingLists[listId],present=list.objects.some(o=>meta(o).objectId===id);
            if(memberships.has(listId)&&!present){list.objects.push(target);list['last edit']=stamp();}
            else if(!memberships.has(listId)&&present){list.objects=list.objects.filter(o=>meta(o).objectId!==id);list['last edit']=stamp();}
         }
      }
   }
   // objtype is the astronomical classification. Stellarium's type field is
   // a selection category: "Nebula" also covers galaxies and star clusters,
   // and "CustomObject" says only that the entry is a coordinate marker.
   function objectType(o) {
      let manual=plain(o[EXT])?text(o[EXT].manualObjectType).trim():'';
      if(manual)return manual;
      let label=text(o.objtype).trim();
      // Decode cached SIMBAD fallback labels as well as raw catalog codes.
      // This lets saved entries benefit from newly recognized types offline.
      let info=catalogTypeInfo(label);if(info)return info.label;
      label=label.replace(/^Catalog object\s*\(([^()]+)\)$/i,'$1').trim();
      if(label&&!/^(?:custom\s*object|coordinate marker|unknown|unspecified)$/i.test(label))
         return own(TYPES,label)?TYPES[label]:label.charAt(0).toUpperCase()+label.slice(1);
      let category=text((plain(o[EXT])?o[EXT].catalogClass:'')||o.type).trim();
      if(category==='Nebula')return 'Deep-sky object';
      if(!category||category==='CustomObject')return 'Unspecified';
      return category.replace(/([a-z])([A-Z])/g,'$1 $2');
   }
   // Suggestions are a convenience, not a closed classification scheme.
   // Include saved custom labels so they can be reused for another target.
   function objectTypeChoices(doc) {
      let values=['Unspecified','Deep-sky object','Emission nebula','Integrated flux nebula (IFN)','Asterism'].concat(Object.values(TYPES),records(doc).map(r=>r.objectType)),seen=new Set;
      return values.filter(value=>{let key=value.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>a.localeCompare(b));
   }
   // Re-evaluation is explicit: viewing an object never replaces a manual type.
   // Match physical classifications, not filter names or catalog-number prefixes.
   // Paths express compatible refinements; unrelated/sibling types need review.
   function reevaluateObjectType(o) {
      const definitions=[
         ['Deep-sky object','',/deep[ -]sky object/i],['Nebula','nebula',/\bnebula(?:e)?\b|\bnebel\b/i],
         ['Planetary nebula','nebula/planetary',/\bplanetary nebula(?:e)?\b|\bplanetarisch\w* nebel\b/i],
         ['Emission nebula','nebula/emission',/\bemission[ -]nebula(?:e)?\b|\bemissionsnebel\b/i],
         ['H II region','nebula/emission/hii',/\bH\s*II[ -]regions?\b|\bionized hydrogen region\b/i],
         ['Reflection nebula','nebula/reflection',/\breflection[ -]nebula(?:e)?\b|\breflexionsnebel\b/i],
         ['Dark nebula','nebula/dark',/\bdark[ -]nebula(?:e)?\b|\bdunkelnebel\b/i],
         ['Integrated flux nebula (IFN)','nebula/ifn',/\bintegrated[ -]flux[ -]nebula(?:e)?\b|\bIFN\b/i],
         ['Molecular cloud','nebula/molecular',/\bmolecular[ -]cloud\b|\bmolek[üu]lwolke\b/i],
         ['Supernova remnant','nebula/snr',/\bsupernova[ -]remnants?\b|\bSNR\b|\bsupernova[üu]berrest\b/i],
         ['Star cluster','cluster',/\b(?:star|stellar)[ -]cluster\b|\bsternhaufen\b/i],
         ['Open cluster','cluster/open',/\bopen(?: star)?[ -]cluster\b|\boffen\w* sternhaufen\b/i],
         ['Globular cluster','cluster/globular',/\bglobular(?: star)?[ -]cluster\b|\bkugelsternhaufen\b/i],
         ['Galaxy','galaxy',/\bgalax(?:y|ies)\b|\bgalaxie\b/i],
         ['Spiral galaxy','galaxy/spiral',/\bspiral[ -]galaxy\b|\bspiralgalaxie\b/i],
         ['Barred spiral galaxy','galaxy/spiral/barred',/\bbarred[ -]spiral[ -]galaxy\b|\bbalkenspiralgalaxie\b/i],
         ['Elliptical galaxy','galaxy/elliptical',/\belliptical[ -]galaxy\b/i],
         ['Lenticular galaxy','galaxy/lenticular',/\blenticular[ -]galaxy\b/i],
         ['Irregular galaxy','galaxy/irregular',/\birregular[ -]galaxy\b/i],
         ['Galaxy group','galaxy-system/group',/\b(?:galaxy group|group of galaxies)\b/i],
         ['Galaxy cluster','galaxy-system/cluster',/\b(?:galaxy cluster|cluster of galaxies)\b/i],
         ['Star','star',/\bstar\b|\bstern\b/i]
      ];
      const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      for(let label of Object.values(TYPES))if(!definitions.some(d=>d[0]===label)){
         let base=definitions.find(d=>d[0].toLowerCase()===label.replace(/ candidate$/i,'').toLowerCase());
         let path=base?base[1]:/galaxy|galactic|blazar|quasar|BL Lac/i.test(label)?'galaxy/'+label.toLowerCase():/star/i.test(label)?'star/'+label.toLowerCase():label.toLowerCase();
         definitions.push([label,path,new RegExp('\\b'+escape(label)+'\\b','i')]);
      }
      let candidates=[];
      const add=(value,source,structured=false)=>{
         for(let line of text(value).split(/\r?\n|;|[.!](?:\s+|$)/)){
            line=line.trim();if(!line)continue;
            if(!structured&&/^(?:SIMBAD identifier|Morphology|Spectral type|Angular size|V magnitude)\s*:/i.test(line))continue;
            // A sentence about a neighbour, a rejected type, or equipment is
            // not evidence for the target's own physical classification.
            if(!structured&&/\b(?:not|without|no|nicht|kein\w*|nearby|next to|background|foreground|companion|field of view|guide star|rather than|instead of)\b/i.test(line))continue;
            let code=line.replace(/^(?:object type|type|classification)\s*:\s*/i,'').replace(/^Catalog object\s*\(([^)]+)\)$/i,'$1');
            let info=catalogTypeInfo(code),recognized=info?info.label:line,exact=!!info,found=[];
            for(let definition of definitions){
               // A complete catalog label is unambiguous. Do not interpret
               // "star" inside a named class as competing classification.
               if(exact&&definition[0]!==recognized)continue;
               let match=exact?[recognized]:recognized.match(definition[2]);if(match)found.push({type:definition[0],path:definition[1],start:match.index||0,end:(match.index||0)+match[0].length});
            }
            // Do not also interpret "star" inside "star cluster" or "galaxy"
            // inside "galaxy cluster" as independent competing evidence.
            found=found.filter(a=>!found.some(b=>a!==b&&b.start<=a.start&&b.end>=a.end&&(b.end-b.start>a.end-a.start)));
            for(let candidate of found){
               let uncertain=/\b(?:candidate|possible|possibly|suspected|probable|perhaps)\b|\?/i.test(recognized)||(code.endsWith('?')&&code!=='?');
               if(uncertain&&!/candidate/i.test(candidate.type))candidate.type+=' candidate';
               candidates.push(Object.assign(candidate,{source,evidence:line,structured,uncertain,exact}));
            }
         }
      };
      add(o.objtype,'Catalog type',true);
      add(catalogInformation(o),'Catalog information');
      let m=plain(o[EXT])?o[EXT]:{};if(m.catalogSummary&&m.catalogSummary!==catalogInformation(o))add(m.catalogSummary,'Retrieved catalog information');
      add(m.notes,'Comments');
      // Generic classifications may be refined, but candidate status is not
      // upgraded to confirmed merely because a broader label also matches.
      let specific=candidates.filter(a=>!candidates.some(b=>a.path!==b.path&&(!a.path||b.path.startsWith(a.path+'/'))));
      let paths=Array.from(new Set(specific.map(c=>c.path)));
      if(!paths.length)return {type:'',reason:'No recognizable object type in the available information.',evidence:[]};
      if(paths.length>1)return {type:'',reason:'Conflicting types: '+Array.from(new Set(specific.map(c=>c.type))).join(', ')+'. Choose the type manually.',evidence:specific};
      specific.sort((a,b)=>Number(b.structured)-Number(a.structured)||Number(b.uncertain)-Number(a.uncertain));
      let chosen=specific[0];return {type:chosen.type,reason:chosen.source+': '+chosen.evidence,evidence:specific};
   }
   // Remove hollow-circle glyphs and generated month/constellation source
   // headings. Whole-line removal matches only that heading format; other
   // bracketed notes, degree symbols and remaining line breaks are preserved.
   function cleanNotes(notes) {
      return text(notes).replace(/^[ \t]*[○◯][ \t]*/gm,'').replace(/[○◯]/g,'')
         .replace(/^[ \t]*\[[^\]\r\n]+\/[^\]\r\n]+;[ \t]*source line[ \t]+\d+[ \t]*\][ \t]*(?:\r\n|\r|\n|$)/gmi,'');
   }
   function cleanDocumentNotes(doc) {
      let count=0;
      for(let r of refs(doc)){let m=meta(r.object);if(own(m,'notes')){
         let cleaned=cleanNotes(m.notes);if(cleaned!==m.notes){m.notes=cleaned;++count;}
      }}
      return count;
   }
   // The compact column uses the same persisted cleanup as the editor.
   function commentText(notes) {
      return cleanNotes(notes).replace(/\r\n|\r/g,'\n').trim();
   }
   // The editable information field combines imported descriptive prose with
   // catalog facts. Deduplicate whole lines only, preserving distinct facts.
   // Type labels and their prefixed forms share one key ("Galaxy"/"Type: Galaxy").
   function informationKey(line) {
      let value=text(line).trim().replace(/^(?:object type|type|classification)\s*:\s*/i,'');
      let info=catalogTypeInfo(value);if(info)value=info.label;
      return value.replace(/\s+/g,' ').replace(/\.$/,'').toLowerCase();
   }
   function informationText(...parts) {
      let lines=[],seen=new Set;
      for(let part of parts)for(let line of text(part).replace(/\r\n|\r/g,'\n').split('\n')){
         line=line.trim();if(!line)continue;
         // Replace only a whole generated type line, never a code embedded in
         // personal prose. The normalized key also deduplicates its long name.
         let generated=line.match(/^((?:object type|type|classification)\s*:\s*)?(Catalog object\s*\([^()]+\))$/i);
         if(generated){let info=catalogTypeInfo(generated[2]);if(info)line=(generated[1]||'')+info.label;}
         let key=informationKey(line);
         if(!seen.has(key)){seen.add(key);lines.push(line);}
      }
      return lines.join('\n');
   }
   function fetchedCatalogInformation(o) {
      let m=plain(o[EXT])?o[EXT]:{};return informationText(m.catalogSummary||o.objtype);
   }
   function catalogInformation(o) {
      let m=plain(o[EXT])?o[EXT]:{};
      return informationText(own(m,'catalogInformation')?m.catalogInformation:fetchedCatalogInformation(o),m.description,o.description);
   }
   function consolidateObjectInformation(o) {
      let m=meta(o),before=JSON.stringify(o),hadOverride=own(m,'catalogInformation'),value=catalogInformation(o);
      if(own(m,'catalogSummary'))m.catalogSummary=informationText(m.catalogSummary);
      delete m.description;delete o.description;
      if(hadOverride||value!==fetchedCatalogInformation(o))m.catalogInformation=value;
      return JSON.stringify(o)!==before;
   }
   function consolidateDocumentInformation(doc) {
      let count=0;for(let r of refs(doc))if(consolidateObjectInformation(r.object))++count;return count;
   }
   function setCatalogInformation(o,value) {
      let m=meta(o),wasBlank=own(m,'catalogInformation')&&m.catalogInformation==='';
      value=informationText(value);delete m.description;delete o.description;
      if(value===fetchedCatalogInformation(o)&&!(wasBlank&&value===''))delete m.catalogInformation;
      else m.catalogInformation=value;
   }
   // On import, current structured catalog facts win conflicts while distinct
   // descriptive lines accumulate. An explicitly cleared field remains empty.
   function mergeObjectInformation(current,incoming) {
      let am=meta(current);if(own(am,'catalogInformation')&&am.catalogInformation==='')return '';
      let first=catalogInformation(current),known=new Set,lines=first?first.split('\n'):[];
      const hasType=o=>!!text(o.objtype).trim()&&!/^(?:unknown|unspecified|custom\s*object|catalog object\s*\(\?\))$/i.test(text(o.objtype).trim());
      // A missing type may be filled by the import; do not retain its old
      // placeholder as a competing description of the newly classified object.
      if(!hasType(current)&&hasType(incoming))lines=lines.filter(line=>informationKey(line)!==informationKey(current.objtype));
      const field=line=>{let m=line.match(/^(SIMBAD identifier|Morphology|Spectral type|Angular size(?: \(arcmin\))?|V magnitude)\s*:/i);return m?m[1].toLowerCase():'';};
      for(let line of lines)if(field(line))known.add(field(line));
      for(let line of catalogInformation(incoming).split('\n')){
         if(hasType(current)&&informationKey(line)===informationKey(incoming.objtype)&&informationKey(current.objtype)!==informationKey(incoming.objtype))continue;
         let key=field(line);if(key&&known.has(key))continue;if(key)known.add(key);lines.push(line);
      }
      return informationText(lines.join('\n'));
   }

   // Angular dimensions are always stored in arcminutes. Stellarium's fov
   // is a view setting, not an object measurement, and must never be used here.
   function validSize(size) {
      return plain(size)&&Number.isFinite(size.majorArcmin)&&size.majorArcmin>0&&size.majorArcmin<=10800&&
         (size.minorArcmin===null||size.minorArcmin===undefined||Number.isFinite(size.minorArcmin)&&size.minorArcmin>0&&size.minorArcmin<=size.majorArcmin);
   }
   function parseAngularSize(value,source='SIMBAD') {
      // SIMBAD ASCII: major minor position-angle, followed by band/quality/ref.
      // Tildes denote unavailable values, never zero-sized objects.
      let tokens=text(value).trim().split(/\s+/),major=Number(tokens[0]),minor=tokens[1]===undefined||tokens[1]==='~'?null:Number(tokens[1]);
      let size={majorArcmin:major,minorArcmin:minor,source};
      if(!validSize(size))return null;
      let angle=Number(tokens[2]);if(tokens[2]!=='~'&&Number.isFinite(angle)&&angle>=0&&angle<180)size.positionAngleDeg=angle;
      size.catalogValue=text(value).trim();return size;
   }
   function catalogSize(o) {
      let m=plain(o[EXT])?o[EXT]:{};
      if(own(m,'catalogAngularSize'))return validSize(m.catalogAngularSize)?copy(m.catalogAngularSize):null;
      // Existing SIMBAD summaries already identify their units explicitly.
      let line=text(m.catalogSummary).match(/^Angular size \(arcmin\):\s*(.+)$/m);
      return line?parseAngularSize(line[1]):null;
   }
   function angularSize(o) {
      let m=plain(o[EXT])?o[EXT]:{};
      return own(m,'angularSize')?(validSize(m.angularSize)?copy(m.angularSize):null):catalogSize(o);
   }
   function sizeText(size) {
      if(!validSize(size))return 'Unknown';
      let f=n=>String(Number(n.toPrecision(6)))+'′';
      return f(size.majorArcmin)+(size.minorArcmin?' × '+f(size.minorArcmin):'');
   }
   function manualSize(major,minor) {
      major=text(major).trim();minor=text(minor).trim();
      if(!major&&!minor)return null;
      let size={majorArcmin:Number(major),minorArcmin:minor?Number(minor):null,source:'Manual'};
      if(!validSize(size))throw Error('Enter a positive major size in arcminutes (up to 10800). The optional minor size must be positive and no larger than the major size.');
      return size;
   }
   function chartFraming(o,sky=false) {
      let size=angularSize(o),requested=size?1.5*size.majorArcmin:30;
      let field=Math.ceil(Math.max(sky?1:5,Math.min(sky?1800:120,requested))*100)/100;
      return {field,sky:size?Math.ceil(Math.max(.1,Math.min(120,4*field/60))*100)/100:30,
         size:sizeText(size),known:!!size,limited:requested>field};
   }
   // The finder starts with useful surrounding sky even for compact or
   // unmeasured targets. Sizes are stored in arcminutes; coverage is degrees.
   function defaultSkyCoverage(o) {
      let size=angularSize(o);
      return Math.ceil(Math.min(120,Math.max(45,size?size.majorArcmin/60:45))*100)/100;
   }
   function defaultInsetCoverage(o,sky) {
      let size=angularSize(o);
      return Math.max(.1,Math.round(Math.min(sky/2,size?size.majorArcmin/60*2.5:2)*100)/100);
   }
   // Stellarium/SkyChart outlines.dat: J2000 RA in hours, Dec in degrees,
   // then start/vertex/end. Preserve open contours and separate components;
   // never infer a boundary from a catalog's ellipse or an image texture.
   function parseOutlines(source) {
      if(typeof source!=='string'||source.length>16*1024*1024)throw Error('The contour file is empty or exceeds 16 MiB.');
      let outlines=[],active=null,vertices=0;
      source.replace(/^\uFEFF/,'').split(/\r?\n/).forEach((line,index)=>{
         line=line.trim();if(!line||line.startsWith('#'))return;
         let m=line.match(/^([+-]?[\d.]+)\s+([+-]?[\d.]+)\s+(start|vertex|end)(?:\s+(.*))?$/i);
         const fail=()=>{throw Error('Invalid contour data at line '+(index+1)+'. Choose a Stellarium/SkyChart outlines.dat file.');};
         if(!m)fail();let ra=Number(m[1]),dec=Number(m[2]),command=m[3].toLowerCase();
         if(!Number.isFinite(ra)||ra<0||ra>24||!Number.isFinite(dec)||dec< -90||dec>90)fail();
         if(command==='start'){if(active)fail();active={name:text(m[4]).trim(),points:[]};if(!active.name)fail();}
         if(!active)fail();
         // Unwrap adjacent vertices before projection to avoid a false line
         // across the entire sky when a contour crosses RA zero.
         let x=ra*15,previous=active.points[active.points.length-1];
         if(previous){while(x-previous.x>180)x-=360;while(x-previous.x< -180)x+=360;}
         active.points.push({x,y:dec});if(++vertices>250000)throw Error('The contour file exceeds 250000 vertices.');
         if(command==='end'){if(active.points.length<2)fail();outlines.push(active);active=null;}
      });
      if(active||!outlines.length)throw Error('The contour file has no complete outlines or ends inside a contour.');
      return outlines;
   }
   // These preferences affect the drawing only. One normalization path also
   // upgrades older saved preferences and supplies complete cache keys.
   function chartAppearance(options={}) {
      return {projection:['auto','gnomonic','stereographic'].includes(options.projection)?options.projection:'auto',
         milkyWay:options.milkyWay!==false,
         milkyWayStrength:Number.isFinite(options.milkyWayStrength)&&options.milkyWayStrength>=5&&options.milkyWayStrength<=30?options.milkyWayStrength:10,
         starColors:options.starColors===true,starDensity:['sparse','normal','dense'].includes(options.starDensity)?options.starDensity:'normal',
         starSize:Number.isFinite(options.starSize)&&options.starSize>=50&&options.starSize<=200?options.starSize:100};
   }
   // Normalize display-only options once for rendering and the session cache.
   function chartDetails(options={}) {
      return Object.assign(chartAppearance(options),{starNames:options.starNames===true,starMagnitudes:options.starMagnitudes===true,
         objectDetails:options.objectDetails===true,labelDensity:['sparse','normal','detailed'].includes(options.labelDensity)?options.labelDensity:'normal',
         contours:options.contours===true,contourPath:text(options.contourPath),outlineLevel:[0,1,2,3].includes(options.outlineLevel)?options.outlineLevel:2,inset:options.inset===true,
         insetDegrees:Number.isFinite(options.insetDegrees)?options.insetDegrees:2});
   }
   function chartObjectDetails(o) {
      let fields=[],type=text(o.Type).trim();if(type)fields.push(type);
      if(Number.isFinite(o.diameter)&&o.diameter>0){
         let major=o.diameter*60,minor=Number.isFinite(o.axisRatio)&&o.axisRatio>1?major/o.axisRatio:null;
         const number=v=>String(Number(v.toFixed(v<1?2:1)));
         fields.push(number(major)+(minor?' × '+number(minor):'')+'′');
      }
      if(Number.isFinite(o.magnitude)&&Math.abs(o.magnitude)<90)fields.push('mag '+o.magnitude.toFixed(1));
      return fields.join(' · ');
   }
   // Refresh only catalog-owned fields. Preserve identifier, list membership,
   // imaging state, filters, personal prose, and manual size/type overrides.
   function refreshCatalog(object,found) {
      let o=copy(object);consolidateObjectInformation(o);let m=meta(o),fresh=meta(found);
      let local=fresh.catalogProvider==='local',before=position(o),next=position(found),baseline=m.catalogPosition;
      let retarget=!!catalogIdentifier(o)&&!!catalogIdentifier(found)&&!same(o,found),replaceCatalog=!local||retarget;
      let automaticName=!own(m,'displayName')&&(!text(o.name)&&!text(o.nameI18n)||retarget&&norm(o.name)===norm(m.catalogMainId));
      // A coordinate is catalog-owned only while it still equals the saved
      // lookup value. Older collections lack that evidence: retain their
      // coordinates until the user explicitly chooses Use catalog coordinates.
      for(let axis of ['ra','dec'])if(next[axis]!==null&&(before[axis]===null||replaceCatalog&&baseline&&Number.isFinite(baseline[axis])&&Math.abs(before[axis]-baseline[axis])<1e-9))o[axis]=copy(found[axis]);
      let p=position(o);if(p.ra!==null&&p.dec!==null)o.constellation=constellation(p.ra,p.dec);
      if(retarget)o.objtype=found.objtype||'';
      else if(text(found.objtype).trim()&&(replaceCatalog||!text(o.objtype).trim()))o.objtype=found.objtype;
      for(let k of ['catalogMainId','catalogSummary','catalogSource','catalogRetrieved','catalogClass','positionFrame','catalogProvider'])
         if(own(fresh,k)&&(replaceCatalog||!m[k]))m[k]=copy(fresh[k]);
      m.aliases=Array.from(new Set((!retarget&&Array.isArray(m.aliases)?m.aliases:[]).concat(Array.isArray(fresh.aliases)?fresh.aliases:[])));
      if(next.ra!==null&&next.dec!==null&&(replaceCatalog||!m.catalogPosition))m.catalogPosition=next;
      let size=catalogSize(found);if(retarget)m.catalogAngularSize=size;else if(size&&(replaceCatalog||!catalogSize(o)))m.catalogAngularSize=size;
      if(fresh.localCatalogs)m.localCatalogs=copy(fresh.localCatalogs);
      // Blank display-name overrides are intentional. New objects without
      // any name can take the catalog name; existing names stay unchanged.
      if(automaticName){o.name=found.name;o.nameI18n=found.nameI18n;}
      return o;
   }
   // Suggestions are literal filter mentions, not exposure recommendations.
   // An explicit empty value suppresses suggestions after a user clears it.
   function filterInfo(o) {
      let m=plain(o[EXT])?o[EXT]:{};
      if(own(m,'filters'))return {text:text(m.filters).trim(),fromNotes:false};
      let s=commentText(m.notes),found=[],seen=new Set(),match;
      let pattern=/(^|[^a-z0-9])((?:(?:no|without|kein(?:en|e|er)?|ohne)\s+filter)|(?:(?:no|not|without|kein(?:en|e|er)?|ohne)\s+)?(?:(?:LRGB(?:HO)?|RGB|SHO|HOO|HSO|HOS|OHS|OSH|H(?:alpha|beta|α|β|a|b)|O\s*III|S\s*II))+(?:\(\?\)|\?)?)(?=$|[^a-z0-9])/gi;
      while((match=pattern.exec(s))!==null){let value=match[2].trim(),key=value.replace(/\s+/g,'').toLowerCase();
         if(!seen.has(key)){seen.add(key);found.push(value);}}
      return {text:found.join('; '),fromNotes:found.length>0};
   }
   const BAND_LABELS={broadband:'Broadband',narrowband:'Narrowband',unclassified:'Unclassified'};
   // Recognize positive filter mentions, including compact HaRGB / LRGBHO
   // mixtures. Do not interpret an explicitly negated filter as evidence.
   function bandFilters(value,explicit=false) {
      let s=text(value),narrow='',broad='',match;
      let pattern=/(^|[^a-z0-9])((?:(?:LRGBHO|LRGB|RGB|SHO|HOO|HSO|HOS|OHS|OSH|H[\s-]*(?:alpha|α|a)|O[\s-]*(?:III|3)|S[\s-]*(?:II|2)))+|narrow[\s-]*band|broad[\s-]*band|full[\s-]*spectrum|schmalband|breitband)(?=$|[^a-z0-9])/gi;
      while((match=pattern.exec(s))!==null){
         let prefix=s.slice(0,match.index+match[1].length);
         if(/\b(?:no|not|without|kein(?:e|en|er)?|ohne)(?:\s+(?:use|using|any|a|an))?\s*$/i.test(prefix))continue;
         let token=match[2],key=token.replace(/[\s-]/g,'').toUpperCase();
         if(/HA|HΑ|OIII|O3|SII|S2|SHO|HOO|HSO|HOS|OHS|OSH|LRGBHO|NARROWBAND|SCHMALBAND/.test(key))narrow=token;
         else broad=token;
      }
      // Individual L/R/G/B channel names are meaningful in the dedicated
      // Filters field. In prose, require a channel list or the word filter.
      if(!broad&&(explicit&&/^[LRGB\s,;/+&-]+$/i.test(s.trim())&&/[LRGB]/i.test(s)||/\b[LRGB](?:\s*[,/+&]\s*[LRGB]){2,}\b|\b[LRGB]\s+filters?\b/i.test(s)))broad='L/R/G/B';
      return {narrow,broad};
   }
   function targetBand(o) {
      let m=plain(o[EXT])?o[EXT]:{},saved=m.targetBand;
      if(plain(saved)&&saved.mode==='manual'&&['broadband','narrowband'].includes(saved.value))
         return {value:saved.value,label:BAND_LABELS[saved.value],mode:'manual',reason:'Manual classification'};
      let prose=[m.notes,catalogInformation(o),m.catalogSummary].map(text).join('\n');
      let filters=bandFilters(m.filters,true),mentions=bandFilters(prose),narrow=filters.narrow||mentions.narrow,broad=filters.broad||mentions.broad;
      const automatic=(value,reason)=>({value,label:BAND_LABELS[value],mode:'auto',reason});
      // Continuum targets remain broadband: emission-line filters are optional
      // additions. Use the object's type, not incidental mentions of nearby
      // galaxies in a nebula's notes. Explicit manual choices still win above.
      let type=objectType(o),galaxy=type.match(/\b(?:galax(?:y|ies)|galaxi\w*|(?:active\s+)?galactic\s+nucleus|AGN|LINER|Seyfert|blazar|quasar|BL Lac)\b/i);
      if(galaxy)return automatic('broadband','Galaxy type: '+galaxy[0]+'; narrowband filters are optional.');
      let cluster=type.match(/\b(?:(?:open|globular|star|stellar)(?:\s+star)?[\s-]*clusters?|cluster\s+of\s+stars|sternhaufen|kugelsternhaufen)\b/i);
      if(cluster)return automatic('broadband','Star cluster type: '+cluster[0]+'; narrowband filters are optional.');
      let cloud=type.match(/\b(?:(?:reflection|dark)[\s-]*nebula(?:e)?|integrated[\s-]*flux[\s-]*nebula(?:e)?|IFN|reflexionsnebel|reflektionsnebel|dunkelnebel)\b/i);
      if(cloud)return automatic('broadband','Broadband nebula type: '+cloud[0]+'; narrowband filters are optional.');
      // For other targets, filter evidence takes priority over metadata;
      // narrowband wins when both filter families are mentioned.
      if(narrow)return automatic('narrowband','Narrowband filter mention: '+narrow);
      if(broad)return automatic('broadband','Broadband filter mention: '+broad);
      let metadata=[type,o.name,o.nameI18n,m.displayName,prose].map(text).join('\n');
      let match=metadata.match(/\b(?:emission[\s-]*nebula(?:e)?|h[\s-]*ii(?:\s+regions?)?|planetary[\s-]*nebula(?:e)?|supernova[\s-]*remnants?|SNR|PNc?|emissionsnebel|planetarisch\w*\s+nebel|supernova[\s-]*(?:überrest\w*|ueberrest\w*))\b/i);
      if(match)return automatic('narrowband','Object metadata: '+match[0]);
      match=metadata.match(/\b(?:galax(?:y|ies)|galaxi\w*|(?:active\s+)?galactic\s+nucleus|AGN|LINER|Seyfert|reflection[\s-]*nebula(?:e)?|dark[\s-]*nebula(?:e)?|(?:open|globular|star|stellar)(?:\s+star)?[\s-]*clusters?|cluster\s+of\s+stars|integrated[\s-]*flux[\s-]*nebula(?:e)?|IFN|reflexionsnebel|reflektionsnebel|dunkelnebel|sternhaufen|kugelsternhaufen)\b/i);
      if(match)return automatic('broadband','Object metadata: '+match[0]);
      return automatic('unclassified','No recognized filter or sufficiently specific object type; choose a target band in Edit object.');
   }
   function setTargetBand(o,choice) {
      if(!['auto','broadband','narrowband'].includes(choice))throw Error('Choose Automatic, Broadband or Narrowband.');
      let m=meta(o);m.targetBand={mode:choice==='auto'?'auto':'manual',value:choice==='auto'?'unclassified':choice};
      m.targetBand.value=targetBand(o).value;
   }
   function objectHeading(designation,name) {
      let id=text(designation).trim().replace(/\s+marker$/i,''),label=text(name).trim();
      return id+(label&&norm(label)!==norm(id)?' — '+label:'');
   }
   function record(o,doc) {
      let m=meta(o),p=position(o),code=p.ra!==null&&p.dec!==null?constellation(p.ra,p.dec):normalizeConstellation(o.constellation);
      let key=monthKey(code,p.ra),month=Number(config(doc).constellationMonths[key])||0,filters=filterInfo(o),band=targetBand(o);
      return {object:o,id:m.objectId,designation:text(m.catalogIdentifier||o.designation||o.name||'Unnamed position'),name:text(m.displayName||o.name||o.nameI18n),
         objectType:objectType(o),size:angularSize(o),sizeText:sizeText(angularSize(o)),notes:cleanNotes(m.notes),comments:commentText(m.notes),filters:filters.text,filtersFromNotes:filters.fromNotes,catalogSummary:catalogInformation(o),
         band:band.value,bandLabel:band.label,bandMode:band.mode,bandReason:band.reason,
         ra:p.ra,dec:p.dec,code,key,constellation:code?(key==='SerCap'?'Serpens Caput':key==='SerCau'?'Serpens Cauda':ABL_CONSTELLATIONS[code]):'Unassigned constellation',
         month,monthName:MONTHS[month],imaged:m.imaged===true,imagedOn:text(m.imagedOn)};
   }
   function records(doc,listId) {
      let arr=listId?(doc.observingLists[listId]||{objects:[]}).objects:refs(doc).map(r=>r.object),seen=new Set();
      return arr.filter(o=>{let id=meta(o).objectId;if(seen.has(id))return false;seen.add(id);return true;}).map(o=>record(o,doc));
   }
   // Planning months are recurring calendar months. Use the local calendar,
   // wrapping December/January without including unassigned month zero.
   function adjacentMonths(date=new Date()) {
      let month=date.getMonth()+1;
      return [(month+10)%12+1,month,month%12+1];
   }
   function filter(records,options,date=new Date()) {
      let q=text(options.search).trim().toLowerCase(),months=options.month==='near-current'?adjacentMonths(date):null;
      // Match the displayed identifier. The hidden Stellarium marker suffix
      // is transport metadata; real mentions in names or notes remain searchable.
      return records.filter(r=>(options.month===undefined||options.month===-1||(months?months.includes(r.month):r.month===options.month))&&
         (!options.selectedIds||options.selectedIds.has(r.id))&&
         (options.constellation===undefined||options.constellation===null||r.key===options.constellation)&&(!options.objectType||r.objectType===options.objectType)&&
         (!options.band||r.band===options.band)&&
         (!options.status||options.status==='all'||options.status==='imaged'&&r.imaged||options.status==='not-imaged'&&!r.imaged)&&
         (!q||[r.designation.replace(/\s+marker$/i,''),r.name,r.objectType,r.bandLabel,r.filters,r.catalogSummary,r.notes,r.constellation,r.code].join(' ').toLowerCase().indexOf(q)>=0||identifiers(r.object).some(id=>id.indexOf(norm(q))>=0)));
   }
   // Calendar sorting compares numeric planning months, not localized labels.
   // Unassigned months remain last in either direction.
   function sortedRecords(records,mode='constellation') {
      // Compare explicit criteria in priority order. Apply the stable textual
      // fallback only after all requested keys tie, never between criteria.
      let modes=Array.isArray(mode)?mode:[mode];
      function compare(a,b,mode){
         if(mode==='constellation')return a.constellation.localeCompare(b.constellation);
         if(['ra','ra-desc','dec','dec-desc'].includes(mode)){
            let field=mode.indexOf('ra')===0?'ra':'dec',va=Number.isFinite(a[field])?a[field]:null,vb=Number.isFinite(b[field])?b[field]:null;
            if(va===null&&vb!==null)return 1;if(va!==null&&vb===null)return -1;
            if(va!==null&&vb!==null){let order=(va-vb)*(mode.endsWith('-desc')?-1:1);if(order)return order;}
         }
         if(mode==='size'||mode==='size-desc'){
            let sa=validSize(a.size)?a.size.majorArcmin:null,sb=validSize(b.size)?b.size.majorArcmin:null;
            if(sa===null&&sb!==null)return 1;if(sa!==null&&sb===null)return -1;
            if(sa!==null&&sb!==null){let order=(sa-sb)*(mode==='size-desc'?-1:1);if(order)return order;}
         }
         if(mode==='month'||mode==='month-desc'){
            if(!a.month&&b.month)return 1;if(a.month&&!b.month)return -1;
            let order=(a.month-b.month)*(mode==='month-desc'?-1:1);if(order)return order;
         }
         return 0;
      }
      return records.slice().sort((a,b)=>{
         for(let criterion of modes){let order=compare(a,b,criterion);if(order)return order;}
         return a.constellation.localeCompare(b.constellation)||a.designation.localeCompare(b.designation,undefined,{numeric:true});
      });
   }
   function validDate(s) {
      if(!s)return true;if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
      let d=new Date(s+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;
   }
   function validateObject(o,coordinatePrecision) {
      if(!text(o.designation).trim())throw Error('Enter a catalog identifier or a name for this position.');
      let p=position(o);if(p.ra===null||p.dec===null)throw Error('Enter valid J2000 RA and Dec, or use Look up.');
      if(!validDate(text(meta(o).imagedOn)))throw Error('Use a valid imaging date in YYYY-MM-DD format.');
      if(meta(o).angularSize!==undefined&&meta(o).angularSize!==null&&!validSize(meta(o).angularSize))throw Error('Invalid apparent object size.');
      o.ra=formatRA(p.ra,coordinatePrecision);o.dec=formatDec(p.dec,coordinatePrecision);o.constellation=constellation(p.ra,p.dec);return o;
   }
   const TYPES={G:'Galaxy','G?':'Galaxy candidate',rG:'Radio galaxy',SBG:'Starburst galaxy',EmG:'Emission-line galaxy',H2G:'H II galaxy',LSB:'Low surface brightness galaxy',bCG:'Blue compact galaxy',AGN:'Active galactic nucleus','AG?':'Active galactic nucleus candidate',Bla:'Blazar',BLL:'BL Lac object',QSO:'Quasar',Sy1:'Seyfert 1 galaxy',Sy2:'Seyfert 2 galaxy',LIN:'LINER galaxy nucleus',SyG:'Seyfert galaxy',GiG:'Galaxy in a group',GiP:'Galaxy in a pair',GiC:'Galaxy in a cluster',
      ClG:'Galaxy cluster',GrG:'Galaxy group',IG:'Interacting galaxies',PN:'Planetary nebula',PNc:'Planetary nebula candidate',HII:'H II region',SNR:'Supernova remnant',
      RNe:'Reflection nebula',DNe:'Dark nebula',MoC:'Molecular cloud',ISM:'Interstellar matter',Neb:'Nebula',GlC:'Globular cluster',OpC:'Open cluster','Cl*':'Star cluster',
      '*':'Star','**':'Double or multiple star','C*':'Carbon star','WR*':'Wolf-Rayet star','V*':'Variable star','Em*':'Emission-line star','Be*':'Be star','s*r':'Red supergiant'};
   // SIMBAD otypedef data (ODbL-1.0), retrieved 2026-11-14 from the CDS Harvard
   // mirror: https://simbad.cfa.harvard.edu/simbad/sim-tap/ (SELECT * FROM otypedef).
   // Each row is [code, compact label, full description, classification path].
   // Attribution, license URI, citation and redistribution copy are supplied
   // in AstroBucketList-DataNotices.txt and AstroBucketList-SIMBAD-otypes.json.
   // Keep a local snapshot so saved abbreviations also resolve without a lookup.
   // New lookups request verbose descriptions and can display future types too.
   const SIMBAD_TYPE_DEFINITIONS=[
      ["*","Star","Star","*"],
      ["**","**","Double or Multiple Star","* > **"],
      ["**?","**_Candidate","Double or Multiple Star Candidate","* > **"],
      ["?","Unknown","Object of Unknown Nature",""],
      ["AB*","AGB*","Asymptotic Giant Branch Star","* > Ev* > AB*"],
      ["AB?","AGB*_Candidate","Asymptotic Giant Branch Star Candidate","* > Ev* > AB*"],
      ["AG?","AGN_Candidate","Active Galaxy Nucleus Candidate","G > AGN"],
      ["AGN","AGN","Active Galaxy Nucleus","G > AGN"],
      ["Ae*","Ae*","Herbig Ae/Be Star","* > Y*O > Ae*"],
      ["Ae?","Ae*_Candidate","Herbig Ae/Be Star Candidate","* > Y*O > Ae*"],
      ["As*","Association","Association of Stars","As*"],
      ["As?","Association_Candidate","Association of Stars Candidate","As*"],
      ["BD*","BrownD*","Brown Dwarf","* > LM* > BD*"],
      ["BD?","BrownD*_Candidate","Brown Dwarf Candidate","* > LM* > BD*"],
      ["BH","BlackHole","Black Hole","grv > BH"],
      ["BH?","BlackHole_Candidate","Black Hole Candidate","grv > BH"],
      ["BL?","BLLac_Candidate","BL Lac Candidate","G > AGN > QSO > Bla > BLL"],
      ["BLL","BLLac","BL Lac","G > AGN > QSO > Bla > BLL"],
      ["BS*","BlueStraggler","Blue Straggler","* > MS* > BS*"],
      ["BS?","BlueStraggler_Candidate","Blue Straggler Candidate","* > MS* > BS*"],
      ["BY*","BYDraV*","BY Dra Variable","* > ** > BY*"],
      ["BY?","BYDraV*_Candidate","BY Dra Variable Candidate","* > ** > BY*"],
      ["Be*","Be*","Be Star","* > MS* > Be*"],
      ["Be?","Be*_Candidate","Be Star Candidate","* > MS* > Be*"],
      ["BiC","BrightestCG","Brightest Galaxy in a Cluster (BCG)","G > GiC > BiC"],
      ["Bla","Blazar","Blazar","G > AGN > QSO > Bla"],
      ["Bz?","Blazar_Candidate","Blazar Candidate","G > AGN > QSO > Bla"],
      ["C*","C*","Carbon Star","* > Ev* > C*"],
      ["C*?","C*_Candidate","Carbon Star Candidate","* > Ev* > C*"],
      ["C?G","ClG_Candidate","Cluster of Galaxies Candidate","ClG"],
      ["CGG","Compact_Gr_G","Compact Group of Galaxies","GrG > CGG"],
      ["CGb","ComGlob","Cometary Globule / Pillar","ISM > Cld > CGb"],
      ["CV*","CataclyV*","Cataclysmic Binary","* > ** > CV*"],
      ["CV?","CataclyV*_Candidate","Cataclysmic Binary Candidate","* > ** > CV*"],
      ["Ce*","Cepheid","Cepheid Variable","* > Ev* > Ce*"],
      ["Ce?","Cepheid_Candidate","Cepheid Variable Candidate","* > Ev* > Ce*"],
      ["Cl*","Cluster*","Cluster of Stars","Cl*"],
      ["Cl?","Cluster*_Candidate","Cluster of Stars Candidate","Cl*"],
      ["ClG","ClG","Cluster of Galaxies","ClG"],
      ["Cld","Cloud","Cloud","ISM > Cld"],
      ["DNe","DarkNeb","Dark Cloud (nebula)","ISM > Cld > DNe"],
      ["EB*","EclBin","Eclipsing Binary","* > ** > EB*"],
      ["EB?","EclBin_Candidate","Eclipsing Binary Candidate","* > ** > EB*"],
      ["El*","EllipVar","Ellipsoidal Variable","* > ** > El*"],
      ["El?","EllipVar_Candidate","Ellipsoidal Variable Candidate","* > ** > El*"],
      ["Em*","EmLine*","Emission-line Star","* > Em*"],
      ["EmG","EmissionG","Emission-line galaxy","G > EmG"],
      ["EmO","EmObj","Emission Object","Opt > EmO"],
      ["Er*","Eruptive*","Eruptive Variable","* > V* > Er*"],
      ["Er?","Eruptive*_Candidate","Eruptive Variable Candidate","* > V* > Er*"],
      ["Ev*","Evolved*","Evolved Star","* > Ev*"],
      ["Ev?","Evolved*_Candidate","Evolved Star Candidate","* > Ev*"],
      ["FIR","FarIR","Far-IR source (λ >= 30 µm)","IR > FIR"],
      ["G","Galaxy","Galaxy","G"],
      ["G?","Galaxy_Candidate","Galaxy Candidate","G"],
      ["GNe","GalNeb","Nebula","ISM > Cld > GNe"],
      ["GWE","GravWaveEvent","Gravitational Wave Event","grv > GWE"],
      ["GiC","GtowardsCl","Galaxy towards a Cluster of Galaxies","G > GiC"],
      ["GiG","GtowardsGroup","Galaxy towards a Group of Galaxies","G > GiG"],
      ["GiP","GinPair","Galaxy in Pair of Galaxies","G > GiP"],
      ["Gl?","GlobCluster_Candidate","Globular Cluster Candidate","Cl* > GlC"],
      ["GlC","GlobCluster","Globular Cluster","Cl* > GlC"],
      ["Gr?","GroupG_Candidate","Group of Galaxies Candidate","GrG"],
      ["GrG","GroupG","Group of Galaxies","GrG"],
      ["H2G","HIIG","HII Galaxy","G > H2G"],
      ["HB*","HorBranch*","Horizontal Branch Star","* > Ev* > HB*"],
      ["HB?","HorBranch*_Candidate","Horizontal Branch Star Candidate","* > Ev* > HB*"],
      ["HH","HerbigHaroObj","Herbig-Haro Object","* > Y*O > out > HH"],
      ["HI","HI","HI (21cm) Source","Rad > HI"],
      ["HII","HIIReg","HII Region","ISM > HII"],
      ["HS*","HotSubdwarf","Hot Subdwarf","* > Ev* > HS*"],
      ["HS?","HotSubdwarf_Candidate","Hot Subdwarf Candidate","* > Ev* > HS*"],
      ["HV*","HighVel*","High Velocity Star","* > HV*"],
      ["HVC","HVCld","High-velocity Cloud","ISM > Cld > HVC"],
      ["HX?","HighMassXBin_Candidate","High Mass X-ray Binary Candidate","* > ** > XB* > HXB"],
      ["HXB","HighMassXBin","High Mass X-ray Binary","* > ** > XB* > HXB"],
      ["IG","InteractingG","Interacting Galaxies","IG"],
      ["IR","Infrared","Infra-Red Source","IR"],
      ["ISM","ISM","Interstellar Medium Object","ISM"],
      ["Ir*","IrregularV*","Irregular Variable","* > V* > Ir*"],
      ["LI?","LensedImage_Candidate","Gravitationally Lensed Image Candidate","grv > gLS > LeI"],
      ["LIN","LINER","LINER-type Active Galaxy Nucleus","G > AGN > LIN"],
      ["LM*","Low-Mass*","Low-mass Star","* > LM*"],
      ["LM?","Low-Mass*_Candidate","Low-mass Star Candidate","* > LM*"],
      ["LP*","LongPeriodV*","Long-Period Variable","* > Ev* > LP*"],
      ["LP?","LongPeriodV*_Candidate","Long-Period Variable Candidate","* > Ev* > LP*"],
      ["LS?","GravLensSystem_Candidate","Gravitational Lens System (lens+images) Candidate","grv > gLS"],
      ["LSB","LowSurfBrghtG","Low Surface Brightness Galaxy","G > LSB"],
      ["LX?","LowMassXBin_Candidate","Low Mass X-ray Binary Candidate","* > ** > XB* > LXB"],
      ["LXB","LowMassXBin","Low Mass X-ray Binary","* > ** > XB* > LXB"],
      ["Le?","GravLens_Candidate","Gravitational Lens Candidate","grv > gLS > gLe"],
      ["LeG","LensedG","Gravitationally Lensed Image of a Galaxy","grv > gLS > LeI > LeG"],
      ["LeI","LensedImage","Gravitationally Lensed Image","grv > gLS > LeI"],
      ["LeQ","LensedQ","Gravitationally Lensed Image of a Quasar","grv > gLS > LeI > LeQ"],
      ["Lev","LensingEv","(Micro)Lensing Event","grv > Lev"],
      ["MGr","MouvGroup","Moving Group","As* > MGr"],
      ["MIR","MidIR","Mid-IR Source (3 to 30 µm)","IR > MIR"],
      ["MS*","MainSequence*","Main Sequence Star","* > MS*"],
      ["MS?","MainSequence*_Candidate","Main Sequence Star Candidate","* > MS*"],
      ["Ma*","Massiv*","Massive Star","* > Ma*"],
      ["Ma?","Massiv*_Candidate","Massive Star Candidate","* > Ma*"],
      ["Mas","Maser","Maser","Rad > Mas"],
      ["Mi*","Mira","Mira Variable","* > Ev* > AB* > Mi*"],
      ["Mi?","Mira_Candidate","Mira Variable Candidate","* > Ev* > AB* > Mi*"],
      ["MoC","MolCld","Molecular Cloud","ISM > Cld > MoC"],
      ["N*","Neutron*","Neutron Star","* > Ma* > N*"],
      ["N*?","Neutron*_Candidate","Neutron Star Candidate","* > Ma* > N*"],
      ["NIR","NearIR","Near-IR Source (λ < 3 µm)","IR > NIR"],
      ["No*","Nova","Classical Nova","* > ** > CV* > No*"],
      ["No?","Nova_Candidate","Classical Nova Candidate","* > ** > CV* > No*"],
      ["OH*","OH/IR*","OH/IR Star","* > Ev* > OH*"],
      ["OH?","OH/IR*_Candidate","OH/IR Star Candidate","* > Ev* > OH*"],
      ["OpC","OpenCluster","Open Cluster","Cl* > OpC"],
      ["Opt","Optical","Optical Source","Opt"],
      ["Or*","OrionV*","Orion Variable","* > Y*O > Or*"],
      ["PCG","protoClG","Proto Cluster of Galaxies","PCG"],
      ["PCG?","protoClG_Candidate","Proto Cluster of Galaxies Candidate","PCG"],
      ["PM*","HighPM*","High Proper Motion Star","* > PM*"],
      ["PN","PlanetaryNeb","Planetary Nebula","* > Ev* > PN"],
      ["PN?","PlanetaryNeb_Candidate","Planetary Nebula Candidate","* > Ev* > PN"],
      ["PaG","PairG","Pair of Galaxies","PaG"],
      ["Pe*","ChemPec*","Chemically Peculiar Star","* > Pe*"],
      ["Pe?","ChemPec*_Candidate","Chemically Peculiar Star Candidate","* > Pe*"],
      ["Pl","Planet","Extra-solar Planet","* > Pl"],
      ["Pl?","Planet_Candidate","Extra-solar Planet Candidate","* > Pl"],
      ["PoC","PartofCloud","Part of Cloud","PoC"],
      ["PoG","PartofG","Part of a Galaxy","PoG"],
      ["Psr","Pulsar","Pulsar","* > Ma* > N* > Psr"],
      ["Pu*","PulsV*","Pulsating Variable","* > V* > Pu*"],
      ["Pu?","PulsV*_Candidate","Pulsating Variable Candidate","* > V* > Pu*"],
      ["Q?","QSO_Candidate","Quasar Candidate","G > AGN > QSO"],
      ["QSO","QSO","Quasar","G > AGN > QSO"],
      ["RB?","RGB*_Candidate","Red Giant Branch star Candidate","* > Ev* > RG*"],
      ["RC*","RCrBV*","R CrB Variable","* > Pe* > RC*"],
      ["RC?","RCrBV*_Candidate","R CrB Variable Candidate","* > Pe* > RC*"],
      ["RG*","RGB*","Red Giant Branch star","* > Ev* > RG*"],
      ["RNe","RefNeb","Reflection Nebula","ISM > Cld > GNe > RNe"],
      ["RR*","RRLyrae","RR Lyrae Variable","* > Ev* > HB* > RR*"],
      ["RR?","RRLyrae_Candidate","RR Lyrae Variable Candidate","* > Ev* > HB* > RR*"],
      ["RS*","RSCVnV*","RS CVn Variable","* > ** > RS*"],
      ["RS?","RSCVnV*_Candidate","RS CVn Variable Candidate","* > ** > RS*"],
      ["RV*","RVTauV*","RV Tauri Variable","* > Ev* > RV*"],
      ["RV?","RVTauV*_Candidate","RV Tauri Variable Candidate","* > Ev* > RV*"],
      ["Rad","Radio","Radio Source","Rad"],
      ["Ro*","RotV*","Rotating Variable","* > V* > Ro*"],
      ["Ro?","RotV*_Candidate","Rotating Variable Candidate","* > V* > Ro*"],
      ["S*","S*","S Star","* > Ev* > S*"],
      ["S*?","S*_Candidate","S Star Candidate","* > Ev* > S*"],
      ["SB*","SB*","Spectroscopic Binary","* > ** > SB*"],
      ["SB?","SB*_Candidate","Spectroscopic Binary Candidate","* > ** > SB*"],
      ["SBG","StarburstG","Starburst Galaxy","G > SBG"],
      ["SC?","SuperClG_Candidate","Supercluster of Galaxies Candidate","SCG"],
      ["SCG","SuperClG","Supercluster of Galaxies","SCG"],
      ["SFR","StarFormingReg","Star Forming Region","ISM > SFR"],
      ["SN*","Supernova","SuperNova","* > SN*"],
      ["SN?","Supernova_Candidate","SuperNova Candidate","* > SN*"],
      ["SNR","SNRemnant","SuperNova Remnant","ISM > SNR"],
      ["SR?","SNRemnant_Candidate","SuperNova Remnant Candidate","ISM > SNR"],
      ["SX*","SXPheV*","SX Phe Variable","* > MS* > BS* > SX*"],
      ["St*","Stream","Stellar Stream","As* > St*"],
      ["Sy*","Symbiotic*","Symbiotic Star","* > ** > Sy*"],
      ["Sy1","Seyfert1","Seyfert 1 Galaxy","G > AGN > SyG > Sy1"],
      ["Sy2","Seyfert2","Seyfert 2 Galaxy","G > AGN > SyG > Sy2"],
      ["Sy?","Symbiotic*_Candidate","Symbiotic Star Candidate","* > ** > Sy*"],
      ["SyG","Seyfert","Seyfert Galaxy","G > AGN > SyG"],
      ["TT*","TTauri*","T Tauri Star","* > Y*O > TT*"],
      ["TT?","TTauri*_Candidate","T Tauri Star Candidate","* > Y*O > TT*"],
      ["ULX","ULX","Ultra-luminous X-ray Source","X > ULX"],
      ["UV","UV","UV-emission Source","UV"],
      ["UX?","ULX_Candidate","Ultra-luminous X-ray Source Candidate","X > ULX"],
      ["V*","Variable*","Variable Star","* > V*"],
      ["V*?","Variable*_Candidate","Variable Star Candidate","* > V*"],
      ["WD*","WhiteDwarf","White Dwarf","* > Ev* > WD*"],
      ["WD?","WhiteDwarf_Candidate","White Dwarf Candidate","* > Ev* > WD*"],
      ["WR*","WolfRayet*","Wolf-Rayet","* > Ma* > sg* > s*b > WR*"],
      ["WR?","WolfRayet*_Candidate","Wolf-Rayet Candidate","* > Ma* > sg* > s*b > WR*"],
      ["WV*","Type2Cep","Type II Cepheid Variable","* > Ev* > WV*"],
      ["WV?","Type2Cep_Candidate","Type II Cepheid Variable Candidate","* > Ev* > WV*"],
      ["X","X","X-ray Source","X"],
      ["XB*","XrayBin","X-ray Binary","* > ** > XB*"],
      ["XB?","XrayBin_Candidate","X-ray Binary Candidate","* > ** > XB*"],
      ["Y*?","YSO_Candidate","Young Stellar Object Candidate","* > Y*O"],
      ["Y*O","YSO","Young Stellar Object","* > Y*O"],
      ["a2*","alf2CVnV*","alpha2 CVn Variable","* > Pe* > a2*"],
      ["a2?","alf2CVnV*_Candidate","alpha2 CVn Variable Candidate","* > Pe* > a2*"],
      ["bC*","bCepV*","beta Cep Variable","* > Ma* > bC*"],
      ["bC?","bCepV*_Candidate","beta Cep Variable Candidate","* > Ma* > bC*"],
      ["bCG","BlueCompactG","Blue Compact Galaxy","G > bCG"],
      ["blu","blue","Blue Object","Opt > blu"],
      ["bub","Bubble","Bubble","ISM > bub"],
      ["cC*","ClassicalCep","Classical Cepheid Variable","* > Ev* > Ce* > cC*"],
      ["cm","cmRad","Centimetric Radio Source","Rad > cm"],
      ["cor","denseCore","Dense Core","ISM > cor"],
      ["dS*","delSctV*","delta Sct Variable","* > MS* > dS*"],
      ["err","Inexistent","Not an Object (Error, Artefact, ...)","err"],
      ["ev","Transient","Transient Event","ev"],
      ["flt","Filament","Interstellar Filament","ISM > flt"],
      ["gB","gammaBurst","Gamma-ray Burst","gam > gB"],
      ["gD*","gammaDorV*","gamma Dor Variable","* > MS* > gD*"],
      ["gLS","GravLensSystem","Gravitational Lens System (lens+images)","grv > gLS"],
      ["gLe","GravLens","Gravitational Lens","grv > gLS > gLe"],
      ["gam","gamma","Gamma-ray Source","gam"],
      ["glb","Globule","Globule (low-mass dark cloud)","ISM > Cld > glb"],
      ["grv","Gravitation","Gravitational Source","grv"],
      ["mR","metricRad","Metric Radio Source","Rad > mR"],
      ["mm","mmRad","Millimetric Radio Source","Rad > mm"],
      ["mul","Blend","Composite Object, Blend","mul"],
      ["of?","Outflow_Candidate","Outflow Candidate","* > Y*O > out"],
      ["out","Outflow","Outflow","* > Y*O > out"],
      ["pA*","post-AGB*","Post-AGB Star","* > Ev* > pA*"],
      ["pA?","post-AGB*_Candidate","Post-AGB Star Candidate","* > Ev* > pA*"],
      ["rB","radioBurst","Radio Burst","Rad > rB"],
      ["rG","RadioG","Radio Galaxy","G > AGN > rG"],
      ["reg","Region","Region defined in the Sky","reg"],
      ["s*b","BlueSG","Blue Supergiant","* > Ma* > sg* > s*b"],
      ["s*r","RedSG","Red Supergiant","* > Ma* > sg* > s*r"],
      ["s*y","YellowSG","Yellow Supergiant","* > Ma* > sg* > s*y"],
      ["s?b","BlueSG_Candidate","Blue Supergiant Candidate","* > Ma* > sg* > s*b"],
      ["s?r","RedSG_Candidate","Red Supergiant Candidate","* > Ma* > sg* > s*r"],
      ["s?y","YellowSG_Candidate","Yellow Supergiant Candidate","* > Ma* > sg* > s*y"],
      ["sg*","Supergiant","Evolved Supergiant","* > Ma* > sg*"],
      ["sg?","Supergiant_Candidate","Evolved Supergiant Candidate","* > Ma* > sg*"],
      ["sh","HIshell","Interstellar Shell","ISM > sh"],
      ["smm","smmRad","Sub-Millimetric Source","Rad > smm"],
      ["var","Variable","Variable source",null],
      ["vid","Void","Underdense Region of the Universe","vid"]
   ];
   const TYPE_CODES=Object.create(null),TYPE_LABELS=Object.create(null);
   // Existing display labels remain stable when the catalog uses synonymous
   // wording. Codes are case-sensitive (rG is not the stellar type RG*).
   for(let [code,label] of Object.entries(TYPES))TYPE_CODES[code]={code,label,path:''};
   for(let [code,compact,description,path] of SIMBAD_TYPE_DEFINITIONS){
      if(!own(TYPES,code))TYPES[code]=Object.values(TYPES).find(label=>label.toLowerCase()===description.toLowerCase())||description;
      let info=TYPE_CODES[code]={code,label:TYPES[code],path};
      TYPE_LABELS[compact.toLowerCase()]=TYPE_LABELS[description.toLowerCase()]=info;
   }
   for(let info of Object.values(TYPE_CODES))TYPE_LABELS[info.label.toLowerCase()]=info;
   function catalogTypeInfo(value) {
      value=text(value).trim().replace(/^Catalog object\s*\(([^()]+)\)$/i,'$1').trim();
      return TYPE_CODES[value]||TYPE_LABELS[value.toLowerCase()]||null;
   }
   // Parse explicit catalog fields; never infer coordinates from a display
   // name. New objects retain clean catalog labels; coordinate markers are opt-in.
   function parseSimbad(s,query,source) {
      s=text(s);let header=s.match(/^Object\s+(.+?)\s+---\s+(.+?)\s+---/m);
      if(!header)throw Error('SIMBAD did not identify '+query+'. Try a full identifier such as M 31, NGC 7000 or PN G075.5+01.7.');
      let coord=s.match(/Coordinates\(ICRS,ep=J2000,eq=2000\):\s*(\d+)\s+(\d+)\s+([\d.]+)\s+([+-])(\d+)\s+(\d+)\s+([\d.]+)/);
      if(!coord)throw Error('SIMBAD identifies this object but has no usable J2000 coordinates. Enter coordinates manually.');
      let components=[coord[1],coord[2],coord[3],coord[5],coord[6],coord[7]].map(Number);
      if(components.some(x=>!Number.isFinite(x))||components[0]>=24||components[1]>=60||components[2]>=60||components[3]>90||components[4]>=60||components[5]>=60||components[3]===90&&(components[4]!==0||components[5]!==0))
         throw Error('SIMBAD returned invalid J2000 coordinate components.');
      const ra=15*(Number(coord[1])+Number(coord[2])/60+Number(coord[3])/3600);
      const dec=(Number(coord[5])+Number(coord[6])/60+Number(coord[7])/3600)*(coord[4]==='-'?-1:1);
      // Request verbose names at the service, decode known cached/short names
      // locally, and retain unfamiliar responses without inventing a type.
      const type=header[2].trim(),info=catalogTypeInfo(type),label=info?info.label:type,parts=[label,'SIMBAD identifier: '+header[1].trim()];
      for(let [pattern,title] of [[/^Morphological type:\s*(.+)$/m,'Morphology'],[/^Spectral type:\s*(.+)$/m,'Spectral type'],[/^Angular size:\s*(.+)$/m,'Angular size (arcmin)'],[/^Flux V\s*:\s*(.+)$/m,'V magnitude']]){
         let m=s.match(pattern);if(m&&!/^~(?:\s|$)/.test(m[1]))parts.push(title+': '+m[1].trim());}
      let aliases=[],block=s.match(/Identifiers\s*\(\d+\):\s*\n([\s\S]*?)(?:\n\s*\n|$)/);
      if(block)aliases=block[1].split(/\n| {2,}/).map(x=>x.trim()).filter(Boolean);
      // Verbose types have no asterisk. Use the catalog hierarchy, excluding
      // nonstellar entries also placed in the stellar-evolution tree.
      let star=info&&info.path?/^\*(?: >|$)/.test(info.path)&&!['PN','PN?','Pl','Pl?','HH','out','of?'].includes(info.code):/\*|\*r/.test(type)&&type!=='Cl*',main=header[1].trim();
      // Stellarium highlights stored coordinates using this exact label.
      // Named coordinate-marker selection is available as an explicit opt-in.
      let o={designation:query.replace(/\s+marker$/i,'').trim(),name:main,nameI18n:main,type:star?'Star':'Nebula',objtype:label,
         ra:formatRA(ra),dec:formatDec(dec),constellation:constellation(ra,dec),isVisibleMarker:false,fov:2};
      o[EXT]={objectId:uuid(),imaged:false,imagedOn:'',catalogMainId:main,aliases:aliases.concat([query]),
         catalogSummary:parts.join('\n'),catalogSource:source,catalogRetrieved:stamp(),catalogClass:star?'Star':'Nebula',positionFrame:'ICRS/J2000',catalogProvider:'simbad'};
      meta(o).catalogPosition=position(o);
      let dimensions=s.match(/^Angular size:[ \t]*(.*)$/m);
      meta(o).catalogAngularSize=dimensions?parseAngularSize(dimensions[1]):null;
      return o;
   }
   function lookupLocal(doc,query) {
      let n=norm(query);if(!n)return null;let matches=refs(doc).filter(r=>identifiers(r.object).indexOf(n)>=0);
      let exact=matches.find(r=>norm(catalogIdentifier(r.object))===n||norm(meta(r.object).catalogMainId)===n);
      if(exact)return copy(exact.object);
      let unique=new Set(matches.map(r=>meta(r.object).objectId));
      return unique.size===1?copy(matches[0].object):null;
   }
   function dssField(o,arcmin) {
      if(!Number.isFinite(arcmin)||arcmin<5||arcmin>120)throw Error('Finder chart width must be 5–120 arcminutes.');
      let size=angularSize(o);return size&&size.majorArcmin>120?120:arcmin;
   }
   function finderURL(o,arcmin) {
      let p=position(o);if(p.ra===null||p.dec===null)throw Error('This object needs J2000 coordinates before a finder chart can be loaded.');
      arcmin=dssField(o,arcmin);
      return 'https://archive.stsci.edu/cgi-bin/dss_search?v=poss2ukstu_red&r='+p.ra.toFixed(8)+'&d='+p.dec.toFixed(8)+'&e=J2000&h='+arcmin+'&w='+arcmin+'&f=gif&c=none';
   }
   return {VERSION,EXT,MONTHS,own,plain,copy,text,uuid,today,stamp,norm,html,coordinate,formatRA,formatDec,position,constellation,normalizeConstellation,
      monthKey,meta,config,refs,catalogIdentifier,setStellariumLabel,same,newDocument,normalizeDocument,parseDocument,parseListImport,addList,deleteList,removeFromList,deleteObject,transferObjects,importDocuments,importListChoices,importListDestination,importObjectsAsList,exportDocument,exportObjects,setState,duplicateMatches,validateNewObject,addObject,replaceObject,
      objectType,objectTypeChoices,reevaluateObjectType,cleanNotes,cleanDocumentNotes,commentText,informationText,fetchedCatalogInformation,catalogInformation,consolidateObjectInformation,consolidateDocumentInformation,setCatalogInformation,filterInfo,BAND_LABELS,bandFilters,targetBand,setTargetBand,objectHeading,validSize,parseAngularSize,catalogSize,angularSize,sizeText,manualSize,chartFraming,defaultSkyCoverage,defaultInsetCoverage,parseOutlines,chartAppearance,chartDetails,chartObjectDetails,refreshCatalog,record,records,adjacentMonths,filter,sortedRecords,validDate,validateObject,parseSimbad,lookupLocal,dssField,finderURL};
})();
// END ABL_PORTABLE

// Sky charts use the standard engines already installed by PixInsight.
/* Astro Bucket List 0.47.1 — Styled star maps using bundled PJSR engines.
 * Copyright (c) 2026 Thorsten Glebe. SPDX-License-Identifier: MIT
 * The included engines remain part of the user's PixInsight installation.
 */
#ifndef __ABL_CHARTS
#define __ABL_CHARTS
#define SETTINGS_MODULE "AstroBucketListCharts"
#define ANNOT_SETTINGS_MODULE "AstroBucketListChartsAnnotate"
#define VERSION "0.47.1"
#define TITLE "Astro Bucket List"
#include <pjsr/astrometry/AstrometricMetadata.js>
#include <pjsr/astrometry/AstronomicalCatalogs.js>
#include <pjsr/astrometry/ObjectNameIndex.js>
// These src/scripts engines are internal components covered by this script's
// signature. Revalidate compatibility after PixInsight updates and re-sign
// AstroBucketList whenever any of these included components changes.
#include <pjsr/utility/ScriptErrors.js>
#include <../src/scripts/AnnotateImage/Entity.js>
#include <../src/scripts/AnnotateImage/GraphicProperties.js>
#include <../src/scripts/AnnotateImage/Layer.js>
#include <../src/scripts/AnnotateImage/AnnotationEngine.js>
#define RELEASE_YEAR 2026
#include <../src/scripts/SkyChartGenerator/ChartGraphics.js>
#include <../src/scripts/SkyChartGenerator/ChartStarNames.js>
#include <../src/scripts/SkyChartGenerator/ChartEngine.js>
#include <../src/scripts/SkyChartGenerator/ChartLayers.js>
#undef RELEASE_YEAR
#undef VERSION
#undef TITLE

// Query Gaia's configured database service without changing its file list or
// preferences. BestAvailable covers the full astrometric releases; DR3/SP is
// checked separately for installations that only have the spectral subset.
function ablLocalChartCatalog(makeServer=()=>new Gaia){
   if(typeof Gaia==='undefined')return null;
   for(let release of [Gaia.DataRelease_BestAvailable,Gaia.DataRelease_3_SP]){
      let server=makeServer();server.command='get-info';server.dataRelease=release;server.verbosity=0;server.generateTextOutput=false;
      if(!server.executeGlobal()||!server.isValid)continue;
      let catalog;
      switch(server.outputDataRelease){
      case Gaia.DataRelease_3:catalog=new GaiaDR3XPSDCatalog;break;
      case Gaia.DataRelease_E3:catalog=new GaiaEDR3XPSDCatalog;break;
      case Gaia.DataRelease_2:catalog=new GaiaDR2XPSDCatalog;break;
      case Gaia.DataRelease_3_SP:catalog=new GaiaDR3SPXPSDCatalog;break;
      default:continue;
      }
      return catalog;
   }
   return null;
}

// Place constellation names in the visible part of their IAU regions. The
// bundled asterism centroid can lie outside a cropped map (notably Serpens).
class ABLConstellationLayer extends ConstLinesLayer {
   constructor(showNames){super();this.showNames=showNames;this.visibleNames=[];}
   Draw(g,metadata,bounds,imageWnd,engine,entities){
      let labels=this.gprops.showLabels;this.gprops.showLabels=false;
      try{super.Draw(g,metadata,bounds,imageWnd,engine,entities);}finally{this.gprops.showLabels=labels;}
      if(!labels||!this.showNames)return;
      let regions=new Map,w=metadata.scaledWidth,h=metadata.scaledHeight;
      for(let y=0;y<17;++y)for(let x=0;x<17;++x){let px=(x+.5)*w/17,py=(y+.5)*h/17,rd=metadata.Convert_I_RD(new Point(px,py));
         if(!rd)continue;let code=ABL.constellation(rd.x,rd.y);if(!code)continue;
         let key=ABL.monthKey(code,rd.x),region=regions.get(key)||{code,n:0,x:0,y:0,points:[]};++region.n;region.x+=px;region.y+=py;region.points.push({x:px,y:py});regions.set(key,region);
      }
      let obstacles=[{x:w/2,y:h/2}];
      for(let layer of engine.layers||[])if(layer.visible&&layer.labelObjects)for(let object of layer.labelObjects){let p=metadata.Convert_RD_I(object.posRD);if(p)obstacles.push(p);}
      g.pen=this.newLabelPen();g.font=this.newLabelFont(engine.graphicsScale*engine.textScale);this.visibleNames=[];
      for(let region of regions.values())if(region.n>=4){
         let name=ABL_CONSTELLATIONS[region.code],rect=g.font.tightBoundingRect(name),x=region.x/region.n,y=region.y/region.n;
         // Prefer open sky within the same IAU region; a centroid can sit
         // directly on the target or a cluster of deep-sky object labels.
         let best=null,cost=Infinity;
         for(let p of region.points){
            if(p.x<rect.width/2+16||p.x>w-rect.width/2-16||p.y<rect.height+16||p.y>h-20)continue;
            let penalty=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);
            for(let q of obstacles)if(Math.abs(p.x-q.x)<rect.width/2+150&&Math.abs(p.y-q.y)<80)penalty+=10000000;
            if(penalty<cost){cost=penalty;best=p;}
         }
         if(best){x=best.x;y=best.y;}obstacles.push({x,y});
         x=Math.max(16,Math.min(w-rect.width-16,x-rect.width/2));y=Math.max(rect.height+16,Math.min(h-20,y));
         this.visibleNames.push(name);
         if(entities)entities.push(new LabelEntity({x0:x,y0:y-rect.height,x1:x+rect.width,y1:y},{x:x+rect.width/2,y:y-rect.height/2},0,name,this));
         else g.drawText(x,y,name);
      }
   }
}
// Keep every marker while restricting labels to a spaced subset. The native
// chart layer draws each star once and lets label placement avoid its halo.
class ABLChartCatalogLayer extends ChartCatalogLayer {
   HasLabels(object){return (!this.labelObjects||this.labelObjects.has(object))&&super.HasLabels(object);}
}
// Use PixInsight's bundled boundary polylines and projection-aware clipping.
// Dashed strokes distinguish region borders from solid constellation asterisms.
// Our existing constellation layer supplies names, so borders add no labels.
class ABLConstellationBordersLayer extends ConstBordersLayer {
   constructor(color){super();this.visible=true;this.gprops.showLabels=false;this.gprops.lineColor=color;this.gprops.lineWidth=1.5;}
   newLinePen(scale){return new Pen(this.gprops.lineColor,this.gprops.lineWidth*scale,PenStyle.Dash);}
}
function ablChartLabels(layers,metadata,width,height,details={}){
   let candidates=[],occupied=new Set,count=0;
   for(let layer of layers){layer.labelObjects=new Set;if(!layer.gprops.showLabels)continue;for(let object of layer.objects||[])if(object){let p=metadata.Convert_RD_I(object.posRD),margin=details.objectDetails&&!layer.isStar?Math.min(200,width/4):65;if(p&&p.x>margin&&p.x<width-Math.max(150,margin)&&p.y>45&&p.y<height-65)candidates.push({layer,object,p});}}
   candidates.sort((a,b)=>(a.layer.isStar?1:0)-(b.layer.isStar?1:0)||(Number.isFinite(a.object.magnitude)?a.object.magnitude:14)-(Number.isFinite(b.object.magnitude)?b.object.magnitude:14)||(b.object.diameter||0)-(a.object.diameter||0));
   let density=details.labelDensity==='sparse'?.55:details.labelDensity==='detailed'?1.6:1,area=width*height/(1440*780),stars=0;
   let cellWidth=(details.objectDetails?280:160)/Math.sqrt(density),cellHeight=(details.objectDetails?100:64)/Math.sqrt(density);
   for(let entry of candidates){
      let cell=Math.floor(entry.p.x/cellWidth)+','+Math.floor(entry.p.y/cellHeight),star=entry.layer.isStar===true;
      if(!occupied.has(cell)&&(star?stars<Math.ceil(32*density*area):count<Math.ceil(72*density*area))){occupied.add(cell);entry.layer.labelObjects.add(entry.object);if(star)++stars;else ++count;}
   }
   return count;
}
// An empty path selects PixInsight's configured local outline databases.
// Explicit Stellarium files remain an optional override stored in preferences.
function ablDefaultContourPath(){return '';}
function ablContoursAvailable(state){return !!state&&['bundled','loaded'].includes(state.status);}
// An empty path uses bundled outlines; custom files are validated separately.
// Keep source availability outside collection data and validate on selection.
function ablContourFileState(path){
   if(!path){let available=typeof NebulaOutlines!=='undefined'&&NebulaOutlines.IsAvailable();return {path:'',status:available?'bundled':'unavailable',count:0,error:available?'':'PixInsight nebula outline databases are unavailable.'};}
   if(!File.exists(path))return {path,status:'missing',count:0,error:'The selected file no longer exists.'};
   try{return {path,status:'loaded',count:ABL.parseOutlines(File.readTextFile(path)).length,error:''};}
   catch(e){return {path,status:'invalid',count:0,error:String(e)};}
}
function ablBundledContours(metadata,level=2){
   let outlines=[];
   for(let [key,entries] of NebulaOutlines.Search(metadata)){
      if(!entries.length)continue;
      let shift=NebulaOutlines.PlaceShift(metadata,entries[0].ra,entries[0].dec);
      for(let ring of NebulaOutlines.Shift(NebulaOutlines.Select(entries,level),shift.dx,shift.dy)){
         let points=[];for(let p of ring){let x=p.x;if(points.length){let previous=points[points.length-1].x;while(x-previous>180)x-=360;while(x-previous< -180)x+=360;}points.push(new Point(x,p.y));}
         if(points.length>2){let first=points[0],last=points[points.length-1];if(first.x!==last.x||first.y!==last.y)points.push(new Point(first.x,first.y));outlines.push({name:key,points});}
      }
   }
   return outlines;
}
class ABLNebulaContoursLayer extends Layer {
   constructor(outlines,style){super('Nebula contours','Local catalog boundaries');this.outlines=outlines;this.visible=true;this.count=0;this.color=style.vintage?0xffa18557:0xff739584;}
   Draw(g,metadata){
      this.count=0;g.pen=new Pen(this.color,1.5);let w=metadata.scaledWidth,h=metadata.scaledHeight;
      for(let outline of this.outlines){
         let visible=false;
         for(let line of GridLayerBase.convertLines(metadata,outline.points)){
            // The graphics context clips to the sky rectangle. Count only
            // polylines whose projected bounds intersect this map.
            let bounds=line.reduce((b,p)=>({x0:Math.min(b.x0,p.x),y0:Math.min(b.y0,p.y),x1:Math.max(b.x1,p.x),y1:Math.max(b.y1,p.y)}),{x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity});
            if(bounds.x1<0||bounds.x0>w||bounds.y1<0||bounds.y0>h)continue;
            g.drawPolyline(line);visible=true;
         }
         if(visible)++this.count;
      }
   }
}
// Appearance affects drawing only. The styles share the same projection,
// catalog selection, magnitude limits, label spacing and angular scale.
function ablChartStyle(key){
   return key==='observing-atlas'?{
      key:'observing-atlas',name:'Observing Atlas',face:'DejaVu Sans',vintage:false,atlas:true,
      sky:0xffffffff,band:0xffffffff,ink:0xff20252b,secondary:0xff56616b,
      star:0xff111111,faintStar:0xff4c5054,grid:0xffdce1e6,gridLabel:0xff687785,
      asterism:0xff7390ae,constellation:0xff8c9eae,object:0xff42756b,objectLabel:0xff253b48,
      accent:0xff315d83,rule:0xffb9c6d1,border:0xffb19d9d
   }:key==='vintage-atlas'?{
      key:'vintage-atlas',name:'Vintage Atlas',face:'DejaVu Serif',vintage:true,
      sky:0xfff3e9d2,band:0xffe9dcc0,ink:0xff43382a,secondary:0xff705e47,
      star:0xff43382a,faintStar:0xff7b6850,grid:0xffc6b798,gridLabel:0xff887455,
      asterism:0xffa18b6c,constellation:0xff766044,object:0xff806243,objectLabel:0xff513b26,
      accent:0xff994a32,rule:0xffbba580,border:0xffa1805e
   }:{
      key:'modern-editorial',name:'Modern Editorial',face:'DejaVu Sans',vintage:false,
      sky:0xff000000,band:0xff141c26,ink:0xffedf3f7,secondary:0xffb5c4d2,
      star:0xffe4ebf1,faintStar:0xff92a3b3,grid:0xff29333e,gridLabel:0xff8a9bab,
      asterism:0xff60768a,constellation:0xffa8bacb,object:0xff89aebc,objectLabel:0xffe3edf5,
      accent:0xff8edbd1,rule:0xff3b4b5d,border:0xff6f829b
   };
}
// List the installed, fixed-sky local annotation catalogs with their purpose.
// Online VizieR and time-dependent solar-system catalogs are deliberately not
// queried by this offline J2000 finder. Availability is checked at runtime.
function ablChartCatalogs(){
   return [
      {key:'messier',label:'Messier',content:'Bright deep-sky objects',catalog:new MessierCatalog},
      {key:'ngc',label:'NGC/IC',content:'Galaxies, nebulae, clusters',catalog:new NGCICCatalog},
      {key:'caldwell',label:'Caldwell',content:'Deep-sky selection',catalog:typeof CaldwellCatalog!=='undefined'?new CaldwellCatalog:null},
      {key:'collinder',label:'Collinder',content:'Open clusters',catalog:typeof CollinderCatalog!=='undefined'?new CollinderCatalog:null},
      {key:'snr',label:'Green SNR',content:'Supernova remnants',catalog:typeof SNRCatalog!=='undefined'?new SNRCatalog:null},
      {key:'wise-hii',label:'WISE H II',content:'H II regions and candidates',catalog:typeof WISEHIICatalog!=='undefined'?new WISEHIICatalog:null},
      {key:'mandel-wilson',label:'Mandel–Wilson',content:'Integrated flux nebulae',catalog:typeof MandelWilsonCatalog!=='undefined'?new MandelWilsonCatalog:null}
   ].map(entry=>{entry.available=!!entry.catalog&&File.exists(entry.catalog.catalogPath);
      entry.hasMagnitude=!!entry.catalog&&entry.catalog.fields.includes('Magnitude');return entry;});
}
function ablExtraChartCatalogs(){return ablChartCatalogs().slice(2);}
function ablChartCatalogKeys(options){
   let selected=Array.isArray(options.extraCatalogs)?options.extraCatalogs:[];
   return ['caldwell','collinder','snr','wise-hii','mandel-wilson'].filter(key=>selected.includes(key));
}
function ablChartMagnitudeLimits(degrees){return {normal:Math.min(14,9-2*Math.log10(degrees/30)),faint:Math.min(16,11-2*Math.log10(degrees/30))};}
// Normalize per-catalog display settings for rendering and cache keys. When
// catalogs[key] is absent, derive defaults from ngc/faintNGC/extraCatalogs.
// Installed catalog capabilities determine which properties are effective.
function ablChartCatalogOptions(options={}){
   return ablChartCatalogs().map(entry=>{
      let raw=options.catalogs&&options.catalogs[entry.key],legacy=entry.key==='messier'||entry.key==='ngc'&&(options.ngc===true||options.faintNGC===true)||ablChartCatalogKeys(options).includes(entry.key);
      return {key:entry.key,enabled:entry.available&&(raw?raw.enabled===true:legacy),labels:!raw||raw.labels!==false,
         mode:entry.hasMagnitude&&raw&&['auto','manual','unlimited'].includes(raw.mode)?raw.mode:'auto',
         magnitude:entry.hasMagnitude&&raw&&raw.mode==='manual'&&Number.isFinite(raw.magnitude)?Math.max(-5,Math.min(25,raw.magnitude)):null,
         faint:!raw&&entry.key==='ngc'&&options.faintNGC===true};
   });
}
function ablCatalogMagnitude(entry,choice,degrees){
   if(!entry.hasMagnitude||choice.mode==='unlimited')return Catalog.NullMag;
   if(choice.mode==='manual'&&choice.magnitude!==null)return choice.magnitude;
   let limits=ablChartMagnitudeLimits(degrees);return choice.key==='messier'||choice.key==='ngc'&&!choice.faint?limits.normal:limits.faint;
}
// A table chart snapshots visible rows, never export checks or highlighted rows.
// Keep identity, coordinates and sizes in its cache key; numbering follows the
// table order, including rows without coordinates in the printed object key.
function ablTableChartTargets(records){
   return records.map(r=>({id:r.id,designation:r.designation,name:ABL.objectHeading(r.designation,r.name),ra:r.ra,dec:r.dec,
      size:r.size?ABL.copy(r.size):null,type:r.objectType,displayName:r.name,aliases:(ABL.meta(r.object).aliases||[]).slice()}));
}
function ablChartTargetPosition(t){return Number.isFinite(t.ra)&&t.ra>=0&&t.ra<360&&Number.isFinite(t.dec)&&Math.abs(t.dec)<=90;}
// Both projections use a tangent plane in radians. Keep the angular field,
// the fitting calculation and the center scale bar on the same geometry.
function ablChartProjection(coverage,choice='auto'){
   return choice==='gnomonic'||choice==='stereographic'?choice:coverage<=20?'gnomonic':'stereographic';
}
function ablChartPlaneWidth(degrees,projection){
   return projection==='stereographic'?4*Math.tan(degrees*Math.PI/720):2*Math.tan(degrees*Math.PI/360);
}
function ablMilkyWayAvailable(){
   try{return typeof MilkyWayLayer!=='undefined'&&typeof XESDServer!=='undefined'&&XESDServer.isAvailable('MilkyWay');}catch(e){return false;}
}
function ablTableChartFrame(targets,minimum=45,projection='auto'){
   const rad=Math.PI/180,width=1340,height=680,valid=targets.filter(ablChartTargetPosition);
   if(!valid.length)throw Error(targets.length?'The shown objects need coordinates. Use Edit object or Update catalogs.':'No objects match the active filters.');
   const vector=(ra,dec)=>[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)];
   const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
   const unit=a=>{let n=Math.hypot(...a);if(n<1e-10)throw Error('These objects cannot fit in one finder chart. Narrow the filters.');return a.map(v=>v/n);};
   let centers=valid.map(t=>vector(t.ra*rad,t.dec*rad)),initial=unit(centers.reduce((a,v)=>a.map((x,i)=>x+v[i]),[0,0,0])),points=[];
   for(let t of valid){
      let ra=t.ra*rad,dec=t.dec*rad,c=vector(ra,dec),east=[-Math.sin(ra),Math.cos(ra),0],north=[-Math.sin(dec)*Math.cos(ra),-Math.sin(dec)*Math.sin(ra),Math.cos(dec)];points.push(c);
      // Enclose the full major diameter without inventing a position angle.
      let radius=t.size?t.size.majorArcmin/120*rad:0;
      if(radius)for(let i=0;i<32;++i){let a=i*Math.PI/16;points.push(c.map((v,j)=>v*Math.cos(radius)+(east[j]*Math.cos(a)+north[j]*Math.sin(a))*Math.sin(radius)));}
   }
   const fit=kind=>{
      let center=initial.slice(),ra,dec,east,north,bounds;
      for(let pass=0;pass<4;++pass){
         ra=Math.atan2(center[1],center[0]);dec=Math.asin(Math.max(-1,Math.min(1,center[2])));
         east=[-Math.sin(ra),Math.cos(ra),0];north=[-Math.sin(dec)*Math.cos(ra),-Math.sin(dec)*Math.sin(ra),Math.cos(dec)];
         bounds={x0:Infinity,x1:-Infinity,y0:Infinity,y1:-Infinity};
         for(let p of points){let z=dot(p,center);if(z<=.001)throw Error('These objects span too much sky for one finder chart. Narrow the filters.');
            let f=kind==='stereographic'?2/(1+z):1/z,x=dot(p,east)*f,y=dot(p,north)*f;
            bounds.x0=Math.min(bounds.x0,x);bounds.x1=Math.max(bounds.x1,x);bounds.y0=Math.min(bounds.y0,y);bounds.y1=Math.max(bounds.y1,y);}
         if(pass<3){let x=(bounds.x0+bounds.x1)/2,y=(bounds.y0+bounds.y1)/2,r=Math.hypot(x,y);
            if(r>1e-12){let a=kind==='stereographic'?2*Math.atan(r/2):Math.atan(r);center=unit(center.map((v,i)=>v*Math.cos(a)+(x*east[i]+y*north[i])*Math.sin(a)/r));}}
      }
      // Reserve marker space on both axes, including the shorter map height.
      let plane=Math.max(Math.abs(bounds.x0),Math.abs(bounds.x1))/(1-120/width);
      plane=Math.max(plane,Math.max(Math.abs(bounds.y0),Math.abs(bounds.y1))*width/(height-120));
      let angle=kind==='stereographic'?4*Math.atan(plane/2):2*Math.atan(plane);
      let coverage=Math.ceil(Math.max(minimum,angle/rad)*100)/100;
      if(coverage>170)throw Error('These objects need more than 170° coverage. Narrow the filters.');
      return {ra:(ra/rad+360)%360,dec:dec/rad,coverage,projection:kind,plotted:valid.length,missing:targets.length-valid.length};
   };
   let kind=ablChartProjection(minimum,projection),frame;
   try{frame=fit(kind);}catch(e){if(projection!=='auto'||kind!=='gnomonic')throw e;frame=fit('stereographic');}
   if(projection==='auto'&&frame.projection==='gnomonic'&&frame.coverage>20)frame=fit('stereographic');
   // Rounding near the automatic threshold must not switch the renderer back
   // to a different projection than the one used to fit the group.
   if(projection==='auto'&&frame.projection==='stereographic')frame.coverage=Math.max(20.01,frame.coverage);
   return frame;
}
// Explicit table targets are always marked, independently of catalog switches,
// magnitude cutoffs and label density. Number labels use leader lines where
// needed; the complete names appear in a separate key below the sky map.
function ablDrawTableTargets(recording,metadata,targets,style){
   let g=recording,labels=[],markers=[];const w=metadata.width,h=metadata.height;
   try{
      g.antialiasing=true;g.textAntialiasing=true;g.font=new Font(style.face,23,'px');g.font.bold=true;
      for(let i=0;i<targets.length;++i){let t=targets[i];if(!ablChartTargetPosition(t))continue;
         let p=metadata.Convert_RD_I(new Point(t.ra,t.dec));
         if(!p||p.x<0||p.y<0||p.x>w||p.y>h)throw Error('A table target fell outside the chart. Narrow the filters and try again.');
         markers.push({number:i+1,x:p.x,y:p.y});
      }
      for(let p of markers){
         let text=String(p.number),tw=g.font.width(text)+12,th=31,best=null,cost=Infinity;
         for(let radius of [30,50,75,105,140])for(let a=0;a<12;++a){let x=p.x+radius*Math.cos(a*Math.PI/6)-tw/2,y=p.y+radius*Math.sin(a*Math.PI/6)-th/2;
            if(x<5||y<5||x+tw>w-5||y+th>h-5)continue;
            let overlap=labels.filter(b=>x<b.x+b.w+4&&x+tw+4>b.x&&y<b.y+b.h+4&&y+th+4>b.y).length;
            let obscured=markers.filter(m=>m.x>x-8&&m.x<x+tw+8&&m.y>y-8&&m.y<y+th+8).length;
            let score=overlap*100000+obscured*10000+radius+a*.01;if(score<cost){cost=score;best={x,y,w:tw,h:th};}
         }
         if(!best)best={x:Math.max(5,Math.min(w-tw-5,p.x+14)),y:Math.max(5,Math.min(h-th-5,p.y+14)),w:tw,h:th};
         labels.push(best);g.pen=new Pen(style.accent,1);g.drawLine(p.x,p.y,best.x+tw/2,best.y+th/2);
         g.pen=new Pen(style.sky,5);g.strokeEllipse(p.x-8,p.y-8,p.x+8,p.y+8);
         g.pen=new Pen(style.accent,2.5);g.strokeEllipse(p.x-8,p.y-8,p.x+8,p.y+8);
         g.fillRect(best.x,best.y,best.x+tw,best.y+th,new Brush(style.accent));g.pen=new Pen(style.band);g.drawText(best.x+6,best.y+24,text);
      }
   }finally{g.end();}
   return markers;
}
function ablTableChartKey(targets,font,details){
   const columns=4,columnWidth=348;let cells=[],rowHeights=[];
   for(let i=0;i<targets.length;++i){let t=targets[i],text=(i+1)+'. '+t.name;
      if(!ablChartTargetPosition(t))text+=' · coordinates missing';
      else if(details.objectDetails)text+=' · '+t.type+(t.size?' · '+ABL.sizeText(t.size):'');
      let lines=[],line='';for(let c of text){if(line&&font.width(line+c)>columnWidth-24){
         let split=line.lastIndexOf(' ');if(split>0){lines.push(line.slice(0,split));line=line.slice(split+1);}else{lines.push(line);line='';}
      }line+=c;}if(line)lines.push(line);
      let row=Math.floor(i/columns);rowHeights[row]=Math.max(rowHeights[row]||0,lines.length*27+14);cells.push({column:i%columns,row,lines});
   }
   return {cells,rowHeights,height:60+rowHeights.reduce((a,b)=>a+b,0),columnWidth};
}
// A small adapter keeps the manager's catalog choices and label-density
// preferences while using PixInsight's vector symbols and label placement.
class ABLSkyChartEngine extends SkyChartEngine {
   constructor(details,style){super();this.ablDetails=details;this.ablStyle=style;this.ablOutlineData=[];this.ablLabelCount=0;this.ablOutlineCount=0;}
   LoadLayers(){
      super.LoadLayers();
      if(this.layerErrors.length)throw Error(this.layerErrors.join('\n'));
      let details=this.ablDetails,byName=new Map,used=new Set;
      this.ablOutlineCount=0;
      if(details.contours){
         let data=details.contourPath?this.ablOutlineData:ablBundledContours(this.metadata,details.outlineLevel);
         for(let outline of data){let key=NebulaOutlines.Key(outline.name);if(!byName.has(key))byName.set(key,[]);byName.get(key).push(outline);}
         this.ablOutlineData=data;
      }
      for(let layer of this.layers)if(layer.visible&&layer instanceof ABLChartCatalogLayer){
         layer.isStar=layer.isStarLayer;
         for(let o of layer.objects||[])if(o){
            if(layer.isStarLayer){
               let name=details.starNames&&layer.catalog instanceof NamedStarsCatalog?String(o['Common name']||o.name||''):'';
               if(name&&layer.catalog.translateGreekLetters)name=layer.catalog.translateGreekLetters(name);
               o['ABL star label']=[name,details.starMagnitudes&&Number.isFinite(o.magnitude)?'mag '+o.magnitude.toFixed(1):''].filter(Boolean).join(' · ');
            }else{
               o['ABL type']=o.Type||ChartSymbols.TypeNames[o.chartType]||'';
               o['ABL details']=ABL.chartObjectDetails(Object.assign({},o,{Type:''}));
               // Native catalog markers use the actual outline when present.
               // Unlisted nebulae remain in the separate context layer below.
               for(let name of [o.name,o['NGC/IC']]){let key=NebulaOutlines.Key(name),outlines=byName.get(key);if(!outlines)continue;
                  o.outline=outlines.map(outline=>outline.points);used.add(key);break;
               }
            }
         }
      }
      if(details.contours){
         this.ablOutlineCount=Array.from(used).reduce((n,key)=>n+byName.get(key).length,0);
         this.ablContours=new ABLNebulaContoursLayer(this.ablOutlineData.filter(o=>!used.has(NebulaOutlines.Key(o.name))),this.ablStyle);
         this.layers.unshift(this.ablContours);
      }
   }
   RemoveDuplicates(){
      super.RemoveDuplicates();
      this.ablLabelCount=ablChartLabels(this.layers.filter(l=>l.visible&&l instanceof ABLChartCatalogLayer),this.metadata,this.frame.width,this.frame.height,this.ablDetails);
   }
}

// Interaction metadata uses the same projection and frame as the drawing.
// Keep only catalog facts, never native catalog/engine references. Catalog
// symbols with centers outside the map and outline-only context are not picks.
function ablChartPick(record,catalog,isStar=false){
   let name=String(record.name||'').trim(),type=isStar?'Star':String(record.Type||record['ABL type']||'').trim();
   let aliases=[name,record['NGC/IC'],record['Common name']].filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim());
   let size=null;
   if(!isStar&&Number.isFinite(record.diameter)&&record.diameter>0){
      size={majorArcmin:record.diameter*60,minorArcmin:Number.isFinite(record.axisRatio)&&record.axisRatio>1?record.diameter*60/record.axisRatio:null,source:'PixInsight local catalog: '+catalog};
      if(!ABL.validSize(size))size=null;
   }
   // Gaia XPSD records intentionally omit source identifiers. A positional
   // caption identifies the symbol on screen but is never a fabricated ID.
   return {designation:name,name:String(record['Common name']||name||(isStar?'Star at '+ABL.formatRA(record.posRD.x)+' '+ABL.formatDec(record.posRD.y):'')),type,aliases,ra:record.posRD.x,dec:record.posRD.y,
      magnitude:Number.isFinite(record.magnitude)&&Math.abs(record.magnitude)<90?record.magnitude:null,size,catalog,objectId:''};
}
function ablChartPicks(engine,object,targets,centerPick=null){
   let hits=[],frame=engine.frame,metadata=engine.metadata;
   const add=(pick,p,priority)=>{
      if(p&&p.x>=0&&p.y>=0&&p.x<=metadata.width&&p.y<=metadata.height&&(pick.designation||pick.name))
         hits.push(Object.assign(pick,{x:p.x+frame.x0,y:p.y+frame.y0,priority}));
   };
   for(let star of engine.chartStars)add(ablChartPick(star.record,star.layer.catalog.name,true),star,0);
   for(let layer of engine.layers)if(layer.visible&&layer instanceof ABLChartCatalogLayer&&!layer.isStarLayer&&layer.gprops.showMarkers){
      let records=layer.GetObjects();if(!records||layer.maxObjects>=0&&records.length>layer.maxObjects)continue;
      for(let o of records)if(o){
         // An outline with no projected segments is not visible in this map.
         if(o.outline&&!CatalogLayer.ProjectOutline(metadata,o.outline,o.outlineOpen===true).length)continue;
         add(ablChartPick(o,layer.catalog.name),metadata.Convert_RD_I(o.posRD),1);
      }
   }
   // Explicit table targets take precedence over coincident context markers.
   let explicit=targets||(centerPick?[]:[{id:ABL.meta(object).objectId,designation:ABL.catalogIdentifier(object),name:ABL.meta(object).displayName||object.name||object.nameI18n,
      ...ABL.position(object),size:ABL.angularSize(object),type:ABL.objectType(object),aliases:ABL.meta(object).aliases||[]}]);
   if(!targets&&centerPick)add(ABL.copy(centerPick),metadata.Convert_RD_I(new Point(centerPick.ra,centerPick.dec)),2);
   for(let t of explicit)if(ablChartTargetPosition(t)){
      let aliases=Array.from(new Set([t.designation||t.name].concat(t.aliases||[]))),keys=new Set(aliases.map(ABL.norm));
      let catalogHit=hits.find(h=>h.aliases.some(a=>keys.has(ABL.norm(a))));
      add({objectId:t.id||'',designation:t.designation||t.name,name:t.displayName||t.name||t.designation,type:t.type||'',
         size:t.size||null,ra:t.ra,dec:t.dec,magnitude:catalogHit?catalogHit.magnitude:null,aliases,
         catalog:catalogHit?catalogHit.catalog:'Collection target'},metadata.Convert_RD_I(new Point(t.ra,t.dec)),2);
   }
   return hits;
}
function ablOffsetChartPicks(hits,x,y){return hits.map(h=>Object.assign({},h,{x:h.x+x,y:h.y+y}));}
// A uniform grid bounds mouse-move work even in a dense local star field.
// Distance is measured on screen, with a fixed logical-pixel pick tolerance.
class ABLChartHitIndex {
   constructor(hits){
      this.cells=new Map;this.cellSize=32;this.x0=this.y0=Infinity;this.x1=this.y1=-Infinity;
      for(let h of hits||[]){let ix=Math.floor(h.x/this.cellSize),iy=Math.floor(h.y/this.cellSize),key=ix+','+iy;
         this.x0=Math.min(this.x0,ix);this.x1=Math.max(this.x1,ix);this.y0=Math.min(this.y0,iy);this.y1=Math.max(this.y1,iy);
         if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(h);
      }
   }
   hit(x,y,scale,tolerance=9){
      if(!Number.isFinite(scale)||scale<=0||!Number.isFinite(x)||!Number.isFinite(y))return null;
      let radius=tolerance/scale,best=null,distance=Infinity;
      // A long printed object key can make Fit very small. Bound the search
      // to occupied map cells, not the enormous inverse screen-pixel radius.
      for(let ix=Math.max(this.x0,Math.floor((x-radius)/this.cellSize));ix<=Math.min(this.x1,Math.floor((x+radius)/this.cellSize));++ix)
         for(let iy=Math.max(this.y0,Math.floor((y-radius)/this.cellSize));iy<=Math.min(this.y1,Math.floor((y+radius)/this.cellSize));++iy)
            for(let h of this.cells.get(ix+','+iy)||[]){let d=Math.hypot(h.x-x,h.y-y)*scale;
               if(d>tolerance)continue;
               // Prefer the closest symbol; prefer an explicit target when
               // its center is effectively coincident (within two pixels).
               if(!best||d<distance-2||Math.abs(d-distance)<=2&&h.priority>best.priority){best=h;distance=d;}
            }
      return best;
   }
}
function ablChartPickObject(hit){
   let o=ablLocalRecord({name:hit.designation,names:hit.aliases||[],type:hit.type,ra:hit.ra,dec:hit.dec,
      magnitude:hit.magnitude,catalogs:[hit.catalog]},hit.designation);
   o.name=o.nameI18n=hit.name||hit.designation;
   if(!hit.designation){
      let m=ABL.meta(o);delete m.catalogMainId;m.aliases=[];
      m.catalogSummary=['Star','Local catalogs: '+hit.catalog,Number.isFinite(hit.magnitude)?'Catalog magnitude: '+hit.magnitude:'',
         'This local catalog record has no source identifier. Coordinates are J2000.'].filter(Boolean).join('\n');
   }
   if(ABL.validSize(hit.size))ABL.meta(o).catalogAngularSize=ABL.copy(hit.size);
   return o;
}
function ablChartPickMatches(doc,hit){
   if(hit.objectId){let r=ABL.refs(doc).find(r=>ABL.meta(r.object).objectId===hit.objectId);if(r)return [{id:hit.objectId,object:r.object}];}
   if(!hit.designation)return [];
   return ABL.duplicateMatches(doc,ablChartPickObject(hit));
}
function ablChartPickText(hit){
   if(!hit)return '';
   return [hit.designation?ABL.objectHeading(hit.designation,hit.name):hit.name,hit.type,'Size: '+ABL.sizeText(hit.size),
      Number.isFinite(hit.magnitude)?'mag '+Number(hit.magnitude.toFixed(2)):'Magnitude unavailable'].filter(Boolean).join(' · ');
}

// The same recording supplies the embedded preview, the image and both vector
// formats. No temporary image window or rasterized star field is needed.
function ablSkyChart(object,fieldArcmin,skyDegrees,path,options={}){
   const mapOnly=options._mapOnly===true,position=ABL.position(object),width=mapOnly?600:1440,height=mapOnly?600:780,header=80;
   if(!mapOnly){TGFileProtection.assertOutsideInstallation(path,'Finder chart image');if(File.exists(path)||File.directoryExists(path))throw Error('The temporary chart path is already occupied.');}
   const targets=Array.isArray(options.tableTargets)?options.tableTargets:null;
   const details=ABL.chartDetails(targets?Object.assign({},options,{inset:false}):options),style=ablChartStyle(options.style);
   if(position.ra===null||position.dec===null)throw Error('This object needs valid coordinates first.');
   if(!Number.isFinite(fieldArcmin)||fieldArcmin<1||fieldArcmin>1800||!Number.isFinite(skyDegrees)||skyDegrees<.1||skyDegrees>(targets?170:120))throw Error('Choose valid survey and sky coverage.');
   if(details.inset&&(!Number.isFinite(details.insetDegrees)||details.insetDegrees<.1||details.insetDegrees>=skyDegrees))throw Error('Choose a close-up coverage of at least 0.1° and smaller than the overview.');
   let engine=new ABLSkyChartEngine(details,style);
   const projection=ablChartProjection(skyDegrees,details.projection);
   engine.centerRA=position.ra;engine.centerDec=position.dec;engine.projection=projection==='gnomonic'?Projection.Gnomonic:Projection.Stereographic;
   // Native fieldWidth measures the plane, not edge-to-edge sky coverage.
   engine.fieldWidth=ablChartPlaneWidth(skyDegrees,projection)*180/Math.PI;
   engine.pageFormat=SkyChartEngine.Custom;engine.pageWidth=width/SkyChartEngine.PX_PER_MM;engine.pageHeight=height/SkyChartEngine.PX_PER_MM;
   engine.pageMargin=2;engine.showLegend=false;engine.observationTime=2451545.0;engine.starColors=details.starColors;
   engine.backgroundColor=style.band;engine.mapBackgroundColor=style.sky;engine.frameColor=style.ink;engine.leaderLineColor=style.secondary;
   engine.starMinSize=2.5*details.starSize/100;engine.starMaxSize=18*details.starSize/100;engine.starHalos=true;engine.starHalo=1.8*details.starSize/100;engine.haloMapColor=true;engine.starOutlines=false;
   // Normal preserves the established depth. Sparse/Dense shift the limiting
   // magnitude by one; availability still depends on the local star catalog.
   engine.autoStarLimit=false;engine.starLimitMagnitude=Math.min(15,Math.max(5.5,6.7-3*Math.log10(skyDegrees/30))+({sparse:-1,normal:0,dense:1}[details.starDensity]));
   // Per-catalog limits are authoritative, including No limit. Do not impose
   // a second, hidden magnitude cutoff through the engine's global default.
   engine.autoDSOLimit=false;engine.dsoLimitMagnitude=99;engine.dsoMinSize=7;engine.labelReductionFactor=.85;
   if(!style.atlas){engine.dsoLineColors=ChartSymbols.TypeNames.map(()=>style.object);engine.dsoFillColors=ChartSymbols.TypeNames.map(()=>((style.object&0xffffff)|0x18000000)>>>0);}
   let grid=new ChartGridLayer;grid.density=3;grid.gprops.lineColor=style.grid;grid.gprops.labelColor=style.gridLabel;grid.gprops.labelSize=16;grid.gprops.labelFace=style.face;
   let constellationLayer=new ABLConstellationLayer(skyDegrees>=5);constellationLayer.gprops.lineColor=style.asterism;constellationLayer.gprops.lineWidth=1.5;constellationLayer.gprops.labelColor=style.constellation;constellationLayer.gprops.labelFace=style.face;constellationLayer.gprops.labelSize=28;constellationLayer.gprops.labelItalic=style.vintage;
   let milkyWayAvailable=ablMilkyWayAvailable(),milkyWay=details.milkyWay&&milkyWayAvailable;
   engine.layers=[];
   if(milkyWay){let layer=new MilkyWayLayer;
      // Native fills preserve the catalog's isophotes. Style-aware tints are
      // deliberately subtle; each overlapping brightness level adds opacity.
      let tint=style.vintage?0x806846:style.atlas?0x6884a5:0x9aadc9;
      layer.gprops.lineColor=((Math.round(details.milkyWayStrength*2.55)<<24)|tint)>>>0;engine.layers.push(layer);}
   engine.layers.push(grid);const showBorders=options.borders!==false;if(showBorders)engine.layers.push(new ABLConstellationBordersLayer(style.border));engine.layers.push(constellationLayer);
   let entries=ablChartCatalogs(),choices=ablChartCatalogOptions(options),catalogLayers=[];
   for(let i=0;i<entries.length;++i){let entry=entries[i],choice=choices[i];if(!entry.available||!choice.enabled)continue;
      let layer=new ABLChartCatalogLayer(entry.catalog);layer.visible=true;layer.catalog.showOutlines=false;layer.catalog.magMax=ablCatalogMagnitude(entry,choice,skyDegrees);
      layer.gprops.showLabels=choice.labels;layer.gprops.labelFields=['','','','','Name','','',details.objectDetails?'ABL details':''];
      if(details.objectDetails)layer.gprops.labelFields[0]='ABL type';
      layer.gprops.labelFace=style.face;layer.gprops.labelSize=details.objectDetails?16:19;layer.gprops.labelColor=style.objectLabel;layer.gprops.lineWidth=1.4;
      catalogLayers.push(layer);engine.layers.push(layer);
   }
   let local=ablLocalChartCatalog(),starLayers=[];
   for(let catalog of [new NamedStarsCatalog].concat(local?[local]:[])){
      let layer=new ABLChartCatalogLayer(catalog);layer.visible=true;layer.gprops.lineColor=style.star;layer.gprops.labelColor=style.secondary;layer.gprops.labelFace=style.face;layer.gprops.labelSize=17;
      layer.gprops.showLabels=details.starNames||details.starMagnitudes;layer.gprops.labelFields=['','','','','ABL star label','','',''];starLayers.push(layer);engine.layers.push(layer);
   }
   if(details.contours&&details.contourPath){if(!File.exists(details.contourPath))throw Error('The selected Stellarium outline file is unavailable. Choose another file or Use bundled in Configuration.');engine.ablOutlineData=options.outlineData||ABL.parseOutlines(File.readTextFile(details.contourPath));}
   let map=engine.BuildChart(),targetMarkers=[],picks=ablChartPicks(engine,object,targets,options.centerPick);
   if(targets){map.pushState();try{map.translateTransformation(engine.frame.x0,engine.frame.y0);targetMarkers=ablDrawTableTargets(map,engine.metadata,targets,style);}finally{map.popState();}}
   let result={style:style.key,styleName:style.name,projection,projectionName:projection==='gnomonic'?'Gnomonic':'Stereographic',
      milkyWay,milkyWayAvailable,starLimit:engine.chartStarLimit,starColors:engine.starColors,starSize:details.starSize,
      coloredStars:engine.chartStars.filter(s=>Number.isFinite(s.record.chartBV)).length,borders:showBorders,catalog:local?'Local '+local.name+' and bundled stars':'Bundled named and bright stars',localGaia:!!local,
      stars:engine.chartStats.stars,objectCount:engine.chartStats.deepSky,labelCount:engine.ablLabelCount,starLabelCount:starLayers.reduce((n,l)=>n+(l.labelObjects?l.labelObjects.size:0),0),
      contourCount:(engine.ablContours?engine.ablContours.count:0)+engine.ablOutlineCount,contourSource:details.contourPath?'Stellarium file':'PixInsight local databases',details,targetMarkers,tableTargetCount:targets?targets.length:0,
      catalogs:catalogLayers.map(l=>l.catalog.name),catalogOptions:choices,constellations:constellationLayer.visibleNames,background:style.band};
   if(mapOnly)return Object.assign(result,{recording:map,picks});
   let inset=details.inset?ablSkyChart(object,fieldArcmin,details.insetDegrees,'',Object.assign({},options,{inset:false,_mapOnly:true})):null;
   let title=ABL.catalogIdentifier(object)||'Target',keyFont=new Font(style.face,20,'px'),key=targets?ablTableChartKey(targets,keyFont,details):null;
   let legendFont=new Font(style.face,17,'px'),items=engine.SymbolLegendItems(),legendHeight=28,legend=engine.SymbolLegendLayout(items,legendFont,legendHeight);
   while(legend.width>width-48&&legendHeight<168){legendHeight+=28;legend=engine.SymbolLegendLayout(items,legendFont,legendHeight);}
   const footer=100+(items.length?legendHeight+16:0),recording=new ChartRecording(width+(inset?640:0),header+height+footer+(key?key.height:0)),g=recording;
   ChartFill.Rect(g,0,0,recording.width,recording.height,new Brush(style.band));
   g.pushState();g.translateTransformation(0,header);map.paint(g);g.popState();
   g.antialiasing=true;g.textAntialiasing=true;
   let cx=width/2,cy=header+height/2;
   if(!targets){g.pen=new Pen(style.sky,6);for(let pass=0;pass<2;++pass){if(pass)g.pen=new Pen(style.accent,2.5);g.drawLine(cx-23,cy,cx-9,cy);g.drawLine(cx+9,cy,cx+23,cy);g.drawLine(cx,cy-23,cx,cy-9);g.drawLine(cx,cy+9,cx,cy+23);}}
   g.pen=new Pen(style.vintage?style.rule:style.accent,style.vintage?1:3);g.drawLine(24,7,width-24,7);if(style.vintage)g.drawLine(24,11,width-24,11);
   g.pen=new Pen(style.ink);let titleFont=new Font(style.face,31,'px');titleFont.bold=!style.vintage;g.font=titleFont;
   let heading=title;while(heading.length>1&&g.font.width(heading)>850)heading=heading.slice(0,-1);if(heading!==title)heading+='…';g.drawText(24,40,heading);
   g.font=new Font(style.face,20,'px');g.pen=new Pen(style.secondary);g.drawText(24,65,targets?targets.length+' shown objects · '+targetMarkers.length+' plotted'+(targetMarkers.length<targets.length?' · '+(targets.length-targetMarkers.length)+' without coordinates':''):'Apparent size  '+ABL.sizeText(ABL.angularSize(object)));
   g.drawText(1000,34,'Field width  '+skyDegrees+'°');g.drawText(1000,64,'N ↑   E ←   ·   J2000 · '+result.projectionName);
   let y=header+height;g.pen=new Pen(style.rule);g.drawLine(24,y,width-24,y);g.font=new Font(style.face,20,'px');g.pen=new Pen(style.ink);
   g.drawText(24,y+32,'RA  '+ABL.formatRA(position.ra)+'     Dec  '+ABL.formatDec(position.dec));
   if(showBorders){g.pen=new Pen(style.border,1.5,PenStyle.Dash);g.drawLine(700,y+26,744,y+26);g.pen=new Pen(style.ink);g.font=new Font(style.face,17,'px');g.drawText(754,y+32,'Constellation borders');}
   g.font=new Font(style.face,18,'px');g.drawText(24,y+68,targets?'Numbered rings = table objects · Other symbols = catalog context':'Crosshair = target · Symbols show catalog object types');
   let barDegrees=skyDegrees/5,barPixels=ablChartPlaneWidth(barDegrees,projection)/(engine.metadata.resolution*Math.PI/180),x=width-30-barPixels;
   g.drawLine(x,y+63,width-30,y+63);g.drawLine(x,y+57,x,y+69);g.drawLine(width-30,y+57,width-30,y+69);
   let scaleText=barDegrees>=1?Number(barDegrees.toPrecision(3))+'°':Number((barDegrees*60).toPrecision(3))+'′';g.drawText(x,y+43,scaleText+' at center');
   if(items.length)engine.DrawSymbolLegend(g,24,y+100,items,legend);
   if(key){let top=header+height+footer;g.pen=new Pen(style.rule);g.drawLine(24,top,width-24,top);g.font=keyFont;g.pen=new Pen(style.ink);g.drawText(24,top+32,'Objects in table order');let offsets=[top+64];for(let rh of key.rowHeights)offsets.push(offsets[offsets.length-1]+rh);for(let cell of key.cells)for(let j=0;j<cell.lines.length;++j)g.drawText(24+cell.column*key.columnWidth,offsets[cell.row]+j*27,cell.lines[j]);}
   if(inset){let x=width+20;g.pen=new Pen(style.rule);g.drawLine(width,0,width,recording.height);g.font=new Font(style.face,26,'px');g.pen=new Pen(style.ink);g.drawText(x,40,'Close-up · '+details.insetDegrees+'°');g.font=new Font(style.face,18,'px');g.pen=new Pen(style.secondary);g.drawText(x,66,'N ↑   E ←   ·   J2000   ·   target at center');
      g.pushState();g.translateTransformation(x,header);inset.recording.paint(g);g.popState();let cx=x+300,cy=header+300;g.pen=new Pen(style.accent,2);g.drawLine(cx-16,cy,cx-6,cy);g.drawLine(cx+6,cy,cx+16,cy);g.drawLine(cx,cy-16,cx,cy-6);g.drawLine(cx,cy+6,cx,cy+16);
      g.pen=new Pen(style.ink);g.font=new Font(style.face,20,'px');g.drawText(x,header+638,'Apparent size: '+ABL.sizeText(ABL.angularSize(object)));
      let label='Object type: '+ABL.objectType(object);while(label.length>1&&g.font.width(label)>590)label=label.slice(0,-1);if(label!=='Object type: '+ABL.objectType(object))label+='…';g.drawText(x,header+670,label);
      g.pen=new Pen(style.secondary);g.font=new Font(style.face,18,'px');g.drawText(x,header+707,'Same target · independently projected close-up');g.drawText(x,header+739,inset.objectCount+' catalog objects · '+inset.starLabelCount+' star labels');if(details.contours)g.drawText(x,header+771,inset.contourCount+' local nebula contours');
   }
   let bitmap=new Bitmap(recording.width,recording.height),graphics=new Graphics(bitmap);
   try{recording.paint(graphics);}finally{graphics.end();}
   try{TGFileProtection.assertOutsideInstallation(path,'Finder chart image');if(File.exists(path)||File.directoryExists(path))throw Error('The temporary chart path is already occupied.');bitmap.save(path);}finally{bitmap.clear();}
   picks=ablOffsetChartPicks(picks,0,header);if(inset)picks.push(...ablOffsetChartPicks(inset.picks,width+20,header));
   return Object.assign(result,{path,recording,title,picks,interactionBytes:JSON.stringify(picks).length*2,inset:inset?{coverage:details.insetDegrees,projection:inset.projection,stars:inset.stars,objectCount:inset.objectCount,starLabelCount:inset.starLabelCount,contourCount:inset.contourCount}:null});
}

// Export a complete vector drawing, not a bitmap embedded in a document.
// Documents are 297 mm wide and retain the preview's aspect ratio, including
// an inset or a long object key. Print dialogs can fit them to another page.
function ablExportChart(chart,path){
   if(!chart||!(chart.recording instanceof ChartRecording))throw Error('Load a Finder chart before exporting it.');
   path=TGFileProtection.assertOutsideInstallation(path,'Finder chart export');
   let extension=path.toLowerCase().match(/\.(svg|pdf)$/);if(!extension)throw Error('Choose a filename ending in .svg or .pdf.');
   const recording=chart.recording,title=chart.title||'Finder chart',widthMM=297,heightMM=widthMM*recording.height/recording.width;
   if(heightMM>2000)throw Error('The chart is too tall for a document. Narrow the table filters before exporting.');
   let temporary='',bytes;
   try{
      if(extension[1]==='svg'){
         // SVG resolution is integral. Set physical size at a fixed DPI and
         // keep chart coordinates in the viewBox, avoiding size-rounding drift.
         let svg=new SVG;svg.resolution=300;svg.size=new Rect(0,0,widthMM/25.4*300,heightMM/25.4*300);svg.viewBox=new Rect(0,0,recording.width,recording.height);
         svg.title=title;svg.description='Finder chart generated by Astro Bucket List '+ABL_VERSION+' with PixInsight chart libraries by Pleiades Astrophoto.';svg.textToPaths=true;
         let graphics=new Graphics(svg);try{recording.paint(graphics);}finally{graphics.end();}
         bytes=svg.outputData;if(!bytes.length)throw Error('The SVG renderer returned an empty document.');
      }else{
         temporary=File.uniqueFileName(File.systemTempDirectory,20,'AstroBucketList-export-','.pdf');TGFileProtection.assertOutsideInstallation(temporary,'Temporary chart export');
         if(File.exists(temporary)||File.directoryExists(temporary))throw Error('The temporary export path is already occupied.');
         // Limit the PDF object's lifetime to rendering. Read it only after
         // the graphics context has ended and finalized the document.
         let pdf=new PDF(temporary);pdf.pageSize=new Rect(0,0,Math.min(widthMM,heightMM),Math.max(widthMM,heightMM));pdf.landscape=widthMM>heightMM;pdf.margins=new Rect(0,0,0,0);pdf.resolution=300;pdf.title=title;pdf.creator='Astro Bucket List '+ABL_VERSION+' / PixInsight';
         let graphics=new Graphics(pdf);try{let scale=widthMM/25.4*300/recording.width;graphics.scaleTransformation(scale,scale);recording.paint(graphics);}finally{graphics.end();}
         bytes=File.readFile(temporary);if(bytes.length<8||bytes[0]!==37||bytes[1]!==80||bytes[2]!==68||bytes[3]!==70)throw Error('The PDF renderer did not produce a complete document.');
      }
      // The shared writer verifies staged bytes, preserves an existing file
      // during replacement and reports a recovery path if restoration fails.
      TGFileProtection.writeFile(path,bytes,'Finder chart export');
   }finally{if(temporary&&File.exists(temporary))try{TGFileProtection.removeFile(temporary,'Temporary chart export');}catch(e){console.warningln('Temporary chart export remains at '+temporary+': '+String(e));}}
   return path;
}
#endif

// Native dialogs, file operations, and application entry point.

const ABL_VERSION='0.47.1';
const ABL_FILE=#__FILE__;
const ABL_TITLE='Astro Bucket List';
const ABL_SERVERS=['https://simbad.cfa.harvard.edu/simbad/sim-id','https://simbad.cds.unistra.fr/simbad/sim-id'];

function ablError(e){(new MessageBox(ABL.html(e.message||e),ABL_TITLE,StdIcon.Error,StdButton.Ok)).execute();}
function ablNotice(s){(new MessageBox(ABL.html(s),ABL_TITLE,StdIcon.Information,StdButton.Ok)).execute();}
// Follow the TGScripts documentation layout for both an installed script and
// a repository checkout. The last candidate supports the standalone release.
function ablDocumentationPath(scriptFile=ABL_FILE,docDirectory=CoreApplication.docDirPath){
   let relative='/scripts/AstroBucketList/AstroBucketList.html',dir=scriptFile.replace(/\\/g,'/').replace(/\/[^/]+$/,'');
   let candidates=[docDirectory.replace(/[\\/]+$/,'')+relative,
      File.fullPath(dir+'/../../../doc'+relative),dir+'/doc'+relative,dir+'/AstroBucketList.html'];
   return candidates.find(path=>File.exists(path))||'';
}
function ablShowDocumentation(){
   let page=ablDocumentationPath();
   if(page)Dialog.openBrowser(page,ABL_TITLE+' — User Guide');
   else ablNotice('The Astro Bucket List user guide is missing. Check that the TGScripts installation includes its documentation.');
}
function ablButton(parent,label,handler,tip){let b=new PushButton(parent);b.text=label;b.onClick=handler;if(tip)b.toolTip=tip;return b;}
// Match the compact native controls and section spacing used by recent
// TGScripts dialogs. No global stylesheet or other script's settings change.
function ablTool(parent,resource,tip,handler){let b=new ToolButton(parent);b.icon=parent.scaledResource(resource);b.setScaledFixedSize(24,24);b.toolTip=tip;b.onClick=handler;return b;}
function ablGroup(parent,title){let g=new GroupBox(parent);g.title=title;g.sizer=new VerticalSizer;g.sizer.margin=10;g.sizer.spacing=8;return g;}
// Compare normalized collection content with the open/last-saved baseline.
// JSON copying expands shared objects, so strip bookkeeping fields from both
// inventory entries and list copies. View state and local preferences are
// held outside this document and do not contribute to the dirty flag.
function ablCollectionSignature(doc){
   let copy=ABL.copy(doc);
   let objects=(copy[ABL.EXT]?.objects||[]).slice();
   for(let list of Object.values(copy.observingLists||{})){delete list['last edit'];for(let object of list.objects||[])objects.push(object);}
   for(let object of objects)if(object[ABL.EXT]){
         let meta=object[ABL.EXT];delete meta.catalogRetrieved;
         // Automatic classifications are export snapshots, not user edits.
         if(!meta.targetBand||meta.targetBand.mode!=='manual')meta.targetBand={mode:'auto'};
   }
   const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
   return JSON.stringify(stable(copy));
}
// SectionBar normally calls Dialog.adjustToContents(), shrinking the window.
// These sections instead hand their freed space to the table or preview.
function ablStableSection(manager,bar,section){
   bar.setSection(section);
   bar.toggleSection=()=>{
      let width=manager.width,height=manager.height;manager.togglingSection=true;
      try{section.visible=!section.visible;bar.updateIcon();manager.ensureLayoutUpdated();}
      finally{manager.togglingSection=false;}
      manager.updateMinimumSize();manager.resize(Math.max(width,manager.minWidth),Math.max(height,manager.minHeight));
   };
}
function ablRow(parent,label,control){let l=new Label(parent);l.text=label;l.textAlignment=TextAlignment.Right|TextAlignment.VertCenter;l.setFixedWidth(parent.logicalPixelsToPhysical(150));let s=new HorizontalSizer;s.spacing=8;s.add(l);s.add(control,100);return s;}
// Shared preflight for Open, Save and Export. String.length measures UTF-16
// code units: the limit is 33,554,432 decoded text units, not UTF-8 file bytes
// or a memory budget. Validate the serialized text because shared inventory
// and list objects occur repeatedly in JSON. Return a normalized copy; this
// function does not modify the caller's live collection or any files. Single-
// list imports supply a structural parser that defers object reconciliation.
function ablParseCollectionText(s,parse=ABL.parseDocument){
   if(s.length>32*1024*1024)throw Error('This collection exceeds the 32 MB text-size limit for opening and saving. Export fewer objects or smaller lists.');
   return parse(s);
}
function ablRead(path){return ablParseCollectionText(File.readTextFile(path));}
function ablReadListImport(path){return ablParseCollectionText(File.readTextFile(path),ABL.parseListImport);}
// Save with stable filenames: iCloud can reverse a primary/backup rename chain.
// Validate before I/O, stage locally, retain recovery copies, then write and
// replace the backup and primary at their stable paths. Failures
// trigger best-effort restoration and retain available local recovery files.
function ablWrite(path,doc){
   TGFileProtection.assertOutsideInstallation(path,"Collection file");
   TGFileProtection.assertOutsideInstallation(path+".bak","Collection backup");
   // Include JSON escapes, indentation and the final newline in the same
   // validation used by ablRead(). Rejection occurs before any filesystem
   // change, so a size error cannot replace a readable collection or backup.
   const output=JSON.stringify(doc,null,2)+'\n';ablParseCollectionText(output);
   const directory=File.systemTempDirectory+'/AstroBucketList-save-'+ABL.uuid().slice(1,-1);
   const staged=directory+'/new.sol',previous=directory+'/previous.sol',olderBackup=directory+'/older-backup.bak',backup=path+'.bak';
   const equal=(a,b)=>a.length===b.length&&a.toBase64()===b.toBase64();
   const verify=(p,bytes)=>{if(!equal(File.readFile(p),bytes))throw Error('File verification failed: '+p);};
   const write=(p,bytes)=>{TGFileProtection.writeFile(p,bytes,'Collection save');verify(p,bytes);};
   let original=null,oldBackup=null,primaryTouched=false,backupTouched=false,complete=false;
   TGFileProtection.assertOutsideInstallation(directory,"Collection recovery directory");
   File.createDirectory(directory);
   try{
      TGFileProtection.writeTextFile(staged,output,"Staged collection");
      // Check the text-to-file round trip before using the staged bytes for
      // the primary. Byte comparisons below also preserve the original BOM
      // and line endings in backups without decoding and re-encoding them.
      if(File.readTextFile(staged)!==output)throw Error('The staged collection could not be verified.');
      const next=File.readFile(staged);
      if(File.exists(path)){
         original=File.readFile(path);write(previous,original);
         if(File.exists(backup)){oldBackup=File.readFile(backup);write(olderBackup,oldBackup);}
      }
      try{
         if(original!==null){
            // Detect changes since the original was read, including changes
            // during backup creation. This is a conflict check, not a file lock.
            verify(path,original);
            backupTouched=true;write(backup,original);
            verify(path,original);
         }
         primaryTouched=true;write(path,next);
         if(original!==null)verify(backup,original);
         complete=true;
      }catch(e){
         let failures=[],primaryRestored=true;
         if(primaryTouched)try{
            if(original!==null)write(path,original);else if(File.exists(path))TGFileProtection.removeFile(path,"Collection or preview file");
         }catch(restoreError){
            primaryRestored=false;failures.push('The primary could not be restored: '+String(restoreError));
         }
         // If primary rollback fails, leave the immediate predecessor in .bak.
         // Never replace that recovery copy with the older backup in this case.
         if(backupTouched&&primaryRestored)try{
            if(oldBackup!==null)write(backup,oldBackup);else if(File.exists(backup))TGFileProtection.removeFile(backup,"Collection backup");
         }catch(restoreError){failures.push('The older backup could not be restored: '+String(restoreError));}
         throw Error(String(e)+(failures.length?'\n'+failures.join('\n'):''));
      }
   }catch(e){
      throw Error('Could not save the collection: '+path+'\n'+String(e)+'\nLocal recovery files are retained in:\n'+directory);
   }finally{
      // Cleanup cannot turn a verified completed save into a reported failure.
      if(complete)try{for(let p of [staged,previous,olderBackup])if(File.exists(p))TGFileProtection.removeFile(p,"Collection recovery file");TGFileProtection.assertOutsideInstallation(directory,"Collection recovery directory");File.removeDirectory(directory);}
      catch(e){console.warningln('Collection saved. Local temporary files remain in '+directory+'. '+String(e));}
   }
}
// Transport authentication and response validation are separate from a
// publisher-provided digest. These live services do not supply such a digest.
// Never describe a locally computed cache hash as authentication of the source.
function ablTransfer(url,maxBytes,timeoutSeconds=30,contentType='text/plain'){
   if(!/^https:\/\/(?:simbad\.(?:cfa\.harvard\.edu|cds\.unistra\.fr)\/simbad\/sim-id|archive\.stsci\.edu\/cgi-bin\/dss_search)\?/.test(url))
      throw Error('Unsupported download address. An HTTPS SIMBAD or DSS endpoint is required.');
   let data=new ByteArray,transfer=new NetworkTransfer,start=Date.now(),stopped='';
   transfer.setURL(url);transfer.setConnectionTimeout(10);transfer.setSSL(true,true,true,true);
   transfer.setCustomHTTPHeaders(['User-Agent: '+CoreApplication.agentName+' AstroBucketList/'+ABL_VERSION,'Accept: '+contentType]);
   transfer.onDownloadDataAvailable=function(chunk){
      if(data.length+chunk.length>maxBytes){stopped='The server response is too large.';return false;}
      data.add(chunk);return true;
   };
   transfer.onTransferProgress=function(){
      CoreApplication.processEvents();
      if(console.abortRequested){stopped='Cancelled.';return false;}
      if(Date.now()-start>1000*timeoutSeconds){stopped='The request timed out.';return false;}
      return true;
   };
   if(!transfer.download())throw Error(stopped||transfer.errorInformation||'Download failed.');
   if(transfer.responseCode!==200)throw Error('The server returned HTTP '+transfer.responseCode+'.');
   if(String(transfer.contentType).split(';')[0].trim().toLowerCase()!==contentType)
      throw Error('The server returned an unexpected content type.');
   if(!data.length)throw Error('The server returned an empty response.');
   return data;
}
function ablSimbadResponse(data){
   let text=data.utf8ToString();
   if(!/^C\.D\.S\.[^\r\n]*SIMBAD/.test(text)||/[\x00-\x08\x0b\x0c\x0e-\x1f\ufffd]/.test(text))
      throw Error('The server did not return a valid SIMBAD text response.');
   // The ASCII service terminates an object record with a separator. Refuse a
   // partial record even when its early coordinate fields happened to arrive.
   if(/^Object\s/m.test(text)&&(!/\n={10,}\s*$/.test(text)||(text.match(/^Object\s/gm)||[]).length!==1))
      throw Error('The SIMBAD object response is incomplete or ambiguous.');
   return text;
}
// Check GIF framing before writing or invoking the native image decoder.
// This detects truncation and bounds allocations; it is not a service checksum.
function ablValidateDSS(data){
   let p=0,images=0,word=()=>byte()+256*byte();
   const fail=()=>{throw Error('The DSS response is not a complete, supported GIF image.');};
   const need=n=>{if(p+n>data.length)fail();};
   const byte=()=>{need(1);return data[p++];};
   const skip=n=>{need(n);p+=n;};
   const blocks=()=>{for(let n;(n=byte())!==0;)skip(n);};
   let signature='';for(let i=0;i<6;++i)signature+=String.fromCharCode(byte());
   if(signature!=='GIF87a'&&signature!=='GIF89a')fail();
   let width=word(),height=word(),flags=byte();skip(2);
   if(!width||!height||width>16384||height>16384||width*height>64000000)fail();
   if(flags&128)skip(3*(1<<((flags&7)+1)));
   for(;;){
      let block=byte();
      if(block===0x3b){if(images!==1||p!==data.length)fail();return {width,height};}
      if(block===0x21){byte();blocks();continue;}
      if(block!==0x2c||++images>1)fail();
      let left=word(),top=word(),w=word(),h=word(),packed=byte();
      if(!w||!h||left+w>width||top+h>height)fail();
      if(packed&128)skip(3*(1<<((packed&7)+1)));
      let codeSize=byte();if(codeSize<2||codeSize>8)fail();blocks();
   }
}
function ablSHA256(data){return (new CryptographicHash(CryptographicHash.SHA256)).hash(data).toHex();}
function ablDSSImage(url,cache,files){
   const maxBytes=128*1024*1024;
   let previous=cache.get(url);
   if(previous){
      // Compare against the in-memory digest of the accepted download before
      // reusing an on-disk preview. Missing or altered files are re-downloaded.
      try{if(File.exists(previous.path)&&(new FileInfo(previous.path)).size===previous.bytes&&ablSHA256(File.readFile(previous.path))===previous.sha256)return previous.path;}catch(e){}
      cache.delete(url);
   }
   let data=ablTransfer(url,maxBytes,90,'image/gif'),dimensions=ablValidateDSS(data),sha256=ablSHA256(data);
   let file=File.systemTempDirectory+'/AstroBucketList-'+ABL.uuid().slice(1,-1)+'.gif',check=null;
   files.push(file);
   try{
      TGFileProtection.writeFile(file,data,'DSS preview image');
      if((new FileInfo(file)).size!==data.length||ablSHA256(File.readFile(file))!==sha256)throw Error('DSS preview file verification failed.');
      check=new Bitmap(file);
      if(check.isNull||check.width!==dimensions.width||check.height!==dimensions.height)throw Error('The DSS image could not be decoded completely.');
      cache.set(url,{path:file,bytes:data.length,sha256});return file;
   }catch(e){
      if(File.exists(file))try{TGFileProtection.removeFile(file,'Rejected DSS preview');}catch(cleanupError){console.warningln('Rejected preview remains at '+file);}
      throw e;
   }finally{if(check)check.clear();}
}
function ablBusy(dialog,label,operation,showConsole=true){
   let wasEnabled=dialog.enabled,abort=console.abortEnabled;
   dialog.enabled=false;console.abortEnabled=true;if(showConsole)console.show();console.writeln(label);CoreApplication.processEvents();
   try{return operation();}finally{dialog.enabled=wasEnabled;console.abortEnabled=abort;}
}
// Name-index coordinates are ICRS at J2000. Catalog descriptions are not
// available in these indexes; retain SIMBAD as an explicit enrichment source.
function ablLocalRecord(match,query){
   if(!Number.isFinite(match.ra)||match.ra<0||match.ra>=360||!Number.isFinite(match.dec)||Math.abs(match.dec)>90)
      throw Error('The local catalog result has invalid J2000 coordinates.');
   let catalogs=Array.isArray(match.catalogs)?match.catalogs:[],names=Array.isArray(match.names)?match.names:[];
   let type=ABL.text(match.type).trim(),main=match.name||query;
   let star=/star|binary|pulsar|dwarf/i.test(type)&&!/cluster|nebula|galaxy/i.test(type),parts=[];
   if(type)parts.push(type);
   parts.push('Catalog identifier: '+main,'Local catalogs: '+catalogs.join(', '));
   if(Number.isFinite(match.magnitude))parts.push('Catalog magnitude: '+match.magnitude);
   let o={designation:query,name:main,nameI18n:main,type:star?'Star':'Nebula',objtype:type,
      ra:ABL.formatRA(match.ra,4),dec:ABL.formatDec(match.dec,4),constellation:ABL.constellation(match.ra,match.dec),isVisibleMarker:false,fov:2};
   o[ABL.EXT]={objectId:ABL.uuid(),imaged:false,imagedOn:'',catalogMainId:main,aliases:Array.from(new Set(names.concat([query,main]))),
      catalogSummary:parts.join('\n'),catalogSource:'PixInsight local catalogs: '+catalogs.join(', '),catalogRetrieved:ABL.stamp(),
      catalogClass:star?'Star':'Nebula',positionFrame:'ICRS/J2000',catalogProvider:'local',localCatalogs:catalogs.slice()};
   ABL.meta(o).catalogPosition=ABL.position(o);return o;
}
function ablLocalMatches(query){return ObjectNameSearch.search(query,false,100).filter(match=>match.exact);}
function ablLookup(doc,query,serverIndex=0,refresh=false,mode='auto'){
   query=String(query).trim();if(!query)throw Error('Enter a catalog identifier first.');
   if(query.length>200)throw Error('The catalog identifier is too long.');
   if(!refresh){let local=ABL.lookupLocal(doc,query);if(local)return local;}
   if(mode!=='simbad'){
      let matches=[];
      try{matches=ablLocalMatches(query);}catch(e){
         if(console.abortRequested)throw Error('Cancelled.');
         console.warningln('Local catalog search unavailable: '+String(e)+'. Trying SIMBAD.');
      }
      if(console.abortRequested)throw Error('Cancelled.');
      if(matches.length===1)return ablLocalRecord(matches[0],query);
      if(matches.length>1){let error=Error('Several local catalog entries match '+query+'. Use Edit object to choose a match or select SIMBAD.');error.code='ABL_LOCAL_AMBIGUOUS';error.matches=matches;throw error;}
   }
   let errors=[];
   for(let index of [serverIndex,1-serverIndex]){
      if(console.abortRequested)throw Error('Cancelled.');
      let url=ABL_SERVERS[index]+'?Ident='+encodeURIComponent(query)+'&output.format=ASCII&otypedisp=V';
      try{return ABL.parseSimbad(ablSimbadResponse(ablTransfer(url,2*1024*1024)),query,url);}
      catch(e){errors.push(e.message||String(e));if(/Cancelled/.test(String(e)))throw e;}
   }
   throw Error(errors.join('\n\n'));
}
// Ambiguity is a user decision. In bulk updates it remains a per-object error;
// the editor presents every exact match, including its position and catalogs.
class ABLLocalMatchDialog extends Dialog { constructor(parent,matches,query){
   super(parent);this.windowTitle='Choose local catalog object';this.autoDefaultButton=false;
   this.info=new Label(this);this.info.wordWrapping=true;this.info.text='Several entries match '+query+'. Choose the intended object. Cancel keeps the editor unchanged; SIMBAD remains available in Lookup source.';
   this.tree=new TreeBox(this);this.tree.numberOfColumns=5;this.tree.headerVisible=true;this.tree.rootDecoration=false;this.tree.alternateRowColor=true;
   for(let [i,label] of ['Object','Type','RA (J2000)','Dec (J2000)','Catalogs'].entries())this.tree.setHeaderText(i,label);
   this.nodes=[];for(let match of matches){let n=new TreeBoxNode(this.tree);n.match=match;n.setText(0,match.name);n.setText(1,match.type||'');n.setText(2,ABL.formatRA(match.ra));n.setText(3,ABL.formatDec(match.dec));n.setText(4,(match.catalogs||[]).join(', '));n.setToolTip(0,(match.names||[]).join(', '));this.nodes.push(n);}
   for(let i=0;i<5;++i)this.tree.adjustColumnWidthToContents(i);
   this.tree.setMinSize(this.logicalPixelsToPhysical(690),this.logicalPixelsToPhysical(150));
   this.useButton=ablButton(this,'Use selected',()=>{if(this.tree.currentNode&&this.tree.currentNode.match){this.match=this.tree.currentNode.match;this.ok();}});this.useButton.enabled=false;
   this.tree.onCurrentNodeUpdated=n=>{this.useButton.enabled=!!n&&!!n.match;};
   this.cancelButton=ablButton(this,'Cancel',()=>this.cancel());let buttons=new HorizontalSizer;buttons.addStretch();buttons.add(this.useButton);buttons.add(this.cancelButton);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=8;this.sizer.add(this.info);this.sizer.add(this.tree);this.sizer.add(buttons);this.adjustToContents();
}}
function ablDialogValue(parent,title,name,description){
   let d=new Dialog(parent);d.windowTitle=title;
   d.nameEdit=new Edit(d);d.nameEdit.text=name||'';d.nameEdit.setMinWidth(360);
   d.descriptionEdit=new TextBox(d);d.descriptionEdit.text=ABL.html(description||'');d.descriptionEdit.setMinHeight(110);
   let ok=ablButton(d,'OK',()=>d.ok()),cancel=ablButton(d,'Cancel',()=>d.cancel());ok.defaultButton=true;
   let buttons=new HorizontalSizer;buttons.addStretch();buttons.add(ok);buttons.add(cancel);
   d.sizer=new VerticalSizer;d.sizer.margin=12;d.sizer.spacing=8;d.sizer.add(ablRow(d,'List name:',d.nameEdit));d.sizer.add(ablRow(d,'Description:',d.descriptionEdit));d.sizer.add(buttons);
   return parent.executeDialog(d)?{name:d.nameEdit.text.trim(),description:d.descriptionEdit.text}:null;
}

// A duplicate is a navigation choice, not an instruction to discard the
// entered form. Going back retains every field; opening uses saved data only.
class ABLDuplicateDialog extends Dialog { constructor(parent,object,matches){
   super(parent);this.windowTitle='Object already in collection';this.matches=matches;
   this.info=new Label(this);this.info.wordWrapping=true;this.info.setFixedWidth(this.logicalPixelsToPhysical(570));
   this.info.text='The entered object matches an existing entry. It may be listed under another catalog identifier or hidden by the selected list or filters.';
   this.entries=new ComboBox(this);for(let match of matches)this.entries.addItem(ABL.objectHeading(ABL.catalogIdentifier(match.object),ABL.meta(match.object).displayName||match.object.name));
   this.entries.toolTip='Select the existing entry to inspect. Each object is shown once, even if it belongs to several lists.';
   this.details=new TextBox(this);this.details.readOnly=true;this.details.setMinHeight(this.logicalPixelsToPhysical(155));
   this.updateMatch=()=>{let match=matches[this.entries.currentItem],o=match.object,m=ABL.meta(o);
      this.details.text=ABL.html(['Entered: '+ABL.catalogIdentifier(object),
         'Existing entry: '+ABL.objectHeading(ABL.catalogIdentifier(o),m.displayName||o.name),
         m.catalogMainId?'Catalog identifier: '+m.catalogMainId:'',
         match.identifier?'Matching identifier / alias: '+match.identifier:'Matching saved object identifier.',
         'List'+(match.listNames.length===1?'':'s')+': '+(match.listNames.join('; ')||'None — collection only'),
         'J2000: '+o.ra+'  '+o.dec].filter(Boolean).join('\n'));
   };this.entries.onItemSelected=()=>this.updateMatch();this.updateMatch();
   this.hint=new Label(this);this.hint.wordWrapping=true;this.hint.setFixedWidth(this.logicalPixelsToPhysical(570));
   this.hint.text='Open existing object switches to All objects, clears search and filters, and opens its editor. Sorting and checked objects are retained. The new entry is not added and its entered values are not copied.';
   this.openButton=ablButton(this,'Open existing object',()=>{this.existingObjectId=matches[this.entries.currentItem].id;this.ok();});
   this.backButton=ablButton(this,'Back to new object',()=>this.cancel());this.backButton.defaultButton=true;
   let buttons=new HorizontalSizer;buttons.spacing=6;buttons.addStretch();buttons.add(this.openButton);buttons.add(this.backButton);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=8;this.sizer.add(this.info);this.sizer.add(this.entries);this.sizer.add(this.details);this.sizer.add(this.hint);this.sizer.add(buttons);this.adjustToContents();
}}

// Date-only selection uses civil year/month/day values. Avoid UTC conversions
// that could shift an imaging date, and clamp days when changing month/year.
class ABLImagingDateDialog extends Dialog { constructor(parent,value){
   super(parent);this.windowTitle='Imaging date';this.selectedDate=null;
   this.year=new SpinBox(this);this.year.setRange(0,9999);this.year.setFixedWidth(85);
   this.month=new ComboBox(this);for(let name of ABL.MONTHS.slice(1))this.month.addItem(name);
   this.day=new SpinBox(this);this.day.setRange(1,31);this.day.setFixedWidth(65);
   this.updateDays=()=>{let y=this.year.value,m=this.month.currentItem+1,leap=y%4===0&&(y%100!==0||y%400===0);
      this.day.maxValue=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1];};
   this.setDate=s=>{let values=s.split('-').map(Number);this.year.value=values[0];this.month.currentItem=values[1]-1;this.updateDays();this.day.value=values[2];};
   this.value=()=>String(this.year.value).padStart(4,'0')+'-'+String(this.month.currentItem+1).padStart(2,'0')+'-'+String(this.day.value).padStart(2,'0');
   this.year.onValueUpdated=this.month.onItemSelected=()=>this.updateDays();this.setDate(value&&ABL.validDate(value)?value:ABL.today());
   let fields=new HorizontalSizer;fields.spacing=8;
   for(let [title,control] of [['Year:',this.year],['Month:',this.month],['Day:',this.day]]){let label=new Label(this);label.text=title;fields.add(label);fields.add(control);}
   this.todayButton=ablButton(this,'Today',()=>this.setDate(ABL.today()));
   this.clearButton=ablButton(this,'Clear date',()=>{this.selectedDate='';this.ok();},'Remove the date while retaining the object\'s imaged flag.');
   this.applyButton=ablButton(this,'Apply',()=>{this.selectedDate=this.value();this.ok();});this.applyButton.defaultButton=true;
   this.cancelButton=ablButton(this,'Cancel',()=>this.cancel());this.cancelButton.escapeButton=true;
   let buttons=new HorizontalSizer;buttons.spacing=8;buttons.add(this.todayButton);buttons.add(this.clearButton);buttons.addStretch();buttons.add(this.applyButton);buttons.add(this.cancelButton);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=12;this.sizer.add(fields);this.sizer.add(buttons);this.adjustToContents();
}}

// Optional sexagesimal entry for missing or manually supplied coordinates.
// Keep untouched axes at their original precision; the four-decimal seconds
// shown by the controls must not round an existing catalog position on Apply.
class ABLCoordinatesDialog extends Dialog { constructor(parent,raText,decText){
   super(parent);this.windowTitle='J2000 coordinates';this.coordinates=null;
   const spin=(maximum)=>{let c=new SpinBox(this);c.setRange(0,maximum);c.setFixedWidth(this.logicalPixelsToPhysical(65));return c;};
   const seconds=()=>{let c=new NumericEdit(this);c.label.hide();c.real=true;c.fixed=true;c.scientific=false;c.autoEditWidth=false;
      c.setRange(0,59.9999);c.setPrecision(4);c.edit.setFixedWidth(this.logicalPixelsToPhysical(100));return c;};
   this.raHours=spin(23);this.raMinutes=spin(59);this.raSeconds=seconds();
   this.decSign=new ComboBox(this);this.decSign.addItem('+');this.decSign.addItem('−');
   this.decDegrees=spin(90);this.decMinutes=spin(59);this.decSeconds=seconds();
   const parts=(degrees,hours)=>{let t=Math.round(Math.abs(degrees)*(hours?240:3600)*10000);if(hours)t%=864000000;
      return [Math.floor(t/36000000),Math.floor(t%36000000/600000),t%600000/10000];};
   let originalRA=ABL.coordinate(raText,true),originalDec=ABL.coordinate(decText,false),r=parts(originalRA===null?0:originalRA,true),d=parts(originalDec===null?0:originalDec,false);
   this.raHours.value=r[0];this.raMinutes.value=r[1];this.raSeconds.setValue(r[2]);
   this.decSign.currentItem=originalDec<0||Object.is(originalDec,-0)?1:0;this.decDegrees.value=d[0];this.decMinutes.value=d[1];this.decSeconds.setValue(d[2]);
   const raSignature=()=>[this.raHours.value,this.raMinutes.value,this.raSeconds.value].join('/');
   const decSignature=()=>[this.decSign.currentItem,this.decDegrees.value,this.decMinutes.value,this.decSeconds.value].join('/');
   let initialRA=raSignature(),initialDec=decSignature();
   this.value=()=>({ra:originalRA!==null&&raSignature()===initialRA?originalRA:(this.raHours.value+this.raMinutes.value/60+this.raSeconds.value/3600)*15,
      dec:originalDec!==null&&decSignature()===initialDec?originalDec:(this.decDegrees.value+this.decMinutes.value/60+this.decSeconds.value/3600)*(this.decSign.currentItem===1?-1:1)});
   this.preview=new Label(this);
   this.updatePosition=()=>{
      // At either pole the fractional degree components must be zero.
      let pole=this.decDegrees.value===90;this.decMinutes.enabled=this.decSeconds.enabled=!pole;
      if(pole){this.decMinutes.value=0;this.decSeconds.setValue(0);}
      let p=this.value();this.preview.text='Decimal degrees: RA '+p.ra.toFixed(8)+'; Dec '+p.dec.toFixed(8);
   };
   this.raHours.onValueUpdated=this.raMinutes.onValueUpdated=this.raSeconds.onValueUpdated=this.decSign.onItemSelected=this.decDegrees.onValueUpdated=this.decMinutes.onValueUpdated=this.decSeconds.onValueUpdated=()=>this.updatePosition();
   let info=new Label(this);info.text='Enter J2000 coordinates. RA uses hours; Dec uses signed degrees.';
   this.blankHint=new Label(this);this.blankHint.text='Missing or invalid coordinates start at zero. Enter the target position before Apply.';this.blankHint.visible=originalRA===null||originalDec===null;
   const row=(caption,controls)=>{let s=new HorizontalSizer;s.spacing=6;let l=new Label(this);l.text=caption;l.setFixedWidth(this.logicalPixelsToPhysical(35));s.add(l);
      for(let [control,unit] of controls){s.add(control);if(unit){let u=new Label(this);u.text=unit;s.add(u);}}s.addStretch();return s;};
   let raRow=row('RA:',[[this.raHours,'h'],[this.raMinutes,'m'],[this.raSeconds,'s']]);
   let decRow=row('Dec:',[[this.decSign,''],[this.decDegrees,'°'],[this.decMinutes,'′'],[this.decSeconds,'″']]);
   this.applyButton=ablButton(this,'Apply',()=>{this.coordinates=this.value();this.ok();});this.applyButton.defaultButton=true;
   this.cancelButton=ablButton(this,'Cancel',()=>this.cancel());this.cancelButton.escapeButton=true;
   let buttons=new HorizontalSizer;buttons.spacing=6;buttons.addStretch();buttons.add(this.applyButton);buttons.add(this.cancelButton);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=10;this.sizer.add(info);this.sizer.add(raRow);this.sizer.add(decRow);this.sizer.add(this.preview);this.sizer.add(this.blankHint);this.sizer.add(buttons);
   this.updatePosition();this.adjustToContents();
}}

const ABL_VIEW_SORTS=['constellation','month','month-desc','size','size-desc','ra','ra-desc','dec','dec-desc'];
function ablViewState(value={}){
   if(!value||typeof value!=='object')value={};
   let sorts=Array.isArray(value.sorts)?value.sorts:[],text=v=>typeof v==='string'?v:'';
   return {search:text(value.search).slice(0,4096),month:value.month==='near-current'||Number.isInteger(value.month)&&value.month>=-1&&value.month<=12?value.month:-1,
      status:['all','not-imaged','imaged'].includes(value.status)?value.status:'all',constellation:text(value.constellation)||null,objectType:text(value.objectType).slice(0,256)||null,
      band:['broadband','narrowband','unclassified'].includes(value.band)?value.band:null,selectedOnly:value.selectedOnly===true,
      sorts:[ABL_VIEW_SORTS.includes(sorts[0])?sorts[0]:'constellation',ABL_VIEW_SORTS.includes(sorts[1])?sorts[1]:null,ABL_VIEW_SORTS.includes(sorts[2])?sorts[2]:null]};
}
function ablLoadViewPresets(text){
   if(typeof text!=='string'||text.length>1048576)return [];
   try{let data=JSON.parse(text);if(!data||data.version!==1||!Array.isArray(data.presets)||data.presets.length>50)return [];
      let names=new Set,presets=[];
      for(let p of data.presets){if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.trim().length>80||!p.view||typeof p.view!=='object')continue;
         let name=p.name.trim(),key=name.toLowerCase();if(names.has(key))continue;names.add(key);presets.push({name,view:ablViewState(p.view)});}
      return presets;
   }catch(e){return [];}
}
class ABLViewNameDialog extends Dialog { constructor(parent,name,chart=false){
   super(parent);this.windowTitle=chart?'Save chart preset':'Save view preset';this.autoDefaultButton=false;
   this.nameEdit=new Edit(this);this.nameEdit.text=name;this.nameEdit.setMinWidth(320);
   let info=new Label(this);info.wordWrapping=true;info.text=chart?'Name a copy of the Finder settings shown in Configuration, including catalogs and annotations. Apply Configuration to save it. Targets, navigation history, table filters and DSS settings are excluded.':'Save Find, all filters and the three sort choices. The preset applies within the current list. Checked object identities and chart settings are not saved.';
   let save=ablButton(this,'Save',()=>{let value=this.nameEdit.text.trim();if(!value||value.length>80){parent.error(Error('Enter a preset name of 1 to 80 characters.'));return;}this.presetName=value;this.ok();});
   let cancel=ablButton(this,'Cancel',()=>this.cancel()),buttons=new HorizontalSizer;buttons.spacing=8;buttons.addStretch();buttons.add(save);buttons.add(cancel);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=8;this.sizer.add(info);this.sizer.add(ablRow(this,'Name:',this.nameEdit));this.sizer.add(buttons);this.adjustToContents();
}}

// The editor works on a copy; only Apply returns a validated replacement.
class ABLObjectDialog extends Dialog { constructor(parent,object,initialIdentifier='',seed=null){
   super(parent);
   this.windowTitle=(object?'Edit object':'Add object')+' — '+ABL_TITLE;
   this.source=object?ABL.copy(object):seed?ABL.copy(seed):{designation:'',name:'',type:'Nebula',isVisibleMarker:false,ra:'',dec:''};
   ABL.consolidateObjectInformation(this.source);
   this.editedObject=null;this.lookupPerformed=false;this.setMinWidth(660);
   let m=ABL.meta(this.source);
   this.idEdit=new Edit(this);this.idEdit.text=object?(ABL.catalogIdentifier(object)||String(object.name||'')):String(initialIdentifier).trim();
   this.stellariumLabelEdit=new Edit(this);this.labelAutomatic=true;
   this.stellariumLabelEdit.toolTip='Exact label exported to Stellarium. It also serves as Stellarium\'s catalog lookup key. Use a recognized catalog identifier for reliable object selection. Labels containing marker opt into Stellarium\'s named coordinate-marker fallback and display that word. Editing this label retains the catalog identifier used by Astro Bucket List.';
   this.catalogLabelButton=ablButton(this,'Use catalog identifier',()=>{this.stellariumLabelEdit.text=this.idEdit.text.trim().replace(/\s+marker$/i,'');this.labelAutomatic=true;this.marker.checked=/marker/i.test(this.stellariumLabelEdit.text);},'Set the Stellarium label to the clean catalog identifier, removing an added marker suffix. Apply and Save to keep this repair.');
   let stellariumLabelRow=new HorizontalSizer;stellariumLabelRow.spacing=6;stellariumLabelRow.add(this.stellariumLabelEdit,100);stellariumLabelRow.add(this.catalogLabelButton);
   // All objects has no destination membership. Require an explicit choice;
   // null is the unanswered prompt, while '' deliberately means collection only.
   this.destinationListId='';
   if(!object){
      this.listSelect=new ComboBox(this);this.listIds=[null,''].concat(Object.keys(parent.doc.observingLists));
      this.listSelect.addItem('Choose a list…');this.listSelect.addItem('No list — collection only');
      for(let id of this.listIds.slice(2))this.listSelect.addItem(parent.doc.observingLists[id].name);
      this.listSelect.currentItem=parent.listId&&this.listIds.includes(parent.listId)?this.listIds.indexOf(parent.listId):0;
      this.listSelect.toolTip='Choose which list this object should belong to before applying. The active named list is preselected. Choose No list explicitly to store the object only in the collection. If no lists exist, create one in the main window or choose No list.';
   }else{
      this.membershipTree=new TreeBox(this);this.membershipTree.numberOfColumns=1;this.membershipTree.headerVisible=false;this.membershipTree.rootDecoration=false;
      this.membershipTree.setFixedHeight(this.logicalPixelsToPhysical(90));this.membershipNodes=[];
      let id=ABL.meta(object).objectId,lists=Object.keys(parent.doc.observingLists);
      lists.sort((a,b)=>parent.doc.observingLists[a].name.localeCompare(parent.doc.observingLists[b].name));
      for(let listId of lists){let list=parent.doc.observingLists[listId],node=new TreeBoxNode(this.membershipTree);
         node.listId=listId;node.checkable=true;node.checked=list.objects.some(o=>ABL.meta(o).objectId===id);node.setText(0,list.name);node.setToolTip(0,ABL.html(list.name));this.membershipNodes.push(node);}
      if(!lists.length){let node=new TreeBoxNode(this.membershipTree);node.setText(0,'No lists defined — object stays in the collection');}
      this.membershipTree.adjustColumnWidthToContents(0);
      this.membershipTree.toolTip='Checked lists contain this object. Check or uncheck memberships, then Apply. The object can belong to several lists; unchecking every list keeps it in the collection. Cancel discards membership changes. Create new lists in the main window.';
   }
   this.idEdit.toolTip='Examples: M 31, NGC 7000, LDN 1228, PK 164+31.1. Local catalogs are searched first. Select SIMBAD for richer descriptions, classifications and apparent dimensions.';
   this.server=new ComboBox(this);for(let label of ['Local catalogs, then SIMBAD','SIMBAD — Harvard','SIMBAD — Strasbourg'])this.server.addItem(label);this.server.currentItem=parent.lookupSource||0;
   this.server.toolTip='Local catalogs resolve exact names and aliases without a connection. Missing names fall back to SIMBAD. Choose SIMBAD explicitly to request richer data even when a local match exists. Manual edits are retained.';
   this.lookupButton=ablButton(this,'Look up',()=>{
      try{let previousObject=ABL.copy(this.source);ABL.setCatalogInformation(previousObject,this.catalogText.text);this.applyObjectType(previousObject);
         let previous=ABL.meta(previousObject);previous.notes=ABL.cleanNotes(this.notesEdit.text);
         if(ABL.own(previous,'displayName')||this.nameEdit.text!==(this.source.name||this.source.nameI18n||''))previous.displayName=this.nameEdit.text;
         previousObject.name=previousObject.nameI18n=this.nameEdit.text;previousObject.ra=this.raEdit.text;previousObject.dec=this.decEdit.text;
         let enteredId=this.idEdit.text.trim().replace(/\s+marker$/i,''),enteredLabel=this.stellariumLabelEdit.text.trim(),useMarker=this.marker.checked;
         if(!enteredLabel||this.labelAutomatic&&ABL.norm(enteredLabel)!==ABL.norm(enteredId))enteredLabel=enteredId+(useMarker?' marker':'');
         previous.imagedOn=this.imagedDate.text.trim();previous.imaged=this.imaged.checked||!!previous.imagedOn;previous.filters=this.filtersEdit.text;
         ABL.setTargetBand(previousObject,this.bandSelect.values[this.bandSelect.currentItem]);
         if(this.useCatalogSize.checked)delete previous.angularSize;else previous.angularSize=ABL.manualSize(this.majorEdit.text,this.minorEdit.text);
         let found,choice=this.server.currentItem;
         try{found=ablBusy(this,'Looking up '+this.idEdit.text+(choice?' in SIMBAD…':' in local catalogs…'),()=>parent.io.lookup(parent.doc,this.idEdit.text,choice===2?1:0,true,choice?'simbad':'auto'));}
         catch(e){if(e.code!=='ABL_LOCAL_AMBIGUOUS')throw e;let picker=new ABLLocalMatchDialog(this,e.matches,enteredId);if(!parent.executeDialog(picker))return;found=ablLocalRecord(picker.match,enteredId);}
         this.lookupPerformed=true;this.source=ABL.refreshCatalog(previousObject,found);
         ABL.setStellariumLabel(this.source,enteredId,enteredLabel);this.idEdit.text=enteredId;this.fill();parent.lookupSource=choice;
         this.typeHint.text=(ABL.meta(found).catalogProvider==='local'?'Local catalogs':'SIMBAD')+' lookup complete. Manual edits retained; Apply to keep the result.';
      }catch(e){parent.error(e);}
   },'Resolve this identifier using the selected source. Fill missing data and refresh catalog-owned fields while preserving manual edits. Multiple local matches require a choice.');
   let idRow=new HorizontalSizer;idRow.spacing=6;idRow.add(this.idEdit,100);idRow.add(this.lookupButton);
   this.nameEdit=new Edit(this);this.raEdit=new Edit(this);this.decEdit=new Edit(this);
   this.nameCatalogButton=ablButton(this,'Use catalog identifier',()=>{this.nameEdit.text=this.idEdit.text.trim().replace(/\s+marker$/i,'');this.updateBand();},'Set Display name to the catalog identifier. The Stellarium label is unchanged until edited separately.');
   let nameRow=new HorizontalSizer;nameRow.spacing=6;nameRow.add(this.nameEdit,100);nameRow.add(this.nameCatalogButton);
   this.raEdit.setFixedWidth(this.logicalPixelsToPhysical(145));this.decEdit.setFixedWidth(this.logicalPixelsToPhysical(145));
   this.coordinatesButton=ablButton(this,'Enter…',()=>{let picker=new ABLCoordinatesDialog(this,this.raEdit.text,this.decEdit.text);
      if(parent.executeDialog(picker)){
         // Preserve direct-entry formatting when an axis was not changed.
         if(ABL.coordinate(this.raEdit.text,true)!==picker.coordinates.ra)this.raEdit.text=String(picker.coordinates.ra);
         if(ABL.coordinate(this.decEdit.text,false)!==picker.coordinates.dec)this.decEdit.text=String(picker.coordinates.dec);
         this.updatePosition();
      }
   },'Enter J2000 coordinates manually with separate RA hours/minutes/seconds and Dec sign/degrees/minutes/seconds controls. Existing coordinates are prefilled. Useful when a catalog lookup has no position. Direct decimal-degree or sexagesimal entry in these fields remains available.');
   this.catalogCoordinatesButton=ablTool(this,':/icons/reload.png','Use catalog coordinates: explicitly replace RA and Dec with the latest retrieved position. Apply to keep the change.',()=>{let p=ABL.meta(this.source).catalogPosition;if(p){this.raEdit.text=ABL.formatRA(p.ra,4);this.decEdit.text=ABL.formatDec(p.dec,4);this.updatePosition();}});
   let coordinateRow=new HorizontalSizer;coordinateRow.spacing=8;coordinateRow.add(this.raEdit);let decLabel=new Label(this);decLabel.text='Dec (J2000):';coordinateRow.add(decLabel);coordinateRow.add(this.decEdit);coordinateRow.add(this.coordinatesButton);coordinateRow.add(this.catalogCoordinatesButton);coordinateRow.addStretch();
   this.typeSelect=new ComboBox(this);this.typeSelect.editEnabled=true;this.typeSelect.autoCompletion=false;
   // Long catalog descriptions must not squeeze the adjacent action labels.
   this.typeSelect.setFixedWidth(this.logicalPixelsToPhysical(245));
   for(let label of ABL.objectTypeChoices(parent.doc))this.typeSelect.addItem(label);
   this.typeSelect.toolTip='Choose a common object type or type your own label. Manual types are retained by Look up and Update catalogs. Clear the field or choose Use catalog type to follow the catalog again.';
   this.typeReset=false;this.typeBaseline='';this.fillingType=false;
   this.applyObjectType=o=>{let value=this.typeSelect.editText.trim(),m=ABL.meta(o);
      if(this.typeReset||!value)delete m.manualObjectType;
      else if(value!==this.typeBaseline)m.manualObjectType=value;
   };
   this.catalogTypeButton=ablButton(this,'Use catalog type',()=>{
      let o=ABL.copy(this.source);delete ABL.meta(o).manualObjectType;
      this.fillingType=true;this.typeSelect.editText=ABL.objectType(o);this.fillingType=false;
      this.typeReset=true;this.catalogTypeButton.enabled=false;this.updateBand();
      this.typeHint.text='Catalog type restored. Apply to keep it.';this.typeHint.toolTip='';
   },'Restore the latest catalog classification for this object. Apply retains the reset.');
   this.typeChanged=()=>{if(this.fillingType)return;this.typeReset=false;this.catalogTypeButton.enabled=true;this.typeHint.text='Type edited manually. Apply to keep it.';this.typeHint.toolTip='';this.updateBand();};
   this.typeSelect.onEditTextUpdated=()=>this.typeChanged();
   this.typeSelect.onItemSelected=index=>{this.typeSelect.editText=this.typeSelect.itemText(index);this.typeChanged();};
   this.typeHint=new Label(this);this.typeHint.wordWrapping=true;this.typeHint.setFixedWidth(this.logicalPixelsToPhysical(478));this.typeHint.text='Re-evaluate considers catalog information, descriptions and comments.';
   this.reevaluateTypeButton=ablButton(this,'Re-evaluate',()=>{
      let o=ABL.copy(this.source);ABL.setCatalogInformation(o,this.catalogText.text);ABL.meta(o).notes=this.notesEdit.text;
      let suggestion=ABL.reevaluateObjectType(o);
      if(suggestion.type){
         delete ABL.meta(o).manualObjectType;this.typeSelect.editText=suggestion.type;this.typeChanged();
         if(suggestion.type===ABL.objectType(o)){this.typeReset=true;this.catalogTypeButton.enabled=false;this.updateBand();}
         this.typeHint.text='Suggested: '+suggestion.type+' ('+suggestion.evidence[0].source+'). Apply to keep it.';
      }else this.typeHint.text=suggestion.evidence.length?'No clear suggestion: conflicting information. See the tooltip.':'No recognizable type found; the current choice is unchanged.';
      this.typeHint.toolTip=ABL.html(suggestion.reason+'\n'+suggestion.evidence.map(c=>c.source+': '+c.evidence).join('\n'));
   },'Re-evaluate the object type from saved catalog data and the current Catalog information and Comments fields. Descriptions imported into Catalog information are included. No network lookup is performed; use Look up first for fresh SIMBAD data. Review the suggestion and its evidence, then Apply. Conflicting or unrecognized information leaves the current choice unchanged.');
   let typeRow=new HorizontalSizer;typeRow.spacing=6;typeRow.add(this.typeSelect,100);typeRow.add(this.reevaluateTypeButton);typeRow.add(this.catalogTypeButton);
   this.majorEdit=new Edit(this);this.minorEdit=new Edit(this);this.majorEdit.setFixedWidth(100);this.minorEdit.setFixedWidth(100);
   this.majorEdit.toolTip='Major diameter in arcminutes. Leave both dimensions blank when unknown.';
   this.minorEdit.toolTip='Optional minor diameter in arcminutes; no larger than the major diameter.';
   this.useCatalogSize=new CheckBox(this);this.useCatalogSize.text='Use catalog size';
   this.sizeSource=new Label(this);this.sizeSource.wordWrapping=true;
   this.fillSize=()=>{let size=this.useCatalogSize.checked?ABL.catalogSize(this.source):ABL.angularSize(this.source);
      this.majorEdit.text=size?String(size.majorArcmin):'';this.minorEdit.text=size&&size.minorArcmin?String(size.minorArcmin):'';
      this.majorEdit.enabled=this.minorEdit.enabled=!this.useCatalogSize.checked;
      this.sizeSource.text=this.useCatalogSize.checked?(size?'Catalog: '+(size.source||'imported measurement'):'Catalog size unavailable; use Look up or uncheck Use catalog size to enter dimensions.'):'Manual dimensions are retained when catalogs are updated.';};
   this.useCatalogSize.onCheck=()=>this.fillSize();
   let sizeRow=new HorizontalSizer;sizeRow.spacing=6;sizeRow.add(this.majorEdit);let times=new Label(this);times.text='×';sizeRow.add(times);sizeRow.add(this.minorEdit);sizeRow.addSpacing(8);sizeRow.add(this.useCatalogSize);sizeRow.addStretch();
   this.raEdit.toolTip='J2000 right ascension: decimal degrees, or hh:mm:ss / 12h34m56s.';
   this.decEdit.toolTip='J2000 declination: signed decimal degrees, or +dd:mm:ss / -12d34m56s.';
   this.constellationLabel=new Label(this);this.constellationLabel.wordWrapping=true;
   this.filtersEdit=new Edit(this);this.filtersEdit.toolTip='Filter information for this object. Explicit filter mentions in existing comments are offered initially; edit or clear this field to override them.';
   this.bandSelect=new ComboBox(this);this.bandSelect.values=['auto','broadband','narrowband'];
   for(let label of ['Automatic','Broadband','Narrowband'])this.bandSelect.addItem(label);
   this.bandSelect.toolTip='Automatic classifies galaxies (including starburst galaxies), star clusters, reflection nebulae, dark nebulae and IFN as Broadband; narrowband filters are optional additions. Other targets use saved filter mentions, then object metadata; narrowband wins for mixed filters. Select Broadband or Narrowband to keep a manual override, including during catalog refresh.';
   this.bandHint=new Label(this);let bandRow=new HorizontalSizer;bandRow.spacing=8;bandRow.add(this.bandSelect);bandRow.add(this.bandHint,100);
   this.notesEdit=new TextBox(this);this.notesEdit.setFixedHeight(this.logicalPixelsToPhysical(120));
   this.catalogText=new TextBox(this);this.catalogText.setFixedHeight(this.logicalPixelsToPhysical(150));
   this.catalogResetButton=ablButton(this,'Use catalog text',()=>{
      this.catalogReset=true;delete ABL.meta(this.source).catalogInformation;this.catalogText.text=ABL.html(ABL.fetchedCatalogInformation(this.source));this.updateBand();
   },'Replace your edited text with the latest retrieved catalog information. Apply to keep this change.');
   let catalogActions=new HorizontalSizer;catalogActions.addStretch();catalogActions.add(this.catalogResetButton);
   this.imaged=new CheckBox(this);this.imaged.text='I have imaged this object';
   this.imagedDate=new Edit(this);this.imagedDate.setFixedWidth(120);this.imagedDate.toolTip='Editable imaging date, YYYY-MM-DD. Entering a date marks this object as imaged. Clear the date to keep an imaged object without a known date.';
   this.imaged.onCheck=checked=>{if(!checked)this.imagedDate.text='';else if(!this.imagedDate.text)this.imagedDate.text=ABL.today();};
   this.imagedDate.onTextUpdated=value=>{if(value.trim()&&ABL.validDate(value.trim()))this.imaged.checked=true;};
   this.imagedDateButton=ablButton(this,'Choose…',()=>{let picker=new ABLImagingDateDialog(this,this.imagedDate.text.trim());
      if(parent.executeDialog(picker)){this.imagedDate.text=picker.selectedDate;if(picker.selectedDate)this.imaged.checked=true;}
   },'Choose the imaging year, month and day, set Today, or clear the date. Cancel keeps the current entry.');
   this.marker=new CheckBox(this);this.marker.text='Use coordinate marker (adds “marker” to label)';
   this.marker.toolTip='<p><b>Normally leave this off</b> for recognized catalog objects such as NGC 936 or NGC 1232.</p>'+
      '<p>Use it when Stellarium cannot find a target by name, for example an obscure catalog object or a manually entered position without a recognized name. Double-clicking the imported entry then creates a named marker at its saved RA/Dec instead of potentially selecting a nearby star.</p>'+
      '<p>Stellarium requires the word <b>marker</b> in the label for this fallback and displays it. This option is unnecessary for <b>Highlight all</b>, which marks saved coordinates with clean labels. It is off by default.</p>';
   this.marker.onCheck=checked=>{let label=this.stellariumLabelEdit.text.trim()||this.idEdit.text.trim();
      this.stellariumLabelEdit.text=checked?(/marker/i.test(label)?label:label+' marker'):label.replace(/\s+marker$/i,'');
      this.marker.checked=/marker/i.test(this.stellariumLabelEdit.text);};
   this.stellariumLabelEdit.onTextUpdated=value=>{this.marker.checked=/marker/i.test(value);this.labelAutomatic=ABL.norm(value)===ABL.norm(this.idEdit.text);};
   this.idEdit.onTextUpdated=()=>{if(this.labelAutomatic)this.stellariumLabelEdit.text=this.idEdit.text.trim()+(this.marker.checked?' marker':'');};
   let status=new HorizontalSizer;status.spacing=8;status.add(this.imaged);status.addStretch();let dl=new Label(this);dl.text='Imaged on:';status.add(dl);status.add(this.imagedDate);status.add(this.imagedDateButton);
   this.applyButton=ablButton(this,'Apply',()=>{try{
      if(!object&&typeof this.listIds[this.listSelect.currentItem]!=='string')
         throw Error('Choose a destination in Add to list, or explicitly select No list — collection only.');
      let value=this.value();
      if(!object){this.destinationListId=this.listIds[this.listSelect.currentItem];ABL.validateNewObject(parent.doc,this.destinationListId,value);}
      else this.editedListIds=this.membershipNodes.filter(n=>n.checked).map(n=>n.listId);
      this.editedObject=value;this.ok();
   }catch(e){
      if(!object&&e.code==='ABL_DUPLICATE_OBJECT'){
         let duplicate=new ABLDuplicateDialog(this,this.value(),e.matches);
         if(parent.executeDialog(duplicate)){this.existingObjectId=duplicate.existingObjectId;this.ok();}
      }else parent.error(e);
   }});
   this.cancelButton=ablButton(this,'Cancel',()=>this.cancel());this.applyButton.defaultButton=true;
   let buttons=new HorizontalSizer;buttons.spacing=6;buttons.add(this.marker);buttons.addStretch();buttons.add(this.applyButton);buttons.add(this.cancelButton);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=7;
   if(this.listSelect)this.sizer.add(ablRow(this,'Add to list:',this.listSelect));
   if(this.membershipTree)this.sizer.add(ablRow(this,'List memberships:',this.membershipTree));
   this.sizer.add(ablRow(this,'Catalog identifier:',idRow));this.sizer.add(ablRow(this,'Lookup source:',this.server));
   this.sizer.add(ablRow(this,'Display name:',nameRow));this.sizer.add(ablRow(this,'Stellarium label:',stellariumLabelRow));this.sizer.add(ablRow(this,'Object type:',typeRow));this.sizer.add(ablRow(this,'',this.typeHint));this.sizer.add(ablRow(this,'RA (J2000):',coordinateRow));
   this.sizer.add(ablRow(this,'Constellation / month:',this.constellationLabel));
   this.sizer.add(ablRow(this,'Apparent size (arcmin):',sizeRow));this.sizer.add(ablRow(this,'',this.sizeSource));
   this.sizer.add(ablRow(this,'Filters:',this.filtersEdit));this.sizer.add(ablRow(this,'Target band:',bandRow));this.sizer.add(ablRow(this,'Comments:',this.notesEdit));this.sizer.add(ablRow(this,'Catalog information:',this.catalogText));this.sizer.add(catalogActions);this.sizer.add(status);this.sizer.add(buttons);
   this.updateBand=()=>{
      let o=ABL.copy(this.source),m=ABL.meta(o);m.filters=this.filtersEdit.text;m.notes=this.notesEdit.text;o.name=o.nameI18n=m.displayName=this.nameEdit.text;
      this.applyObjectType(o);
      ABL.setCatalogInformation(o,this.catalogText.text);ABL.setTargetBand(o,this.bandSelect.values[this.bandSelect.currentItem]);
      let c=ABL.targetBand(o);this.bandHint.text=c.mode==='auto'?'Automatic: '+c.label:'Manual classification';this.bandHint.toolTip=c.reason;
   };
   this.bandSelect.onItemSelected=this.filtersEdit.onTextUpdated=this.notesEdit.onTextUpdated=this.catalogText.onTextUpdated=this.nameEdit.onTextUpdated=()=>this.updateBand();
   this.updatePosition=()=>{let ra=ABL.coordinate(this.raEdit.text,true),dec=ABL.coordinate(this.decEdit.text,false);
      let code=ra!==null&&dec!==null?ABL.constellation(ra,dec):'',key=ABL.monthKey(code,ra),month=ABL.config(parent.doc).constellationMonths[key]||0;
      this.constellationLabel.text=code?((key==='SerCap'?'Serpens Caput':key==='SerCau'?'Serpens Cauda':ABL_CONSTELLATIONS[code])+' — '+ABL.MONTHS[month]):'Enter coordinates or use Look up';};
   this.raEdit.onTextUpdated=this.decEdit.onTextUpdated=()=>this.updatePosition();
   this.fill=()=>{let o=this.source,m=ABL.meta(o);this.nameEdit.text=m.displayName||o.name||o.nameI18n||'';this.raEdit.text=o.ra===undefined||o.ra===null?'':String(o.ra);this.decEdit.text=o.dec===undefined||o.dec===null?'':String(o.dec);
      if(ABL.own(m,'displayName'))this.nameEdit.text=ABL.text(m.displayName);
      this.catalogCoordinatesButton.enabled=!!m.catalogPosition&&Number.isFinite(m.catalogPosition.ra)&&Number.isFinite(m.catalogPosition.dec);
      this.typeHint.text='Re-evaluate considers catalog information, descriptions and comments.';this.typeHint.toolTip='';
      this.stellariumLabelEdit.text=o.designation||this.idEdit.text;this.labelAutomatic=!o.designation||ABL.norm(o.designation)===ABL.norm(this.idEdit.text);
      this.fillingType=true;this.typeBaseline=ABL.objectType(o);this.typeSelect.editText=this.typeBaseline;this.typeReset=false;this.fillingType=false;
      this.catalogTypeButton.enabled=!!ABL.text(m.manualObjectType).trim();
      // TextBox setters interpret console markup; escape literal prose so
      // ampersands and angle brackets survive a fill/edit/save cycle.
      this.notesEdit.text=ABL.html(ABL.cleanNotes(m.notes));this.filtersEdit.text=ABL.filterInfo(o).text;
      this.useCatalogSize.checked=!ABL.own(m,'angularSize');this.fillSize();
      this.catalogText.text=ABL.html(ABL.catalogInformation(o));this.catalogText.toolTip='Object description and catalog facts in one editable field. Repeated lines are removed when applied. Your edits survive catalog updates.'+(m.catalogSource?'\nCatalog source: '+m.catalogSource:'');
      this.imaged.checked=m.imaged===true;this.imagedDate.text=m.imagedOn||'';
      let band=ABL.targetBand(o);this.bandSelect.currentItem=band.mode==='manual'?this.bandSelect.values.indexOf(band.value):0;
      this.marker.checked=/marker/i.test(this.stellariumLabelEdit.text);this.updatePosition();this.updateBand();};
   this.formSignature=()=>JSON.stringify([this.idEdit.text,this.nameEdit.text,this.raEdit.text,this.decEdit.text,this.useCatalogSize.checked,this.majorEdit.text,this.minorEdit.text,this.filtersEdit.text,this.notesEdit.text,this.catalogText.text,this.bandSelect.currentItem,this.imaged.checked,this.imagedDate.text,this.marker.checked,this.typeSelect.editText,this.typeReset,this.stellariumLabelEdit.text]);
   this.value=()=>{if(object&&!this.lookupPerformed&&!this.catalogReset&&this.formSignature()===this.initialForm)return ABL.copy(this.initialObject);let o=ABL.copy(this.source),m=ABL.meta(o);o.designation=this.idEdit.text.trim().replace(/\s+marker$/i,'');
      o.name=this.nameEdit.text.trim();o.nameI18n=o.name;o.ra=this.raEdit.text.trim();o.dec=this.decEdit.text.trim();
      m.displayName=o.name;m.notes=ABL.cleanNotes(this.notesEdit.text);m.filters=this.filtersEdit.text.trim();m.imagedOn=this.imagedDate.text.trim();m.imaged=this.imaged.checked||!!m.imagedOn;
      ABL.setCatalogInformation(o,this.catalogText.text);
      this.applyObjectType(o);
      ABL.setTargetBand(o,this.bandSelect.values[this.bandSelect.currentItem]);
      if(this.useCatalogSize.checked)delete m.angularSize;else m.angularSize=ABL.manualSize(this.majorEdit.text,this.minorEdit.text);
      let label=this.stellariumLabelEdit.text.trim();
      if(!label||this.labelAutomatic&&ABL.norm(label)!==ABL.norm(o.designation))label=o.designation+(this.marker.checked?' marker':'');
      ABL.setStellariumLabel(o,this.idEdit.text,label);
      // Retain all four fractional-second digits offered by manual entry.
      if(!o.fov)o.fov=2;ABL.validateObject(o,4);
      // Applying one edit must not rewrite unrelated defaults or round the
      // original coordinate representation. This also lets a later edit
      // restore the original content and clear the unsaved-change prompt.
      if(object&&!this.lookupPerformed){
         let initial=JSON.parse(this.initialForm),current=JSON.parse(this.formSignature()),original=this.initialObject,old=ABL.meta(original);
         const unchanged=indices=>indices.every(i=>initial[i]===current[i]);
         const restore=(dest,source,keys)=>{for(let key of keys){if(ABL.own(source,key))dest[key]=ABL.copy(source[key]);else delete dest[key];}};
         if(unchanged([0,13,16])){restore(o,original,['designation','type','isVisibleMarker']);restore(m,old,['catalogIdentifier']);}
         if(unchanged([1])){restore(o,original,['name','nameI18n']);restore(m,old,['displayName']);}
         if(unchanged([2]))restore(o,original,['ra']);
         if(unchanged([3]))restore(o,original,['dec']);
         if(unchanged([2,3]))restore(o,original,['constellation']);
         if(unchanged([4,5,6]))restore(m,old,['angularSize']);
         if(unchanged([7]))restore(m,old,['filters']);
         if(unchanged([8]))restore(m,old,['notes']);
         if(unchanged([9])&&!this.catalogReset)restore(m,old,['catalogInformation']);
         if(unchanged([10]))restore(m,old,['targetBand']);
         if(unchanged([11,12]))restore(m,old,['imaged','imagedOn']);
         if(unchanged([14,15]))restore(m,old,['manualObjectType']);
         restore(o,original,['fov']);
      }
      return o;};
   this.fill();this.initialForm=this.formSignature();this.initialObject=ABL.copy(this.source);this.adjustToContents();
   // Reserve the coordinate row's real width, including both actions. Native
   // sizers can otherwise squeeze labels between fixed-width input fields.
   let coordinateWidth=this.raEdit.position.x+this.raEdit.width+this.decEdit.width+this.font.width('Dec (J2000):')+this.coordinatesButton.width+this.catalogCoordinatesButton.width+this.logicalPixelsToPhysical(5*8+12);
   this.setMinWidth(Math.max(this.width,coordinateWidth));this.adjustToContents();
   // Wrapped hints and fixed-height editors need the fully calculated height;
   // a smaller vertical layout can otherwise overlap the catalog text action.
   this.setMinHeight(this.height);
}}

class ABLMonthsDialog extends Dialog { constructor(parent){
   super(parent);this.windowTitle='Constellation imaging months';this.setMinWidth(540);
   this.mapping=ABL.copy(ABL.config(parent.doc).constellationMonths);
   this.info=new Label(this);this.info.text='Assign a planning month to each constellation. Select a constellation to change its month.';this.info.wordWrapping=true;
   this.tree=new TreeBox(this);this.tree.numberOfColumns=2;this.tree.headerVisible=true;this.tree.setHeaderText(0,'Constellation');this.tree.setHeaderText(1,'Imaging month');this.tree.rootDecoration=false;this.tree.setMinHeight(390);
   this.month=new ComboBox(this);for(let m of ABL.MONTHS)this.month.addItem(m);
   this.nodes=[];
   this.rebuild=()=>{this.tree.clear();this.nodes=[];let keys=Object.keys(ABL_CONSTELLATIONS).filter(k=>k!=='Ser').concat(['SerCap','SerCau']);
      keys.sort((a,b)=>this.label(a).localeCompare(this.label(b)));
      for(let key of keys){let n=new TreeBoxNode(this.tree);n.key=key;n.setText(0,this.label(key));n.setText(1,ABL.MONTHS[this.mapping[key]||0]);this.nodes.push(n);}
      this.tree.adjustColumnWidthToContents(0);this.tree.adjustColumnWidthToContents(1);};
   this.label=k=>k==='SerCap'?'Serpens Caput (west)':k==='SerCau'?'Serpens Cauda (east)':ABL_CONSTELLATIONS[k]+' ('+k+')';
   this.tree.onCurrentNodeUpdated=n=>{if(n)this.month.currentItem=this.mapping[n.key]||0;};
   this.month.onItemSelected=i=>{let n=this.tree.currentNode;if(n){this.mapping[n.key]=i;n.setText(1,ABL.MONTHS[i]);}};
   let reset=ablButton(this,'Bucket-list defaults',()=>{this.mapping=ABL.copy(ABL_DEFAULT_MONTHS);this.rebuild();});
   let apply=ablButton(this,'Apply',()=>this.ok()),cancel=ablButton(this,'Cancel',()=>this.cancel());
   let buttons=new HorizontalSizer;buttons.spacing=6;buttons.add(reset);buttons.addStretch();buttons.add(apply);buttons.add(cancel);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=8;this.sizer.add(this.info);this.sizer.add(this.tree,100);this.sizer.add(ablRow(this,'Imaging month:',this.month));this.sizer.add(buttons);
   this.rebuild();this.adjustToContents();
}}

// Preferences describe all targets. Effective framing is derived separately
// so fitting, missing sizes and survey limits never overwrite manual widths.
const ABL_DEFAULT_USABLE_MINUTES=60;
function ablLoadPreviewPreferences(text,style='modern-editorial'){
   let defaults={sky:Object.assign({coverage:45,fitObjectSize:false,style:ablChartStyle(style).key,labelDensity:'normal',inset:false,insetDegrees:2},ABL.chartAppearance()),dss:{coverage:30,fitObjectSize:true},details:ablChartDetailSettings(),planningUsableOnly:true,minimumUsableMinutes:ABL_DEFAULT_USABLE_MINUTES},saved;
   try{saved=JSON.parse(text);}catch(e){return defaults;}
   for(let key of ['sky','dss']){let value=saved?.[key],target=defaults[key];if(!value||typeof value!=='object')continue;
      if(Number.isFinite(value.coverage)&&value.coverage>=(key==='sky'?.1:5)&&value.coverage<=120)target.coverage=value.coverage;
      if(typeof value.fitObjectSize==='boolean')target.fitObjectSize=value.fitObjectSize;
      if(key==='sky'){
         Object.assign(target,ABL.chartAppearance(value));
         if(['modern-editorial','vintage-atlas','observing-atlas'].includes(value.style))target.style=value.style;
         if(['sparse','normal','detailed'].includes(value.labelDensity))target.labelDensity=value.labelDensity;
         if(typeof value.inset==='boolean')target.inset=value.inset;
         if(Number.isFinite(value.insetDegrees)&&value.insetDegrees>=.1&&value.insetDegrees<=120)target.insetDegrees=value.insetDegrees;
      }
   }
   if(typeof saved?.planningUsableOnly==='boolean')defaults.planningUsableOnly=saved.planningUsableOnly;
   if(Number.isInteger(saved?.minimumUsableMinutes)&&saved.minimumUsableMinutes>=0&&saved.minimumUsableMinutes<=1440)
      defaults.minimumUsableMinutes=saved.minimumUsableMinutes;
   defaults.details=ablChartDetailSettings(saved?.details);
   return defaults;
}
function ablPreviewSettings(object,sky,preferences){
   let value=ABL.copy(preferences),size=object?ABL.angularSize(object):null;
   if(!sky&&size&&size.majorArcmin>120)value.coverage=120;
   else if(size&&value.fitObjectSize){let framing=ABL.chartFraming(object,sky);value.coverage=sky?framing.sky:framing.field;}
   if(sky){
      value.inset=!!value.inset&&!!object&&value.coverage>.1;
      if(value.insetDegrees>=value.coverage)value.insetDegrees=Math.max(.1,value.coverage/2);
   }
   return value;
}

// A chart preset stores preferred settings, never a target-specific fitted
// width or viewport. Normalize without masking catalog availability so saved
// choices remain intact when a local catalog is temporarily unavailable.
function ablChartDetailSettings(value){
   let raw=value&&typeof value==='object'?value:{},details={catalogs:{},borders:raw.borders!==false,starNames:raw.starNames===true,
      starMagnitudes:raw.starMagnitudes===true,objectDetails:raw.objectDetails===true,contours:raw.contours!==false};
   for(let entry of ablChartCatalogs()){
      let c=raw.catalogs?.[entry.key]||{};
      details.catalogs[entry.key]={enabled:typeof c.enabled==='boolean'?c.enabled:['messier','ngc'].includes(entry.key),
         labels:c.labels!==false,mode:['auto','manual','unlimited'].includes(c.mode)?c.mode:'auto',
         magnitude:Number.isFinite(c.magnitude)&&c.magnitude>=-5&&c.magnitude<=25?c.magnitude:12};
   }
   return details;
}
function ablChartPresetState(value={}){
   if(!value||typeof value!=='object')value={};
   return {sky:ablLoadPreviewPreferences(JSON.stringify({sky:value.sky})).sky,details:ablChartDetailSettings(value.details),
      contourPath:typeof value.contourPath==='string'?value.contourPath:'',outlineLevel:[0,1,2,3].includes(value.outlineLevel)?value.outlineLevel:2};
}
function ablLoadChartPresets(text){
   if(typeof text!=='string'||text.length>1048576)return [];
   try{let data=JSON.parse(text);if(!data||data.version!==1||!Array.isArray(data.presets)||data.presets.length>50)return [];
      let names=new Set,presets=[];
      for(let p of data.presets){
         if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.trim().length>80||!p.chart||typeof p.chart!=='object'||Array.isArray(p.chart))continue;
         let name=p.name.trim(),key=name.toLowerCase();if(names.has(key))continue;
         if(typeof p.chart.contourPath==='string'&&p.chart.contourPath.length>4096)continue;
         names.add(key);presets.push({name,chart:ablChartPresetState(p.chart)});
      }
      return presets;
   }catch(e){return [];}
}
// Strip projected screen positions from a pick. Only fixed-sky facts belong
// in history and cache keys; the next chart projects the target afresh.
function ablNavigationPick(hit){
   if(!hit||!ablChartTargetPosition(hit))throw Error('Choose a chart object with valid J2000 coordinates.');
   return {designation:hit.designation||'',name:hit.name||hit.designation||'',type:hit.type||'',ra:hit.ra,dec:hit.dec,
      size:hit.size?ABL.copy(hit.size):null,magnitude:Number.isFinite(hit.magnitude)?hit.magnitude:null,
      aliases:Array.isArray(hit.aliases)?hit.aliases.slice():[],catalog:hit.catalog||'',objectId:hit.objectId||''};
}
function ablNavigationIdentity(object,group,centerPick){
   return group?'group:'+JSON.stringify(group):object?JSON.stringify([ABL.position(object),ABL.norm(centerPick?centerPick.designation||centerPick.name:ABL.catalogIdentifier(object))]):'';
}

// The opt-in flag and filename are independent persistent script settings.
// They use PixInsight's settings store, never the collection or process icon.
// An existing filename alone does not enable automatic reopening.
function ablCollectionPreferenceStore(settings=Settings){
   return {
      readRemember:()=>{let value=settings.read('AstroBucketList/rememberCollection',DataType.Boolean);return settings.lastReadOK&&value===true;},
      readPath:()=>{let value=settings.read('AstroBucketList/lastFile',DataType.String);return settings.lastReadOK&&typeof value==='string'?value:'';},
      writeRemember:value=>settings.write('AstroBucketList/rememberCollection',DataType.Boolean,value),
      writePath:path=>{if(path)settings.write('AstroBucketList/lastFile',DataType.String,path);else settings.remove('AstroBucketList/lastFile');}
   };
}
function ablRememberedCollectionPath(store=ablCollectionPreferenceStore()){
   if(store.readRemember()!==true)return '';
   let path=store.readPath();return typeof path==='string'?path:'';
}

// Observing preferences belong to the local PixInsight profile, never to an
// object, SOL collection or chart preset. No site is assumed before setup.
// Horizon samples use true north = 0°, east = 90°. A periodic linear profile
// closes the last point back to the first, including horizons spanning north.
const ABL_HORIZON_MODES=['azDeg_altDeg','azDeg_zdDeg','azRad_altRad','azRad_zdRad','azGrad_altGrad','azGrad_zdGrad'];
function ablHorizonPoints(points){
   if(!Array.isArray(points)||points.length>720)throw Error('A horizon supports at most 720 azimuth/altitude pairs.');
   let sorted=points.map(p=>{
      if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[0]>360||p[1]<-90||p[1]>90)throw Error('Horizon points require azimuth 0–360° and altitude −90–90°.');
      return [p[0]===360?0:p[0],p[1]];
   }).sort((a,b)=>a[0]-b[0]),result=[];
   for(let p of sorted){let last=result[result.length-1];
      if(last&&Math.abs(last[0]-p[0])<1e-8){if(Math.abs(last[1]-p[1])>1e-8)throw Error('Conflicting horizon altitudes at azimuth '+p[0]+'°.');}
      else result.push(p);
   }
   if(result.length===1)throw Error('Enter at least two distinct azimuths, or clear the horizon.');
   return result;
}
function ablParseHorizon(text,mode='azDeg_altDeg',rotation=0){
   if(typeof text!=='string'||text.length>131072)throw Error('The horizon text is too large (maximum 128 KiB).');
   if(!ABL_HORIZON_MODES.includes(mode)||!Number.isFinite(rotation)||Math.abs(rotation)>360)throw Error('Choose valid horizon units and a rotation from −360° to +360°.');
   let factor=mode.includes('Rad')?180/Math.PI:mode.includes('Grad')?.9:1,points=[];
   for(let [i,line]of text.replace(/^\uFEFF/,'').split(/\r?\n/).entries()){
      line=line.split('#')[0].trim();if(!line)continue;
      let parts=line.split(/[\s,;]+/);
      if(parts.length!==2||parts.some(s=>!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(s)))throw Error('Horizon line '+(i+1)+': enter exactly two numbers, azimuth and altitude.');
      let az=Number(parts[0])*factor,alt=Number(parts[1])*factor;
      if(mode.includes('_zd'))alt=90-alt;
      if(!Number.isFinite(az)||az<0||az>360+1e-8||!Number.isFinite(alt)||alt<-90||alt>90)throw Error('Horizon line '+(i+1)+': coordinates are outside their allowed ranges.');
      points.push([((az+rotation)%360+360)%360,alt]);
   }
   return ablHorizonPoints(points);
}
function ablHorizonText(points){return points.map(p=>p.map(String).join(' ')).join('\n');}
function ablHorizonIndex(points,az){let lo=0,hi=points.length;while(lo<hi){let mid=(lo+hi)>>1;if(points[mid][0]<=az)lo=mid+1;else hi=mid;}return lo;}
function ablHorizonAltitude(points,az){
   if(!points.length)return 0;az=((az%360)+360)%360;
   let index=ablHorizonIndex(points,az),a=points[(index+points.length-1)%points.length],b=points[index%points.length];
   let left=a[0],right=b[0];if(index===0)left-=360;if(index===points.length)right+=360;
   return a[1]+(b[1]-a[1])*(az-left)/(right-left);
}
function ablHorizonSource(value){return typeof value==='string'?value.replace(/[\x00-\x1f]/g,' ').slice(0,160):'';}
function ablPlanningPreferences(value={}){
   let p={siteName:'Observing site',latitude:null,longitude:null,height:0,utcOffset:-new Date().getTimezoneOffset()/60,minAltitude:0,sunAltitude:-18,moonSeparation:0,
      broadbandMoonSeparation:null,narrowbandMoonSeparation:null,plotRange:'night',beforeDuskHours:1,afterDawnHours:1,
      horizonEnabled:false,horizonSource:'',horizonPoints:[]};
   if(!value||typeof value!=='object')return p;
   if(typeof value.siteName==='string')p.siteName=value.siteName.trim().slice(0,80);
   for(let [key,min,max]of [['latitude',-90,90],['longitude',-180,180],['height',-500,10000],['utcOffset',-12,14],['minAltitude',0,90],['moonSeparation',0,180],['broadbandMoonSeparation',0,180],['narrowbandMoonSeparation',0,180]])
      if(Number.isFinite(value[key])&&value[key]>=min&&value[key]<=max)p[key]=value[key];
   if([0,-6,-12,-18].includes(value.sunAltitude))p.sunAltitude=value.sunAltitude;
   if(value.plotRange==='full')p.plotRange='full';
   for(const key of ['beforeDuskHours','afterDawnHours'])
      if(Number.isFinite(value[key])&&value[key]>=0&&value[key]<=12)p[key]=value[key];
   if(value.horizonPoints!==undefined)p.horizonPoints=ablHorizonPoints(value.horizonPoints);
   p.horizonEnabled=value.horizonEnabled===true;
   p.horizonSource=ablHorizonSource(value.horizonSource);
   if(p.horizonEnabled&&!p.horizonPoints.length)throw Error('Load or enter a horizon before enabling it.');
   return p;
}
function ablLoadPlanningPreferences(text){let state=ablLoadObservingSites(text);return state.sites[state.active];}
function ablValidatePlanningPreferences(value){
   let normalized=ablPlanningPreferences(value);
   if(!value||Object.keys(normalized).some(key=>value[key]!==undefined&&(key==='horizonPoints'?JSON.stringify(value[key])!==JSON.stringify(normalized[key]):value[key]!==normalized[key])))throw Error('Enter valid observing coordinates, UTC offset, horizon and planning limits.');
   if((normalized.latitude===null)!==(normalized.longitude===null))throw Error('Enter both latitude and longitude, or leave both empty.');
   if(Math.abs(normalized.utcOffset*60-Math.round(normalized.utcOffset*60))>1e-8)throw Error('Specify the UTC offset in whole minutes, for example 1, 5.5 or 5.75 hours.');
   return normalized;
}
function ablValidateObservingSites(value){
   if(!value||value.version!==2||!Array.isArray(value.sites)||!value.sites.length||value.sites.length>30||!Number.isInteger(value.active)||value.active<0||value.active>=value.sites.length)throw Error('Choose an observing site (maximum 30 profiles).');
   let sites=value.sites.map(ablValidatePlanningPreferences),names=new Set;
   for(let p of sites){if(!p.siteName||names.has(p.siteName.toLowerCase()))throw Error('Give every observing site a distinct name.');names.add(p.siteName.toLowerCase());}
   let result={version:2,active:value.active,sites};if(JSON.stringify(result).length>1048576)throw Error('Observing profiles exceed the 1 MiB settings limit.');return result;
}
function ablLoadObservingSites(text){
   const empty=()=>({version:2,active:0,sites:[ablPlanningPreferences()]});
   if(!text)return empty();
   try{
      if(text.length>1048576)throw Error('settings exceed 1 MiB');let value=JSON.parse(text);
      if(value?.version===2)return ablValidateObservingSites(value);
      // Migrate the former single-site settings in memory. A profile edit
      // persists the new structure; unrelated chart settings write nothing.
      if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==undefined)throw Error('unrecognized settings format');
      let p=ablValidatePlanningPreferences(value);p.siteName=p.siteName||'Observing site';return {version:2,active:0,sites:[p]};
   }catch(e){let result=empty();result.warning='Observing profiles could not be loaded: '+String(e.message||e)+'. Configure a site before planning. Stored settings have not been overwritten.';return result;}
}

// Include every horizon vertex traversed between two position samples. This
// prevents a narrow obstruction from disappearing when both endpoints clear
// it. Azimuth, altitude and solar/lunar constraints are interpolated over the
// original two-minute segment; times remain approximate, not mount guidance.
function ablPlanningHorizonSeries(night,azimuths,altitudes,separations,moonLimit=night.preferences.moonSeparation){
   let p=night.preferences,points=p.horizonPoints,times=[],series=[[],[],[],[],[]],limits=[];
   for(let i=0;i<night.times.length-1;++i){
      let az=azimuths[i],delta=((azimuths[i+1]-az+540)%360)-180,breaks=[0,1];
      if(p.horizonEnabled&&Math.abs(delta)>1e-10){let low=Math.min(az,az+delta),high=Math.max(az,az+delta);
         for(let turn=Math.floor(low/360);turn<=Math.floor(high/360);++turn){let shift=turn*360;
            for(let j=ablHorizonIndex(points,low-shift);j<points.length&&points[j][0]+shift<high;++j){let f=(points[j][0]+shift-az)/delta;if(f>1e-9&&f<1-1e-9)breaks.push(f);}
         }
      }
      breaks.sort((a,b)=>a-b);
      if(p.horizonEnabled){
         // Each interval is linear after inserting the horizon vertices.
         // Its crossing of the minimum altitude is a corner of the plotted
         // maximum; joining only the endpoints would overstate the limit.
         let crossings=[];
         for(let j=1;j<breaks.length;++j){let a=breaks[j-1],b=breaks[j],ha=ablHorizonAltitude(points,az+a*delta),hb=ablHorizonAltitude(points,az+b*delta);
            if(hb!==ha){let f=(p.minAltitude-ha)/(hb-ha);if(f>0&&f<1)crossings.push(a+f*(b-a));}
         }
         breaks.push(...crossings);breaks.sort((a,b)=>a-b);
      }
      // The next segment supplies this endpoint, except at the end of the night.
      if(i<night.times.length-2)breaks.pop();
      for(let f of breaks){const at=v=>v[i]+f*(v[i+1]-v[i]);let altitude=at(altitudes),horizon=p.horizonEnabled?ablHorizonAltitude(points,az+f*delta):0;
         times.push(night.times[i]+f*night.step);limits.push(Math.max(p.minAltitude,horizon));
         series[0].push(altitude-p.minAltitude);series[1].push(at(night.darkness));series[2].push(at(night.moonAltitudes));series[3].push(at(separations)-moonLimit);series[4].push(p.horizonEnabled?altitude-horizon:altitude-p.minAltitude);
      }
   }
   return {times,series,limits};
}

// Export a completed snapshot in the visible ranking. UTC instants accompany
// local timestamps in CSV so midnight and fixed-offset interpretation are clear.
function ablPlanningTimestamp(ms,period){
   let local=ablPlanningLocalISO(ms,period).slice(0,16),offset=ablPlanningOffset(period.offset).slice(3).replace('−','-');return local+offset;
}
function ablPlanningCSV(night,rows){
   let p=night.preferences,period=night.period;
   const cell=value=>{if(typeof value==='number')return Number.isFinite(value)?String(value):'';
      let s=String(value??'');if(/^[\s\x00-\x1f]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
   let lines=[['Object','Display name','RA J2000 deg','Dec J2000 deg','Night','Site','Latitude deg N','Longitude deg E','Height m','UTC offset hours','Minimum altitude deg','Sun limit deg','Moon separation deg','Horizon enabled','Horizon source','Peak altitude deg','Peak local','Above minimum hours','Clear horizon hours','Dark hours','Usable hours','Best start local','Best end local','All usable windows local','All usable windows UTC','Moon minimum deg','Status','Target band','Minimum usable minutes'].map(cell).join(',')];
   for(let r of rows){let c=ABL.position(r.record.object);lines.push([r.record.designation,r.record.name,c.ra,c.dec,period.date,p.siteName,p.latitude,p.longitude,p.height,p.utcOffset,p.minAltitude,p.sunAltitude,r.moonLimit,p.horizonEnabled?'yes':'no',p.horizonSource,r.peak?.value??'',r.peak?ablPlanningTimestamp(r.peak.time,period):'',r.missing?'':r.above/3600000,r.missing?'':r.clear/3600000,r.missing?'':r.dark/3600000,r.missing?'':r.usable/3600000,r.best?ablPlanningTimestamp(r.best[0],period):'',r.best?ablPlanningTimestamp(r.best[1],period):'',r.windows.map(w=>w.map(t=>ablPlanningTimestamp(t,period)).join(' / ')).join('; '),r.windows.map(w=>w.map(t=>new Date(Math.round(t/60000)*60000).toISOString()).join(' / ')).join('; '),r.moonMinimum??'',r.status,ABL.BAND_LABELS[r.band],night.minimumUsableMinutes??ABL_DEFAULT_USABLE_MINUTES].map(cell).join(','));}
   return '\uFEFF'+lines.join('\r\n')+'\r\n';
}
function ablWritePlanPDF(night,rows,path,scope){
   // Native PDF rendering keeps the report inside PixInsight. A verified
   // temporary PDF is handed to the same replacement writer as chart exports.
   let temporary=File.uniqueFileName(File.systemTempDirectory,20,'AstroBucketList-plan-','.pdf');
   TGFileProtection.assertOutsideInstallation(temporary,'Temporary observing plan');
   if(File.exists(temporary)||File.directoryExists(temporary))throw Error('Temporary plan path is occupied.');
   try{
      let pdf=new PDF(temporary);pdf.pageSize=new Rect(0,0,210,297);pdf.landscape=true;pdf.margins=new Rect(0,0,0,0);pdf.resolution=72;pdf.title='Observing plan - '+night.period.date;pdf.creator='Astro Bucket List '+ABL_VERSION+' / PixInsight';
      let g=new Graphics(pdf),body=new Font('DejaVu Sans',9,'px'),bold=new Font('DejaVu Sans',11,'px'),title=new Font('DejaVu Sans',18,'px');bold.bold=true;title.bold=true;
      let y=0,page=0,p=night.preferences,width=297/25.4*72,left=36,right=width-36,bottom=210/25.4*72-45;
      const wrap=(text,font)=>{let lines=[],line='';for(let word of String(text).replace(/[\r\n\t]+/g,' ').split(' ')){
         if(font.width(line+(line?' ':'')+word)<=right-left){line+=(line?' ':'')+word;continue;}
         if(line){lines.push(line);line='';}for(let ch of word){if(font.width(line+ch)>right-left){lines.push(line);line='';}line+=ch;}
      }if(line)lines.push(line);return lines;};
      const newPage=()=>{
         if(page>=200)throw Error('The report exceeds 200 pages. Narrow the table filters or export CSV.');
         if(page)pdf.newPage();++page;g.pen=new Pen(0xff203344);g.font=title;g.drawText(left,42,'Observing plan');
         g.font=body;g.pen=new Pen(0xff465866);g.drawText(left,61,night.period.date+' / '+ablPlanningLocalISO(night.period.end,night.period).slice(0,10)+'  |  '+ablPlanningTimeContext(night.period)+'  |  '+rows.length+' targets  |  '+scope);
         let site=p.siteName+'  |  '+p.latitude.toFixed(4)+'°, '+p.longitude.toFixed(4)+'°  |  '+p.height+' m',headerY=76;
         for(let line of wrap(site,body)){g.drawText(left,headerY,line);headerY+=15;}
         let limits='Altitude ≥ '+p.minAltitude+'°  |  Sun ≤ '+p.sunAltitude+'°  |  '+ablSiteMoonLimitText(p)+'  |  Minimum usable '+ablMinimumTimeText(night.minimumUsableMinutes??ABL_DEFAULT_USABLE_MINUTES)+'  |  Horizon '+(p.horizonEnabled?'enabled: '+(p.horizonSource||'Manual profile'):'off');
         for(let line of wrap(limits,body)){g.drawText(left,headerY,line);headerY+=15;}
         g.pen=new Pen(0xffaab9c4);g.drawLine(left,headerY-3,right,headerY-3);g.font=body;g.pen=new Pen(0xff52606b);
         g.drawText(left,bottom+25,'Local times; dates identify midnight crossings. Approximate windows. Check daylight saving offset.');g.drawText(right-52,bottom+25,'Page '+page);y=headerY+16;
      };
      const paragraph=(text,font,color=0xff203344)=>{for(let line of wrap(text,font)){if(y+15>bottom)newPage();g.font=font;g.pen=new Pen(color);g.drawText(left,y,line);y+=14;}};
      try{
         newPage();
         for(let r of rows){if(y+72>bottom)newPage();paragraph(ABL.objectHeading(r.record.designation,r.record.name),bold);
            let peak=r.peak?r.peak.value.toFixed(1)+'° at '+ablPlanningDateTime(r.peak.time,night.period):'not available';
            paragraph(r.status+'  |  '+ablTargetMoonLimitText(r)+'  |  Peak in darkness: '+peak+'  |  Usable: '+(r.missing?'unknown':ablPlanningHours(r.usable))+'  |  Dark: '+(r.missing?'unknown':ablPlanningHours(r.dark)),body);
            paragraph('Windows: '+(r.windows.length?r.windows.map(w=>ablPlanningRange(w,night.period,true)).join('; '):'none')+(r.moonMinimum===null?'':'  |  Minimum Moon separation: '+r.moonMinimum.toFixed(1)+'°'),body);
            g.pen=new Pen(0xffd6dfe5);g.drawLine(left,y+2,right,y+2);y+=22;
         }
      }finally{g.end();}
      let bytes=File.readFile(temporary);if(bytes.length<8||bytes[0]!==37||bytes[1]!==80||bytes[2]!==68||bytes[3]!==70)throw Error('The PDF renderer did not produce a complete plan.');
      TGFileProtection.writeFile(path,bytes,'Observing plan export');
   }finally{if(File.exists(temporary))try{TGFileProtection.removeFile(temporary,'Temporary observing plan');}catch(e){console.warningln('Temporary plan remains at '+temporary+': '+e);}}
}
function ablExportPlan(night,rows,path,scope='All results'){
   if(!night||!rows.length)throw Error('Finish planning and select at least one result to export.');
   path=TGFileProtection.assertOutsideInstallation(path,'Observing plan export');
   let ext=File.extractExtension(path).toLowerCase();
   if(ext==='.csv')TGFileProtection.writeTextFile(path,ablPlanningCSV(night,rows),'Observing plan export');
   else if(ext==='.pdf')ablWritePlanPDF(night,rows,path,scope);
   else throw Error('Choose a filename ending in .csv or .pdf.');
   return path;
}

function ablPlanningToday(offset){return new Date(Date.now()+offset*3600000).toISOString().slice(0,10);}
function ablPlanningOffset(offset){let minutes=Math.round(Math.abs(offset)*60);return 'UTC'+(offset<0?'−':'+')+String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');}
function ablPlanningPeriod(date,offset){
   if(!ABL.validDate(date))throw Error('Enter an observing date as YYYY-MM-DD.');
   // UTC parsing avoids the computer's timezone and Date's special handling
   // of years 0–99. The selected date denotes the evening, noon to next noon.
   let day=Date.parse(date+'T00:00:00Z'),start=day+(12-offset)*3600000;
   if(!Number.isFinite(start))throw Error('Invalid observing date.');
   return {date,offset,start,end:start+86400000,day};
}
// Clock and calendar labels use the observing site's fixed local offset,
// including minute rounding at midnight. UTC is never used as a display fallback.
function ablPlanningLocalISO(ms,period){return new Date(Math.round((ms+period.offset*3600000)/60000)*60000).toISOString();}
function ablPlanningTime(ms,period){return ablPlanningLocalISO(ms,period).slice(11,16);}
function ablPlanningDateTime(ms,period){return ablPlanningLocalISO(ms,period).slice(0,16).replace('T',' ');}
function ablPlanningTimeContext(period){return 'Local time ('+ablPlanningOffset(period.offset)+')';}

// Separate calendar labels from HH:mm ticks. The midnight divider remains at
// the selected site's midnight, including fractional offsets and year rollover.
function ablPlanningPlotRange(night,site){
   const {period,darkIntervals}=night;
   if(site.plotRange==='full'||!darkIntervals.length)return period;
   // Use the same interpolated solar crossings as the plan, clipped to the sampled day.
   return {start:Math.max(period.start,darkIntervals[0][0]-site.beforeDuskHours*3600000),
           end:Math.min(period.end,darkIntervals[darkIntervals.length-1][1]+site.afterDawnHours*3600000)};
}
const ABL_NIGHT_SHADING={darkness:0xff526f98,unusable:0xff51353f,usable:0xff214739};
function ablDrawPlanningBands(g,plot,darkIntervals,windows,scale){
   const {left,top,width,height,range,x}=plot;
   const stripTop=top-scale(18),stripBottom=top-scale(8);
   const fillIntervals=(intervals,y0,y1,color)=>{
      const brush=new Brush(color);
      for(const [start,end] of intervals){
         const a=Math.max(start,range.start),b=Math.min(end,range.end);
         if(a<b)g.fillRect(x(a),y0,x(b),y1,brush);
      }
   };
   g.pen=new Pen(0xffb2c5e1);g.drawText(scale(4),stripBottom,'Sky');
   g.fillRect(left,stripTop,left+width,stripBottom,new Brush(0xff30343c));
   fillIntervals(darkIntervals,stripTop,stripBottom,ABL_NIGHT_SHADING.darkness);
   // The sky strip stays visible across every target window. The altitude
   // plot distinguishes usable windows from the rest of the site's dark time.
   fillIntervals(darkIntervals,top,top+height,ABL_NIGHT_SHADING.unusable);
   fillIntervals(windows,top,top+height,ABL_NIGHT_SHADING.usable);
}
function ablDrawPlanningTimeAxis(g,period,plot,scale,range=period){
   let left=plot.left,right=left+plot.width,bottom=plot.top+plot.height;
   const duration=range.end-range.start,x=time=>left+(time-range.start)/duration*plot.width;
   let midnight=period.day+86400000-period.offset*3600000,mid=x(midnight);
   const crosses=range.start<midnight&&midnight<=range.end;
   if(crosses){g.pen=new Pen(0xff71829b,1,PenStyle.Dash);g.drawLine(mid,plot.top,mid,bottom+scale(5));}
   g.pen=new Pen(0xffaebaca);
   // Align ticks to the site's clock. Pick the label interval from the actual
   // font and available width, keeping hour marks even when labels need more room.
   const gap=scale(6),labelSpace=g.font.width('00:00')+gap;
   const intervals=duration>=6*3600000?[60,120,180,240,360,720]:[1,5,10,15,30,60,120,180];
   const labelStep=(intervals.find(m=>m*60000/duration*plot.width>=labelSpace)||intervals[intervals.length-1])*60000;
   const tickStep=Math.min(labelStep,3600000),first=midnight+Math.ceil((range.start-midnight)/tickStep)*tickStep;
   const labelLeft=(time,width)=>Math.max(left,Math.min(right-width,x(time)-width/2));
   const midnightLeft=labelLeft(midnight,g.font.width('00:00'));
   let previousRight=-Infinity;
   for(let time=Math.min(first,range.end);time<=range.end;time+=tickStep){
      g.drawLine(x(time),bottom,x(time),bottom+scale(4));
      if((time-midnight)%labelStep!==0&&first<=range.end)continue;
      const label=ablPlanningTime(time,period),width=g.font.width(label),start=labelLeft(time,width);
      if(start<previousRight+gap||(crosses&&time<midnight&&start+width+gap>midnightLeft))continue;
      g.drawText(start,bottom+scale(18),label);previousRight=start+width;
   }
   let date=new Date(range.start+period.offset*3600000).toISOString().slice(0,10),nextDate=ablPlanningLocalISO(midnight,period).slice(0,10),context=ablPlanningTimeContext(period);
   g.pen=new Pen(0xffcbd3dc);g.drawText(left,bottom+scale(38),date);
   if(crosses){
      const lo=left+g.font.width(date)+scale(8),hi=right-g.font.width(context)-g.font.width(nextDate)-scale(8);
      g.drawText(Math.max(lo,Math.min(hi,mid-g.font.width(nextDate)/2)),bottom+scale(38),nextDate);
   }
   g.pen=new Pen(0xffaebaca);g.drawText(right-g.font.width(context),bottom+scale(38),context);
}
function ablPlanningHours(ms){return ms>0&&ms<360000?' <0.1 h':(ms/3600000).toFixed(1)+' h';}
// Eligibility uses the full unrounded nightly total, including disjoint windows.
function ablHasUsableTime(result,minutes){return result.usable>0&&result.usable>=minutes*60000;}
function ablMinimumTimeText(minutes){return minutes>0&&minutes%60===0?minutes/60+' h':minutes+' min';}
function ablPositiveTimeStatus(result,minutes){return ablHasUsableTime(result,minutes)?'Available':'Under '+ablMinimumTimeText(minutes)+' usable';}
function ablPlanningDuration(intervals){return intervals.reduce((sum,r)=>sum+r[1]-r[0],0);}
function ablPlanningRange(range,period,dated=false){
   if(!dated)return ablPlanningTime(range[0],period)+'–'+ablPlanningTime(range[1],period);
   let start=ablPlanningDateTime(range[0],period),end=ablPlanningDateTime(range[1],period);
   return start+(start.slice(0,10)===end.slice(0,10)?'–'+end.slice(11):' – '+end);
}

// Locate crossings of each sampled constraint, then test the resulting
// subintervals. Splitting every crossing preserves the Moon-below-horizon OR
// separation rule and disjoint windows that a single Boolean sample would lose.
function ablPlanningIntervals(times,series,accept){
   let result=[];
   for(let i=0;i<times.length-1;++i){let breaks=[0,1];
      for(let values of series){let a=values[i],b=values[i+1];if(a*b<0)breaks.push(a/(a-b));}
      breaks.sort((a,b)=>a-b);
      for(let j=0;j<breaks.length-1;++j){let a=breaks[j],b=breaks[j+1];if(b-a<1e-12)continue;
         let middle=(a+b)/2;if(!accept(series.map(values=>values[i]+middle*(values[i+1]-values[i]))))continue;
         let lo=times[i]+a*(times[i+1]-times[i]),hi=times[i]+b*(times[i+1]-times[i]);
         if(result.length&&Math.abs(result[result.length-1][1]-lo)<1)result[result.length-1][1]=hi;else result.push([lo,hi]);
      }
   }
   return result;
}
function ablPlanningAt(values,time,night){let index=Math.max(0,Math.min(values.length-1,(time-night.period.start)/night.step)),i=Math.floor(index),f=index-i;return i+1<values.length?values[i]+f*(values[i+1]-values[i]):values[i];}
function ablPlanningExtremum(values,intervals,night,maximum){
   let best=null;const consider=(time,value)=>{if(!best||(maximum?value>best.value:value<best.value))best={time,value};};
   for(let range of intervals){consider(range[0],ablPlanningAt(values,range[0],night));consider(range[1],ablPlanningAt(values,range[1],night));
      for(let i=Math.ceil((range[0]-night.period.start)/night.step);i<values.length&&night.times[i]<=range[1];++i)consider(night.times[i],values[i]);}
   return best;
}

// Native IAU reductions keep Sun, Moon and fixed J2000 collection targets in
// one apparent topocentric frame. Equinox-based ObserverPosition matches
// apparent(); equatorialToHorizontal() handles GAST and east-positive longitude.
// Geometric horizons are used: no weather-dependent atmospheric refraction.
function ablPlanningNight(date,preferences){
   let p=ablValidatePlanningPreferences(preferences);if(p.latitude===null)throw Error('Set latitude and longitude in Configuration → Observing.');
   let period=ablPlanningPeriod(date,p.utcOffset),ephemeris=EphemerisFile.fundamentalEphemerides;
   if(period.start<ephemeris.startTime.getTime()+86400000||period.end>ephemeris.endTime.getTime()-86400000)throw Error('This night is outside the installed fundamental ephemeris date range.');
   return {preferences:p,period,step:120000,count:721,ephemeris,
      observer:new ObserverPosition(p.longitude,p.latitude,p.height),sun:new EphemerisHandle(ephemeris,'Sn','SSB'),moon:new EphemerisHandle(ephemeris,'Mn','Ea'),
      minimumUsableMinutes:ABL_DEFAULT_USABLE_MINUTES,times:[],positions:[],sunAltitudes:[],moonAltitudes:[],moonCoordinates:[],darkness:[],darkIntervals:[]};
}
function ablPlanningSample(night){
   let time=night.period.start+night.times.length*night.step,position=new Position(new Date(time),'UTC');
   // Polar motion is negligible at the minute/degree resolution of planning.
   // Disabling this correction also avoids requiring a separate CIP database.
   position.polarMotionEnabled=false;position.observer=night.observer;
   let sun=position.apparent(night.sun).toSpherical2Pi(),moon=position.apparent(night.moon).toSpherical2Pi();
   let sunAltitude=Math.deg(position.equatorialToHorizontal(sun).y),moonAltitude=Math.deg(position.equatorialToHorizontal(moon).y);
   night.times.push(time);night.positions.push(position);night.sunAltitudes.push(sunAltitude);night.moonAltitudes.push(moonAltitude);night.moonCoordinates.push(moon);
   night.darkness.push(night.preferences.sunAltitude-sunAltitude);
   if(night.times.length===night.count)night.darkIntervals=ablPlanningIntervals(night.times,[night.darkness],v=>v[0]>=0);
}
// Null inherits the site's default. An explicit zero disables the Moon limit.
function ablPlanningMoonLimit(site,band){
   if(band==='broadband')return site.broadbandMoonSeparation??site.moonSeparation;
   if(band==='narrowband')return site.narrowbandMoonSeparation??site.moonSeparation;
   return site.moonSeparation;
}
function ablTargetMoonLimitText(result){
   const limit=result.moonLimit>0?result.moonLimit+'°':'off';
   return ABL.BAND_LABELS[result.band]+' · Moon limit '+limit;
}
function ablSiteMoonLimitText(site){
   if(site.broadbandMoonSeparation!=null||site.narrowbandMoonSeparation!=null)return 'Moon limits by target band';
   return site.moonSeparation?'Moon separation ≥ '+site.moonSeparation+'° when up':'Moon separation unrestricted';
}
function ablPlanningTarget(night,record){
   let coordinates=ABL.position(record.object),p=night.preferences;
   const band=record.band??ABL.targetBand(record.object).value;
   const moonLimit=ablPlanningMoonLimit(p,band);
   let result={record,band,moonLimit,missing:!Number.isFinite(coordinates.ra)||!Number.isFinite(coordinates.dec),above:0,clear:0,dark:0,usable:0,windows:[],peak:null,moonMinimum:null,moonUp:false};
   if(result.missing){result.status='Missing coordinates';return result;}
   let star=new StarPosition(coordinates.ra,coordinates.dec),altitudes=[],azimuths=[],separations=[],altitudeLimit=[];
   for(let i=0;i<night.positions.length;++i){let position=night.positions[i],s=position.apparent(star).toSpherical2Pi(),m=night.moonCoordinates[i];
      let horizontal=position.equatorialToHorizontal(s),altitude=Math.deg(horizontal.y),cosine=Math.sin(s[1])*Math.sin(m[1])+Math.cos(s[1])*Math.cos(m[1])*Math.cos(s[0]-m[0]);
      let separation=Math.deg(Math.acos(Math.max(-1,Math.min(1,cosine))));altitudes.push(altitude);separations.push(separation);altitudeLimit.push(altitude-p.minAltitude);azimuths.push(Math.deg(horizontal.x));
   }
   let above=ablPlanningIntervals(night.times,[altitudeLimit],v=>v[0]>=0),profile=ablPlanningHorizonSeries(night,azimuths,altitudes,separations,moonLimit);
   let clear=ablPlanningIntervals(profile.times,profile.series,v=>v[0]>=0&&v[4]>=0);
   let base=ablPlanningIntervals(profile.times,profile.series,v=>v[0]>=0&&v[4]>=0&&v[1]>=0);
   let moonUp=ablPlanningIntervals(profile.times,profile.series,v=>v[0]>=0&&v[4]>=0&&v[1]>=0&&v[2]>0);
   result.windows=moonLimit?ablPlanningIntervals(profile.times,profile.series,v=>v[0]>=0&&v[4]>=0&&v[1]>=0&&(v[2]<=0||v[3]>=0)):base;
   result.above=ablPlanningDuration(above);result.clear=ablPlanningDuration(clear);result.dark=ablPlanningDuration(base);result.usable=ablPlanningDuration(result.windows);
   result.best=result.windows.reduce((best,range)=>!best||range[1]-range[0]>best[1]-best[0]?range:best,null);
   result.peak=ablPlanningExtremum(altitudes,night.darkIntervals,night,true);result.moonUp=moonUp.length>0;
   result.moonMinimum=ablPlanningExtremum(separations,moonUp,night,false)?.value??null;
   result.status=!night.darkIntervals.length?'No darkness':!result.above?'Below altitude limit':!result.clear?'Blocked by horizon':!result.dark?(p.horizonEnabled?'No dark horizon window':'No dark altitude window'):!result.usable?'Moon separation limit':ablPositiveTimeStatus(result,night.minimumUsableMinutes);
   // Curves are transient. The page retains only the selected row's curve,
   // not hundreds of samples for every collection object.
   result.curve={altitudes,separations,azimuths,horizonTimes:profile.times,horizonLimits:profile.limits};return result;
}

// The planner processes short timer slices. Leaving the tab or opening a
// modal dialog pauses it; a new date, site or filtered set discards stale work.
class ABLPlanningPage extends Control { constructor(parent,manager){
   super(parent);this.manager=manager;this.disposed=false;this.pendingRedraw=false;this.job=null;this.night=null;this.results=[];this.selectedId='';this.inputSelection='';this.key='';this.completedKey='';this.plotResult=null;this.building=false;
   this.date=ablPlanningToday(manager.planningPreferences.utcOffset);
   this.message=new TextBox(this);this.message.readOnly=true;this.message.font=this.font;
   this.message.setFixedHeight(5*this.font.height+this.logicalPixelsToPhysical(12));
   const note='Times are local to the selected site · Fixed UTC offset: check daylight saving time · Custom horizon applies when enabled · Weather/refraction are not modeled.';
   let planText='',targetText='',lastMessage='';
   const showMessage=(detail=targetText)=>{
      const text=[detail,planText,note].filter(Boolean).join('\n');
      if(text!==lastMessage){this.message.text=ABL.html(text);this.message.home();lastMessage=text;}
   };
   const showPlanStatus=text=>{planText=text;targetText='';showMessage();};
   this.controlsSection=new Control(this);
   this.controlsBar=new SectionBar(this,'Observing controls');
   ablStableSection(manager,this.controlsBar,this.controlsSection);
   this.timeGroup=ablGroup(this.controlsSection,'Time and location');
   this.rankGroup=ablGroup(this.controlsSection,'Ranking and results');
   this.actionsGroup=ablGroup(this.controlsSection,'Actions');
   this.dateEdit=new Edit(this.timeGroup);this.dateEdit.text=this.date;this.dateEdit.setFixedWidth(this.logicalPixelsToPhysical(110));
   this.dateEdit.toolTip='Evening date, YYYY-MM-DD. The plan covers local noon on this date through noon the following day. Times use the fixed UTC offset in Observing configuration, including any daylight saving adjustment.';
   this.changeDate=date=>{this.date=date;this.dateEdit.text=date;this.refreshInput();};
   this.dateEdit.onEditCompleted=()=>this.changeDate(this.dateEdit.text.trim());this.dateEdit.onKeyPress=key=>{if(key!==KeyCode.Return)return false;this.changeDate(this.dateEdit.text.trim());return true;};
   this.dateButton=ablButton(this.timeGroup,'Choose…',()=>manager.safe(()=>{let d=new ABLImagingDateDialog(manager,this.date);d.windowTitle='Observing night';d.clearButton.hide();d.todayButton.onClick=()=>d.setDate(ablPlanningToday(manager.planningPreferences.utcOffset));if(manager.executeDialog(d)&&d.selectedDate)this.changeDate(d.selectedDate);}));
   this.todayButton=ablButton(this.timeGroup,'Tonight',()=>this.changeDate(ablPlanningToday(manager.planningPreferences.utcOffset)));
   // Endpoints use absolute instants so ranking remains chronological across midnight.
   const numericRank=key=>(a,b)=>{
      const first=key(a),second=key(b);
      return first===second?0:first-second;
   };
   const byName=(a,b)=>a.record.designation.localeCompare(b.record.designation);
   const rankings=[
      ['Usable time',numericRank(r=>-r.usable)],
      ['Peak in darkness',numericRank(r=>-(r.peak?.value??-Infinity))],
      ['Object name',byName],
      ['Observation start',numericRank(r=>r.best?.[0]??Infinity)],
      ['Observation end',numericRank(r=>r.best?.[1]??Infinity)]
   ];
   this.sort=new ComboBox(this.rankGroup);
   this.thenBy=new ComboBox(this.rankGroup);
   for(const [label] of rankings)this.sort.addItem(label);
   this.sort.adjustToContents();this.sort.setFixedWidth();this.thenBy.setFixedWidth(this.sort.width);
   let primary=rankings[0],secondary=rankings[2],remaining=[];
   const updateRanks=()=>{
      const previous=primary;
      primary=rankings[this.sort.currentItem];
      if(secondary===primary)secondary=previous;
      remaining=rankings.filter(rank=>rank!==primary);
      this.thenBy.clear();
      for(const [label] of remaining)this.thenBy.addItem(label);
      this.thenBy.currentItem=remaining.indexOf(secondary);
   };
   updateRanks();
   this.sort.onItemSelected=()=>{updateRanks();this.rebuild();};
   this.thenBy.onItemSelected=()=>{secondary=remaining[this.thenBy.currentItem];this.rebuild();};
   this.stopButton=ablButton(this.actionsGroup,'Stop',()=>{this.redrawTimer.stop();this.job=null;this.pendingRedraw=false;showPlanStatus('Planning stopped. Recalculate to try again.');this.stopButton.visible=false;this.retryButton.visible=true;});this.stopButton.visible=false;
   this.retryButton=ablButton(this.actionsGroup,'Recalculate',()=>{this.key='';this.refreshInput();});this.retryButton.visible=false;
   this.siteSelect=new ComboBox(this.timeGroup);this.siteSelect.setFixedWidth(this.logicalPixelsToPhysical(220));
   this.refreshSites=()=>{this.siteSelect.clear();for(let p of manager.observingSites.sites)this.siteSelect.addItem(p.siteName);this.siteSelect.currentItem=manager.observingSites.active;};
   this.siteSelect.onItemSelected=index=>manager.safe(()=>{try{let value=manager.currentConfiguration();value.observingSites.active=index;value.planning=ABL.copy(value.observingSites.sites[index]);manager.applyConfiguration(value);}finally{this.refreshSites();}});
   this.exportScope=new ComboBox(this.rankGroup);for(let text of ['All displayed rows','Usable rows','Selected rows'])this.exportScope.addItem(text);this.exportScope.adjustToContents();this.exportScope.setFixedWidth();
   this.exportScope.onItemSelected=()=>this.updateExport();
   this.exportRows=()=>!this.night||this.completedKey!==this.key?[]:(this.nodes||[]).filter(n=>this.exportScope.currentItem===0||this.exportScope.currentItem===1&&ablHasUsableTime(n.result,this.night.minimumUsableMinutes)||this.exportScope.currentItem===2&&n.selected).map(n=>n.result);
   this.updateExport=()=>{let enabled=this.exportRows().length>0;if(this.exportButton)this.exportButton.enabled=enabled;if(this.planListButton)this.planListButton.enabled=enabled;};
   this.chooseExportPath=()=>{let d=new SaveFileDialog;d.caption='Export observing plan';d.filters=[['CSV table','*.csv'],['PDF document','*.pdf']];d.defaultExtension='csv';d.overwritePrompt=true;d.initialPath='Observing-plan-'+this.date+'.csv';return manager.executeDialog(d)?d.filePath:'';};
   this.exportPlan=()=>{
      this.refreshInput();let rows=this.exportRows();if(!rows.length)return false;let night=this.night,key=this.completedKey,minimum=night.minimumUsableMinutes,path=this.chooseExportPath();if(!path)return false;
      this.refreshInput();if(this.completedKey!==key||this.night!==night||night.minimumUsableMinutes!==minimum)throw Error('The plan changed. Review the current results before exporting.');
      ablBusy(manager,'Exporting observing plan…',()=>ablExportPlan(night,rows,path,this.exportScope.itemText(this.exportScope.currentItem)),false);showMessage('Plan exported: '+path);return true;
   };
   this.exportButton=ablButton(this.actionsGroup,'Export plan…',()=>manager.safe(()=>this.exportPlan()),'Export the chosen results in the visible ranking as CSV or a printable PDF. Exports include site coordinates, the night, limits and all usable windows. Ctrl/Shift-click planning rows for a selection.');this.exportButton.enabled=false;
   this.addPlanToList=()=>{
      this.refreshInput();let ids=this.exportRows().map(r=>r.record.id);if(!ids.length)return false;
      let d=new ABLListTransferDialog(manager,'add',ids);d.destination.currentItem=1;d.destination.onItemSelected();d.nameEdit.text='Observing night '+this.date;
      if(!manager.executeDialog(d))return false;let result=d.transferResult;
      if(result.changed){manager.doc=result.doc;manager.changed();manager.refreshLists();}
      showMessage('Targets added to '+manager.doc.observingLists[result.destinationId].name+'. Save the collection to retain the grouping.');return true;
   };
   this.planListButton=ablButton(this.actionsGroup,'Add to list…',()=>manager.safe(()=>this.addPlanToList()),'Add the chosen planning results to a new or existing observing list. Other memberships and metadata are retained. Save the collection to keep the grouping.');this.planListButton.enabled=false;
   const addRow=(group,label,width,...controls)=>{
      const row=new HorizontalSizer;row.spacing=6;
      if(label){
         const caption=new Label(group);caption.text=label;caption.setFixedWidth(width);
         row.add(caption);
      }
      for(const control of controls)row.add(control);
      row.addStretch();group.sizer.add(row);
   };
   const timeWidth=this.font.width('Night of:')+2;
   const rankWidth=Math.max(...['Rank by:','Then by:','Results:'].map(s=>this.font.width(s)))+2;
   addRow(this.timeGroup,'Night of:',timeWidth,this.dateEdit,this.dateButton,this.todayButton);
   addRow(this.timeGroup,'Site:',timeWidth,this.siteSelect);
   addRow(this.rankGroup,'Rank by:',rankWidth,this.sort);
   addRow(this.rankGroup,'Then by:',rankWidth,this.thenBy);
   addRow(this.rankGroup,'Results:',rankWidth,this.exportScope);
   addRow(this.actionsGroup,'',0,this.exportButton,this.planListButton);
   addRow(this.actionsGroup,'',0,this.stopButton,this.retryButton);
   this.timeGroup.sizer.addStretch();this.actionsGroup.sizer.addStretch();
   this.controlsSection.sizer=new HorizontalSizer;this.controlsSection.sizer.spacing=8;
   for(const group of [this.timeGroup,this.rankGroup,this.actionsGroup])this.controlsSection.sizer.add(group);
   this.controlsSection.sizer.addStretch();
   this.tree=new TreeBox(this);this.tree.headerVisible=true;this.tree.rootDecoration=false;this.tree.alternateRowColor=true;this.tree.multipleSelection=true;this.tree.onNodeSelectionUpdated=()=>this.updateExport();this.tree.setMinHeight(this.logicalPixelsToPhysical(160));
   const columns=['Object','Peak in dark','Above minimum','Dark time','Usable','Observation start','Observation end','Moon min','Status'];
   this.tree.numberOfColumns=columns.length;
   columns.forEach((label,i)=>this.tree.setHeaderText(i,label));
   this.tree.toolTip='Double-click a row to open its Finder chart.';
   this.graph=new Control(this);this.graph.setMinSize(this.logicalPixelsToPhysical(620),this.logicalPixelsToPhysical(210));this.graph.mouseTracking=true;
   this.tree.onCurrentNodeUpdated=node=>{if(!this.building){this.selectedId=node?.result?.record.id||'';this.updatePlot();}};
   this.tree.onNodeActivated=node=>{let id=node?.result?.record.id,n=manager.nodes.find(n=>n.record.id===id);if(n)manager.tree.onNodeActivated(n);};
   this.refreshInput=()=>{this.refreshSites();this.setRecords((manager.nodes||[]).map(n=>n.record),manager.selected?.()?.id||'');this.updateExport();};
   this.setRecords=(records,selection)=>{
      this.records=records;
      if(selection!==this.inputSelection){this.inputSelection=selection;this.selectedId=selection;}
      // Changes to the plot range redraw the graph using the existing night.
      const {plotRange,beforeDuskHours,afterDawnHours,...observingLimits}=manager.planningPreferences;
      let key=JSON.stringify([this.date,observingLimits,records.map(r=>[r.id,r.designation,r.name,r.band,ABL.position(r.object)])]);
      if(key!==this.key){this.key=key;this.redrawTimer.stop();this.job=null;this.night=null;this.results=[];this.plotResult=null;this.completedKey='';
         this.building=true;try{this.tree.clear();this.nodes=[];}finally{this.building=false;}
         this.graph.update();this.exportButton.enabled=false;this.planListButton.enabled=false;this.retryButton.visible=false;this.stopButton.visible=false;
         if(manager.planningPreferences.latitude===null||manager.planningPreferences.longitude===null){this.pendingRedraw=false;showPlanStatus(manager.observingSites.warning||'Set your observing site in Configuration → Observing to plan the objects shown in Table.');return;}
         if(!ABL.validDate(this.date)){this.pendingRedraw=false;showPlanStatus('Enter the evening date as YYYY-MM-DD.');return;}
         if(!records.length){this.pendingRedraw=false;showPlanStatus('No objects shown in Table. Adjust its list or filters to plan targets.');return;}
         this.pendingRedraw=true;showPlanStatus('Ready to plan '+records.length+' objects shown in Table.');this.queueRedraw();
      }else if(this.completedKey===this.key){
         if(this.displayedUsableOnly!==manager.previewPreferences.planningUsableOnly||this.night.minimumUsableMinutes!==manager.previewPreferences.minimumUsableMinutes)this.rebuild();
         else this.selectCurrent();
      }
   };
   this.queueRedraw=()=>{this.redrawTimer.stop();if(this.pendingRedraw&&!this.disposed&&manager.tabs.currentPageIndex===3&&manager.visible)this.redrawTimer.start();};
   this.activate=()=>{this.refreshInput();this.queueRedraw();};
   this.step=(budget=25)=>{
      if(!this.pendingRedraw||this.disposed)return;
      try{
         if(!this.job)this.job={key:this.key,night:ablPlanningNight(this.date,manager.planningPreferences),index:0,results:[]};
         let job=this.job,deadline=Date.now()+budget;this.stopButton.visible=true;
         while(job.night.times.length<job.night.count&&Date.now()<deadline)ablPlanningSample(job.night);
         while(job.night.times.length===job.night.count&&job.index<this.records.length&&Date.now()<deadline){let result=ablPlanningTarget(job.night,this.records[job.index++]);delete result.curve;job.results.push(result);}
         showPlanStatus(job.night.times.length<job.night.count?'Calculating local Sun and Moon positions…':'Planning '+job.index+' / '+this.records.length+' objects…');
         if(job.index===this.records.length){this.night=job.night;this.results=job.results;this.completedKey=job.key;this.job=null;this.pendingRedraw=false;this.stopButton.visible=false;this.rebuild();}
      }catch(e){this.job=null;this.night=null;this.completedKey='';this.results=[];this.nodes=[];this.plotResult=null;this.tree.clear();this.graph.update();this.pendingRedraw=false;this.stopButton.visible=false;this.retryButton.visible=true;showPlanStatus('Planning unavailable: '+String(e.message||e));}
   };
   this.redrawTimer=new Timer(.03,false,this);this.redrawTimer.onTimeout=()=>{
      if(!this.pendingRedraw||this.disposed||!manager.visible||manager.tabs.currentPageIndex!==3)return;
      if(manager.chartPauseDepth||!manager.enabled||!manager.isActiveWindow){this.redrawTimer.start();return;}
      this.step();this.queueRedraw();
   };
   this.selectCurrent=()=>{
      let node=this.nodes?.find(n=>n.result.record.id===this.selectedId)||this.nodes?.[0];
      // TreeBox current-node assignment can select the focused row. Restore
      // the exact export selection, including an explicitly empty selection.
      if(node){let selected=new Set(this.nodes.filter(n=>n.selected).map(n=>n.result.record.id));this.building=true;try{this.tree.currentNode=node;for(let n of this.nodes)n.selected=selected.has(n.result.record.id);this.selectedId=node.result.record.id;}finally{this.building=false;}}
      if(!node)this.selectedId='';
      this.updatePlot();
   };
   this.rebuild=()=>{
      if(!this.night)return;
      const minimum=manager.previewPreferences.minimumUsableMinutes;
      // A different nightly total reclassifies the cached rows, including
      // those hidden by the filter, without recalculating their windows.
      if(this.night.minimumUsableMinutes!==minimum){
         this.night.minimumUsableMinutes=minimum;
         for(const r of this.results)if(r.usable>0)r.status=ablPositiveTimeStatus(r,minimum);
      }
      const usable=this.results.filter(r=>ablHasUsableTime(r,minimum));
      this.displayedUsableOnly=manager.previewPreferences.planningUsableOnly;
      let p=this.night.preferences,period=this.night.period,rows=this.displayedUsableOnly?usable:this.results.slice(),selected=new Set((this.nodes||[]).filter(n=>n.selected).map(n=>n.result.record.id));
      rows.sort((a,b)=>primary[1](a,b)||secondary[1](a,b)||byName(a,b));
      this.building=true;try{this.tree.clear();this.nodes=[];
         this.tree.setHeaderText(2,p.horizonEnabled?'Clear horizon':'Above '+p.minAltitude+'°');
         for(let r of rows){let n=new TreeBoxNode(this.tree);n.result=r;n.selected=selected.has(r.record.id);
            let text=[ABL.objectHeading(r.record.designation,r.record.name),r.peak?r.peak.value.toFixed(1)+'° · '+ablPlanningTime(r.peak.time,period):'—',r.missing?'—':ablPlanningHours(p.horizonEnabled?r.clear:r.above),r.missing?'—':ablPlanningHours(r.dark),r.missing?'—':ablPlanningHours(r.usable),
               r.best?ablPlanningTime(r.best[0],period):'—',r.best?ablPlanningTime(r.best[1],period):'—',
               r.moonMinimum!==null?r.moonMinimum.toFixed(1)+'°':r.dark?'Moon down':'—',r.status];
            for(let i=0;i<text.length;++i)n.setText(i,text[i]);
            this.nodes.push(n);
         }
         for(let i=0;i<columns.length;++i)this.tree.adjustColumnWidthToContents(i);this.tree.setColumnWidth(0,Math.min(this.tree.columnWidth(0),this.logicalPixelsToPhysical(240)));
      }finally{this.building=false;}
      let site=p.siteName||'Observing site',dark=ablPlanningDuration(this.night.darkIntervals);
      planText=site+' · '+p.latitude.toFixed(3)+'°, '+p.longitude.toFixed(3)+'° · '+this.date+' → '+ablPlanningLocalISO(period.end,period).slice(0,10)+' · '+ablPlanningTimeContext(period)+'\n'+usable.length+' / '+this.results.length+' targets usable (minimum '+ablMinimumTimeText(minimum)+') · Darkness '+ablPlanningHours(dark)+' (Sun ≤ '+p.sunAltitude+'°) · Altitude ≥ '+p.minAltitude+'°'+(p.horizonEnabled?' + horizon':'')+' · '+ablSiteMoonLimitText(p);
      this.selectCurrent();this.updateExport();
   };
   this.updatePlot=()=>{
      let row=this.results.find(r=>r.record.id===this.selectedId);
      this.plotResult=row&&!row.missing&&this.night?ablPlanningTarget(this.night,row.record):null;
      targetText=row?row.missing?'Enter coordinates in Edit object to plan this target.':row.windows.length?'Usable (local): '+row.windows.map(w=>ablPlanningRange(w,this.night.period,true)).join(' · '):row.status+'. Try another night or adjust the observing limits.':'Select a planning row to inspect its altitude curve.';
      if(row)targetText=ablTargetMoonLimitText(row)+' · '+targetText;
      else if(this.night&&manager.previewPreferences.planningUsableOnly&&!this.nodes.length){
         const minimum=this.night.minimumUsableMinutes;
         targetText=(minimum?'No target has at least '+ablMinimumTimeText(minimum)+' of usable time.':'No target has any usable time.')+' Clear “Usable targets only” in Configuration → Observing to see each target’s status.';
      }
      showMessage();this.graph.update();
   };
   const minAltitudeShown=-30,maxAltitudeShown=90;
   this.plotFrame=()=>{
      const scale=v=>this.logicalPixelsToPhysical(v),left=scale(48),top=scale(44);
      const width=Math.max(1,this.graph.width-left-scale(16)),height=this.graph.height-top-scale(50);
      const range=ablPlanningPlotRange(this.night,manager.planningPreferences),duration=range.end-range.start;
      return {left,top,width,height,range,x:t=>left+(t-range.start)/duration*width,
         y:alt=>top+(maxAltitudeShown-alt)/(maxAltitudeShown-minAltitudeShown)*height,
         timeAt:px=>range.start+Math.max(0,Math.min(1,(px-left)/width))*duration};
   };
   this.graph.onMouseMove=px=>{
      if(!this.plotResult||!this.night)return;
      const night=this.night,curve=this.plotResult.curve,time=this.plotFrame().timeAt(px);
      const degrees=values=>ablPlanningAt(values,time,night).toFixed(1)+'°';
      const containsTime=([start,end])=>start<=time&&time<=end;
      let status='Outside darkness';
      if(night.darkIntervals.some(containsTime))
         status=this.plotResult.windows.some(containsTime)?'Dark · target usable':'Dark · target unusable';
      let detail=ablPlanningDateTime(time,night.period)+' local · '+status+' · Target '+degrees(curve.altitudes)+' · Moon '+degrees(night.moonAltitudes)+' · Sun '+degrees(night.sunAltitudes)+' · Moon separation '+degrees(curve.separations);
      if(night.preferences.horizonEnabled){
         const index=(time-night.period.start)/night.step,i=Math.floor(index),a=curve.azimuths[i],b=curve.azimuths[i+1]??a;
         const az=(a+(index-i)*(((b-a+540)%360)-180)+360)%360;
         detail+=' · Az '+az.toFixed(1)+'° · Horizon '+ablHorizonAltitude(night.preferences.horizonPoints,az).toFixed(1)+'°';
      }
      showMessage(detail);
   };
   this.graph.onLeave=()=>showMessage();
   this.graph.onPaint=()=>{
      let g=new Graphics(this.graph);try{
         g.fillRect(this.graph.boundsRect,new Brush(0xff171d25));g.font=this.font;g.pen=new Pen(0xffcbd3dc);
         if(!this.night||!this.plotResult){g.drawText(this.logicalPixelsToPhysical(18),this.logicalPixelsToPhysical(30),'Select a target with coordinates to display its night.');return;}
         const night=this.night,r=this.plotResult,plot=this.plotFrame();
         const {left,top,width,height,range,x,y}=plot,scale=v=>this.logicalPixelsToPhysical(v);
         ablDrawPlanningBands(g,plot,night.darkIntervals,r.windows,scale);
         for(let altitude=minAltitudeShown;altitude<=maxAltitudeShown;altitude+=30){g.pen=new Pen(0xff405063);g.drawLine(left,y(altitude),left+width,y(altitude));g.pen=new Pen(0xffaebaca);g.drawText(this.logicalPixelsToPhysical(4),y(altitude)+4,altitude+'°');}
         ablDrawPlanningTimeAxis(g,night.period,plot,scale,range);
         g.pen=new Pen(0xff83b58d);for(let px=left;px<left+width;px+=12)g.drawLine(px,y(night.preferences.minAltitude),Math.min(left+width,px+6),y(night.preferences.minAltitude));
         g.pushState();
         g.clipRect=new Rect(left,top,left+width+1,top+height+1);
         g.clipping=true;g.antialiasing=true;
         const drawCurve=(times,values,color)=>{
            g.pen=new Pen(color,2);
            for(let i=1;i<times.length;++i){
               const t0=times[i-1],t1=times[i];
               if(t1<=range.start)continue;
               if(t0>=range.end)break;
               if(t1<=t0)continue;
               const a=Math.max(t0,range.start),b=Math.min(t1,range.end);
               const slope=(values[i]-values[i-1])/(t1-t0);
               g.drawLine(x(a),y(values[i-1]+(a-t0)*slope),x(b),y(values[i-1]+(b-t0)*slope));
            }
         };
         if(night.preferences.horizonEnabled)drawCurve(r.curve.horizonTimes,r.curve.horizonLimits,0xffe6a861);
         drawCurve(night.times,night.sunAltitudes,0xffa7876b);
         drawCurve(night.times,night.moonAltitudes,0xffe8c465);
         drawCurve(night.times,r.curve.altitudes,0xff72c8ff);
         g.popState();
         const captions=night.preferences.horizonEnabled?[['Horizon/min',0xffe6a861]]:[];
         captions.push(['Target',0xff72c8ff],['Moon',0xffe8c465],['Sun',0xffa7876b],
            ['Darkness (Sun ≤ '+night.preferences.sunAltitude+'°)',0xffb2c5e1,ABL_NIGHT_SHADING.darkness],
            ['Unusable',0xffe2a8b9,ABL_NIGHT_SHADING.unusable],
            ['Usable',0xff8ed4a2,ABL_NIGHT_SHADING.usable]);
         const baseline=scale(20);
         let px=left;
         for(const [caption,color,fill] of captions){
            if(fill!==undefined){
               g.fillRect(px,baseline-scale(10),px+scale(12),baseline,new Brush(color));
               g.fillRect(px+scale(1),baseline-scale(9),px+scale(11),baseline-scale(1),new Brush(fill));
               px+=scale(17);
            }
            g.pen=new Pen(color);g.drawText(px,baseline,caption);
            px+=this.font.width(caption)+scale(16);
         }
      }finally{g.end();}
   };
   this.sizer=new VerticalSizer;this.sizer.margin=10;this.sizer.spacing=8;this.sizer.add(this.controlsBar);this.sizer.add(this.controlsSection);this.sizer.add(this.tree,50);this.sizer.add(this.graph,50);this.sizer.add(this.message);
   this.dispose=()=>{this.disposed=true;this.pendingRedraw=false;this.redrawTimer.stop();this.job=null;this.night=null;this.results=[];this.plotResult=null;};
}}


// Configuration owns temporary controls and proposed values. Cancel leaves
// previews, local preferences and collection metadata untouched.
class ABLConfigurationDialog extends Dialog { constructor(manager){
   super(manager);this.windowTitle='Configuration — '+ABL_TITLE;this.autoDefaultButton=false;
   this.doc=ABL.newDocument();ABL.config(this.doc).constellationMonths=ABL.copy(ABL.config(manager.doc).constellationMonths);
   this.outlinePath=manager.contourPath;this.outlineState=ablContourFileState(this.outlinePath);
   this.error=e=>manager.error(e);this.loadingChart=false;
   this.chartPresets=ABL.copy(manager.chartPresets);this.activeChartPreset=manager.finderPage.activeChartPreset;
   this.tabs=new TabBox(this);this.finderTab=new Control(this.tabs);this.dssTab=new Control(this.tabs);this.generalTab=new Control(this.tabs);
   this.tabs.addPage(this.finderTab,'Finder chart');this.tabs.addPage(this.dssTab,'DSS survey image');this.tabs.addPage(this.generalTab,'General');
   this.observingTab=new Control(this.tabs);this.tabs.addPage(this.observingTab,'Observing');
   this.startupGroup=ablGroup(this.generalTab,'Startup');
   this.rememberCollection=new CheckBox(this.startupGroup);this.rememberCollection.text='Remember last opened or saved collection';this.rememberCollection.checked=manager.rememberCollection;
   this.rememberCollection.toolTip='Off by default. When enabled, successful Open, Save and Save as operations remember the collection path for normal startup. This independent preference is stored in PixInsight settings alongside the filename. It does not save unsaved object edits. Explicit process-instance paths still open their specified collection.';
   this.startupHint=new Label(this.startupGroup);this.startupHint.wordWrapping=true;this.startupHint.setFixedWidth(this.logicalPixelsToPhysical(510));
   this.startupHint.text='Off starts with an empty collection. On reopens the last opened or saved file. Turning this off clears the remembered path, leaving the current collection open.';
   this.startupGroup.sizer.add(this.rememberCollection);this.startupGroup.sizer.add(this.startupHint);
   this.finderGroup=ablGroup(this.finderTab,'Appearance and coverage');this.dssGroup=ablGroup(this.dssTab,'DSS survey image');
   const optionWidth=this.logicalPixelsToPhysical(118),labelWidth=this.font.width('Survey field (arcmin):')+this.logicalPixelsToPhysical(8);
   const widthEdit=(group,label,min,value)=>{let edit=new NumericEdit(group);edit.label.text=label;edit.label.setFixedWidth(labelWidth);edit.sizer.spacing=6;edit.fixed=true;edit.autoEditWidth=false;edit.setRange(min,120);edit.setPrecision(2);edit.setValue(value);edit.edit.setFixedWidth(this.logicalPixelsToPhysical(85));return edit;};
   this.skyCoverage=widthEdit(this.finderGroup,'Sky coverage (°):',.1,manager.previewPreferences.sky.coverage);
   this.surveyField=widthEdit(this.dssGroup,'Survey field (arcmin):',5,manager.previewPreferences.dss.coverage);
   this.skyFit=new CheckBox(this.finderGroup);this.skyFit.text='Fit object size';this.skyFit.checked=manager.previewPreferences.sky.fitObjectSize;
   this.dssFit=new CheckBox(this.dssGroup);this.dssFit.text='Fit object size';this.dssFit.checked=manager.previewPreferences.dss.fitObjectSize;
   this.skyFit.toolTip='Fit sky coverage to six times the apparent major diameter, within 0.1–120 degrees.';
   this.dssFit.toolTip='Fit the DSS width to 1.5 times the apparent major diameter. Objects larger than 120 arcminutes always use the maximum field.';
   this.skyCoverage.toolTip='Preferred Finder width for every target, 0.1–120 degrees. When fitting is enabled this is the fallback for unknown sizes.';
   this.surveyField.toolTip='Preferred square DSS width for every target, 5–120 arcminutes. Fitting uses the target size when available; larger targets always use 120 arcminutes without replacing this preference.';
   this.styleSelect=new ComboBox(this.finderGroup);this.styleSelect.values=['modern-editorial','vintage-atlas','observing-atlas'];
   for(let key of this.styleSelect.values)this.styleSelect.addItem(ablChartStyle(key).name);
   this.styleSelect.currentItem=this.styleSelect.values.indexOf(manager.previewPreferences.sky.style);
   this.styleSelect.toolTip='Modern Editorial uses a dark sky and sans-serif labels. Vintage Atlas uses warm paper, sepia ink and serif labels. Observing Atlas uses white paper, black stars and colored astronomical symbols.';
   this.labelDensity=new ComboBox(this.finderGroup);this.labelDensity.values=['sparse','normal','detailed'];
   for(let name of ['Sparse','Normal','Detailed'])this.labelDensity.addItem(name);
   this.labelDensity.currentItem=this.labelDensity.values.indexOf(manager.previewPreferences.sky.labelDensity);
   this.labelDensity.toolTip='Control the number and spacing of labels without hiding object markers.';
   this.inset=new CheckBox(this.finderGroup);this.inset.text='Close-up inset';this.inset.checked=manager.previewPreferences.sky.inset;
   this.inset.toolTip='Add a separate square close-up beside the overview, using the same style, catalogs and details.';
   this.insetField=widthEdit(this.finderGroup,'Coverage (°):',.1,manager.previewPreferences.sky.insetDegrees);
   this.insetField.toolTip='Preferred close-up width for all targets. If it is too large for the current overview, that chart uses half the overview width without changing this preference.';
   this.projection=new ComboBox(this.finderGroup);this.projection.values=['auto','gnomonic','stereographic'];
   for(let name of ['Automatic','Gnomonic','Stereographic'])this.projection.addItem(name);
   this.projection.currentItem=this.projection.values.indexOf(manager.previewPreferences.sky.projection);
   this.projection.toolTip='Automatic uses Gnomonic up to 20° and Stereographic above 20° to reduce stretching in wide views. The close-up is chosen independently. Manual choices apply to both. Sky coverage remains the actual horizontal angular width.';
   this.appearanceColumn=new Control(this.finderGroup);this.appearanceColumn.sizer=new VerticalSizer;this.appearanceColumn.sizer.spacing=6;
   const appearance=manager.previewPreferences.sky;
   this.milkyWay=new CheckBox(this.appearanceColumn);this.milkyWay.text='Milky Way shading';this.milkyWay.checked=appearance.milkyWay;this.milkyWay.enabled=ablMilkyWayAvailable();
   this.milkyWay.toolTip='Shade integrated-starlight contours from PixInsight’s local MilkyWay database. Enabled by default. No download is made. When the database is unavailable, charts omit shading and retain your preference. All details also toggles this layer.';
   this.milkyWayStrength=new NumericEdit(this.appearanceColumn);this.milkyWayStrength.label.text='Shading strength (%):';this.milkyWayStrength.setRange(5,30);this.milkyWayStrength.setPrecision(0);this.milkyWayStrength.setValue(appearance.milkyWayStrength);
   this.milkyWayStrength.toolTip='Opacity added by each Milky Way brightness contour, from 5 to 30 percent. Overlapping levels build up the shading; 10 percent is the default.';
   this.starDensity=new ComboBox(this.appearanceColumn);this.starDensity.values=['sparse','normal','dense'];for(let name of ['Sparse','Normal','Dense'])this.starDensity.addItem(name);
   this.starDensity.currentItem=this.starDensity.values.indexOf(appearance.starDensity);
   this.starDensity.toolTip='Normal adjusts the star magnitude limit to the sky coverage. Sparse uses a limit one magnitude brighter; Dense goes one magnitude fainter, up to magnitude 15. Local catalog coverage limits which stars can appear. This is independent of label density and deep-sky catalog limits.';
   this.starSize=new NumericEdit(this.appearanceColumn);this.starSize.label.text='Star size (%):';this.starSize.setRange(50,200);this.starSize.setPrecision(0);this.starSize.setValue(appearance.starSize);
   this.starSize.toolTip='Scale magnitude-dependent star symbols and their halos from 50 to 200 percent. This does not change the star count, field coverage or deep-sky object sizes.';
   for(let edit of [this.milkyWayStrength,this.starSize]){edit.label.setFixedWidth(this.font.width('Shading strength (%):')+this.logicalPixelsToPhysical(8));edit.sizer.spacing=6;edit.fixed=true;edit.autoEditWidth=false;edit.edit.setFixedWidth(this.logicalPixelsToPhysical(65));}
   this.starColors=new CheckBox(this.appearanceColumn);this.starColors.text='Use catalog star colors';this.starColors.checked=appearance.starColors;
   this.starColors.toolTip='Use available catalog color indices. Stars without color data keep the chart style’s neutral color. Off by default, including black stars in Observing Atlas. This is a schematic color rendering, not a calibrated photograph.';
   let densityRow=new HorizontalSizer;densityRow.spacing=6;let densityLabel=new Label(this.appearanceColumn);densityLabel.text='Star density:';densityLabel.setFixedWidth(this.starSize.label.width);densityLabel.textAlignment=TextAlignment.Right|TextAlignment.VertCenter;this.starDensity.setFixedWidth(this.logicalPixelsToPhysical(110));densityRow.add(densityLabel);densityRow.add(this.starDensity);densityRow.addStretch();
   this.milkyWayHint=new Label(this.appearanceColumn);this.milkyWayHint.text=this.milkyWay.enabled?'Local MilkyWay database available':'MilkyWay database unavailable — shading omitted';this.milkyWayHint.wordWrapping=true;this.milkyWayHint.setFixedWidth(this.logicalPixelsToPhysical(285));
   for(let control of [this.milkyWay,this.milkyWayStrength,this.milkyWayHint])this.appearanceColumn.sizer.add(control);this.appearanceColumn.sizer.addSpacing(6);this.appearanceColumn.sizer.add(densityRow);this.appearanceColumn.sizer.add(this.starSize);this.appearanceColumn.sizer.add(this.starColors);this.appearanceColumn.sizer.addStretch();
   this.previewValues=()=>({sky:{projection:this.projection.values[this.projection.currentItem],milkyWay:this.milkyWay.checked,milkyWayStrength:this.milkyWayStrength.value,starColors:this.starColors.checked,starDensity:this.starDensity.values[this.starDensity.currentItem],starSize:this.starSize.value,coverage:this.skyCoverage.value,fitObjectSize:this.skyFit.checked,style:this.styleSelect.values[this.styleSelect.currentItem],labelDensity:this.labelDensity.values[this.labelDensity.currentItem],inset:this.inset.checked,insetDegrees:this.insetField.value},dss:{coverage:this.surveyField.value,fitObjectSize:this.dssFit.checked}});
   this.coverageHint=new Label(this.dssTab);this.coverageHint.wordWrapping=true;this.coverageHint.setFixedWidth(this.logicalPixelsToPhysical(510));
   this.updating=false;
   this.updateFraming=()=>{
      this.milkyWayStrength.enabled=this.milkyWay.enabled&&this.milkyWay.checked;this.skyCoverage.enabled=!this.skyFit.checked;this.surveyField.enabled=!this.dssFit.checked;this.insetField.enabled=this.inset.checked;
      let size=manager.dssPage.object?ABL.angularSize(manager.dssPage.object):null;
      this.coverageHint.text='Settings apply to all targets and are remembered between launches. With fitting enabled, the widths shown are used when object size is unknown.'+(size&&size.majorArcmin>120?' The current DSS target uses the 120′ maximum.':'');
   };
   this.dssFit.onCheck=this.updateFraming;
   const pair=(left,right)=>{left.setFixedWidth(optionWidth);let row=new HorizontalSizer;row.spacing=12;row.add(left);row.add(right);row.addStretch();return row;};
   // Reserve the same checkbox and label columns on every row. Fixed-width
   // choices align with the numeric fields without expanding across the group.
   const choiceRow=(caption,control)=>{control.setFixedWidth(this.logicalPixelsToPhysical(150));let label=new Label(this.finderGroup);label.text=caption;label.textAlignment=TextAlignment.Right|TextAlignment.VertCenter;label.setFixedWidth(labelWidth);let row=new HorizontalSizer;row.spacing=6;row.addSpacing(optionWidth+this.logicalPixelsToPhysical(12));row.add(label);row.add(control);row.addStretch();return row;};
   let geometry=new VerticalSizer;geometry.spacing=6;geometry.add(pair(this.skyFit,this.skyCoverage));geometry.add(pair(this.inset,this.insetField));geometry.add(choiceRow('Projection:',this.projection));geometry.addStretch();geometry.add(choiceRow('Chart style:',this.styleSelect));geometry.add(choiceRow('Label density:',this.labelDensity));
   let finderColumns=new HorizontalSizer;finderColumns.spacing=24;finderColumns.add(geometry);finderColumns.add(this.appearanceColumn);finderColumns.addStretch();this.finderGroup.sizer.add(finderColumns);
   this.dssGroup.sizer.add(pair(this.dssFit,this.surveyField));this.updateFraming();
   this.outlineGroup=ablGroup(this.finderTab,'Nebula outlines');this.outlineLabel=new Label(this.outlineGroup);this.outlineLabel.text='Outline source:';
   this.outlineLevel=new ComboBox(this.outlineGroup);for(let name of NebulaOutlines.levelNames)this.outlineLevel.addItem(name);this.outlineLevel.currentItem=manager.outlineLevel;
   this.outlineLevel.adjustToContents();this.outlineLevel.setFixedWidth();
   this.outlineLevel.toolTip='Brightness level of bundled nebula outlines. If unavailable for a nebula, PixInsight uses the nearest available level. Custom Stellarium files provide their own contours.';
   this.outlineStatus=new Label(this.outlineGroup);this.outlineStatus.wordWrapping=true;this.outlineStatus.setFixedWidth(this.logicalPixelsToPhysical(480));
   this.setOutlinePath=path=>{
      let state=ablContourFileState(path);if(path&&state.status!=='loaded')throw Error(state.error);
      let wasAvailable=ablContoursAvailable(this.outlineState);
      this.outlinePath=path;this.outlineState=state;this.updateOutlineStatus();
      if(this.detailsEditor){let available=ablContoursAvailable(state);this.detailsEditor.contours.enabled=available;
         if(!available)this.detailsEditor.contours.checked=false;else if(!wasAvailable)this.detailsEditor.contours.checked=true;}
      this.syncChartPreset();
   };
   this.chooseOutline=ablButton(this.outlineGroup,'Choose file…',()=>{try{
      let d=new OpenFileDialog;d.caption='Choose Stellarium outline file';d.filters=[['Stellarium / SkyChart outlines','*.dat'],['All files','*']];if(manager.executeDialog(d))this.setOutlinePath(d.filePath);
   }catch(e){manager.error(e);}},'Choose a local Stellarium outlines.dat file, also compatible with SkyChart. The data is validated before it is reported as Loaded.');
   this.clearOutline=ablButton(this.outlineGroup,'Use bundled',()=>this.setOutlinePath(''),'Use the local nebula outline databases supplied with PixInsight. Deselects a custom Stellarium file without deleting it.');
   this.updateOutlineStatus=()=>{let state=this.outlineState,name=this.outlinePath.replace(/.*[\\/]/,'');
      this.outlineStatus.text=state.status==='bundled'?'Bundled PixInsight nebula outlines available':state.status==='loaded'?'Custom file loaded: '+name+' · '+state.count+' outlines':state.status==='unavailable'?'Bundled nebula outlines unavailable':state.status==='missing'?'File missing: '+name:'Not loaded: '+name;
      this.outlineStatus.toolTip=this.outlinePath?'Custom Stellarium outline file (usually outlines.dat), also compatible with SkyChart.\n'+this.outlinePath:'Uses the OpenNGC and Nebula-Outlines databases configured in PixInsight. No download or separate outline file is required.';
      if(state.error)this.outlineStatus.toolTip+='\n'+state.error;this.clearOutline.enabled=!!this.outlinePath;this.outlineLevel.enabled=state.status==='bundled';
   };
   let outlineRow=new HorizontalSizer;outlineRow.spacing=8;outlineRow.add(this.outlineLabel);outlineRow.add(this.chooseOutline);outlineRow.add(this.clearOutline);outlineRow.addStretch();this.outlineGroup.sizer.add(outlineRow);this.outlineGroup.sizer.add(this.outlineStatus);
   let levelRow=ablRow(this.outlineGroup,'Brightness level:',this.outlineLevel);levelRow.addStretch();this.outlineGroup.sizer.add(levelRow);this.updateOutlineStatus();
   this.monthsGroup=ablGroup(this.generalTab,'Collection planning');
   this.monthsButton=ablButton(this.monthsGroup,'Constellation months…',()=>{let d=new ABLMonthsDialog(this);if(manager.executeDialog(d))ABL.config(this.doc).constellationMonths=d.mapping;},'Edit planning months. The proposed mapping is stored with the collection only after applying Configuration.');
   this.detailsEditor=new ABLChartDetailsControl(this.finderTab,manager);
   this.captureChartPreset=()=>ablChartPresetState({sky:this.previewValues().sky,details:this.detailsEditor.values(),contourPath:this.outlinePath,outlineLevel:this.outlineLevel.currentItem});
   this.refreshChartPresets=()=>{
      this.chartPresetSelect.clear();this.chartPresetSelect.addItem('Custom settings');for(let p of this.chartPresets)this.chartPresetSelect.addItem(p.name);
      this.chartPresetSelect.currentItem=Math.max(0,1+this.chartPresets.findIndex(p=>p.name===this.activeChartPreset));this.deleteChartPresetButton.enabled=!!this.activeChartPreset;
   };
   this.syncChartPreset=()=>{
      if(this.loadingChart)return;
      this.updateFraming();this.detailsEditor.settings=manager.finderPage.effectiveSettings(this.previewValues().sky);this.detailsEditor.updateCatalogEditor();
      let preset=this.chartPresets.find(p=>p.name===this.activeChartPreset);
      if(!preset||JSON.stringify(preset.chart)!==JSON.stringify(this.captureChartPreset()))this.activeChartPreset='';
      this.refreshChartPresets();
   };
   this.loadChartPreset=name=>{
      let preset=this.chartPresets.find(p=>p.name===name);if(!preset)return false;
      let chart=ablChartPresetState(preset.chart),state=ablContourFileState(chart.contourPath),unavailable=[];
      // Reject a missing explicit file before changing the proposal. A preset
      // never silently substitutes bundled outlines for a custom source.
      if(chart.contourPath&&state.status!=='loaded')throw Error('Cannot load chart preset “'+name+'”: '+state.error+' Current settings were retained. Choose an available outline source and save the preset again.');
      this.loadingChart=true;
      try{
         for(let [key,control]of [['coverage',this.skyCoverage],['insetDegrees',this.insetField],['milkyWayStrength',this.milkyWayStrength],['starSize',this.starSize]])control.setValue(chart.sky[key]);
         for(let [key,control]of [['fitObjectSize',this.skyFit],['inset',this.inset],['milkyWay',this.milkyWay],['starColors',this.starColors]])control.checked=chart.sky[key];
         for(let [key,control]of [['style',this.styleSelect],['labelDensity',this.labelDensity],['projection',this.projection],['starDensity',this.starDensity]])control.currentItem=control.values.indexOf(chart.sky[key]);
         this.outlinePath=chart.contourPath;this.outlineState=state;this.outlineLevel.currentItem=chart.outlineLevel;this.updateOutlineStatus();
         for(let entry of this.detailsEditor.catalogEntries)if(!entry.available&&chart.details.catalogs[entry.key].enabled)unavailable.push(entry.label);
         if(chart.details.contours&&!ablContoursAvailable(state))unavailable.push('nebula outlines');
         this.detailsEditor.setValues(chart.details,manager.finderPage.effectiveSettings(chart.sky),ablContoursAvailable(state));this.activeChartPreset=name;
      }finally{this.loadingChart=false;}
      this.syncChartPreset();
      if(unavailable.length)manager.notice('Unavailable local data was omitted from the proposed settings: '+unavailable.join(', ')+'. The saved preset is unchanged.');
      return true;
   };
   this.saveChartPreset=name=>{
      name=String(name).trim();if(!name||name.length>80)throw Error('Enter a preset name of 1 to 80 characters.');
      let chart=this.captureChartPreset();if(chart.contourPath.length>4096)throw Error('The outline file path is too long for a chart preset.');
      let next=ABL.copy(this.chartPresets),index=next.findIndex(p=>p.name.toLowerCase()===name.toLowerCase());
      if(index>=0&&!manager.confirm('Replace chart preset “'+next[index].name+'” with the Finder settings shown in Configuration?'))return false;
      if(index<0&&next.length>=50)throw Error('There are already 50 chart presets. Delete an unused preset first.');
      if(index>=0)next[index]={name,chart};else next.push({name,chart});next.sort((a,b)=>a.name.localeCompare(b.name));
      this.chartPresets=next;this.activeChartPreset=name;this.refreshChartPresets();return true;
   };
   this.chartPresetSelect=new ComboBox(this.finderTab);this.chartPresetSelect.setFixedWidth(this.logicalPixelsToPhysical(220));
   this.chartPresetSelect.toolTip='Fill the settings below from a named preset. Apply updates the chart and remembers these settings for all targets. Cancel discards the proposal. Custom settings retains the values without associating a preset name.';
   this.chartPresetSelect.onItemSelected=index=>manager.safe(()=>{
      if(index>0){try{this.loadChartPreset(this.chartPresets[index-1].name);}catch(e){this.refreshChartPresets();throw e;}}
      else{this.activeChartPreset='';this.refreshChartPresets();}
   });
   this.saveChartPresetButton=ablButton(this.finderTab,'Save preset…',()=>manager.safe(()=>{let d=new ABLViewNameDialog(this,this.activeChartPreset,true);if(manager.executeDialog(d))this.saveChartPreset(d.presetName);}),
      'Name a copy of all Finder settings shown below, including catalogs and annotations. The preset is saved when you Apply Configuration. Existing names require confirmation before replacement.');
   this.deleteChartPresetButton=ablTool(this.finderTab,':/icons/delete.png','Remove the selected preset after confirmation. Apply saves the deletion; Cancel restores it. The settings below are retained.',()=>manager.safe(()=>{
      if(!this.activeChartPreset||!manager.confirm('Delete chart preset “'+this.activeChartPreset+'”? The settings shown below will be retained. Apply Configuration to save the deletion.'))return;
      this.chartPresets=this.chartPresets.filter(p=>p.name!==this.activeChartPreset);this.activeChartPreset='';this.refreshChartPresets();
   }));
   let presetLabel=new Label(this.finderTab);presetLabel.text='Chart preset:';let presets=new HorizontalSizer;presets.spacing=8;presets.add(presetLabel);presets.add(this.chartPresetSelect);presets.add(this.saveChartPresetButton);presets.add(this.deleteChartPresetButton);presets.addStretch();
   this.presetHint=new Label(this.finderTab);this.presetHint.text='A preset is a named copy of the Finder settings below. Apply saves all changes; Cancel discards them.';
   this.presetHint.wordWrapping=true;this.presetHint.setFixedWidth(this.logicalPixelsToPhysical(700));
   this.detailsEditor.onChanged=()=>this.syncChartPreset();
   for(let control of [this.skyFit,this.inset,this.milkyWay,this.starColors])control.onCheck=()=>this.syncChartPreset();
   for(let control of [this.skyCoverage,this.insetField,this.milkyWayStrength,this.starSize])control.onValueUpdated=()=>this.syncChartPreset();
   for(let control of [this.styleSelect,this.labelDensity,this.projection,this.starDensity,this.outlineLevel])control.onItemSelected=()=>this.syncChartPreset();
   this.refreshChartPresets();this.updateFraming();
   this.usableOnly=new CheckBox(this.observingTab);
   this.usableOnly.text='Usable targets only';
   this.usableOnly.toolTip='Show targets that meet Minimum usable time. This filter applies to all observing sites and collections.';
   this.usableOnly.checked=manager.previewPreferences.planningUsableOnly;
   const minimumLabel=new Label(this.observingTab);minimumLabel.text='Minimum usable time (min):';
   this.minimumUsableTime=new SpinBox(this.observingTab);this.minimumUsableTime.setRange(0,1440);
   this.minimumUsableTime.value=manager.previewPreferences.minimumUsableMinutes;
   this.minimumUsableTime.setFixedWidth(this.logicalPixelsToPhysical(75));
   minimumLabel.toolTip=this.minimumUsableTime.toolTip='Total usable minutes across all windows for one target in one night. Zero accepts any positive duration. Applies to the usable count, filter and Usable rows actions.';
   const usableSettings=new HorizontalSizer;usableSettings.spacing=6;usableSettings.add(this.usableOnly);usableSettings.addSpacing(12);usableSettings.add(minimumLabel);usableSettings.add(this.minimumUsableTime);usableSettings.addStretch();
   this.observingSites=ABL.copy(manager.observingSites);delete this.observingSites.warning;
   this.activeSite=this.observingSites.active;this.loadingSite=false;
   const observing=this.observingSites.sites[this.activeSite];
   this.siteGroup=ablGroup(this.observingTab,'Observing site');this.limitGroup=ablGroup(this.observingTab,'Night limits');
   this.siteSelect=new ComboBox(this.observingTab);this.siteSelect.setFixedWidth(this.logicalPixelsToPhysical(240));
   this.siteName=new Edit(this.siteGroup);this.siteName.setFixedWidth(this.logicalPixelsToPhysical(260));
   this.latitude=new Edit(this.siteGroup);this.longitude=new Edit(this.siteGroup);
   for(let control of [this.latitude,this.longitude])control.setFixedWidth(this.logicalPixelsToPhysical(100));
   this.latitude.toolTip='Geodetic latitude in decimal degrees, −90 to +90. North is positive.';
   this.longitude.toolTip='Geodetic longitude in decimal degrees, −180 to +180. East is positive. Planning keeps site coordinates local; exported plans include them.';
   const number=(group,label,min,max,value,precision=0)=>{let edit=new NumericEdit(group);edit.label.text=label;edit.label.setFixedWidth(this.logicalPixelsToPhysical(155));edit.fixed=true;edit.autoEditWidth=false;edit.setRange(min,max);edit.setPrecision(precision);edit.setValue(value);edit.edit.setFixedWidth(this.logicalPixelsToPhysical(75));return edit;};
   this.siteHeight=number(this.siteGroup,'Height (m):',-500,10000,0);
   this.siteHeight.toolTip='Geodetic height above the reference ellipsoid. Zero is sufficient for ordinary planning if unknown.';
   this.utcOffset=number(this.siteGroup,'UTC offset (hours):',-12,14,0,2);
   this.utcOffset.toolTip='Fixed offset for the selected night, including daylight saving time. No automatic timezone or daylight-saving conversion is performed.';
   this.minimumAltitude=number(this.limitGroup,'Minimum altitude (°):',0,90,observing.minAltitude,1);
   this.minimumAltitude.toolTip='Minimum height of the target’s center above the geometric horizon (0° at the horizon, 90° overhead). Imaging time counts only while the target clears this angle and any higher custom horizon in its direction.';
   this.minimumAltitude.label.toolTip=this.minimumAltitude.edit.toolTip=this.minimumAltitude.toolTip;
   this.minimumMoon=number(this.limitGroup,'Default Moon limit (°):',0,180,0,1);
   this.minimumMoon.toolTip='Minimum target-to-Moon separation while the Moon is above the geometric horizon. Unclassified targets always use this value. Zero disables the restriction.';
   this.darkness=new ComboBox(this.limitGroup);this.darkness.values=[-18,-12,-6,0];
   for(let name of ['Astronomical · Sun below −18°','Nautical · Sun below −12°','Civil · Sun below −6°','Sun below horizon'])this.darkness.addItem(name);
   this.darkness.adjustToContents();this.darkness.setFixedWidth();
   const compact=(group,label,control)=>{let row=ablRow(group,label,control);row.addStretch();group.sizer.add(row);};
   compact(this.siteGroup,'Name:',this.siteName);
   let coordinates=new HorizontalSizer;coordinates.spacing=6;coordinates.add(this.latitude);let lonLabel=new Label(this.siteGroup);lonLabel.text='Longitude (°E):';coordinates.add(lonLabel);coordinates.add(this.longitude);coordinates.addStretch();this.siteGroup.sizer.add(ablRow(this.siteGroup,'Latitude (°N):',coordinates));
   this.siteGroup.sizer.add(this.siteHeight);this.siteGroup.sizer.add(this.utcOffset);
   this.limitGroup.sizer.add(this.minimumAltitude);compact(this.limitGroup,'Darkness:',this.darkness);this.limitGroup.sizer.add(this.minimumMoon);
   this.moonBandControls={};
   for(const band of ['broadband','narrowband']){
      const edit=number(this.limitGroup,ABL.BAND_LABELS[band]+' (°):',0,180,0,1);
      const inherit=new CheckBox(this.limitGroup);
      inherit.text='Use default';
      inherit.toolTip='Use this site’s default Moon limit. Clear to set a separate angle for '+band+' targets, including zero to disable the limit.';
      edit.toolTip=inherit.toolTip;
      const update=()=>{
         edit.edit.enabled=!inherit.checked;
         if(inherit.checked)edit.setValue(this.minimumMoon.value);
      };
      inherit.onCheck=update;
      this.moonBandControls[band]={edit,inherit,update};
      const row=new HorizontalSizer;
      row.spacing=6;row.add(edit);row.add(inherit);row.addStretch();this.limitGroup.sizer.add(row);
   }
   this.minimumMoon.onValueUpdated=()=>{for(const control of Object.values(this.moonBandControls))control.update();};
   this.limitGroup.sizer.addStretch();
   this.plotRangeGroup=ablGroup(this.observingTab,'Observing plot');
   this.plotRange=new ComboBox(this.plotRangeGroup);
   this.plotRange.addItem('Dusk to dawn');this.plotRange.addItem('Full day (noon to noon)');
   this.plotRange.adjustToContents();this.plotRange.setFixedWidth();
   this.plotRange.toolTip='Dusk and dawn use the Darkness limit above. The full day is shown when there is no darkness or darkness lasts all day.';
   this.beforeDusk=number(this.plotRangeGroup,'Before dusk (h):',0,12,1,2);
   this.afterDawn=number(this.plotRangeGroup,'After dawn (h):',0,12,1,2);
   this.updatePlotMargins=()=>{
      this.beforeDusk.enabled=this.afterDawn.enabled=this.plotRange.currentItem===0;
   };
   this.plotRange.onItemSelected=this.updatePlotMargins;
   let plotControls=new HorizontalSizer;plotControls.spacing=8;plotControls.add(this.plotRange);
   for(const edit of [this.beforeDusk,this.afterDawn]){
      edit.label.setFixedWidth(this.logicalPixelsToPhysical(105));
      edit.edit.setFixedWidth(this.logicalPixelsToPhysical(55));plotControls.add(edit);
   }
   plotControls.addStretch();this.plotRangeGroup.sizer.add(plotControls);
   this.horizonGroup=ablGroup(this.observingTab,'Custom horizon');this.horizonEnabled=new CheckBox(this.horizonGroup);this.horizonEnabled.text='Use this site’s horizon';
   this.horizonEnabled.toolTip='The target must clear both this profile and Minimum altitude. The profile wraps through north; it does not alter twilight or Moon-up calculations.';
   this.horizonText=new TextBox(this.horizonGroup);this.horizonText.readOnly=false;this.horizonText.setFixedSize(this.logicalPixelsToPhysical(330),this.logicalPixelsToPhysical(130));
   this.horizonText.toolTip='One azimuth altitude pair per line, in decimal degrees. True north = 0°, east = 90°, south = 180°, west = 270°. Up to 720 pairs; # starts a comment. Values are interpolated and the profile closes through north. Import converts the chosen file units to these degrees.';
   this.horizonGraph=new Control(this.horizonGroup);this.horizonGraph.setFixedSize(this.logicalPixelsToPhysical(380),this.logicalPixelsToPhysical(130));
   this.horizonStatus=new Label(this.horizonGroup);this.horizonStatus.wordWrapping=true;this.horizonStatus.setFixedSize(this.logicalPixelsToPhysical(730),this.logicalPixelsToPhysical(34));
   this.horizonMode=new ComboBox(this.horizonGroup);for(let mode of ABL_HORIZON_MODES)this.horizonMode.addItem(mode);this.horizonMode.adjustToContents();this.horizonMode.setFixedWidth();
   this.horizonMode.toolTip='Import format from Stellarium’s landscape.ini polygonal_horizon_list_mode. The default is azimuth and altitude in degrees. Select the horizon point file, not landscape.ini or a landscape ZIP.';
   this.horizonRotation=number(this.horizonGroup,'Rotation (°):',-360,360,0,2);this.horizonRotation.label.setFixedWidth(this.logicalPixelsToPhysical(90));
   this.horizonRotation.toolTip='Import only: add Stellarium’s polygonal_angle_rotatez offset, in degrees. Existing editor values are already converted.';
   this.horizonSource='';this.horizonPreview=[];
   this.updateHorizon=()=>{
      try{this.horizonPreview=ablParseHorizon(this.horizonText.text);this.horizonStatus.text=this.horizonPreview.length?(this.horizonEnabled.checked?'Enabled':'Disabled')+' · '+this.horizonPreview.length+' points · '+(this.horizonSource||'Manual profile')+' · 0° N / 90° E / 180° S / 270° W':'No horizon loaded. Enter points or import a Stellarium horizon file.';}
      catch(e){this.horizonPreview=[];this.horizonStatus.text=String(e.message||e);}
      this.horizonGraph.update();
   };
   this.horizonText.onTextUpdated=()=>{if(this.loadingSite)return;this.horizonSource='Manual profile';this.updateHorizon();};this.horizonEnabled.onCheck=()=>this.updateHorizon();
   this.horizonGraph.onPaint=()=>{let g=new Graphics(this.horizonGraph);try{
      let w=this.horizonGraph.width,h=this.horizonGraph.height,left=32,top=12,right=w-10,bottom=h-25;const x=a=>left+a/360*(right-left),y=a=>bottom-a/90*(bottom-top);
      g.fillRect(this.horizonGraph.boundsRect,new Brush(0xff171d25));g.font=this.font;
      for(let a of [0,30,60,90]){g.pen=new Pen(0xff405063);g.drawLine(left,y(a),right,y(a));g.pen=new Pen(0xffaebaca);g.drawText(2,y(a)+4,String(a));}
      for(let [a,label]of [[0,'N'],[90,'E'],[180,'S'],[270,'W'],[360,'N']]){g.pen=new Pen(0xffaebaca);g.drawText(x(a)-4,h-5,label);}
      if(this.horizonPreview.length){g.pen=new Pen(0xffe6a861,2);for(let a=1;a<=360;++a)g.drawLine(x(a-1),y(Math.max(0,ablHorizonAltitude(this.horizonPreview,a-1))),x(a),y(Math.max(0,ablHorizonAltitude(this.horizonPreview,a))));}
   }finally{g.end();}};
   this.importHorizon=path=>{
      let info=new FileInfo(path);if(!info.isFile||info.size>131072)throw Error('Choose a horizon point file of at most 128 KiB.');
      let points=ablParseHorizon(File.readTextFile(path),ABL_HORIZON_MODES[this.horizonMode.currentItem],this.horizonRotation.value);if(!points.length)throw Error('The selected file contains no horizon points.');
      this.loadingSite=true;try{this.horizonText.text=ablHorizonText(points);this.horizonSource=ablHorizonSource(File.extractName(path)+File.extractExtension(path));this.horizonEnabled.checked=true;}finally{this.loadingSite=false;}this.updateHorizon();
   };
   this.importHorizonButton=ablButton(this.horizonGroup,'Import…',()=>manager.safe(()=>{
      let d=new OpenFileDialog;d.caption='Import Stellarium horizon point file';d.multipleSelections=false;d.filters=[['Horizon points','*.txt','*.dat','*.csv'],['All files','*']];if(manager.executeDialog(d))this.importHorizon(d.filePath);
   }));
   this.clearHorizonButton=ablButton(this.horizonGroup,'Clear',()=>{this.loadingSite=true;try{this.horizonText.clear();this.horizonSource='';this.horizonEnabled.checked=false;}finally{this.loadingSite=false;}this.updateHorizon();});
   let horizonControls=new HorizontalSizer;horizonControls.spacing=8;horizonControls.add(this.horizonEnabled);horizonControls.add(this.clearHorizonButton);horizonControls.addStretch();
   let importControls=new HorizontalSizer;importControls.spacing=8;let formatLabel=new Label(this.horizonGroup);formatLabel.text='Import format:';importControls.add(formatLabel);importControls.add(this.horizonMode);importControls.add(this.horizonRotation);importControls.add(this.importHorizonButton);importControls.addStretch();
   let horizonEditor=new HorizontalSizer;horizonEditor.spacing=10;horizonEditor.add(this.horizonText);horizonEditor.add(this.horizonGraph);horizonEditor.addStretch();
   this.horizonGroup.sizer.add(horizonControls);this.horizonGroup.sizer.add(importControls);this.horizonGroup.sizer.add(horizonEditor);this.horizonGroup.sizer.add(this.horizonStatus);
   const bandValue=band=>{const {edit,inherit}=this.moonBandControls[band];return inherit.checked?null:edit.value;};
   this.planningValues=()=>ablValidatePlanningPreferences({siteName:this.siteName.text.trim(),latitude:this.latitude.text.trim()?Number(this.latitude.text):null,longitude:this.longitude.text.trim()?Number(this.longitude.text):null,height:this.siteHeight.value,utcOffset:this.utcOffset.value,minAltitude:this.minimumAltitude.value,sunAltitude:this.darkness.values[this.darkness.currentItem],moonSeparation:this.minimumMoon.value,
      broadbandMoonSeparation:bandValue('broadband'),narrowbandMoonSeparation:bandValue('narrowband'),
      plotRange:this.plotRange.currentItem===1?'full':'night',beforeDuskHours:this.beforeDusk.value,afterDawnHours:this.afterDawn.value,
      horizonEnabled:this.horizonEnabled.checked,horizonSource:this.horizonSource,horizonPoints:ablParseHorizon(this.horizonText.text)});
   this.commitSiteDraft=()=>{let draft=ABL.copy(this.observingSites);draft.sites[this.activeSite]=this.planningValues();draft.active=this.activeSite;this.observingSites=ablValidateObservingSites(draft);};
   this.refreshSites=()=>{this.siteSelect.clear();for(let site of this.observingSites.sites)this.siteSelect.addItem(site.siteName);this.siteSelect.currentItem=this.activeSite;this.deleteSiteButton.enabled=this.observingSites.sites.length>1;};
   this.loadSite=index=>{this.activeSite=index;this.observingSites.active=index;let p=this.observingSites.sites[index];this.loadingSite=true;try{
      this.siteName.text=p.siteName;this.latitude.text=p.latitude===null?'':String(p.latitude);this.longitude.text=p.longitude===null?'':String(p.longitude);this.siteHeight.setValue(p.height);this.utcOffset.setValue(p.utcOffset);this.minimumAltitude.setValue(p.minAltitude);this.minimumMoon.setValue(p.moonSeparation);this.darkness.currentItem=this.darkness.values.indexOf(p.sunAltitude);
      for(const [band,control] of Object.entries(this.moonBandControls)){
         control.inherit.checked=p[band+'MoonSeparation']==null;
         control.edit.setValue(ablPlanningMoonLimit(p,band));
         control.update();
      }
      this.plotRange.currentItem=p.plotRange==='full'?1:0;
      this.beforeDusk.setValue(p.beforeDuskHours);this.afterDawn.setValue(p.afterDawnHours);this.updatePlotMargins();
      this.horizonText.text=ablHorizonText(p.horizonPoints);this.horizonEnabled.checked=p.horizonEnabled;this.horizonSource=p.horizonSource;
   }finally{this.loadingSite=false;}this.refreshSites();this.updateHorizon();};
   this.siteSelect.onItemSelected=index=>{if(this.loadingSite||index===this.activeSite)return;try{this.commitSiteDraft();this.loadSite(index);}catch(e){this.siteSelect.currentItem=this.activeSite;manager.error(e);}};
   this.addSite=duplicate=>{this.commitSiteDraft();if(this.observingSites.sites.length>=30)throw Error('At most 30 observing sites can be saved.');
      let p=duplicate?ABL.copy(this.observingSites.sites[this.activeSite]):ablPlanningPreferences(),base=duplicate?p.siteName.slice(0,65)+' copy':'Observing site',name=base,index=2;
      while(this.observingSites.sites.some(s=>s.siteName.toLowerCase()===name.toLowerCase()))name=base+' '+index++;
      p.siteName=name.slice(0,80);this.observingSites.sites.push(p);this.loadSite(this.observingSites.sites.length-1);
   };
   this.newSiteButton=ablButton(this.observingTab,'New',()=>manager.safe(()=>this.addSite(false)));
   this.duplicateSiteButton=ablButton(this.observingTab,'Duplicate',()=>manager.safe(()=>this.addSite(true)));
   this.deleteSiteButton=ablButton(this.observingTab,'Delete',()=>manager.safe(()=>{
      if(this.observingSites.sites.length<=1)return;if(!manager.confirm('Delete observing profile “'+this.observingSites.sites[this.activeSite].siteName+'”? Apply saves the deletion; Cancel restores it.'))return;
      this.observingSites.sites.splice(this.activeSite,1);this.loadSite(Math.min(this.activeSite,this.observingSites.sites.length-1));
   }));
   let sites=new HorizontalSizer;sites.spacing=8;let siteLabel=new Label(this.observingTab);siteLabel.text='Profile:';sites.add(siteLabel);sites.add(this.siteSelect);sites.add(this.newSiteButton);sites.add(this.duplicateSiteButton);sites.add(this.deleteSiteButton);sites.addStretch();
   let siteSettings=new HorizontalSizer;siteSettings.spacing=10;siteSettings.add(this.siteGroup);siteSettings.add(this.limitGroup);siteSettings.addStretch();
   this.observingHint=new Label(this.observingTab);this.observingHint.wordWrapping=true;this.observingHint.setFixedWidth(this.logicalPixelsToPhysical(730));
   this.observingHint.text=manager.observingSites.warning||'Apply saves all site profiles and selects the displayed site. Cancel discards changes to every profile. Horizons are stored as points, so the imported file is not needed afterwards. Check the fixed UTC offset for daylight saving time; weather and refraction are not modeled.';
   this.loadSite(this.activeSite);

   this.values=()=>{this.commitSiteDraft();return Object.assign(this.previewValues(),{planningUsableOnly:this.usableOnly.checked,minimumUsableMinutes:this.minimumUsableTime.value,observingSites:ABL.copy(this.observingSites),planning:this.planningValues(),details:this.detailsEditor.values(),chartPresets:ABL.copy(this.chartPresets),activeChartPreset:this.activeChartPreset,
      rememberCollection:this.rememberCollection.checked,contourPath:this.outlinePath,outlineLevel:this.outlineLevel.currentItem,constellationMonths:ABL.copy(ABL.config(this.doc).constellationMonths)});};
   this.applyButton=ablButton(this,'Apply',()=>{try{manager.validateConfiguration(this.values());this.ok();}catch(e){manager.error(e);}});this.applyButton.defaultButton=true;
   this.cancelButton=ablButton(this,'Cancel',()=>this.cancel());
   let buttons=new HorizontalSizer;buttons.spacing=8;buttons.addStretch();buttons.add(this.applyButton);buttons.add(this.cancelButton);
   for(let tab of [this.finderTab,this.dssTab,this.generalTab,this.observingTab]){tab.sizer=new VerticalSizer;tab.sizer.margin=10;tab.sizer.spacing=8;}
   this.finderTab.sizer.add(presets);this.finderTab.sizer.add(this.presetHint);this.finderTab.sizer.add(this.finderGroup);this.finderTab.sizer.add(this.detailsEditor);this.finderTab.sizer.add(this.outlineGroup);this.finderTab.sizer.addStretch();
   this.dssTab.sizer.add(this.dssGroup);this.dssTab.sizer.add(this.coverageHint);this.dssTab.sizer.addStretch();
   let months=new HorizontalSizer;months.add(this.monthsButton);months.addStretch();this.monthsGroup.sizer.add(months);this.generalTab.sizer.add(this.startupGroup);this.generalTab.sizer.add(this.monthsGroup);this.generalTab.sizer.addStretch();
   this.observingTab.sizer.add(usableSettings);this.observingTab.sizer.add(sites);this.observingTab.sizer.add(siteSettings);this.observingTab.sizer.add(this.plotRangeGroup);this.observingTab.sizer.add(this.horizonGroup);this.observingTab.sizer.add(this.observingHint);this.observingTab.sizer.addStretch();
   this.tabs.currentPageIndex=manager.tabs.currentPageIndex===3?3:manager.tabs.currentPageIndex===2?1:0;
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=10;this.sizer.add(this.tabs);this.sizer.add(buttons);this.adjustToContents();
}}

// Reusable detail editor. Its controls change only the Configuration draft;
// the manager commits current preferences and named presets together on Apply.
class ABLChartDetailsControl extends Control { constructor(parent,manager){
   super(parent);this.onChanged=()=>{};
   let page=manager.finderPage;this.settings=ABL.copy(page.settings);
   this.detailsGroup=new Control(this);this.detailsGroup.sizer=new HorizontalSizer;this.detailsGroup.sizer.spacing=10;
   this.annotationPage=ablGroup(this.detailsGroup,'Annotations');this.catalogPage=ablGroup(this.detailsGroup,'Catalogs');
   this.catalogEntries=page.catalogEntries;this.catalogSettings=ABL.copy(page.details.catalogs);this.catalogNodes=[];
   this.catalogTree=new TreeBox(this.catalogPage);this.catalogTree.numberOfColumns=2;this.catalogTree.headerVisible=true;
   this.catalogTree.setHeaderText(0,'Catalog');this.catalogTree.setHeaderText(1,'Contains');this.catalogTree.rootDecoration=false;
   this.catalogTree.setFixedSize(this.logicalPixelsToPhysical(410),this.logicalPixelsToPhysical(112));
   for(let entry of this.catalogEntries){
      let n=new TreeBoxNode(this.catalogTree);n.entry=entry;n.checkable=entry.available;n.checked=this.catalogSettings[entry.key].enabled;
      n.setText(0,entry.label);n.setText(1,entry.available?entry.content:'Unavailable');
      n.setToolTip(0,entry.catalog?entry.catalog.description+'\n'+entry.catalog.catalogPath:'Not installed.');
      n.setToolTip(1,entry.content+(entry.available?' — local file bundled with PixInsight.':' — catalog file or class is missing.'));
      this.catalogNodes.push(n);
   }
   this.catalogTree.adjustColumnWidthToContents(0);this.catalogTree.adjustColumnWidthToContents(1);
   this.catalogLabels=new CheckBox(this.catalogPage);this.catalogLabels.text='Labels';
   this.catalogLabels.toolTip='Show labels for the selected catalog. Markers remain visible. Label density controls how many labels fit on the map.';
   this.catalogLimit=new ComboBox(this.catalogPage);this.catalogLimit.values=['auto','manual','unlimited'];
   for(let name of ['Automatic','Custom','No limit'])this.catalogLimit.addItem(name);
   this.catalogLimit.toolTip='Faintest catalog magnitude: Automatic adjusts to chart coverage; Custom uses the entered value; No limit includes all objects. Objects without magnitudes are always retained. Catalog passbands can differ.';
   this.catalogMagnitude=new NumericEdit(this.catalogPage);this.catalogMagnitude.fixed=true;this.catalogMagnitude.autoEditWidth=false;
   this.catalogMagnitude.setRange(-5,25);this.catalogMagnitude.setPrecision(1);this.catalogMagnitude.edit.setFixedWidth(55);this.catalogMagnitude.setValue(12);
   this.catalogHint=new Label(this.catalogPage);this.catalogHint.wordWrapping=true;this.catalogHint.setFixedWidth(this.logicalPixelsToPhysical(210));
   this.updatingCatalog=false;
   this.updateCatalogEditor=()=>{
      let entry=this.catalogTree.currentNode?.entry,config=entry?this.catalogSettings[entry.key]:null;
      this.updatingCatalog=true;
      try{
         this.catalogLabels.enabled=!!entry&&entry.available;this.catalogLabels.checked=!!config&&config.labels;
         this.catalogLimit.enabled=!!entry&&entry.available&&entry.hasMagnitude;
         this.catalogLimit.currentItem=config?this.catalogLimit.values.indexOf(config.mode):0;
         this.catalogMagnitude.enabled=this.catalogLimit.enabled&&config.mode==='manual';this.catalogMagnitude.setValue(config?config.magnitude:12);
         let choice=entry?ablChartCatalogOptions({catalogs:this.catalogSettings}).find(c=>c.key===entry.key):null;
         this.catalogHint.text=!entry?'Select a catalog row to edit its properties.':entry.label+': '+(!entry.available?'not installed.':!entry.hasMagnitude?'no magnitude data; labels can be changed.':
            config.mode==='unlimited'?'all magnitudes.':'faintest magnitude '+ablCatalogMagnitude(entry,choice,this.settings.coverage).toFixed(1)+(config.mode==='auto'?' (automatic).':'.'));
         this.catalogHint.toolTip=entry?.catalog?entry.catalog.description+'\nAvailable fields: '+entry.catalog.fields.join(', '):'';
      }finally{this.updatingCatalog=false;}
   };
   this.catalogTree.onCurrentNodeUpdated=()=>this.updateCatalogEditor();
   this.catalogTree.onNodeUpdated=(n,column)=>{if(column!==0||this.updatingCatalog||!n.entry.available)return;
      this.catalogSettings[n.entry.key].enabled=n.checked;this.updateCatalogEditor();this.onChanged();};
   this.changeCatalogProperty=()=>{
      if(this.updatingCatalog)return;let entry=this.catalogTree.currentNode?.entry;if(!entry)return;
      Object.assign(this.catalogSettings[entry.key],{labels:this.catalogLabels.checked,mode:this.catalogLimit.values[this.catalogLimit.currentItem],magnitude:this.catalogMagnitude.value});
      this.updateCatalogEditor();this.onChanged();
   };
   this.catalogLabels.onCheck=this.catalogLimit.onItemSelected=this.catalogMagnitude.onValueUpdated=this.changeCatalogProperty;
   let catalogProperties=new VerticalSizer;catalogProperties.spacing=6;catalogProperties.add(this.catalogLabels);
   let limitLabel=new Label(this.catalogPage);limitLabel.text='Magnitude:';catalogProperties.add(limitLabel);
   let limitRow=new HorizontalSizer;limitRow.spacing=8;limitRow.add(this.catalogLimit);limitRow.add(this.catalogMagnitude);limitRow.addStretch();catalogProperties.add(limitRow);catalogProperties.add(this.catalogHint);catalogProperties.addStretch();
   let catalogColumns=new HorizontalSizer;catalogColumns.spacing=12;catalogColumns.add(this.catalogTree);catalogColumns.add(catalogProperties);this.catalogPage.sizer.add(catalogColumns);
   this.borders=new CheckBox(this.annotationPage);this.borders.text='Constellation borders';this.borders.checked=page.details.borders;
   this.borders.toolTip='Draw dashed constellation boundaries from PixInsight’s bundled local data. Solid lines connect constellation stars. No online lookup is required.';
   // Annotation controls edit the proposed values only.
   this.starNames=new CheckBox(this.annotationPage);this.starNames.text='Star names';
   this.starMagnitudes=new CheckBox(this.annotationPage);this.starMagnitudes.text='Star magnitudes';
   this.starNames.toolTip='Label bright named stars from the bundled catalog; use common names where available.';
   this.starMagnitudes.toolTip='Label stellar magnitudes from the active local catalog. Passbands differ between Gaia and named-star catalogs; these are catalog brightness values.';
   this.objectDetails=new CheckBox(this.annotationPage);this.objectDetails.text='Object details';
   this.objectDetails.toolTip='Add catalog type, major/minor size in arcminutes and magnitude where available. Missing values are omitted.';
   this.contours=new CheckBox(this.annotationPage);this.contours.text='Nebula contours';
   this.contours.toolTip='Draw nebula outlines from PixInsight local databases by default, or from a custom Stellarium outlines.dat file. Choose the source and bundled outline brightness level in Configuration. Uncheck to hide all nebula contours.';
   for(let key of ['borders','contours','starNames','starMagnitudes','objectDetails']){
      this[key].checked=page.details[key];this[key].onCheck=()=>this.onChanged();this.annotationPage.sizer.add(this[key]);
   }
   this.contours.enabled=ablContoursAvailable(manager.contourState);if(!this.contours.enabled)this.contours.checked=false;
   this.values=()=>({catalogs:ABL.copy(this.catalogSettings),borders:this.borders.checked,starNames:this.starNames.checked,starMagnitudes:this.starMagnitudes.checked,objectDetails:this.objectDetails.checked,contours:this.contours.checked});
   this.setValues=(value,settings,outlineAvailable)=>{
      let details=ablChartDetailSettings(value);this.settings=ABL.copy(settings);this.catalogSettings=details.catalogs;
      this.updatingCatalog=true;
      try{for(let n of this.catalogNodes){this.catalogSettings[n.entry.key].enabled=n.entry.available&&this.catalogSettings[n.entry.key].enabled;n.checked=this.catalogSettings[n.entry.key].enabled;}}
      finally{this.updatingCatalog=false;}
      for(let key of ['borders','contours','starNames','starMagnitudes','objectDetails'])this[key].checked=details[key];
      this.contours.enabled=outlineAvailable;if(!outlineAvailable)this.contours.checked=false;this.updateCatalogEditor();
   };
   this.detailsGroup.sizer.add(this.annotationPage);this.detailsGroup.sizer.add(this.catalogPage);
   if(this.catalogNodes.length)this.catalogTree.currentNode=this.catalogNodes[0];this.updateCatalogEditor();
   this.sizer=new VerticalSizer;this.sizer.add(this.detailsGroup);
}}

// Each tab page owns its preview bitmap; the manager owns temporary chart
// files and the render cache. Open as image loads independent pixels. Tab
// changes retain preview pixels; a changed target or chart key invalidates
// the affected page, and hidden pages defer rendering until activated.
class ABLChartPage extends Control { constructor(parent,manager,sky){
   super(parent);this.manager=manager;this.sky=sky;this.object=null;this.objectKey=null;this.bitmap=null;this.loadedPath='';this.updating=false;
   this.vectorChart=null;this.vectorTiles=sky?new ChartTileCache(32*1024*1024):null;this.exportPath='';
   this.hitIndex=null;this.hoverHit=null;this.pickedHit=null;
   this.tableGroup=null;this.frameError='';
   this.centerPick=null;this.navigationHistory=[];this.navigationIndex=-1;this.navigationActive=false;
   this.navigationInputKey=null;this.navigationDocument=null;this.pendingView=null;this.activeChartPreset='';
   this.previewState='idle';this.previewError='';this.renderSummary='';this.canPreview=false;
   this.settings=ablPreviewSettings(null,sky,manager.previewPreferences[sky?'sky':'dss']);
   this.catalogEntries=sky?ablChartCatalogs():[];
   this.details=ablChartDetailSettings(manager.previewPreferences.details);
   this.details.contours=sky&&this.details.contours&&ablContoursAvailable(manager.contourState);
   for(let entry of this.catalogEntries)this.details.catalogs[entry.key].enabled=this.details.catalogs[entry.key].enabled&&entry.available;
   this.captureChartPreset=()=>ablChartPresetState({sky:manager.previewPreferences.sky,details:this.details,contourPath:manager.contourPath,outlineLevel:manager.outlineLevel});
   this.syncChartPreset=()=>{
      if(!sky||!this.activeChartPreset)return;
      let preset=manager.chartPresets.find(p=>p.name===this.activeChartPreset);
      if(!preset||JSON.stringify(preset.chart)!==JSON.stringify(this.captureChartPreset()))this.activeChartPreset='';
   };
   this.updateNavigationControls=()=>{
      if(!sky||!this.backButton)return;
      this.backButton.enabled=!this.disposed&&!this.rendering&&this.navigationIndex>0;
      this.forwardButton.enabled=!this.disposed&&!this.rendering&&this.navigationIndex>=0&&this.navigationIndex<this.navigationHistory.length-1;
      this.tableTargetButton.enabled=!this.disposed&&!this.rendering&&this.navigationActive;
      this.scopeLabel.visible=this.scopeSelect.visible=!this.navigationActive;this.browsingLabel.visible=this.navigationActive;
   };
   this.resetNavigation=()=>{
      this.navigationHistory=[];this.navigationIndex=-1;this.navigationActive=false;this.centerPick=null;this.pendingView=null;this.updateNavigationControls();
   };
   this.navigationSnapshot=source=>({object:this.object,group:this.tableGroup,centerPick:this.centerPick,source,
      view:{zoom:this.view.zoom,centerX:this.view.centerX,centerY:this.view.centerY},settingsKey:JSON.stringify(this.captureChartPreset())});
   this.rememberNavigationView=()=>{
      if(this.bitmap&&this.navigationIndex>=0){let entry=this.navigationHistory[this.navigationIndex];
         entry.view={zoom:this.view.zoom,centerX:this.view.centerX,centerY:this.view.centerY};entry.settingsKey=JSON.stringify(this.captureChartPreset());}
   };
   this.restoreViewport=view=>{
      if(!view||!this.bitmap)return;
      this.view={zoom:Math.max(1,Math.min(16,Number(view.zoom)||1)),centerX:Number.isFinite(view.centerX)?Math.max(0,Math.min(1,view.centerX)):.5,centerY:Number.isFinite(view.centerY)?Math.max(0,Math.min(1,view.centerY)):.5,drag:null};
      this.previewRect();this.updateViewCursor();this.chart.update();
   };
   this.showNavigationEntry=entry=>{
      this.navigationActive=!entry.source;
      let view=entry.settingsKey===JSON.stringify(this.captureChartPreset())?entry.view:null;
      this.displayTarget(entry.object,entry.group,entry.centerPick,view);this.updateNavigationControls();
   };
   this.centerOnSelection=()=>{
      if(!sky||!this.pickedHit||!this.bitmap||this.rendering||this.disposed)return false;
      let pick=ablNavigationPick(this.pickedHit),object=ablChartPickObject(pick);ABL.meta(object).objectId=pick.objectId;
      if(ablNavigationIdentity(object,null,pick)===ablNavigationIdentity(this.object,this.tableGroup,this.centerPick))return false;
      if(this.navigationIndex<0){this.navigationHistory=[this.navigationSnapshot(true)];this.navigationIndex=0;}else this.rememberNavigationView();
      this.navigationHistory=this.navigationHistory.slice(0,this.navigationIndex+1);
      let entry={object,group:null,centerPick:pick,source:false,view:null,settingsKey:JSON.stringify(this.captureChartPreset())};
      this.navigationHistory.push(entry);
      // Keep target snapshots and view transforms only, never retained native
      // engines or bitmaps. Bound the session's navigation history.
      if(this.navigationHistory.length>32)this.navigationHistory.shift();
      this.navigationIndex=this.navigationHistory.length-1;this.showNavigationEntry(entry);return true;
   };
   this.navigateChart=delta=>{
      let index=this.navigationIndex+delta;
      if(!sky||this.rendering||this.disposed||![-1,1].includes(delta)||index<0||index>=this.navigationHistory.length)return false;
      this.rememberNavigationView();this.navigationIndex=index;this.showNavigationEntry(this.navigationHistory[index]);return true;
   };
   this.returnToTableTarget=()=>{
      if(this.rendering||this.disposed)return;
      this.navigationInputKey=null;this.navigationDocument=null;this.resetNavigation();manager.updateSelection();
   };
   this.availableDetails=()=>['borders','starNames','starMagnitudes','objectDetails'].concat(ablContoursAvailable(manager.contourState)?['contours']:[]);
   this.allDetailsEnabled=()=>sky&&(!ablMilkyWayAvailable()||this.settings.milkyWay)&&this.availableDetails().every(key=>this.details[key])&&this.catalogEntries.filter(e=>e.available).every(e=>this.details.catalogs[e.key].enabled);
   this.setAllDetails=checked=>{
      let value=manager.currentConfiguration(),available=this.availableDetails();
      for(let key of ['borders','starNames','starMagnitudes','objectDetails','contours'])value.details[key]=checked&&available.includes(key);
      for(let entry of this.catalogEntries)value.details.catalogs[entry.key].enabled=checked&&entry.available;
      if(ablMilkyWayAvailable())value.sky.milkyWay=checked;
      // This shortcut uses the same persisted preferences as Configuration.
      manager.applyConfiguration(value);
   };
   this.chartOptions=()=>Object.assign(ABL.copy(this.details),ABL.chartAppearance(this.settings),{style:this.settings.style,labelDensity:this.settings.labelDensity,contourPath:manager.contourPath,outlineLevel:manager.outlineLevel,inset:this.settings.inset,insetDegrees:this.settings.insetDegrees},this.tableGroup?{tableTargets:ABL.copy(this.tableGroup.targets)}:this.centerPick?{centerPick:ABL.copy(this.centerPick)}:{});
   // One information block owns target identity, size, progress, source,
   // coverage limitations and errors. The image area contains only the image.
   this.info=new Label(this);this.info.useRichText=true;this.info.wordWrapping=true;
   this.updateInfo=()=>{
      let o=this.object,r=o?ABL.record(o,manager.doc):null,size=o?ABL.angularSize(o):null,position=o?ABL.position(o):null;
      let lines=[r?'<b>'+ABL.html(ABL.objectHeading(r.designation,r.name))+'</b> · Size: '+ABL.html(ABL.sizeText(size)):'<b>No object selected</b>'];
      if(this.tableGroup)lines=['<b>'+ABL.html(this.tableGroup.title)+'</b> · All filtered objects · '+this.tableGroup.targets.length+' shown'];
      if(position&&position.ra!==null&&position.dec!==null)lines.push('J2000: '+ABL.formatRA(position.ra)+' '+ABL.formatDec(position.dec));
      let status=!o?'Select an object in the Table tab.':!this.canPreview?'Enter coordinates through Edit object.':this.previewState==='loading'?(sky?'Rendering finder chart…':'Loading DSS2 Red survey image…'):this.previewState==='error'?'Preview unavailable: '+this.previewError:this.bitmap?this.renderSummary:'Preview updates automatically when this tab is active.';
      if(this.frameError)status=this.frameError;
      if(this.navigationActive)status+=' · Browsing chart objects; table and DSS target unchanged';
      if(this.bitmap)status+=' · View: '+(this.view.zoom===1?'Fit':Math.round(this.view.zoom*100)+'% of fit');
      lines.push(ABL.html(status));
      if(this.tableGroup){let missing=this.tableGroup.targets.filter(t=>!ablChartTargetPosition(t));
         if(missing.length)lines.push(ABL.html(missing.length+' without coordinates; listed in the object key but not plotted.'));
         else if(this.canPreview&&!this.bitmap)lines.push('Coverage fits all shown objects. Numbered markers match the object key; close-up is omitted.');
      }
      if(!sky&&size&&size.majorArcmin>120)lines.push('Object exceeds DSS coverage: the maximum 120′ field is used.');
      else if(sky&&size&&size.majorArcmin>7200)lines.push('Sky coverage is limited to 120°.');
      if(sky){let state=manager.contourState,source=state.status==='bundled'?'Bundled PixInsight outlines · '+NebulaOutlines.levelNames[manager.outlineLevel]:state.status==='loaded'?'Custom outlines: '+manager.contourPath.replace(/.*[\\/]/,''):'Nebula outlines unavailable · check Configuration';lines.push(ABL.html(source+(ablContoursAvailable(state)?this.details.contours?' · contours enabled':' · contours off':'')));}
      if(this.exportPath)lines.push('Exported chart: '+ABL.html(this.exportPath.replace(/.*[\\/]/,'')));
      this.info.text=lines.join('<br/>');this.info.toolTip=this.previewError||this.frameError||this.exportPath||(this.tableGroup?this.tableGroup.targets.filter(t=>!ablChartTargetPosition(t)).map(t=>t.name+' — coordinates missing').join('\n'):sky?manager.contourPath:'DSS2 Red survey at STScI');
   };
   this.clearPreview=()=>{this.pendingView=null;if(this.bitmap){this.bitmap.clear();this.bitmap=null;}this.vectorChart=null;this.hitIndex=null;this.hoverHit=this.pickedHit=null;if(this.updateInspection)this.updateInspection();if(this.vectorTiles)this.vectorTiles.use(null,0);this.exportPath='';this.resetView(false);this.loadedPath='';this.renderSummary='';this.previewError='';this.previewState='idle';if(manager.updateImageAction)manager.updateImageAction();if(this.retryButton)this.retryButton.visible=false;this.updateInfo();this.chart.update();};
   this.effectiveSettings=preferences=>{
      let value=ablPreviewSettings(this.object,sky,preferences);
      if(this.tableGroup){value.inset=false;try{value.coverage=ablTableChartFrame(this.tableGroup.targets,preferences.coverage,preferences.projection).coverage;}catch(e){/* updateFields presents framing errors in the information block. */}}
      return value;
   };
   this.updateFields=()=>{
      this.frameError='';
      if(this.tableGroup){
         try{let frame=ablTableChartFrame(this.tableGroup.targets,manager.previewPreferences.sky.coverage,manager.previewPreferences.sky.projection);
            this.object={designation:this.tableGroup.title,ra:ABL.formatRA(frame.ra),dec:ABL.formatDec(frame.dec)};
         }catch(e){this.object=null;this.frameError=String(e.message||e);}
      }
      let object=this.object,position=object?ABL.position(object):{ra:null,dec:null};
      this.settings=this.effectiveSettings(manager.previewPreferences[sky?'sky':'dss']);
      if(!manager.contourState||manager.contourState.path!==manager.contourPath||manager.contourState.status==='loaded'&&!File.exists(manager.contourPath))manager.contourState=ablContourFileState(manager.contourPath);
      let state=manager.contourState,loaded=ablContoursAvailable(state);
      if(!loaded)this.details.contours=false;
      if(manager.updateFinderActions)manager.updateFinderActions();
      this.canPreview=position.ra!==null&&position.dec!==null;this.updateInfo();this.updateNavigationControls();
      if(manager.updateMinimumSize)manager.updateMinimumSize();
   };
   this.targetKey=(object,tableGroup,centerPick=null)=>{
      let r=object?ABL.record(object,manager.doc):null;
      return tableGroup?JSON.stringify(tableGroup):r?JSON.stringify([r.id,r.designation,r.name,ABL.position(object),ABL.angularSize(object),ABL.objectType(object),centerPick]):'';
   };
   this.displayTarget=(object,tableGroup=null,centerPick=null,viewport=null)=>{
      let key=this.targetKey(object,tableGroup,centerPick);
      if(key===this.objectKey){if(viewport)this.restoreViewport(viewport);return;}
      this.tableGroup=tableGroup?ABL.copy(tableGroup):null;this.object=object?ABL.copy(object):null;this.centerPick=centerPick?ABL.copy(centerPick):null;
      this.objectKey=key;this.redrawTimer.stop();this.pendingRedraw=false;this.clearPreview();this.pendingView=viewport;
      this.updateFields();this.queueRedraw();
   };
   this.setObject=(object,tableGroup=null)=>{
      let key=this.targetKey(object,tableGroup);
      if(sky){
         // A new table target/filter scope or collection replaces the browsing
         // context. Refreshes with the same input must not recenter navigation.
         if(key!==this.navigationInputKey||manager.doc!==this.navigationDocument){
            this.navigationInputKey=key;this.navigationDocument=manager.doc;this.resetNavigation();
         }else if(this.navigationActive)return;
      }
      this.displayTarget(object,tableGroup);
   };
   this.renderPreview=()=>{
      if(this.rendering||this.disposed)return;this.redrawTimer.stop();this.pendingRedraw=false;this.rendering=true;
      try{
      if(!this.object||!this.canPreview)return;
      // Enforce the DSS cap again immediately before every request, including
      // when a manual width was entered or automatic fitting was unchecked.
      this.updateFields();let object=this.object,field=this.settings.coverage;this.previewState='loading';this.previewError='';this.updateInfo();manager.updateMinimumSize();
      let response=ablBusy(manager,sky?'Creating a finder chart…':'Loading DSS2 Red survey image…',()=>sky?
         manager.io.skyChart(object,ABL.chartFraming(object,true).field,field,this.chartOptions()):manager.io.finder(object,ABL.dssField(object,field)),false);
      let path=typeof response==='string'?response:response.path,bitmap=new Bitmap(path);
      if(bitmap.isNull)throw Error('No chart image was returned. Try again with a different field.');
      let restore=this.pendingView;this.clearPreview();this.bitmap=bitmap;this.loadedPath=path;this.loadedField=field;
      if(sky&&response.recording instanceof ChartRecording){this.vectorChart=response;this.hitIndex=new ABLChartHitIndex(response.picks);this.vectorTiles.use(response.recording,response.background);}
      this.restoreViewport(restore);this.chart.update();
      this.previewState='ready';this.renderSummary=sky?ablChartStyle(this.settings.style).name+' · '+field+'° coverage · target at crosshair · '+(response.catalog||'local catalogs')+(Number.isFinite(response.objectCount)?' · '+response.objectCount+' catalog objects':''):'DSS2 Red · '+field+' × '+field+' arcmin · target at crosshair';
      if(this.tableGroup)this.renderSummary=ablChartStyle(this.settings.style).name+' · '+field+'° coverage · '+this.tableGroup.targets.filter(ablChartTargetPosition).length+' numbered table objects · '+(response.catalog||'local catalogs');
      if(sky&&response.projectionName)this.renderSummary+=' · '+response.projectionName;
      if(sky&&response.milkyWay)this.renderSummary+=' · Milky Way shading';
      else if(sky&&this.settings.milkyWay&&response.milkyWayAvailable===false)this.renderSummary+=' · Milky Way database unavailable';
      if(sky&&this.details.contours)this.renderSummary+=' · '+(response.contourCount||0)+' nebula contours';
      if(sky&&response.inset)this.renderSummary+=' · close-up '+response.inset.coverage+'°';
      this.updateInfo();manager.updateMinimumSize();
   }catch(e){this.previewError=String(e.message||e);this.previewState='error';this.retryButton.visible=true;this.updateInfo();manager.updateMinimumSize();}finally{this.rendering=false;this.updateNavigationControls();if(manager.updateImageAction)manager.updateImageAction();}
   };
   this.retryButton=ablButton(this,'Retry',()=>this.queueRedraw(),'Retry this preview after a failed request.');this.retryButton.visible=false;
   // A single-shot timer coalesces edits and is stopped before rendering.
   // Never render recursively from processEvents, on a hidden tab, behind a
   // modal editor, after closing, or during another manager operation.
   this.pendingRedraw=false;this.rendering=false;this.disposed=false;
   this.redrawTimer=new Timer(.45,false,this);
   this.queueRedraw=()=>{
      this.redrawTimer.stop();
      if(this.disposed||!this.object||!this.canPreview){this.pendingRedraw=false;return;}
      this.pendingRedraw=true;
      if(manager.tabs.currentPageIndex===(sky?1:2)&&manager.visible)this.redrawTimer.start();
   };
   this.redrawTimer.onTimeout=()=>{
      if(!this.pendingRedraw||this.disposed||!manager.visible||manager.tabs.currentPageIndex!==(sky?1:2))return;
      if(this.rendering||manager.chartPauseDepth||!manager.enabled||!manager.isActiveWindow){this.redrawTimer.start();return;}
      if(!this.object||!this.canPreview){this.pendingRedraw=false;return;}
      this.renderPreview();
   };
   this.optionsChanged=()=>{this.updateFields();this.clearPreview();this.syncChartPreset();this.queueRedraw();};
   this.activate=()=>{this.updateFields();if(!this.bitmap)this.queueRedraw();};
   let controls=new HorizontalSizer;controls.spacing=8;
   if(sky){
      this.backButton=ablTool(this,':/icons/arrow-left.png','Back to the previous Finder target. Retains current chart settings; restores zoom and pan if the settings still match.',()=>manager.safe(()=>this.navigateChart(-1)));
      this.forwardButton=ablTool(this,':/icons/arrow-right.png','Forward to the next Finder target in this session.',()=>manager.safe(()=>this.navigateChart(1)));
      this.tableTargetButton=ablTool(this,':/file-explorer/home.png','Return to the current table target or filtered-object chart and clear browsing history. Table selection, filters and DSS are retained.',()=>manager.safe(()=>this.returnToTableTarget()));
      this.centerPickButton=ablButton(this,'Center on selection',()=>manager.safe(()=>this.centerOnSelection()),
         'Center the Finder chart on this object using the current chart settings. Leaves table selection, filters, export checks and the DSS target unchanged. Use Back/Forward or Return to table target above to navigate.');
      controls.add(this.backButton);controls.add(this.forwardButton);controls.add(this.tableTargetButton);controls.add(this.centerPickButton);controls.addSpacing(12);
      this.browsingLabel=new Label(this);this.browsingLabel.text='Chart selection';this.browsingLabel.visible=false;
      this.scopeLabel=new Label(this);this.scopeLabel.text='Chart:';this.scopeLabel.textAlignment=TextAlignment.Left|TextAlignment.VertCenter;
      this.scopeSelect=new ComboBox(this);this.scopeSelect.addItem('Selected object');this.scopeSelect.addItem('All filtered objects');this.scopeSelect.enabled=false;
      this.scopeSelect.toolTip='With a constellation filter active, chart every object currently shown in the table. All other filters and the selected list apply; checks and highlighted rows do not limit the chart. Coverage expands to fit the objects and their sizes. Numbered markers match the object key. DSS remains a single-object image.';
      this.scopeSelect.onItemSelected=()=>manager.updateSelection();controls.add(this.scopeLabel);controls.add(this.scopeSelect);controls.add(this.browsingLabel);
      this.updateNavigationControls();
   }
   controls.addStretch();controls.add(this.retryButton);
   this.chart=new Control(this);this.chart.setMinSize(620,360);this.chart.mouseTracking=sky;
   // Zoom changes only the viewport transform. Finder paints cached vectors
   // at display resolution; DSS magnifies its bitmap. Neither queries a catalog.
   // Store a normalized center so resizing keeps the viewed region centered.
   this.view={zoom:1,centerX:.5,centerY:.5,drag:null};
   const arrowCursor=new Cursor(StdCursor.Arrow),panCursor=new Cursor(StdCursor.OpenHand),dragCursor=new Cursor(StdCursor.ClosedHand);
   this.updateViewCursor=()=>{this.chart.cursor=this.view.drag&&this.view.drag.moved&&this.view.zoom>1?dragCursor:this.bitmap&&this.view.zoom>1?panCursor:arrowCursor;};
   this.resetView=(notify=true)=>{this.view={zoom:1,centerX:.5,centerY:.5,drag:null};this.hoverHit=null;this.updateViewCursor();if(notify){this.updateInfo();this.updateInspection();this.chart.update();}};
   this.previewRect=()=>{
      if(!this.bitmap)return null;
      let width=this.chart.width,height=this.chart.height,v=this.view;
      let scale=Math.max(.0001,Math.min(Math.max(1,width-24)/this.bitmap.width,Math.max(1,height-24)/this.bitmap.height))*v.zoom;
      let w=this.bitmap.width*scale,h=this.bitmap.height*scale;
      // Center short axes; clamp long axes so dragging never loses the image.
      let x=w<=width-24?(width-w)/2:Math.min(12,Math.max(width-12-w,width/2-v.centerX*w));
      let y=h<=height-24?(height-h)/2:Math.min(12,Math.max(height-12-h,height/2-v.centerY*h));
      v.centerX=(width/2-x)/w;v.centerY=(height/2-y)/h;
      return {x,y,width:w,height:h,scale};
   };
   this.zoomAt=(x,y,delta)=>{
      if(!this.bitmap||this.disposed||this.rendering||!Number.isFinite(delta)||!delta)return false;
      let before=this.previewRect(),v=this.view,zoom=Math.max(1,Math.min(16,v.zoom*Math.pow(1.25,Math.max(-8,Math.min(8,delta/120)))));
      if(Math.abs(zoom-v.zoom)<1e-10)return true;
      if(zoom<1.000001){this.resetView();return true;}
      // Hold the image point under the pointer fixed, until an image edge
      // prevents further panning. Margins anchor to the nearest image edge.
      x=Math.max(before.x,Math.min(before.x+before.width,x));y=Math.max(before.y,Math.min(before.y+before.height,y));
      let ratio=zoom/v.zoom,u=(x-before.x)/before.width,w=(y-before.y)/before.height;
      v.zoom=zoom;v.centerX=u+(this.chart.width/2-x)/(before.width*ratio);v.centerY=w+(this.chart.height/2-y)/(before.height*ratio);v.drag=null;
      this.hoverHit=null;this.previewRect();this.updateViewCursor();this.updateInfo();this.updateInspection();this.chart.update();return true;
   };
   this.chart.toolTip=sky?'':'Wheel up to zoom in at the pointer; wheel down to zoom out. Drag with the left mouse button to pan. Double-click to fit the whole image. This changes only the preview, not sky coverage or the saved image.';
   this.chart.onMouseWheel=(x,y,delta)=>this.zoomAt(x,y,delta);
   this.pickAt=(x,y)=>{
      let r=this.previewRect();return r&&this.hitIndex?this.hitIndex.hit((x-r.x)/r.scale,(y-r.y)/r.scale,r.scale,this.logicalPixelsToPhysical(9)):null;
   };
   this.chart.onMousePress=(x,y,button)=>{
      if(button!==MouseButton.Left||!this.bitmap||this.disposed||this.rendering)return false;
      let rect=this.previewRect();this.view.drag={x,y,moved:false,centerX:this.view.centerX,centerY:this.view.centerY,width:rect.width,height:rect.height};return true;
   };
   this.chart.onMouseMove=(x,y,buttons)=>{
      let drag=this.view.drag;
      if(drag&&!(buttons&MouseButton.Left)){this.view.drag=null;this.updateViewCursor();drag=null;}
      if(drag){
         if(Math.hypot(x-drag.x,y-drag.y)>this.logicalPixelsToPhysical(4))drag.moved=true;
         if(drag.moved&&this.view.zoom>1){
            this.hoverHit=null;this.view.centerX=drag.centerX-(x-drag.x)/drag.width;this.view.centerY=drag.centerY-(y-drag.y)/drag.height;
            this.previewRect();this.updateViewCursor();this.updateInspection();this.chart.update();
         }
      }else if(sky){let hit=this.pickAt(x,y);if(hit!==this.hoverHit){this.hoverHit=hit;this.updateInspection();this.chart.update();}}
      return true;
   };
   this.chart.onMouseRelease=(x,y,button)=>{
      if(button!==MouseButton.Left||!this.view.drag)return false;
      let drag=this.view.drag;this.view.drag=null;this.updateViewCursor();
      if(sky&&!drag.moved&&Math.hypot(x-drag.x,y-drag.y)<=this.logicalPixelsToPhysical(4)){
         this.pickedHit=this.pickAt(x,y);this.hoverHit=null;this.updateInspection();this.chart.update();
      }
      return true;
   };
   this.chart.onMouseDoubleClick=(x,y,buttons)=>{if(!this.bitmap||!(buttons&MouseButton.Left))return false;this.resetView();return true;};
   this.chart.onLeave=()=>{this.hoverHit=null;this.updateInspection();this.chart.update();return true;};
   this.chart.onResize=()=>{this.view.drag=null;this.hoverHit=null;this.previewRect();this.updateViewCursor();this.updateInspection();this.chart.update();};
   this.chart.onHide=()=>{this.view.drag=null;this.hoverHit=null;this.updateViewCursor();this.updateInspection();};
   this.chart.onPaint=()=>{let g=new Graphics(this.chart);try{
      g.fillRect(this.chart.boundsRect,new Brush(0xff10141a));
      if(this.bitmap){let r=this.previewRect(),x=r.x,y=r.y,w=r.width,h=r.height;
         // Draw only the visible source region; do not allocate enlarged
         // bitmaps at high zoom. The DSS target marker follows image center.
         let x0=Math.max(0,x),y0=Math.max(0,y),x1=Math.min(this.chart.width,x+w),y1=Math.min(this.chart.height,y+h);
         if(x1>x0&&y1>y0){
            if(this.vectorChart)this.vectorTiles.paint(g,Math.round(x),Math.round(y),r.scale,x0,y0,x1,y1,this.chart.resourcePixelRatio/this.chart.displayPixelRatio);
            else g.drawScaledBitmapRect(new Rect(x0,y0,x1,y1),this.bitmap,new Rect((x0-x)/r.scale,(y0-y)/r.scale,(x1-x)/r.scale,(y1-y)/r.scale));
         }
         if(sky)for(let hit of [this.pickedHit,this.hoverHit])if(hit){let px=x+hit.x*r.scale,py=y+hit.y*r.scale;
            if(px>=0&&py>=0&&px<this.chart.width&&py<this.chart.height){let radius=this.logicalPixelsToPhysical(hit===this.pickedHit?12:9);g.antialiasing=true;g.pen=new Pen(0xff10141a,4);g.strokeEllipse(px-radius,py-radius,px+radius,py+radius);g.pen=new Pen(hit===this.pickedHit?0xffffca60:0xff72ddff,2);g.strokeEllipse(px-radius,py-radius,px+radius,py+radius);}}
         if(!sky){let cx=x+w/2,cy=y+h/2;g.pen=new Pen(0xff65ff99,1);g.drawLine(cx-18,cy,cx-6,cy);g.drawLine(cx+6,cy,cx+18,cy);g.drawLine(cx,cy-18,cx,cy-6);g.drawLine(cx,cy+6,cx,cy+18);}
      }
   }finally{g.end();}};
   this.updateInspection=()=>{
      if(!sky||!this.hoverInfo)return;
      this.hoverInfo.text=this.hoverHit?'Hover: '+ablChartPickText(this.hoverHit):'Hover to inspect · Click to select · Wheel to zoom · Drag to pan · Double-click to fit';
      this.hoverInfo.toolTip=this.hoverHit?ablChartPickText(this.hoverHit)+'\nJ2000: '+ABL.formatRA(this.hoverHit.ra)+' '+ABL.formatDec(this.hoverHit.dec)+'\n'+this.hoverHit.catalog:'';
      let hit=this.pickedHit;
      // Hover never scans the collection. Reconcile the selected symbol once
      // per selection or collection revision, including edits and imports.
      if(this.matchHit!==hit||this.matchDocument!==manager.doc||this.matchRevision!==manager.objectRevision){
         this.pickMatches=hit?ablChartPickMatches(manager.doc,hit):[];this.matchHit=hit;this.matchDocument=manager.doc;this.matchRevision=manager.objectRevision;
      }
      let matches=this.pickMatches||[];
      this.pickInfo.text=hit?'Selected: '+ablChartPickText(hit):'No chart object selected';this.pickInfo.toolTip=hit?ablChartPickText(hit):'';
      this.pickAction.text=matches.length?'Edit object…':'Add object…';this.pickAction.enabled=!!hit;
      this.showPickButton.enabled=matches.length>0;
      this.centerPickButton.enabled=!!hit&&ablChartTargetPosition(hit)&&!this.rendering&&!this.disposed;
   };
   this.resolvePick=()=>{
      let hit=this.pickedHit;if(!hit)return null;
      let matches=ablChartPickMatches(manager.doc,hit);
      if(matches.length<=1)return {hit,id:matches.length?matches[0].id:''};
      // Imported collections can contain ambiguous aliases. Reuse the
      // existing chooser rather than silently editing the first match.
      let d=new ABLDuplicateDialog(manager,ablChartPickObject(hit),matches);d.windowTitle='Choose collection object';d.info.text='More than one collection entry matches this chart identifier. Choose the entry for this action.';d.hint.text='The chart data will not overwrite the selected entry.';d.openButton.text='Choose object';d.backButton.text='Cancel';
      return manager.executeDialog(d)?{hit,id:d.existingObjectId}:null;
   };
   this.sizer=new VerticalSizer;this.sizer.margin=10;this.sizer.spacing=8;this.sizer.add(controls);this.sizer.add(this.info);this.sizer.add(this.chart,100);
   if(sky){
      this.hoverInfo=new Label(this);this.hoverInfo.wordWrapping=true;this.hoverInfo.setFixedHeight(this.logicalPixelsToPhysical(34));
      this.pickInfo=new Label(this);this.pickInfo.wordWrapping=true;this.pickInfo.setMinWidth(100);this.pickInfo.setFixedHeight(this.logicalPixelsToPhysical(38));
      this.pickAction=ablButton(this,'Add object…',()=>manager.safe(()=>{let pick=this.resolvePick();if(!pick)return;if(pick.id)manager.editObject(pick.id);else manager.addObject(pick.hit.designation,ablChartPickObject(pick.hit));this.updateInspection();}),
         'Edit the matching collection entry, even if hidden by filters, or review a new object with local chart facts. Only Apply changes the collection. Look up in the editor can enrich its information.');
      this.showPickButton=ablButton(this,'Show in table',()=>manager.safe(()=>{let pick=this.resolvePick();if(pick&&pick.id)manager.openExistingObject(pick.id,false);}),
         'Reveal the existing object in All objects, clearing table filters. Sorting and export checks are retained.');
      let row=new HorizontalSizer;row.spacing=8;row.add(this.pickInfo,100);row.add(this.pickAction);row.add(this.showPickButton);
      this.sizer.add(this.hoverInfo);this.sizer.add(row);
   }
   this.setObject(null);this.updateInspection();
}}

// Apply returns a complete proposed transfer. Cancel discards the proposal,
// including any new destination, without modifying the live collection.
class ABLListTransferDialog extends Dialog { constructor(parent,mode,ids){
   super(parent);this.windowTitle=mode==='move'?'Move selected to list':'Add selected to list';this.transferResult=null;this.autoDefaultButton=false;
   this.setMinWidth(560);this.ids=ids.slice();this.sourceId='';
   let lists=parent.doc.observingLists,sorted=Object.keys(lists).sort((a,b)=>lists[a].name.localeCompare(lists[b].name));
   const sourceIds=id=>ids.filter(wanted=>lists[id].objects.some(o=>ABL.meta(o).objectId===wanted));
   this.info=new Label(this);this.info.wordWrapping=true;this.info.setFixedWidth(this.logicalPixelsToPhysical(530));
   this.source=new ComboBox(this);this.sourceIds=[''];this.source.addItem('Choose source list');
   for(let id of sorted){let count=sourceIds(id).length;if(count){this.sourceIds.push(id);this.source.addItem(lists[id].name+' ('+count+')');}}
   this.source.currentItem=Math.max(0,this.sourceIds.indexOf(parent.listId));if(!this.source.currentItem&&this.sourceIds.length===2)this.source.currentItem=1;
   this.destination=new ComboBox(this);this.destinationIds=[];
   this.nameEdit=new Edit(this);this.nameEdit.setMinWidth(300);this.nameEdit.enabled=false;
   this.destination.onItemSelected=()=>{this.nameEdit.enabled=this.destinationIds[this.destination.currentItem]==='new';};
   this.updateSource=()=>{
      this.sourceId=mode==='move'?(this.sourceIds[this.source.currentItem]||''):'';
      this.transferIds=mode==='move'?(this.sourceId?sourceIds(this.sourceId):[]):ids.slice();
      let previous=this.destinationIds[this.destination.currentItem];this.destination.clear();this.destinationIds=['','new'];this.destination.addItem('Choose destination list');this.destination.addItem('Create new list…');
      for(let id of sorted)if(id!==this.sourceId){this.destinationIds.push(id);this.destination.addItem(lists[id].name);}
      this.destination.currentItem=Math.max(0,this.destinationIds.indexOf(previous));this.destination.onItemSelected();
      this.info.text=ids.length+' selected object'+(ids.length===1?'':'s')+'. '+(mode==='add'?'Add them to the destination and keep all current memberships.':this.sourceId?'Move '+this.transferIds.length+' from “'+lists[this.sourceId].name+'”. '+(ids.length-this.transferIds.length)+' selected objects outside this source remain unchanged. Other list memberships are kept.':'Choose the list to remove memberships from, then select or create the destination.');
      if(this.applyButton)this.applyButton.enabled=mode==='add'||this.transferIds.length>0;
   };
   this.source.onItemSelected=this.updateSource;
   this.note=new Label(this);this.note.wordWrapping=true;this.note.setFixedWidth(this.logicalPixelsToPhysical(530));this.note.text='Objects already in the destination are not duplicated. Comments, imaging information and other metadata are retained. Save the collection to keep membership changes.';
   this.applyButton=ablButton(this,mode==='move'?'Move':'Add',()=>{try{
      if(mode==='move'&&!this.sourceId)throw Error('Choose a source list.');
      let options={mode,sourceId:this.sourceId};if(this.destinationIds[this.destination.currentItem]==='new')options.newListName=this.nameEdit.text;else options.destinationId=this.destinationIds[this.destination.currentItem];
      this.transferResult=ABL.transferObjects(parent.doc,this.transferIds,options);this.ok();
   }catch(e){parent.error(e);}});this.applyButton.defaultButton=true;
   this.cancelButton=ablButton(this,'Cancel',()=>this.cancel());let buttons=new HorizontalSizer;buttons.spacing=6;buttons.addStretch();buttons.add(this.applyButton);buttons.add(this.cancelButton);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=8;this.sizer.add(this.info);if(mode==='move')this.sizer.add(ablRow(this,'Source list:',this.source));else this.source.hide();this.sizer.add(ablRow(this,'Destination:',this.destination));this.sizer.add(ablRow(this,'New list name:',this.nameEdit));this.sizer.add(this.note);this.sizer.add(buttons);this.updateSource();this.adjustToContents();
}}

// Select one source list and propose a destination before merging any objects.
// A multiple-list file requires an explicit source choice. Source selection
// suggests its saved name without overwriting a name the user has customized.
class ABLListImportDialog extends Dialog { constructor(parent,source,path){
   super(parent);this.windowTitle='Import objects as a list';this.autoDefaultButton=false;this.importOptions=null;
   this.sourceChoices=ABL.importListChoices(source);this.suggestedName='';
   let basename=String(path).replace(/\\/g,'/').split('/').pop(),fallback=basename.replace(/\.(sol|ol|json)$/i,'');
   this.info=new Label(this);this.info.wordWrapping=true;this.info.setFixedWidth(this.logicalPixelsToPhysical(560));this.info.text=ABL.html('File: '+basename);this.info.toolTip=ABL.html(path);
   this.sourceSelect=new ComboBox(this);this.sourceIndexes=[];
   if(this.sourceChoices.length!==1){this.sourceSelect.addItem('Choose list to import');this.sourceIndexes.push(-1);}
   for(let i=0;i<this.sourceChoices.length;++i){let c=this.sourceChoices[i];this.sourceSelect.addItem(c.name+' ('+c.count+' objects)');this.sourceIndexes.push(i);}
   this.sourceSelect.enabled=this.sourceChoices.length>1;this.sourceSelect.toolTip='Only objects belonging to this source list are imported. Other lists in the file remain excluded.';
   this.destination=new ComboBox(this);this.destinationIds=[''];this.destination.addItem('Create new list…');
   for(let id of Object.keys(parent.doc.observingLists).sort((a,b)=>parent.doc.observingLists[a].name.localeCompare(parent.doc.observingLists[b].name))){this.destinationIds.push(id);this.destination.addItem(parent.doc.observingLists[id].name);}
   this.nameEdit=new Edit(this);this.nameEdit.setMinWidth(320);this.nameEdit.toolTip='Defaults to the selected source list name. Enter a different name here or choose an existing destination list.';
   this.hint=new Label(this);this.hint.wordWrapping=true;this.hint.setFixedWidth(this.logicalPixelsToPhysical(560));
   this.hint.text='Objects are matched against the whole collection. Duplicates share one entry; current values take priority, missing information is filled, and distinct notes, filters and aliases are combined.';
   this.sourceChoice=()=>this.sourceChoices[this.sourceIndexes[this.sourceSelect.currentItem]];
   this.updateControls=()=>{this.nameEdit.enabled=!this.destinationIds[this.destination.currentItem];this.applyButton.enabled=!!this.sourceChoice();};
   this.sourceSelect.onItemSelected=()=>{let c=this.sourceChoice(),name=c?(c.sourceUnlisted?fallback:c.name):'';if(!this.nameEdit.text.trim()||this.nameEdit.text===this.suggestedName)this.nameEdit.text=name;this.suggestedName=name;this.updateControls();};
   this.destination.onItemSelected=()=>this.updateControls();
   this.applyButton=ablButton(this,'Import',()=>{try{
      let c=this.sourceChoice();if(!c)throw Error('Choose a list from the import file.');
      let o=c.sourceUnlisted?{sourceUnlisted:true}:{sourceListId:c.sourceListId},id=this.destinationIds[this.destination.currentItem];
      if(id)o.destinationId=id;else o.newListName=this.nameEdit.text.trim();
      ABL.importListDestination(parent.doc,o);this.importOptions=o;this.ok();
   }catch(e){parent.error(e);}});this.applyButton.defaultButton=true;
   this.cancelButton=ablButton(this,'Cancel',()=>this.cancel());let buttons=new HorizontalSizer;buttons.spacing=8;buttons.addStretch();buttons.add(this.applyButton);buttons.add(this.cancelButton);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=8;this.sizer.add(this.info);this.sizer.add(ablRow(this,'Source list:',this.sourceSelect));this.sizer.add(ablRow(this,'Destination:',this.destination));this.sizer.add(ablRow(this,'New list name:',this.nameEdit));this.sizer.add(this.hint);this.sizer.add(buttons);
   this.sourceSelect.onItemSelected();
}}

class ABLDialog extends Dialog { constructor(doc,path='',options={}){
   super();
   // The manager has no implicit action for Return. Otherwise PixInsight
   // promotes the first button (New list) when an edit control has focus.
   this.autoDefaultButton=false;
   this.doc=ABL.normalizeDocument(doc);this.path=path;ABL.cleanDocumentNotes(this.doc);ABL.consolidateDocumentInformation(this.doc);this.savedSignature=ablCollectionSignature(this.doc);this.dirty=false;this.building=false;this.lookupSource=0;this.exportIds=new Set;
   this.persistPreferences=options.persistPreferences!==false;
   this.collectionPreferenceStore=options.collectionPreferenceStore||ablCollectionPreferenceStore();
   this.rememberCollection=this.persistPreferences&&this.collectionPreferenceStore.readRemember()===true;
   // Call only after Open or Save has fully succeeded. Export and Merge keep
   // the active collection identity and must not replace the remembered path.
   this.rememberCurrentCollection=()=>{if(this.persistPreferences&&this.rememberCollection&&this.path)this.collectionPreferenceStore.writePath(this.path);};
   // Native parent windows can still report active while a modal child is
   // running. Explicitly suspend the timer around every nested dialog,
   // including native file choosers and confirmation/error messages.
   this.chartPauseDepth=0;
   this.withChartPaused=operation=>{
      ++this.chartPauseDepth;for(let page of [this.finderPage,this.dssPage,this.planningPage])if(page)page.redrawTimer.stop();
      try{return operation();}finally{
         --this.chartPauseDepth;
         if(!this.chartPauseDepth)for(let page of [this.finderPage,this.dssPage,this.planningPage])if(page?.pendingRedraw)page.queueRedraw();
      }
   };
   this.executeDialog=dialog=>this.withChartPaused(()=>dialog.execute());
   this.error=e=>this.withChartPaused(()=>(options.error||ablError)(e));
   this.notice=s=>this.withChartPaused(()=>(options.notice||ablNotice)(s));
   this.chartStyle='modern-editorial';
   if(this.persistPreferences){let saved=Settings.read('AstroBucketList/chartStyle',DataType.String);if(Settings.lastReadOK)this.chartStyle=ablChartStyle(saved).key;}
   this.previewPreferenceStore=options.previewPreferenceStore||{
      read:()=>{let text=Settings.read('AstroBucketList/previewPreferences',DataType.String);return Settings.lastReadOK?text:null;},
      write:text=>Settings.write('AstroBucketList/previewPreferences',DataType.String,text)
   };
   this.previewPreferences=ablLoadPreviewPreferences(this.persistPreferences?this.previewPreferenceStore.read():null,this.chartStyle);
   this.chartStyle=this.previewPreferences.sky.style;
   this.viewPresetStore=options.viewPresetStore||{
      read:()=>{let text=Settings.read('AstroBucketList/viewPresets',DataType.String);return Settings.lastReadOK?text:null;},
      write:text=>Settings.write('AstroBucketList/viewPresets',DataType.String,text)
   };
   this.viewPresets=ablLoadViewPresets(this.persistPreferences?this.viewPresetStore.read():null);this.activeViewPreset='';
   this.chartPresetStore=options.chartPresetStore||{
      read:()=>{let text=Settings.read('AstroBucketList/chartPresets',DataType.String);return Settings.lastReadOK?text:null;},
      write:text=>Settings.write('AstroBucketList/chartPresets',DataType.String,text)
   };
   this.chartPresets=ablLoadChartPresets(this.persistPreferences?this.chartPresetStore.read():null);
   this.planningPreferenceStore=options.planningPreferenceStore||{
      read:()=>{let text=Settings.read('AstroBucketList/observingPreferences',DataType.String);return Settings.lastReadOK?text:null;},
      write:text=>{if(text===null)Settings.remove('AstroBucketList/observingPreferences');else Settings.write('AstroBucketList/observingPreferences',DataType.String,text);}
   };
   // Keep the original text for rollback, including malformed recoverable
   // data. The normalized fallback and its warning are only in-memory state.
   this.observingSitesText=this.persistPreferences?(this.planningPreferenceStore.read()??null):null;
   this.observingSites=ablLoadObservingSites(this.observingSitesText);
   this.planningPreferences=ABL.copy(this.observingSites.sites[this.observingSites.active]);
   this.contourPath=ablDefaultContourPath();
   if(this.persistPreferences){let saved=Settings.read('AstroBucketList/contourPath',DataType.String);if(Settings.lastReadOK)this.contourPath=saved;}
   this.contourState=ablContourFileState(this.contourPath);
   this.outlineLevel=2;if(this.persistPreferences){let saved=Settings.read('AstroBucketList/outlineLevel',DataType.Int32);if(Settings.lastReadOK&&[0,1,2,3].includes(saved))this.outlineLevel=saved;}
   this.chartFiles=[];this.chartCache=new Map;
   this.io={read:ablRead,readListImport:ablReadListImport,write:ablWrite,lookup:ablLookup,finder:(o,fov)=>{
      // A full 120-arcminute DSS2 field can exceed 24 MiB. Keep a bounded
      // allowance large enough for the full-resolution GIF and a longer,
      // cancellable transfer deadline for these survey images.
      return ablDSSImage(ABL.finderURL(o,fov),this.chartCache,this.chartFiles);
   }};
   // Cache each chart variant only for this manager session. A chart never
   // changes list metadata, imaging flags, Gaia configuration or source images.
   this.io.skyChart=(o,field,sky,chartOptions={})=>{
      let details=ABL.chartDetails(chartOptions),outlineText='';
      if(details.contours&&details.contourPath){
         if(!File.exists(details.contourPath))throw Error('The selected Stellarium outline file is unavailable. Choose another file or Use bundled in Configuration.');
         outlineText=File.readTextFile(details.contourPath);
      }
      // Include every display option and contour contents. Editing a local
      // contour file cannot silently reuse a stale preview.
      let cacheDetails=Object.assign({},details,{contourPath:details.contours?details.contourPath:'',insetDegrees:details.inset?details.insetDegrees:2});
      let key='sky:'+JSON.stringify([ABL.position(o),o.designation||o.name,o.name,o.nameI18n,ABL.meta(o).displayName,ABL.meta(o).objectId,ABL.meta(o).aliases,ABL.angularSize(o),ABL.objectType(o),field,sky,ablChartCatalogOptions(chartOptions),ablChartStyle(chartOptions.style).key,chartOptions.borders!==false,cacheDetails,details.milkyWay?ablMilkyWayAvailable():false,outlineText,chartOptions.tableTargets||null,chartOptions.centerPick||null]);
      if(this.chartCache.has(key)&&File.exists(this.chartCache.get(key).path))return this.chartCache.get(key);
      let file=File.systemTempDirectory+'/AstroBucketList-'+ABL.uuid().slice(1,-1)+'.png';this.chartFiles.push(file);
      let result=ablSkyChart(o,field,sky,file,Object.assign({},chartOptions,{outlineData:details.contours&&details.contourPath?ABL.parseOutlines(outlineText):[]}));this.chartCache.set(key,result);
      // Vector recordings are larger than bitmap-cache metadata. Bound their
      // retained memory; an evicted chart can be rebuilt from the same inputs.
      let charts=Array.from(this.chartCache).filter(e=>e[0].startsWith('sky:')),bytes=charts.reduce((n,e)=>n+(e[1].recording?e[1].recording.bytes:0)+(e[1].interactionBytes||0),0);
      while(charts.length>1&&(charts.length>6||bytes>32*1024*1024)){let old=charts.shift();bytes-=(old[1].recording?old[1].recording.bytes:0)+(old[1].interactionBytes||0);this.chartCache.delete(old[0]);}
      return result;
   };
   if(options.io)for(let k of Object.keys(options.io))this.io[k]=options.io[k];
   this.windowTitle=ABL_TITLE+' '+ABL_VERSION;
   this.titleLabel=new Label(this);this.titleLabel.wordWrapping=true;this.titleLabel.text='Plan your imaging by constellation and month, maintain Stellarium lists, and record the objects you have imaged.';
   this.fileLabel=new Label(this);this.fileLabel.wordWrapping=true;this.fileLabel.setFixedWidth(this.logicalPixelsToPhysical(390));
   this.listSelect=new ComboBox(this);this.listSelect.setFixedWidth(this.logicalPixelsToPhysical(220));
   this.newListButton=ablButton(this,'New list',()=>this.safe(()=>{let v=ablDialogValue(this,'New observing list','','');if(v){this.listId=ABL.addList(this.doc,v.name);this.doc.observingLists[this.listId].description=v.description;this.changed();this.refreshLists();}}));
   this.renameListButton=ablButton(this,'List details',()=>this.safe(()=>{let l=this.doc.observingLists[this.listId];if(!l)return;let v=ablDialogValue(this,'List details',l.name,l.description);if(v){if(!v.name)throw Error('Enter a list name.');l.name=v.name;l.description=v.description;l['last edit']=ABL.stamp();this.changed();this.refreshLists();}}));
   this.deleteListButton=ablButton(this,'Delete list',()=>this.safe(()=>{let l=this.doc.observingLists[this.listId];if(!l)return;
      if(!this.confirm('Delete the list “'+l.name+'”? All of its objects remain in the collection. Only this grouping is removed.'))return;ABL.deleteList(this.doc,this.listId);this.listId='';this.changed();this.refreshLists();}));
   let lists=new HorizontalSizer;lists.add(this.listSelect);lists.addStretch();
   let listActions=new HorizontalSizer;listActions.spacing=6;listActions.add(this.newListButton);listActions.add(this.renameListButton);listActions.add(this.deleteListButton);listActions.addStretch();
   this.openButton=ablButton(this,'Open…',()=>this.safe(()=>this.openFile()));
   this.importButton=ablButton(this,'Merge lists…',()=>this.safe(()=>this.importFiles()));
   this.importButton.toolTip='Merge one or more saved lists into this collection. Matching objects share combined comments, catalog information, filters and aliases; current values win other conflicts. Save to persist the result.';
   this.importListButton=ablButton(this,'Import list…',()=>this.safe(()=>this.importListFile()),'Choose one list from a saved file, merge its objects into the collection, and add them to a new named list or an existing list.');
   this.saveButton=ablButton(this,'Save',()=>this.safe(()=>this.save()),'Save changes to the current collection. After confirmation, keep its previous contents in a single .bak file beside it.');
   this.saveAsButton=ablButton(this,'Save as…',()=>this.safe(()=>this.save(true)));
   this.exportButton=ablButton(this,'Export…',()=>this.safe(()=>this.exportFiles()));
   let files=new HorizontalSizer;files.spacing=6;for(let b of [this.openButton,this.importListButton,this.importButton,this.saveButton,this.saveAsButton,this.exportButton])files.add(b);files.addStretch();
   this.tabs=new TabBox(this);this.tablePage=new Control(this.tabs);
   // Search, filters and sorting share a collapsible section. Separate group
   // titles distinguish row visibility from row order; none of these controls
   // changes the collection or an object's list memberships.
   this.filterSection=new Control(this.tablePage);this.filterColumn=new Control(this.filterSection);
   this.filterBar=new SectionBar(this.tablePage,'Find, filter and sort');ablStableSection(this,this.filterBar,this.filterSection);
   this.filterGroup=ablGroup(this.filterColumn,'Filter objects');this.sortGroup=ablGroup(this.filterSection,'Sort rows');
   this.searchEdit=new Edit(this.filterColumn);this.searchEdit.setFixedWidth(this.logicalPixelsToPhysical(440));this.searchEdit.toolTip='Find matching identifiers, known catalog aliases (with or without spaces), names, object types, target bands, filters, catalog information, comments, or constellations within the selected list and active filters.';
   this.clearSearchButton=ablButton(this.filterColumn,'Clear search',()=>{this.searchEdit.text='';this.refreshTree();},'Clear only Find. Keep all filter choices, sorting and export checks.');
   let searchRow=new HorizontalSizer;searchRow.spacing=8;this.searchLabel=new Label(this.filterColumn);this.searchLabel.text='Find:';searchRow.add(this.searchLabel);searchRow.add(this.searchEdit);searchRow.add(this.clearSearchButton);searchRow.addStretch();
   this.monthFilter=new ComboBox(this.filterGroup);this.monthFilter.values=[-1];this.monthFilter.addItem('All months');
   for(let i=1;i<=12;++i){this.monthFilter.addItem(ABL.MONTHS[i]);this.monthFilter.values.push(i);}
   this.monthFilter.addItem('Unassigned month');this.monthFilter.values.push(0);
   this.monthFilter.addItem('Previous / current / next');this.monthFilter.values.push('near-current');
   this.statusFilter=new ComboBox(this.filterGroup);for(let s of ['All imaging states','Not yet imaged','Imaged'])this.statusFilter.addItem(s);
   this.constellationFilter=new ComboBox(this.filterGroup);this.constellationFilter.values=[null];this.constellationFilter.addItem('All constellations');this.constellationFilter.setMinWidth(190);
   this.constellationFilter.toolTip='Constellations present in the selected list and planning month, including separate Serpens Caput and Cauda regions. Previous / current / next includes all three months. An unavailable selection resets to All constellations.';
   this.typeFilter=new ComboBox(this.filterGroup);this.typeFilter.values=[null];this.typeFilter.addItem('All object types');this.typeFilter.setMinWidth(190);
   this.typeFilter.toolTip='Object types available after the selected list, Find, Month, Constellation, Target band, Imaging status and Selected only filters. The current Object type choice does not hide alternative types. An unavailable selection resets to All object types.';
   this.bandFilter=new ComboBox(this.filterGroup);this.bandFilter.values=[null,'broadband','narrowband','unclassified'];
   for(let label of ['All target bands','Broadband','Narrowband','Unclassified'])this.bandFilter.addItem(label);
   this.bandFilter.toolTip='Filter by imaging target band. Unclassified finds objects that need a manual choice in Edit object.';
   this.selectedOnlyFilter=new CheckBox(this.filterGroup);this.selectedOnlyFilter.text='Selected only';
   this.selectedOnlyFilter.toolTip='Show only objects whose row checkboxes are checked for list actions or export, within the current list and other filters. Highlighting a row alone does not count. Unchecking an object hides it from this view. Turn this off to choose more objects.';
   this.clearFilters=()=>{this.searchEdit.text='';this.monthFilter.currentItem=0;this.statusFilter.currentItem=0;this.constellationFilter.currentItem=0;this.typeFilter.currentItem=0;this.bandFilter.currentItem=0;this.selectedOnlyFilter.checked=false;};
   this.resetFiltersButton=ablButton(this.filterGroup,'Reset filters',()=>{
      // Reset view filters only. Keep list choice, row order, export checks
      // and saved object metadata, including imaging/filter information.
      this.clearFilters();this.refreshTree();
   },'Clear Find, Month, imaging state, Constellation, Object type, Target band and Selected only. Keep the sort order and checked objects.');
   this.sortModes=ABL_VIEW_SORTS;
   this.sortSelect=new ComboBox(this.sortGroup);this.secondarySortSelect=new ComboBox(this.sortGroup);this.tertiarySortSelect=new ComboBox(this.sortGroup);
   for(let control of [this.secondarySortSelect,this.tertiarySortSelect])control.addItem('None');
   for(let text of ['Constellation','Month: January–December','Month: December–January','Size: smallest first','Size: largest first','RA: increasing','RA: decreasing','Dec: increasing','Dec: decreasing'])for(let control of [this.sortSelect,this.secondarySortSelect,this.tertiarySortSelect])control.addItem(text);
   this.sortSelect.toolTip='Primary sort: change row order by constellation, calendar month, major diameter, or numeric J2000 RA/Dec. Then by breaks ties. Missing values stay last in either direction.';
   this.secondarySortSelect.toolTip='Optional secondary sort, used only when primary values are equal. For example: Sort by Dec: increasing, then Size: largest first. None skips this criterion.';
   this.tertiarySortSelect.toolTip='Optional third sort, used only when the preceding selected criteria tie. For example: Dec: increasing, then Size: largest first, finally RA: increasing. None skips this criterion. Missing values stay last.';
   this.viewPresetSelect=new ComboBox(this.filterColumn);this.viewPresetSelect.setFixedWidth(this.logicalPixelsToPhysical(270));
   this.viewPresetSelect.toolTip='Restore saved search, filters and three sort criteria within the current list. The relative month choice remains relative to today. Presets are local PixInsight preferences shared by your collections.';
   this.captureView=()=>ablViewState(Object.assign({},this.filterOptions(),{selectedOnly:this.selectedOnlyFilter.checked,
      sorts:[this.sortModes[this.sortSelect.currentItem],this.secondarySortSelect.currentItem?this.sortModes[this.secondarySortSelect.currentItem-1]:null,this.tertiarySortSelect.currentItem?this.sortModes[this.tertiarySortSelect.currentItem-1]:null]}));
   this.refreshViewPresets=()=>{
      this.viewPresetSelect.clear();this.viewPresetSelect.addItem('Custom view');
      for(let p of this.viewPresets)this.viewPresetSelect.addItem(p.name);
      this.viewPresetSelect.currentItem=Math.max(0,1+this.viewPresets.findIndex(p=>p.name===this.activeViewPreset));
      this.deleteViewPresetButton.enabled=!!this.activeViewPreset;
   };
   this.syncViewPreset=()=>{
      if(this.activeViewPreset){let preset=this.viewPresets.find(p=>p.name===this.activeViewPreset);
         if(!preset||JSON.stringify(preset.view)!==JSON.stringify(this.captureView())){this.activeViewPreset='';this.refreshViewPresets();}}
   };
   this.storeViewPresets=next=>{
      // Write before committing the in-memory change; a failed settings write
      // must not masquerade as a saved, renamed or removed preset.
      if(this.persistPreferences)this.viewPresetStore.write(JSON.stringify({version:1,presets:next}));
      this.viewPresets=next;
   };
   this.saveViewPreset=name=>{
      name=String(name).trim();if(!name||name.length>80)throw Error('Enter a preset name of 1 to 80 characters.');
      let view=this.captureView();
      if(view.search!==this.searchEdit.text||view.objectType!==(this.typeFilter.values[this.typeFilter.currentItem]||null))
         throw Error('A saved view supports up to 4096 search characters and 256 object-type characters. Shorten the value before saving.');
      let next=ABL.copy(this.viewPresets),index=next.findIndex(p=>p.name.toLowerCase()===name.toLowerCase());
      if(index>=0&&!this.confirm('Replace the saved view “'+next[index].name+'” with the current filters and sorting?'))return false;
      if(index<0&&next.length>=50)throw Error('There are already 50 saved views. Delete an unused preset first.');
      let preset={name,view};if(index>=0)next[index]=preset;else next.push(preset);
      next.sort((a,b)=>a.name.localeCompare(b.name));this.storeViewPresets(next);this.activeViewPreset=name;this.refreshViewPresets();return true;
   };
   this.applyViewPreset=name=>{
      let preset=this.viewPresets.find(p=>p.name===name);if(!preset)return;
      let v=ablViewState(preset.view),all=ABL.records(this.doc,this.listId),date=new Date(),unavailable=[];
      this.building=true;
      try{
         this.searchEdit.text=v.search;this.monthFilter.currentItem=Math.max(0,this.monthFilter.values.indexOf(v.month));this.statusFilter.currentItem=['all','not-imaged','imaged'].indexOf(v.status);
         this.bandFilter.currentItem=Math.max(0,this.bandFilter.values.indexOf(v.band));this.selectedOnlyFilter.checked=v.selectedOnly;
         this.constellationFilter.currentItem=0;this.typeFilter.currentItem=0;this.refreshFilterChoices(all,date);
         let index=this.constellationFilter.values.indexOf(v.constellation);if(index<0&&v.constellation)unavailable.push('Constellation');this.constellationFilter.currentItem=Math.max(0,index);
         this.refreshFilterChoices(all,date);index=this.typeFilter.values.indexOf(v.objectType);if(index<0&&v.objectType)unavailable.push('Object type');this.typeFilter.currentItem=Math.max(0,index);
         this.sortSelect.currentItem=this.sortModes.indexOf(v.sorts[0]);this.secondarySortSelect.currentItem=v.sorts[1]?this.sortModes.indexOf(v.sorts[1])+1:0;this.tertiarySortSelect.currentItem=v.sorts[2]?this.sortModes.indexOf(v.sorts[2])+1:0;
      }finally{this.building=false;}
      this.activeViewPreset=name;this.refreshViewPresets();this.refreshTree();
      if(unavailable.length)this.notice('Applied “'+name+'”. '+unavailable.join(' and ')+' choices are unavailable in this list or filtered set and were reset to All. The saved preset is unchanged; the controls now show Custom view.');
   };
   this.viewPresetSelect.onItemSelected=index=>this.safe(()=>{if(this.building)return;if(index>0)this.applyViewPreset(this.viewPresets[index-1].name);else{this.activeViewPreset='';this.refreshViewPresets();}});
   this.saveViewPresetButton=ablButton(this.filterColumn,'Save view…',()=>this.safe(()=>{let d=new ABLViewNameDialog(this,this.activeViewPreset);if(this.executeDialog(d))this.saveViewPreset(d.presetName);}),
      'Save or replace a named view in local PixInsight preferences. Collection contents, list memberships, checked identities and chart settings are unchanged.');
   this.deleteViewPresetButton=ablTool(this.filterColumn,':/icons/delete.png','Delete the selected saved view after confirmation. The displayed filters and collection are retained.',()=>this.safe(()=>{
      if(!this.activeViewPreset||!this.confirm('Delete saved view “'+this.activeViewPreset+'”? The collection and current filters are retained.'))return;
      this.storeViewPresets(this.viewPresets.filter(p=>p.name!==this.activeViewPreset));this.activeViewPreset='';this.refreshViewPresets();
   }));
   let presetRow=new HorizontalSizer;presetRow.spacing=8;let presetLabel=new Label(this.filterColumn);presetLabel.text='View preset:';presetRow.add(presetLabel);presetRow.add(this.viewPresetSelect);presetRow.add(this.saveViewPresetButton);presetRow.add(this.deleteViewPresetButton);presetRow.addStretch();this.refreshViewPresets();
   // Align labelled filters in two compact columns. Search has its own row
   // above the filters, while sorting remains a separate operation.
   // Measure the actual font and right-align text so even short labels end
   // immediately before their controls, without a large blank label cell.
   this.filterLabels=[];
   const filterRow=(caption,control,width)=>{let row=new HorizontalSizer;row.spacing=6;let label=new Label(this.filterGroup);label.text=caption;label.textAlignment=TextAlignment.Right|TextAlignment.VertCenter;label.setFixedWidth(width);row.add(label);row.add(control,100);this.filterLabels.push({label,control});return row;};
   let leftLabelWidth=Math.max(...['Month:','Constellation:','Target band:'].map(t=>this.font.width(t))),rightLabelWidth=Math.max(...['Imaging status:','Object type:'].map(t=>this.font.width(t)));
   let filterLeft=new VerticalSizer;filterLeft.spacing=6;filterLeft.add(filterRow('Month:',this.monthFilter,leftLabelWidth));filterLeft.add(filterRow('Constellation:',this.constellationFilter,leftLabelWidth));filterLeft.add(filterRow('Target band:',this.bandFilter,leftLabelWidth));
   let filterRight=new VerticalSizer;filterRight.spacing=6;filterRight.add(filterRow('Imaging status:',this.statusFilter,rightLabelWidth));filterRight.add(filterRow('Object type:',this.typeFilter,rightLabelWidth));let resetRow=new HorizontalSizer;resetRow.spacing=8;resetRow.add(this.selectedOnlyFilter);resetRow.addStretch();resetRow.add(this.resetFiltersButton);filterRight.add(resetRow);
   let filterColumns=new HorizontalSizer;filterColumns.spacing=16;filterColumns.add(filterLeft);filterColumns.add(filterRight);this.filterGroup.sizer.add(filterColumns);
   let sortRow=new HorizontalSizer;sortRow.spacing=8;let sortLabel=new Label(this.sortGroup);sortLabel.text='Sort by:';sortRow.add(sortLabel);sortRow.add(this.sortSelect,100);
   let secondaryRow=new HorizontalSizer;secondaryRow.spacing=8;let secondaryLabel=new Label(this.sortGroup);secondaryLabel.text='Then by:';secondaryRow.add(secondaryLabel);secondaryRow.add(this.secondarySortSelect,100);
   let tertiaryRow=new HorizontalSizer;tertiaryRow.spacing=8;let tertiaryLabel=new Label(this.sortGroup);tertiaryLabel.text='Finally by:';tertiaryRow.add(tertiaryLabel);tertiaryRow.add(this.tertiarySortSelect,100);
   for(let label of [sortLabel,secondaryLabel,tertiaryLabel])label.setFixedWidth(this.font.width('Finally by:'));
   this.sortGroup.sizer.add(sortRow);this.sortGroup.sizer.add(secondaryRow);this.sortGroup.sizer.add(tertiaryRow);this.sortGroup.sizer.addStretch();
   // Keep the control groups at their useful content widths. A trailing
   // spacer receives extra window width instead of stretching the filters.
   // One section owns search, filters and sorting. Keep the two groups
   // compact and distinct while hiding all view controls with one toggle.
   this.filterColumn.sizer=new VerticalSizer;this.filterColumn.sizer.spacing=8;this.filterColumn.sizer.add(presetRow);this.filterColumn.sizer.add(searchRow);this.filterColumn.sizer.add(this.filterGroup);this.filterColumn.sizer.addStretch();
   this.filterSection.sizer=new HorizontalSizer;this.filterSection.sizer.spacing=8;this.filterSection.sizer.add(this.filterColumn);this.filterSection.sizer.add(this.sortGroup);this.filterSection.sizer.addStretch();
   // Use the native item view strictly as a flat table. Each object is a leaf
   // row; no constellation parents or expand/collapse controls are created.
   this.tree=new TreeBox(this.tablePage);this.tree.numberOfColumns=12;this.tree.headerVisible=true;this.tree.alternateRowColor=true;this.tree.rootDecoration=false;this.tree.multipleSelection=true;
   for(let [i,t]of ['Select / object','Constellation','Name','Object type','Target band','Apparent size','Filters','Comments','Month','RA (J2000)','Dec (J2000)','Imaging status'].entries())this.tree.setHeaderText(i,t);
   this.tree.toolTip='Double-click a row to open its Finder chart.';
   // Leave room for the third sort row and the optional no-results notice
   // at the normal dialog height; the table expands into all spare space.
   this.tree.setMinHeight(210);this.nodes=[];
   this.details=new TextBox(this.tablePage);this.details.readOnly=true;this.details.font=this.font;this.details.setMinHeight(105);
   this.detailsBar=new SectionBar(this.tablePage,'Object information and imaging notes');this.detailsBar.setSection(this.details);
   this.searchNotice=new Label(this.tablePage);this.searchNotice.wordWrapping=true;this.searchNotice.visible=false;
   this.addObject=(query='',seed=null)=>{
      let d=new ABLObjectDialog(this,null,query,seed);
      if(seed&&!query){d.idEdit.toolTip='This chart catalog supplies coordinates and magnitude, but no source identifier. Enter a known catalog identifier or your own unique label before applying.';d.idEdit.hasFocus=true;}
      if(this.executeDialog(d)){
         if(d.existingObjectId){this.openExistingObject(d.existingObjectId);return;}
         let o=ABL.addObject(this.doc,d.destinationListId,d.editedObject);this.listId=d.destinationListId;this.changed();
         // Reveal the accepted entry without losing export checks. A chart
         // selection uses the same validation and explicit list choice as Add.
         if(query)this.clearFilters();this.refreshLists(ABL.meta(o).objectId);
      }
   };
   this.addButton=ablButton(this.tablePage,'Add object…',()=>this.safe(()=>this.addObject(this.nodes.length===0?this.searchEdit.text.trim():'')));
   this.editButton=ablButton(this.tablePage,'Edit object…',()=>this.safe(()=>this.editSelected()));
   this.deleteObjectButton=ablButton(this.tablePage,'Delete object…',()=>this.safe(()=>{
      let r=this.selected();if(!r)return;
      if(!this.confirmObjectDeletion('Delete '+r.designation+' from the collection?\n\nThis removes the object from every list, together with its catalog information, comments and imaging information.\n\nUse Remove from list to remove only a grouping membership.'))return;
      if(ABL.deleteObject(this.doc,r.id)){this.exportIds.delete(r.id);this.clearedSelectionId='';this.changed();this.refreshTree();}
   }),'Delete the current object from the collection and all its lists, after confirmation. Use Remove from list to keep the object.');
   this.removeButton=ablButton(this.tablePage,'Remove from list',()=>this.safe(()=>{let r=this.selected();if(!r||!this.listId)return;
      if(!this.confirm('Remove '+r.designation+' from this list? The object stays in the collection and remains available in All objects.'))return;
      if(ABL.removeFromList(this.doc,this.listId,r.id)){this.changed();this.refreshTree();}
   }),'Remove only the current list membership. The object and its information remain in the collection.');
   this.catalogButton=ablButton(this.tablePage,'Update catalogs…',()=>this.safe(()=>this.chooseCatalogUpdate()),'Refresh coordinates, object type and available angular dimensions from SIMBAD. Personal notes, imaging status, filters and manual sizes are retained.');
   this.addToListButton=ablButton(this.tablePage,'Add selected to list…',()=>this.safe(()=>this.transferSelected('add')),'Add checked objects to an existing or new list. With no checks, use highlighted rows. Hidden checked objects are included; existing memberships are kept.');
   this.moveToListButton=ablButton(this.tablePage,'Move selected to list…',()=>this.safe(()=>this.transferSelected('move')),'Move checked objects, or highlighted rows when none are checked. Choose the source and destination in the dialog; other list memberships are kept.');
   this.checkSelectedButton=ablButton(this.tablePage,'Check selected',()=>this.checkForExport(true,true),'Check all highlighted rows for list actions or export. Use Ctrl-click for individual rows or Shift-click for a range. Existing checks are retained.');
   this.checkShownButton=ablButton(this.tablePage,'Check shown',()=>this.checkForExport(true),'Check all currently displayed objects for list actions or export, retaining any already checked objects hidden by filters.');
   this.uncheckButton=ablButton(this.tablePage,'Uncheck all',()=>this.checkForExport(false),'Clear all object checkboxes, including objects hidden by filters. Highlighted rows remain selected.');
   this.exportSelectedButton=ablButton(this.tablePage,'Export selected…',()=>this.safe(()=>this.exportSelected()),'Export checked objects directly to a Stellarium file. With no checks, export highlighted rows. Includes hidden checked objects, once each.');
   let objects=new HorizontalSizer;objects.spacing=6;for(let b of [this.addButton,this.editButton,this.deleteObjectButton,this.removeButton,this.catalogButton,this.exportSelectedButton])objects.add(b);objects.addStretch();
   let selectedObjects=new HorizontalSizer;selectedObjects.spacing=6;for(let b of [this.addToListButton,this.moveToListButton,this.checkSelectedButton,this.checkShownButton,this.uncheckButton])selectedObjects.add(b);selectedObjects.addStretch();
   this.summary=new Label(this);this.summary.wordWrapping=true;
   this.instanceButton=ablTool(this,':/process-interface/new-instance.png','Drag to save this collection path as a process icon. Save the collection first; unsaved edits are not stored in the icon.',()=>{});
   this.instanceButton.onMousePress=()=>this.safe(()=>{ablStoreInstance(this.path);this.newInstance();});
   this.helpButton=ablTool(this,':/process-interface/browse-documentation.png','Open the PiDoc user guide.',()=>ablShowDocumentation());
   this.validateConfiguration=value=>{
      if(value.planning!==undefined)ablValidatePlanningPreferences(value.planning);
      if(value.observingSites!==undefined)ablValidateObservingSites(value.observingSites);
      if(typeof value.rememberCollection!=='boolean')throw Error('Choose whether to remember the last opened or saved collection.');
      for(let [key,min]of [['sky',.1],['dss',5]])if(!value[key]||!Number.isFinite(value[key].coverage)||value[key].coverage<min||value[key].coverage>120)throw Error('Choose sky coverage from 0.1–120° and survey field from 5–120 arcminutes.');
      if(!['modern-editorial','vintage-atlas','observing-atlas'].includes(value.sky.style)||!['sparse','normal','detailed'].includes(value.sky.labelDensity))throw Error('Choose a chart style and label density.');
      if(!Number.isFinite(value.sky.insetDegrees)||value.sky.insetDegrees<.1||value.sky.insetDegrees>120)throw Error('Choose close-up coverage from 0.1–120°.');
      let appearance=ABL.chartAppearance(value.sky);
      for(let key of Object.keys(appearance))if(value.sky[key]!==undefined&&appearance[key]!==value.sky[key])throw Error('Choose valid projection, Milky Way and star appearance settings.');
      let state=ablContourFileState(value.contourPath);if(value.contourPath!==this.contourPath&&value.contourPath&&state.status!=='loaded')throw Error(state.error);
      if(value.outlineLevel!==undefined&&![0,1,2,3].includes(value.outlineLevel))throw Error('Choose a nebula outline brightness level.');
      return state;
   };
   this.currentConfiguration=()=>Object.assign(ABL.copy(this.previewPreferences),{
      observingSites:ABL.copy(this.observingSites),planning:ABL.copy(this.planningPreferences),details:ABL.copy(this.finderPage.details),contourPath:this.contourPath,outlineLevel:this.outlineLevel,
      rememberCollection:this.rememberCollection,constellationMonths:ABL.copy(ABL.config(this.doc).constellationMonths)});
   this.applyConfiguration=value=>{
      let state=this.validateConfiguration(value),p=this.finderPage,q=this.dssPage,sites=ablValidateObservingSites(value.observingSites||this.observingSites);
      if(value.planning!==undefined)sites.sites[sites.active]=ablValidatePlanningPreferences(value.planning);
      sites=ablValidateObservingSites(sites);let planning=sites.sites[sites.active],sitesText=JSON.stringify(sites);
      let sitesChanged=sitesText!==JSON.stringify(ablValidateObservingSites(this.observingSites));
      // Store preferred widths rather than the current target's fitted field.
      // Normalize property order so an unchanged Apply retains the preview.
      let next=ablLoadPreviewPreferences(JSON.stringify({sky:value.sky,dss:value.dss,details:value.details||p.details,planningUsableOnly:value.planningUsableOnly??this.previewPreferences.planningUsableOnly,minimumUsableMinutes:value.minimumUsableMinutes??this.previewPreferences.minimumUsableMinutes}));
      let sky=p.effectiveSettings(next.sky),dss=q.effectiveSettings(next.dss),details=ABL.copy(next.details);
      for(let entry of p.catalogEntries)details.catalogs[entry.key].enabled=entry.available&&details.catalogs[entry.key].enabled;
      details.contours=details.contours&&ablContoursAvailable(state);
      let level=value.outlineLevel===undefined?this.outlineLevel:value.outlineLevel,pathChanged=this.contourPath!==value.contourPath;
      let finderChanged=JSON.stringify(p.settings)!==JSON.stringify(sky)||JSON.stringify(p.details)!==JSON.stringify(details)||pathChanged||level!==this.outlineLevel;
      let dssChanged=JSON.stringify(q.settings)!==JSON.stringify(dss),presets=value.chartPresets===undefined?this.chartPresets:value.chartPresets;
      let presetText=JSON.stringify({version:1,presets}),previousPresets=JSON.stringify({version:1,presets:this.chartPresets});
      if(presetText.length>1048576||!Array.isArray(presets)||presets.length>50)throw Error('Chart presets exceed the supported settings size.');
      let writes=[];const change=(write,before,after)=>{if(before!==after)writes.push({write,before,after});};
      if(this.persistPreferences){
         // Warnings are not profile edits. Finder shortcuts and an unchanged
         // Apply must leave invalid stored profiles available for recovery.
         if(sitesChanged)change(text=>this.planningPreferenceStore.write(text),this.observingSitesText,sitesText);
         change(text=>this.previewPreferenceStore.write(text),JSON.stringify(this.previewPreferences),JSON.stringify(next));
         change(text=>this.chartPresetStore.write(text),previousPresets,presetText);
         change(path=>Settings.write('AstroBucketList/contourPath',DataType.String,path),this.contourPath,value.contourPath);
         change(n=>Settings.write('AstroBucketList/outlineLevel',DataType.Int32,n),this.outlineLevel,level);
         if(value.rememberCollection!==this.rememberCollection){
            change(path=>this.collectionPreferenceStore.writePath(path),this.collectionPreferenceStore.readPath(),value.rememberCollection?this.path:'');
            change(flag=>this.collectionPreferenceStore.writeRemember(flag),this.rememberCollection,value.rememberCollection);
         }
      }
      let attempted=[];
      try{for(let entry of writes){attempted.push(entry);entry.write(entry.after);}}
      catch(e){let failures=[];for(let entry of attempted.reverse())try{entry.write(entry.before);}catch(restore){failures.push(String(restore));}
         throw Error('Could not save Configuration: '+e+(failures.length?' Some previous preferences could not be restored: '+failures.join('; '):' Previous preferences were restored.')+' The current chart and collection are unchanged.');}
      if(sitesChanged){this.observingSites=ABL.copy(sites);if(this.persistPreferences)this.observingSitesText=sitesText;}
      this.planningPreferences=ABL.copy(planning);this.previewPreferences=next;this.chartPresets=ABL.copy(presets);this.rememberCollection=value.rememberCollection;
      this.contourPath=value.contourPath;this.contourState=state;this.outlineLevel=level;this.chartStyle=next.sky.style;
      p.settings=sky;p.details=details;q.settings=dss;
      if(value.activeChartPreset!==undefined)p.activeChartPreset=value.activeChartPreset;
      if(finderChanged)p.optionsChanged();if(dssChanged)q.optionsChanged();
      if(JSON.stringify(ABL.config(this.doc).constellationMonths)!==JSON.stringify(value.constellationMonths)){
         ABL.config(this.doc).constellationMonths=ABL.copy(value.constellationMonths);this.changed();this.refreshTree();
      }
      p.syncChartPreset();this.updateFinderActions();this.planningPage.refreshInput();
   };
   this.openConfiguration=tab=>{
      this.finderPage.updateFields();this.dssPage.updateFields();let d=new ABLConfigurationDialog(this);if(tab!==undefined)d.tabs.currentPageIndex=tab;
      if(this.executeDialog(d))this.applyConfiguration(d.values());
   };
   this.configurationButton=ablTool(this,':/icons/gear.png','Configuration: Finder settings and presets; DSS settings; observing site and limits; startup preference and constellation months.',()=>this.safe(()=>this.openConfiguration()));
   this.activePreview=()=>this.tabs.currentPageIndex===1?this.finderPage:this.tabs.currentPageIndex===2?this.dssPage:null;
   this.updateImageAction=()=>{let p=this.activePreview();this.openImageButton.enabled=!!p&&!!p.bitmap&&!!p.loadedPath&&!p.disposed;this.openImageButton.toolTip='Open as image: '+(p?(p.sky?'Finder chart':'DSS survey image')+' in a native PixInsight image window.':'select the Finder chart or DSS survey image tab first.');if(this.exportChartButton)this.exportChartButton.enabled=!!p&&p.sky&&!!p.vectorChart&&p.previewState==='ready'&&!p.rendering&&!p.disposed;};
   this.openImageButton=ablTool(this,':/icons/window-export.png','Open as image: select a preview tab.',()=>this.safe(()=>{
      let p=this.activePreview();if(!p||!p.bitmap||!p.loadedPath||p.disposed)return;
      // Opening an image reads the temporary file again. Re-enter the DSS
      // cache verification path even when the displayed bitmap is still valid.
      if(!p.sky){p.renderPreview();if(p.previewState!=='ready')return;}
      let windows=ImageWindow.open(p.loadedPath);if(!windows.length)throw Error('Could not open the preview image.');for(let w of windows)w.show();
   }));this.openImageButton.enabled=false;
   this.chooseChartExportPath=()=>{let d=new SaveFileDialog;d.caption='Export Finder chart';d.filters=[['Scalable Vector Graphics','*.svg'],['PDF document','*.pdf']];d.defaultExtension='svg';d.overwritePrompt=true;let title=this.finderPage.vectorChart?this.finderPage.vectorChart.title:'Finder chart';d.initialPath=title.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_')+'.svg';return this.executeDialog(d)?d.filePath:'';};
   this.exportChart=()=>{
      let p=this.activePreview();if(!p||!p.sky||!p.vectorChart||p.previewState!=='ready'||p.rendering||p.disposed)return false;
      let path=this.chooseChartExportPath();if(!path)return false;
      ablBusy(this,'Exporting Finder chart…',()=>ablExportChart(p.vectorChart,path),false);p.exportPath=path;p.updateInfo();return true;
   };
   this.exportChartButton=ablTool(this,':/icons/document-save.png','Export Finder chart as SVG or PDF. Saves the complete displayed chart, including its close-up or object key, independently of preview zoom. Vector text and symbols remain sharp when enlarged. Available only for a loaded Finder chart.',()=>this.safe(()=>this.exportChart()));this.exportChartButton.enabled=false;
   this.updateFinderActions=()=>{
      let p=this.finderPage,active=this.tabs.currentPageIndex===1&&!!p&&!p.disposed;
      this.allDetailsButton.enabled=active;
      this.allDetailsButton.checked=!!p&&p.allDetailsEnabled();
      this.allDetailsButton.toolTip='All details: '+(this.allDetailsButton.checked?'turn off all available annotations and catalogs.':'turn on all available annotations and catalogs.')+' Milky Way shading is included; star appearance, catalog labels and magnitude settings are retained. Available only on Finder chart.';
   };
   this.allDetailsButton=ablTool(this,':/icons/select-all.png','All details',()=>{});this.allDetailsButton.checkable=true;this.allDetailsButton.enabled=false;
   this.allDetailsButton.onClick=checked=>this.safe(()=>{if(this.tabs.currentPageIndex!==1||this.finderPage.disposed)return;
      try{this.finderPage.setAllDetails(!!checked);}finally{this.updateFinderActions();}});
   this.closeButton=ablTool(this,':/process-interface/cancel.png','Close the list manager; offer to save any changes.',()=>{if(this.canClose())this.ok();});
   // One section toggle hides both groups. Keep their distinct titles and
   // compact widths so file actions and list membership remain easy to find.
   this.collectionSection=new Control(this);
   this.collectionBar=new SectionBar(this,'Collection and lists');this.collectionBar.setSection(this.collectionSection);
   this.collectionGroup=ablGroup(this.collectionSection,'Collection');this.collectionGroup.sizer.add(this.fileLabel);this.collectionGroup.sizer.add(files);
   this.listsGroup=ablGroup(this.collectionSection,'Lists');this.listsGroup.sizer.add(lists);this.listsGroup.sizer.add(listActions);this.listsGroup.sizer.addStretch();
   this.collectionSection.sizer=new HorizontalSizer;this.collectionSection.sizer.spacing=8;this.collectionSection.sizer.add(this.collectionGroup);this.collectionSection.sizer.add(this.listsGroup);this.collectionSection.sizer.addStretch();
   this.objectsGroup=ablGroup(this.tablePage,'Objects');this.objectsGroup.sizer.add(this.tree,100);this.objectsGroup.sizer.add(this.searchNotice);this.objectsGroup.sizer.add(objects);this.objectsGroup.sizer.add(selectedObjects);
   let footer=new HorizontalSizer;footer.spacing=8;footer.add(this.instanceButton);footer.add(this.summary,100);footer.add(this.allDetailsButton);footer.add(this.exportChartButton);footer.add(this.openImageButton);footer.add(this.configurationButton);footer.add(this.closeButton);footer.add(this.helpButton);
   this.tablePage.sizer=new VerticalSizer;this.tablePage.sizer.margin=8;this.tablePage.sizer.spacing=8;this.tablePage.sizer.add(this.filterBar);this.tablePage.sizer.add(this.filterSection);this.tablePage.sizer.add(this.objectsGroup,100);this.tablePage.sizer.add(this.detailsBar);this.tablePage.sizer.add(this.details);
   this.finderPage=new ABLChartPage(this.tabs,this,true);this.dssPage=new ABLChartPage(this.tabs,this,false);
   this.planningPage=new ABLPlanningPage(this.tabs,this);
   this.tabs.addPage(this.tablePage,'Table');this.tabs.addPage(this.finderPage,'Finder chart');this.tabs.addPage(this.dssPage,'DSS survey image');this.tabs.addPage(this.planningPage,'Observing night');this.tabs.currentPageIndex=0;
   this.sizer=new VerticalSizer;this.sizer.margin=10;this.sizer.spacing=8;this.sizer.add(this.titleLabel);this.sizer.add(this.collectionBar);this.sizer.add(this.collectionSection);this.sizer.add(this.tabs,100);this.sizer.add(footer);
   this.safe=f=>{try{return f();}catch(e){this.error(e);return false;}};
   // A checkbox's native item must outlive Qt's mouse/keyboard event handler.
   // Only remove rows after that handler returns to the event loop.
   this.stateRefreshTimer=new Timer(.01,false);
   this.stateRefreshTimer.onTimeout=()=>this.safe(()=>this.refreshTree());
   // Native Qt selection changes precede mouse callbacks. Retain the last
   // settled selection until the press captures it, then decide on release.
   // No tree nodes are destroyed from mouse or checkbox callbacks.
   this.rowSelectionState={id:'',highlights:[]};this.rowClick=null;this.clearedSelectionId='';
   this.selectionUpdateTimer=new Timer(.01,false,this);
   this.selectionUpdateTimer.onTimeout=()=>{if(!this.building){this.updateSelection();this.updateSummary();}};
   this.clearObjectSelection=id=>{
      this.selectionUpdateTimer.stop();this.rowClick=null;this.clearedSelectionId=id;
      // PJSR does not accept null for currentNode. Keep its keyboard anchor,
      // but explicitly suppress that row as the active object until selected.
      this.building=true;try{for(let n of this.nodes)n.selected=false;}finally{this.building=false;}
      this.updateSelection();this.updateSummary();
   };
   this.confirm=s=>this.executeDialog(new MessageBox(ABL.html(s),ABL_TITLE,StdIcon.Question,StdButton.Yes,StdButton.No))===StdButton.Yes;
   // No is the first/default answer for collection-wide deletion.
   this.confirmObjectDeletion=s=>this.executeDialog(new MessageBox(ABL.html(s),ABL_TITLE,StdIcon.Question,StdButton.No,StdButton.Yes))===StdButton.Yes;
   this.selected=()=>{let n=this.tree.currentNode;return n&&n.record&&n.record.id!==this.clearedSelectionId?ABL.record(n.record.object,this.doc):null;};
   // Batch actions prefer checked objects across the whole collection. With
   // no checks, use highlighted rows. Edit/Delete and single-target previews
   // instead use selected(), which resolves the current active row.
   this.actionSelectionIds=()=>this.exportIds.size?Array.from(this.exportIds):this.tree.selectedNodes.filter(n=>n.record).map(n=>n.record.id);
   this.transferSelected=mode=>{
      let ids=this.actionSelectionIds();if(!ids.length)return;
      let dialog=new ABLListTransferDialog(this,mode,ids);if(!this.executeDialog(dialog))return;
      let result=dialog.transferResult;if(result.changed){this.doc=result.doc;this.changed();}
      // Review the destination with filters, sorting and export checks intact.
      this.listId=result.destinationId;this.refreshLists(ids[0]);
   };
   this.objectRevision=0;
   this.changed=()=>{++this.objectRevision;this.dirty=ablCollectionSignature(this.doc)!==this.savedSignature;this.updateHeader();};
   this.updateHeader=()=>{this.windowTitle=ABL_TITLE+' '+ABL_VERSION+(this.dirty?' *':'');this.fileLabel.text=(this.path||'Unsaved collection')+(this.dirty?' — modified':'');this.fileLabel.toolTip=this.path;this.listSelect.toolTip=this.listSelect.itemText(this.listSelect.currentItem);this.saveButton.enabled=this.dirty||!this.path;this.instanceButton.enabled=!!this.path;if(this.updateMinimumSize)this.updateMinimumSize();};
   this.refreshLists=(selectId='')=>{let ids=Object.keys(this.doc.observingLists);if(this.listId&&!ABL.own(this.doc.observingLists,this.listId))this.listId='';
      this.listIds=[''].concat(ids);this.listSelect.clear();this.listSelect.addItem('All objects');for(let id of ids)this.listSelect.addItem(this.doc.observingLists[id].name);
      this.listSelect.currentItem=Math.max(0,this.listIds.indexOf(this.listId||''));this.refreshTree(selectId);};
   this.filterOptions=()=>({search:this.searchEdit.text,month:this.monthFilter.values[this.monthFilter.currentItem],status:['all','not-imaged','imaged'][this.statusFilter.currentItem],constellation:this.constellationFilter.values[this.constellationFilter.currentItem],objectType:this.typeFilter.values[this.typeFilter.currentItem],band:this.bandFilter.values[this.bandFilter.currentItem],selectedIds:this.selectedOnlyFilter.checked?this.exportIds:null});
   // Apply dependencies in one direction: Month -> Constellation -> Object
   // type. Rebuild types with all other filters, but exclude their own current
   // value so users can still switch between the available alternatives.
   // Preserve valid choices by value, not by their changing menu indexes.
   this.refreshFilterChoices=(all,date=new Date())=>{
      const populate=(control,records,field,label)=>{
         let selected=control.values[control.currentItem],choices=new Map;
         for(let r of records)choices.set(r[field],field==='key'?r.constellation:r.objectType);
         let entries=Array.from(choices).sort((a,b)=>a[1].localeCompare(b[1]));
         control.clear();control.addItem(label);control.values=[null];
         for(let [value,title] of entries){control.addItem(title);control.values.push(value);}
         control.currentItem=Math.max(0,control.values.indexOf(selected));
      };
      populate(this.constellationFilter,ABL.filter(all,{month:this.monthFilter.values[this.monthFilter.currentItem]},date),'key','All constellations');
      // Read the constellation only after an obsolete selection has reset.
      populate(this.typeFilter,ABL.filter(all,Object.assign(this.filterOptions(),{objectType:null}),date),'objectType','All object types');
   };
   // Rebuild rows after data, selection-navigation or view changes. Never call
   // this from a checkbox callback: Qt still owns the native item during that
   // event, so check/uncheck handlers update existing rows in place.
   this.refreshTree=(selectId='')=>{
      if(this.building)return;
      this.stateRefreshTimer.stop();
      this.selectionUpdateTimer.stop();this.rowClick=null;
      if(selectId)this.clearedSelectionId='';
      this.clearSearchButton.enabled=!!this.searchEdit.text;
      this.building=true;
      try{
         let existingIds=new Set(ABL.refs(this.doc).map(r=>ABL.meta(r.object).objectId));for(let id of this.exportIds)if(!existingIds.has(id))this.exportIds.delete(id);
         // Highlights and export checks are independent. Preserve every
         // highlighted object that remains visible after sorting/filtering.
         let highlightIds=new Set(this.tree.selectedNodes.filter(n=>n.record).map(n=>n.record.id));if(selectId)highlightIds.add(selectId);
         let previous=this.selected();if(!selectId&&previous)selectId=previous.id;
         // Resolve the relative choice on every refresh, not once at startup.
         // The tooltip names the same local calendar months used by the filter.
         let all=ABL.records(this.doc,this.listId),date=new Date();this.refreshFilterChoices(all,date);
         this.monthFilter.toolTip='Filter by the configured constellation planning month. Previous / current / next includes '+ABL.adjacentMonths(date).map(m=>ABL.MONTHS[m]).join(', ')+'. Based on your computer\'s local date; unassigned months are excluded.';
         let filtered=ABL.filter(all,this.filterOptions(),date);
         // Skip None while retaining priority. The model applies its name
         // fallback only after all selected criteria, including the third.
         let modes=[this.sortModes[this.sortSelect.currentItem]];
         for(let control of [this.secondarySortSelect,this.tertiarySortSelect])if(control.currentItem>0)modes.push(this.sortModes[control.currentItem-1]);
         let visible=ABL.sortedRecords(filtered,modes);
         this.tree.clear();this.nodes=[];let selected=null;
         for(let r of visible){
            let n=new TreeBoxNode(this.tree);n.record=r;n.checkable=true;n.checked=this.exportIds.has(r.id);n.setText(0,r.designation.replace(/\s+marker$/i,''));n.setText(1,r.constellation);n.setText(2,r.name);n.setText(3,r.objectType);n.setText(4,r.bandLabel);n.setText(5,r.sizeText);n.setText(6,r.filters);
            // Compact the preview only; preserve the original multiline notes
            // for editing, searching, details, tooltips and SOL persistence.
            n.setText(7,r.comments.replace(/\s+/g,' ').trim());n.setText(8,r.monthName);n.setText(9,r.ra===null?'Needs lookup':ABL.formatRA(r.ra));n.setText(10,r.dec===null?'Needs lookup':ABL.formatDec(r.dec));n.setText(11,r.imaged?'Imaged'+(r.imagedOn?' · '+r.imagedOn:''):'Not yet imaged');
            n.setToolTip(0,ABL.html(r.designation));n.setToolTip(1,ABL.html(r.constellation+(r.code?' ('+r.code+')':'')));n.setToolTip(2,ABL.html(r.catalogSummary));n.setToolTip(3,ABL.html(r.objectType));n.setToolTip(4,ABL.html((r.bandMode==='manual'?'Manual':'Automatic')+' — '+r.bandReason));n.setToolTip(5,ABL.html(r.size?r.sizeText+' (arcminutes) · '+(r.size.source||'imported measurement'):'No measured size available. Use Update catalogs or Edit object.'));n.setToolTip(6,ABL.html((r.filtersFromNotes?'Filter mentions from comments: ':'')+r.filters));n.setToolTip(7,r.comments?'<p>'+ABL.html(r.comments).replace(/\r?\n/g,'<br/>')+'</p>':'');this.nodes.push(n);if(r.id===selectId)selected=n;
         }
         for(let i=0;i<12;++i)this.tree.adjustColumnWidthToContents(i);
         for(let [column,width] of [[0,180],[1,140],[2,180],[3,150],[4,120],[5,130],[6,90],[7,200]])this.tree.setColumnWidth(column,this.logicalPixelsToPhysical(width));
         // A sole visible result is unambiguous: make it the current object
         // for details and both previews, without adding export or row checks.
         if(!selected&&this.nodes.length===1&&this.nodes[0].record.id!==this.clearedSelectionId)selected=this.nodes[0];
         if(selected)this.tree.currentNode=selected;
         for(let n of this.nodes)n.selected=highlightIds.has(n.record.id);
         this.updateSummary(all);
         this.renameListButton.enabled=this.deleteListButton.enabled=!!this.listId;
         let noMatch=!!this.searchEdit.text.trim()&&!this.nodes.length;
         this.addButton.enabled=true;this.addButton.text=noMatch?'Add searched object…':'Add object…';
         this.addButton.toolTip=noMatch?'Create an entry using the search text as its catalog identifier. Choose Look up or enter coordinates, then Apply.':'Add an object to the collection, with an optional list membership.';
         let noCheckedMatch=this.selectedOnlyFilter.checked&&!this.nodes.length;
         this.searchNotice.text=noCheckedMatch?'No checked objects match this view. Turn off Selected only to choose more objects, or Reset filters to widen the search.':'No matches in this view. Use Add searched object to create an entry, or Reset filters to widen the search.';
         this.searchNotice.visible=noMatch||noCheckedMatch;
      }finally{this.building=false;this.updateSelection();this.updateHeader();this.syncViewPreset();}
   };
   this.updateSummary=(all=ABL.records(this.doc,this.listId))=>{let highlighted=this.tree.selectedNodes.length;this.summary.text=this.nodes.length+' shown / '+all.length+' objects · '+all.filter(r=>r.imaged).length+' imaged · '+highlighted+' selected · '+this.exportIds.size+' checked';this.uncheckButton.enabled=this.exportIds.size>0;this.checkSelectedButton.enabled=highlighted>0;this.addToListButton.enabled=this.moveToListButton.enabled=this.exportSelectedButton.enabled=this.actionSelectionIds().length>0;this.checkShownButton.enabled=this.nodes.length>0;this.resetFiltersButton.enabled=!!this.searchEdit.text||this.monthFilter.currentItem!==0||this.statusFilter.currentItem!==0||this.constellationFilter.currentItem!==0||this.typeFilter.currentItem!==0||this.bandFilter.currentItem!==0||this.selectedOnlyFilter.checked;};
   this.updateSelection=()=>{let r=this.selected();this.editButton.enabled=this.deleteObjectButton.enabled=!!r;this.catalogButton.enabled=(this.listId?this.doc.observingLists[this.listId].objects:ABL.refs(this.doc)).length>0;this.removeButton.enabled=!!r&&!!this.listId;
      this.rowSelectionState={id:r?r.id:'',highlights:this.tree.selectedNodes.filter(n=>n.record).map(n=>n.record.id)};if(r)this.clearedSelectionId='';
      let p=this.finderPage,code=this.constellationFilter.values[this.constellationFilter.currentItem];p.scopeSelect.enabled=!!code;
      if(!code)p.scopeSelect.currentItem=0;
      let group=code&&p.scopeSelect.currentItem===1?{title:this.constellationFilter.itemText(this.constellationFilter.currentItem),targets:ablTableChartTargets(this.nodes.map(n=>n.record))}:null;
      p.setObject(r?r.object:null,group);this.dssPage.setObject(r?r.object:null);this.planningPage.setRecords(this.nodes.map(n=>n.record),r?r.id:'');
      this.details.text=r?ABL.html([ABL.objectHeading(r.designation,r.name),r.constellation+' · '+r.monthName+' · '+(r.imaged?'Imaged '+r.imagedOn:'Not yet imaged'),'Target band: '+r.bandLabel+' ('+(r.bandMode==='manual'?'Manual':'Automatic')+')','Apparent size: '+r.sizeText,r.catalogSummary,r.notes].filter(Boolean).join('\n')):'Check objects for list actions or export. Use Edit object to record imaging status and date.';
      if(this.updateMinimumSize)this.updateMinimumSize();
   };
   this.setImaged=(id,flag)=>{
      let current=ABL.refs(this.doc).find(r=>ABL.meta(r.object).objectId===id),date=current?ABL.meta(current.object).imagedOn:'';
      ABL.setState(this.doc,id,{imaged:flag,imagedOn:flag?(date||ABL.today()):''});
      this.building=true;
      try{
         for(let n of this.nodes)if(n.record.id===id){let r=n.record=ABL.record(n.record.object,this.doc);
            n.checked=this.exportIds.has(r.id);n.setText(11,r.imaged?'Imaged'+(r.imagedOn?' · '+r.imagedOn:''):'Not yet imaged');}
      }finally{this.building=false;}
      this.changed();this.updateSelection();this.updateSummary();
      if(this.statusFilter.currentItem!==0){this.stateRefreshTimer.stop();this.stateRefreshTimer.start();}
   };
   // Navigate only after the Add and duplicate dialogs have returned, so the
   // active table and modal editor have a consistent current object.
   this.openExistingObject=(id,edit=true)=>{
      if(!ABL.refs(this.doc).some(r=>ABL.meta(r.object).objectId===id))throw Error('The existing object is no longer in this collection.');
      this.tabs.currentPageIndex=0;this.tabs.onPageSelected();this.listId='';this.clearFilters();
      for(let n of this.nodes)n.selected=false;
      this.refreshLists(id);if(edit)this.editSelected();
   };
   this.editSelected=()=>{let r=this.selected();if(r)this.editObject(r.id);};
   this.editObject=id=>{let r=ABL.records(this.doc).find(r=>r.id===id);if(!r)return;let d=new ABLObjectDialog(this,r.object);if(this.executeDialog(d)){
      ABL.replaceObject(this.doc,r.id,d.editedObject,d.editedListIds);
      // Keep the edited target visible if it was removed from the active list.
      if(this.listId&&!d.editedListIds.includes(this.listId))this.listId='';
      this.changed();this.refreshLists(r.id);
   }};
   this.updateCatalogs=(targets,choice=this.lookupSource||0)=>{
      // Each object is committed only after a successful lookup/validation.
      // Console cancellation keeps completed updates, which still require Save.
      let result={updated:0,withoutSize:0,errors:[],cancelled:false};
      try{ablBusy(this,'Updating '+targets.length+' catalog objects…',()=>{
         for(let i=0;i<targets.length;++i){
            CoreApplication.processEvents();if(console.abortRequested){result.cancelled=true;break;}
            let r=targets[i],query=String(r.designation).replace(/\s+marker$/i,'');
            console.writeln('['+(i+1)+'/'+targets.length+'] '+query);
            try{let found=this.io.lookup(this.doc,query,choice===2?1:0,true,choice?'simbad':'auto'),replacement=ABL.refreshCatalog(r.object,found);
               ABL.validateObject(replacement);ABL.replaceObject(this.doc,r.id,replacement);this.changed();++result.updated;
               if(!ABL.catalogSize(replacement))++result.withoutSize;
            }catch(e){if(console.abortRequested||/Cancelled/.test(String(e))){result.cancelled=true;break;}
               result.errors.push(query+': '+String(e));console.warningln(query+': '+String(e));}
         }
      });}finally{this.refreshTree();}
      return result;
   };
   this.chooseCatalogUpdate=()=>{
      let selected=this.selected(),all=ABL.records(this.doc,this.listId),d=new Dialog(this);d.windowTitle='Update catalog information';
      let scope=new ComboBox(d),choices=[];
      if(selected){scope.addItem('Selected object: '+selected.designation);choices.push([selected]);}
      scope.addItem('Objects with no apparent size in '+(this.listId?'this list':'the collection'));choices.push(all.filter(r=>!r.size));
      scope.addItem('All objects in '+(this.listId?'this list':'the collection'));choices.push(all);
      let source=new ComboBox(d);for(let label of ['Local catalogs, then SIMBAD','SIMBAD — Harvard','SIMBAD — Strasbourg'])source.addItem(label);source.currentItem=this.lookupSource||0;
      let info=new Label(d);info.wordWrapping=true;info.text='Search local catalogs first, or select SIMBAD for richer classifications, descriptions and dimensions. Only missing names use SIMBAD in automatic mode. Manual edits and richer existing metadata are retained. Ambiguous local matches are reported for review in Edit object. Stop through the process console; completed updates remain available to save.';
      let start=ablButton(d,'Update',()=>d.ok()),cancel=ablButton(d,'Cancel',()=>d.cancel()),buttons=new HorizontalSizer;buttons.addStretch();buttons.add(start);buttons.add(cancel);
      d.sizer=new VerticalSizer;d.sizer.margin=12;d.sizer.spacing=10;d.sizer.add(info);d.sizer.add(scope);d.sizer.add(ablRow(d,'Lookup source:',source));d.sizer.add(buttons);d.setFixedWidth(600);d.adjustToContents();
      if(!this.executeDialog(d))return;
      let targets=choices[scope.currentItem];if(!targets.length){this.notice('No objects need this update.');return;}
      this.lookupSource=source.currentItem;let result=this.updateCatalogs(targets,this.lookupSource);
      this.notice((result.cancelled?'Stopped. ':'')+result.updated+' objects updated. '+result.withoutSize+' have no catalog size. '+result.errors.length+' failed.'+
         (result.errors.length?'\n\n'+result.errors.slice(0,5).join('\n'):'')+'\n\nSave the collection to retain completed updates.');
   };
   // Selection is transient UI state. Keep the native row alive inside its
   // checkbox callback, and never alter saved imaging information here.
   this.tree.onNodeUpdated=(n,column)=>{if(!this.building&&n.record&&column===0){if(this.rowClick)this.rowClick.checkbox=true;if(n.checked)this.exportIds.add(n.record.id);else this.exportIds.delete(n.record.id);this.updateSummary();if(this.selectedOnlyFilter.checked){this.stateRefreshTimer.stop();this.stateRefreshTimer.start();}}};
   // Batch checks update existing native rows in place, just like a single
   // checkbox click. Selected only may hide unchecked rows, so defer that
   // rebuild until after the native event; imaging flags remain unchanged.
   this.checkForExport=(checked,selectedOnly=false)=>{this.building=true;try{
      if(checked)for(let n of selectedOnly?this.tree.selectedNodes:this.nodes)this.exportIds.add(n.record.id);else this.exportIds.clear();
      for(let n of this.nodes)n.checked=this.exportIds.has(n.record.id);
   }finally{this.building=false;this.updateSummary();if(this.selectedOnlyFilter.checked){this.stateRefreshTimer.stop();this.stateRefreshTimer.start();}}};
   this.tree.onCurrentNodeUpdated=()=>{if(!this.building){this.selectionUpdateTimer.stop();this.selectionUpdateTimer.start();}};
   this.tree.onNodeSelectionUpdated=()=>{if(!this.building){this.updateSummary();this.selectionUpdateTimer.stop();this.selectionUpdateTimer.start();}};
   this.tree.onMousePress=(x,y,button,buttons,modifiers)=>{
      this.selectionUpdateTimer.stop();this.rowClick={button,modifiers,previous:ABL.copy(this.rowSelectionState),checkbox:false};return false;
   };
   this.tree.onMouseRelease=()=>{this.selectionUpdateTimer.stop();this.selectionUpdateTimer.start();return false;};
   this.tree.onNodeClicked=n=>{
      if(this.building||!n?.record)return;let click=this.rowClick;this.rowClick=null;this.selectionUpdateTimer.stop();
      if(click&&click.button===MouseButton.Left&&!click.modifiers&&!click.checkbox&&click.previous.id===n.record.id&&click.previous.highlights.length===1&&click.previous.highlights[0]===n.record.id)
         this.clearObjectSelection(n.record.id);
      else{this.clearedSelectionId='';this.updateSelection();this.updateSummary();}
   };
   this.tree.onKeyRelease=()=>{if(this.tree.currentNode?.selected){this.clearedSelectionId='';this.updateSelection();this.updateSummary();}return false;};
   this.tree.onNodeActivated=n=>{if(n&&n.record){
      this.selectionUpdateTimer.stop();this.rowClick=null;this.clearedSelectionId='';this.tree.currentNode=n;n.selected=true;
      // Double-click explicitly requests this table target, even when it is
      // unchanged and the Finder is currently browsing a different object.
      this.finderPage.navigationInputKey=null;this.finderPage.resetNavigation();
      this.updateSelection();this.updateSummary();this.tabs.currentPageIndex=1;this.tabs.onPageSelected();
   }};
   this.listSelect.onItemSelected=i=>{this.listId=this.listIds[i]||'';this.refreshTree();};
   this.searchEdit.onTextUpdated=()=>this.refreshTree();
   this.selectedOnlyFilter.onCheck=()=>this.refreshTree();
   this.searchEdit.onKeyPress=key=>{if(key!==KeyCode.Return)return false;this.refreshTree();return true;};
   this.monthFilter.onItemSelected=this.statusFilter.onItemSelected=this.constellationFilter.onItemSelected=this.typeFilter.onItemSelected=this.bandFilter.onItemSelected=this.sortSelect.onItemSelected=this.secondarySortSelect.onItemSelected=this.tertiarySortSelect.onItemSelected=()=>this.refreshTree();
   this.chooseSavePath=(name)=>{let d=new SaveFileDialog;d.caption='Save observing lists';d.filters=[['Stellarium observing lists','*.sol'],['Stellarium observing-list collection','*.ol']];d.defaultExtension='sol';d.initialPath=name||'Astro_Bucket_List.sol';d.overwritePrompt=true;return this.executeDialog(d)?d.filePath:'';};
   this.save=(as=false)=>{let choosePath=as||!this.path,target=choosePath?this.chooseSavePath(this.path||'Astro_Bucket_List.sol'):this.path;if(!target)return false;
      // Save As and first saves use the native file dialog's overwrite prompt.
      // Advance the path and clean baseline only after io.write() succeeds;
      // validation or write errors leave pending edits and the current path.
      if(!choosePath&&File.exists(target)&&!this.confirm('Overwrite the existing collection?\n\n'+target+'\n\nIts previous contents will be kept in '+target+'.bak, replacing the previous backup.'))return false;
      let data=ABL.exportDocument(this.doc);this.io.write(target,data);this.path=target;this.savedSignature=ablCollectionSignature(this.doc);this.dirty=false;this.updateHeader();
      this.rememberCurrentCollection();return true;};
   this.canClose=()=>{this.changed();if(!this.dirty)return true;let answer=this.executeDialog(new MessageBox('Save changes to your observing lists?',ABL_TITLE,StdIcon.Question,StdButton.Yes,StdButton.No,StdButton.Cancel));
      if(answer===StdButton.Cancel)return false;if(answer===StdButton.No)return true;return this.safe(()=>this.save());};
   this.openFile=()=>{if(!this.canClose())return;let d=new OpenFileDialog;d.caption='Open observing lists';d.filters=[['Stellarium lists','*.sol','*.ol','*.json']];if(!this.executeDialog(d))return;
      this.openPath(d.filePath);};
   this.openPath=path=>{let next=this.io.read(path);this.doc=ABL.normalizeDocument(next);this.path=path;this.listId='';this.exportIds.clear();this.selectedOnlyFilter.checked=false;ABL.cleanDocumentNotes(this.doc);ABL.consolidateDocumentInformation(this.doc);this.savedSignature=ablCollectionSignature(this.doc);this.dirty=false;this.refreshLists();this.rememberCurrentCollection();};
   this.importPaths=paths=>{let raws=paths.map(p=>this.io.read(p)),merged=ABL.importDocuments(this.doc,raws),selected=this.selected();this.doc=merged.doc;this.exportIds=new Set(Array.from(this.exportIds,id=>merged.idMap[id]||id));this.changed();this.refreshLists(selected?(merged.idMap[selected.id]||selected.id):undefined);return merged;};
   this.importListDocument=(source,options)=>{
      let merged=ABL.importObjectsAsList(this.doc,source,options);
      this.doc=merged.doc;this.exportIds=new Set(Array.from(this.exportIds,id=>merged.idMap[id]||id));this.listId=merged.destinationId;
      this.tabs.currentPageIndex=0;this.tabs.onPageSelected();this.clearFilters();this.changed();this.refreshLists(merged.objectIds[0]);return merged;
   };
   this.chooseImportListPath=()=>{let d=new OpenFileDialog;d.caption='Import objects from a saved list';d.multipleSelections=false;d.filters=[['Stellarium lists','*.sol','*.ol','*.json']];return this.executeDialog(d)?d.filePath:'';};
   this.importListFile=()=>{
      let path=this.chooseImportListPath();if(!path)return;
      let source=this.io.readListImport(path),dialog=new ABLListImportDialog(this,source,path);if(!this.executeDialog(dialog))return;
      let r=this.importListDocument(source,dialog.importOptions);
      this.notice('Imported '+r.importedCount+' objects into “'+r.destinationName+'”.\n'+r.addedObjects+' new objects · '+r.mergedObjects+' existing objects matched · '+r.destinationCount+' objects in the destination list.\nDuplicates share one collection entry. Current values won conflicts; missing information and distinct notes, filters and aliases were merged. Choose Save to persist the result.');
   };
   this.importFiles=()=>{let d=new OpenFileDialog;d.caption='Merge saved lists into the current collection';d.multipleSelections=true;d.filters=[['Stellarium lists','*.sol','*.ol','*.json']];if(!this.executeDialog(d))return;let r=this.importPaths(d.filePaths);this.notice('Merged saved lists into the collection.\n'+r.addedLists+' new lists · '+r.addedObjects+' new objects · '+r.mergedObjects+' matching objects reconciled · '+r.duplicatesRemoved+' duplicate entries skipped.\nCurrent values won conflicts; distinct comments, catalog information, filters and aliases were combined. Choose Save to persist the merged collection.');};
   this.exportToPath=(target,mode,selectionIds=null)=>{
      if(!['selected','checked','list','all'].includes(mode))throw Error('Select an export scope.');
      if(mode==='list'&&!this.listId)throw Error('Select a specific list first.');
      let samePath=this.path&&File.fullPath(target).replace(/\\/g,'/').toLowerCase()===File.fullPath(this.path).replace(/\\/g,'/').toLowerCase();
      if(mode!=='all'&&samePath)throw Error('Use a different filename for a partial export, so your complete collection stays intact.');
      let data=mode==='checked'||mode==='selected'?ABL.exportObjects(this.doc,mode==='checked'?Array.from(this.exportIds):(selectionIds||this.actionSelectionIds())):ABL.exportDocument(this.doc,mode==='list'?[this.listId]:null);
      this.io.write(target,data);if(mode==='all'&&samePath){this.savedSignature=ablCollectionSignature(this.doc);this.dirty=false;this.updateHeader();}return data;
   };
   this.exportSelected=()=>{let ids=this.actionSelectionIds();if(!ids.length)return false;
      let target=this.chooseSavePath('Selected_Objects.sol');if(!target)return false;
      this.exportToPath(target,'selected',ids);return true;
   };
   this.exportFiles=()=>{let d=new Dialog(this);d.windowTitle='Export Stellarium lists';let choice=new ComboBox(d),modes=[];
      if(this.exportIds.size){choice.addItem('Checked objects ('+this.exportIds.size+') — new list');modes.push('checked');}
      choice.addItem('Entire collection');modes.push('all');if(this.listId){choice.addItem('Selected list only');modes.push('list');}
      let ok=ablButton(d,'Export…',()=>d.ok()),cancel=ablButton(d,'Cancel',()=>d.cancel());let buttons=new HorizontalSizer;buttons.spacing=8;buttons.addStretch();buttons.add(ok);buttons.add(cancel);
      d.sizer=new VerticalSizer;d.sizer.margin=12;d.sizer.spacing=8;d.sizer.add(choice);d.sizer.add(buttons);if(!this.executeDialog(d))return;
      let mode=modes[choice.currentItem],target=this.chooseSavePath(mode==='checked'?'Selected_Objects.sol':'Astro_Bucket_List_Export.sol');if(!target)return;
      this.exportToPath(target,mode);
   };
   this.onClose=()=>this.canClose();
   this.cleanup=()=>{this.planningPage.dispose();this.finderPage.disposed=this.dssPage.disposed=true;this.finderPage.redrawTimer.stop();this.dssPage.redrawTimer.stop();this.stateRefreshTimer.stop();this.selectionUpdateTimer.stop();this.rowClick=null;this.finderPage.clearPreview();this.finderPage.resetNavigation();this.dssPage.clearPreview();this.updateFinderActions();for(let path of this.chartFiles)try{if(File.exists(path))TGFileProtection.removeFile(path,"Collection or preview file");}catch(e){}this.chartFiles=[];this.chartCache.clear();};
   let initialLists=Object.keys(this.doc.observingLists);this.listId=initialLists.length===1&&!ABL.refs(this.doc).some(r=>!r.listId)?initialLists[0]:'';
   // Explicit minimums override PJSR's computed ones. Measure without that
   // override, then enforce the complete native layout instead of allowing
   // a small window to place buttons over the table. Refresh after wrapping
   // labels, empty-search notices, tab changes and section toggles as well.
   this.updatingMinimumSize=false;this.togglingSection=false;
   this.updateMinimumSize=()=>{
      if(this.updatingMinimumSize||this.togglingSection)return;
      this.updatingMinimumSize=true;
      try{
         this.setMinSize(0,0);this.ensureLayoutUpdated();
         let gutter=this.logicalPixelsToPhysical(8);
         this.setMinSize(this.smartMinWidth+gutter,this.smartMinHeight+gutter);this.ensureLayoutUpdated();
         // Native wrapped labels and the tree's scrollbar can settle after
         // the smart minimum is measured. Reserve any actual shortfall so
         // both action rows remain below the tree at the new window width.
         if(this.tabs.currentPageIndex===0)for(let pass=0;pass<3;++pass){
            let gap=this.logicalPixelsToPhysical(4),next=this.searchNotice.visible?this.searchNotice:this.addButton;
            let shortfall=Math.max(0,this.tree.position.y+this.tree.height+gap-next.position.y,
               this.addButton.position.y+this.addButton.height+gap-this.addToListButton.position.y,
               this.addToListButton.position.y+this.addToListButton.height+gap-this.objectsGroup.height);
            if(this.searchNotice.visible)shortfall=Math.max(shortfall,this.searchNotice.position.y+this.searchNotice.height+gap-this.addButton.position.y);
            if(shortfall<=0)break;
            this.setMinHeight(this.height+shortfall);this.ensureLayoutUpdated();
         }
         else if(this.tabs.currentPageIndex===1||this.tabs.currentPageIndex===2)for(let pass=0;pass<3;++pass){
            // Wrapped hints can gain a line after the adjacent groups settle.
            // Reserve the actual preview bounds as well as the smart minimum,
            // including when entering this tab from a shorter collapsed table.
            let page=this.tabs.currentPageIndex===1?this.finderPage:this.dssPage;
            let shortfall=Math.max(0,page.chart.position.y+page.chart.height+gutter-page.height,
               page.info.position.y+page.info.height+gutter-page.chart.position.y);
            if(shortfall<=0)break;
            this.setMinHeight(this.height+shortfall);this.ensureLayoutUpdated();
         }
         else if(this.tabs.currentPageIndex===3){
            // Reserve room for the two expandable controls and their shared footer.
            const page=this.planningPage;
            const needed=page.tree.position.y+page.tree.minHeight+page.graph.minHeight+
               page.message.height+2*page.sizer.spacing+page.sizer.margin;
            this.setMinHeight(Math.max(this.minHeight,this.height-page.height+needed));
            this.ensureLayoutUpdated();
         }
      }finally{this.updatingMinimumSize=false;}
   };
   this.onResize=()=>this.updateMinimumSize();
   this.tabs.onPageSelected=()=>{this.updateMinimumSize();for(let page of [this.finderPage,this.dssPage,this.planningPage])page.redrawTimer.stop();let page=this.tabs.currentPageIndex===1?this.finderPage:this.tabs.currentPageIndex===2?this.dssPage:this.tabs.currentPageIndex===3?this.planningPage:null;if(page)page.activate();this.updateImageAction();this.updateFinderActions();};
   this.onHide=()=>{this.finderPage.redrawTimer.stop();this.dssPage.redrawTimer.stop();this.planningPage.redrawTimer.stop();};
   this.onShow=()=>this.tabs.onPageSelected();
   // Preserve the window dimensions for both sections. Recompute minimums
   // after the visibility change so the active tab receives the freed space.
   ablStableSection(this,this.detailsBar,this.details);
   ablStableSection(this,this.collectionBar,this.collectionSection);
   this.refreshLists();this.ensureLayoutUpdated();this.adjustToContents();this.updateMinimumSize();
   this.resize(Math.max(this.minWidth,this.logicalPixelsToPhysical(1560)),Math.max(this.minHeight,this.logicalPixelsToPhysical(820)));
}}

// Process icons store only the collection path. Running an icon reloads the
// saved file; it cannot preserve unsaved edits held in the manager's memory.
function ablStoreInstance(path,parameters=Parameters){
   if(typeof path!=='string'||!path.trim())throw Error('Save the collection before creating a process instance.');
   parameters.clear();parameters.set('collectionPath',path);
}
// An explicit process-instance path takes precedence over the recent file.
// If that path fails, report it rather than opening an unrelated collection.
// A normal first launch has an empty list; no bundled file is ever consulted.
function ablStartupCollection(instancePath=null,lastPath='',io={exists:p=>File.exists(p),read:ablRead,notice:ablNotice}){
   let doc=null,path='';
   if(instancePath!==null){
      if(typeof instancePath!=='string'||!instancePath.trim())throw Error('This process instance has no collection path. Open and save a collection, then create a New Instance.');
      try{doc=io.read(instancePath);path=instancePath;}
      catch(e){throw Error('The collection saved in this process instance could not be opened:\n'+instancePath+'\n'+e.message);}
   }else if(lastPath){
      // A remembered filename can disappear after a move, rename or a sync
      // operation. Explain the empty manager without silently forgetting the
      // path: Open will update it after a replacement is loaded successfully.
      if(!io.exists(lastPath))
         io.notice('The remembered collection file was not found:\n\n'+lastPath+'\n\nAn empty collection will open. Use Open to choose the file at its current location. Remembering remains enabled, and a successful Open or Save will update the remembered path.');
      else try{doc=io.read(lastPath);path=lastPath;}
      catch(e){io.notice('The remembered collection could not be opened:\n\n'+lastPath+'\n\n'+e.message+'\n\nAn empty collection will open. Use Open to choose an accessible collection. The remembered path is kept until Open or Save succeeds.');}
   }
   if(!doc){doc=ABL.newDocument();ABL.addList(doc,'My imaging bucket list');}
   return {doc,path};
}
function ablMain(){
   if(Parameters.isViewTarget)throw Error('Run Astro Bucket List globally to open its collection manager.');
   let instancePath=Parameters.has('collectionPath')?Parameters.getString('collectionPath'):null,last='';
   if(instancePath===null)last=ablRememberedCollectionPath();
   let initial=ablStartupCollection(instancePath,last),dialog=new ABLDialog(initial.doc,initial.path);
   try{dialog.rememberCurrentCollection();dialog.execute();}finally{dialog.cleanup();}
}
#ifndef ABL_LIBRARY
ablMain();
#endif
