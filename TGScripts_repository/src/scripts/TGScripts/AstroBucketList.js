#engine v8
#include "lib/TGFileProtection.js"
#ifndef ABL_LIBRARY
#feature-id AstroBucketList : TG Scripts > Astro Bucket List
#feature-info Maintain astronomical imaging bucket lists by constellation and month; exchange Stellarium SOL files, look up catalog objects, view DSS finder charts, and retain imaging status.
#endif

/* Astro Bucket List 0.35.2 — PixInsight 1.9.6+, PJSR V8.
 * Copyright (c) 2026 Thorsten Glebe. SPDX-License-Identifier: MIT
 * Collection files are written only by explicit Save / Export actions.
 */
// BEGIN ABL_PORTABLE
// Constellation tables and the portable list model live here so the
// portable model has no generated or separate runtime copy. Tests read this
// section directly; native filesystem operations use the shared guard above.
// Astro Bucket List 0.35.2. IAU boundaries: Roman (1987), CDS VI/42, via Astropy.
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

/* Astro Bucket List 0.35.2 — portable data model and astronomy functions.
 * Copyright (c) 2026 Thorsten Glebe. SPDX-License-Identifier: MIT
 * This section has no GUI or filesystem dependencies; shared by PJSR V8 and tests.
 */
var ABL = (function () {
   'use strict';
   const VERSION = '0.35.2', EXT = '_astroBucketList';
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
   function formatRA(n) {
      if(!Number.isFinite(n))return '';
      let t=Math.round(((n%360+360)%360)*240*100)%8640000;
      let h=Math.floor(t/360000),m=Math.floor(t%360000/6000),s=t%6000/100;
      return String(h).padStart(2,'0')+'h'+String(m).padStart(2,'0')+'m'+s.toFixed(2).padStart(5,'0')+'s';
   }
   function formatDec(n) {
      if(!Number.isFinite(n)||Math.abs(n)>90)return '';
      let t=Math.round(Math.abs(n)*36000),d=Math.floor(t/36000),m=Math.floor(t%36000/600),s=t%600/10;
      return (n<0?'-':'+')+String(d).padStart(2,'0')+'d'+String(m).padStart(2,'0')+'m'+s.toFixed(1).padStart(4,'0')+'s';
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
   function identifiers(o) {
      let m=meta(o),ids=[o.designation,m.catalogMainId].concat(Array.isArray(m.aliases)?m.aliases:[]);
      return ids.filter(x=>typeof x==='string'&&x.trim()).map(norm);
   }
   function same(a,b) {
      let am=meta(a),bm=meta(b);
      if(am.objectId&&bm.objectId&&am.objectId===bm.objectId)return true;
      let aa=identifiers(a),bb=identifiers(b);
      const primaryA=norm(a.designation),primaryB=norm(b.designation);
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
   function linkObjects(doc) {
      const inventory=config(doc),registry=[],canonical=new Map;
      // Rebuild shared in-memory objects after parsing or JSON copying. Visit
      // the inventory first so its values take priority over list copies.
      // List-only imports also populate the inventory here. List memberships
      // then reference the canonical objects; JSON serialization duplicates
      // their data because Stellarium requires inline objects in each list.
      for(let o of inventory.objects.concat(Object.values(doc.observingLists).flatMap(l=>l.objects))){
         let m=meta(o),match=registry.find(x=>same(x,o));
         if(match){
            if(JSON.stringify(match)!==JSON.stringify(o))Object.assign(match,mergeObjectData(match,o));
         }else{if(typeof m.objectId!=='string'||!m.objectId)m.objectId=uuid();match=o;registry.push(o);}
         canonical.set(o,match);
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
      for(let id of [].concat(am.aliases||[],bm.aliases||[],a.designation||[],b.designation||[],am.catalogMainId||[],bm.catalogMainId||[])){
         if(typeof id==='string'&&norm(id)&&norm(id)!==norm(result.designation)&&!seen.has(norm(id))){seen.add(norm(id));aliases.push(id.trim());}
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
      let next=normalizeDocument(doc),registry=[],index=new Map,listMembers=new Map,addedLists=0,merged=new Set;
      const root=entry=>{while(entry.parent)entry=entry.parent;return entry;};
      const keys=o=>['uuid:'+meta(o).objectId].concat(identifiers(o).map(id=>'id:'+id));
      const put=entry=>{for(let key of keys(entry.object)){if(!index.has(key))index.set(key,new Set);index.get(key).add(entry);}};
      function register(object,existing){
         let candidates=new Set;for(let key of keys(object))for(let entry of index.get(key)||[])candidates.add(root(entry));
         if(!identifiers(object).length)for(let entry of registry)if(!entry.parent&&!identifiers(entry.object).length)candidates.add(entry);
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
         entry.ids.add(meta(object).objectId);put(entry);return entry;
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
         let entries=matches.map(m=>objectHeading(m.object.designation,meta(m.object).displayName||m.object.name));
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
   function replaceObject(doc,id,replacement) {
      let others=refs(doc).filter(r=>meta(r.object).objectId!==id);
      if(others.some(r=>same(r.object,replacement)))throw Error('That identifier belongs to another object. Edit the existing object instead.');
      replacement=copy(replacement);consolidateObjectInformation(replacement);
      for(let r of refs(doc))if(meta(r.object).objectId===id){let old=r.object;
         delete old.description;delete meta(old).description;
         for(let k of Object.keys(replacement))old[k]=copy(replacement[k]);
         if(own(meta(old),'notes'))meta(old).notes=cleanNotes(meta(old).notes);
         meta(old).objectId=id;if(r.listId)doc.observingLists[r.listId]['last edit']=stamp();}
   }
   // objtype is the astronomical classification. Stellarium's type field is
   // a selection category: "Nebula" also covers galaxies and star clusters,
   // and "CustomObject" says only that the entry is a coordinate marker.
   function objectType(o) {
      let label=text(o.objtype).trim();
      // Decode cached SIMBAD fallback labels as well as raw catalog codes.
      // This lets saved entries benefit from newly recognized types offline.
      let cached=label.match(/^Catalog object\s*\(([^()]+)\)$/i);
      if(cached&&own(TYPES,cached[1].trim()))label=cached[1].trim();
      if(label&&!/^(?:custom\s*object|coordinate marker|unknown|unspecified)$/i.test(label))
         return own(TYPES,label)?TYPES[label]:label.charAt(0).toUpperCase()+label.slice(1);
      let category=text((plain(o[EXT])?o[EXT].catalogClass:'')||o.type).trim();
      if(category==='Nebula')return 'Deep-sky object';
      if(!category||category==='CustomObject')return 'Unspecified';
      return category.replace(/([a-z])([A-Z])/g,'$1 $2');
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
      if(own(TYPES,value))value=TYPES[value];
      return value.replace(/\s+/g,' ').replace(/\.$/,'').toLowerCase();
   }
   function informationText(...parts) {
      let lines=[],seen=new Set;
      for(let part of parts)for(let line of text(part).replace(/\r\n|\r/g,'\n').split('\n')){
         line=line.trim();if(!line)continue;let key=informationKey(line);
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
   // Normalize display-only options once for rendering and the session cache.
   function chartDetails(options={}) {
      return {starNames:options.starNames===true,starMagnitudes:options.starMagnitudes===true,
         objectDetails:options.objectDetails===true,labelDensity:['sparse','normal','detailed'].includes(options.labelDensity)?options.labelDensity:'normal',
         contours:options.contours===true,contourPath:text(options.contourPath),inset:options.inset===true,
         insetDegrees:Number.isFinite(options.insetDegrees)?options.insetDegrees:2};
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
   // imaging state, filters, personal prose, and any manual size override.
   function refreshCatalog(object,found) {
      let o=copy(object);consolidateObjectInformation(o);let m=meta(o),fresh=meta(found);
      for(let k of ['ra','dec','constellation','objtype'])if(own(found,k))o[k]=copy(found[k]);
      for(let k of ['catalogMainId','aliases','catalogSummary','catalogSource','catalogRetrieved','catalogClass','positionFrame'])if(own(fresh,k))m[k]=copy(fresh[k]);
      m.catalogAngularSize=catalogSize(found);
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
      let type=objectType(o),galaxy=type.match(/\b(?:galax(?:y|ies)|galaxi\w*|(?:active\s+)?galactic\s+nucleus|AGN|LINER|Seyfert)\b/i);
      if(galaxy)return automatic('broadband','Galaxy type: '+galaxy[0]+'; narrowband filters are optional.');
      let cluster=type.match(/\b(?:(?:open|globular|star|stellar)(?:\s+star)?[\s-]*clusters?|cluster\s+of\s+stars|sternhaufen|kugelsternhaufen)\b/i);
      if(cluster)return automatic('broadband','Star cluster type: '+cluster[0]+'; narrowband filters are optional.');
      let cloud=type.match(/\b(?:(?:reflection|dark)[\s-]*nebula(?:e)?|integrated[\s-]*flux[\s-]*nebula(?:e)?|IFN|reflexionsnebel|reflektionsnebel|dunkelnebel)\b/i);
      if(cloud)return automatic('broadband','Broadband nebula type: '+cloud[0]+'; narrowband filters are optional.');
      // For other targets, filter evidence takes priority over metadata;
      // narrowband wins when both filter families are mentioned.
      if(narrow)return automatic('narrowband','Narrowband filter mention: '+narrow);
      if(broad)return automatic('broadband','Broadband filter mention: '+broad);
      let metadata=[objectType(o),o.objtype,o.name,o.nameI18n,m.displayName,prose].map(text).join('\n');
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
      return {object:o,id:m.objectId,designation:text(o.designation||o.name||'Unnamed position'),name:text(m.displayName||o.name||o.nameI18n),
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
      return records.filter(r=>(options.month===undefined||options.month===-1||(months?months.includes(r.month):r.month===options.month))&&
         (options.constellation===undefined||options.constellation===null||r.key===options.constellation)&&(!options.objectType||r.objectType===options.objectType)&&
         (!options.band||r.band===options.band)&&
         (!options.status||options.status==='all'||options.status==='imaged'&&r.imaged||options.status==='not-imaged'&&!r.imaged)&&
         (!q||[r.designation,r.name,r.objectType,r.bandLabel,r.filters,r.catalogSummary,r.notes,r.constellation,r.code].join(' ').toLowerCase().indexOf(q)>=0||identifiers(r.object).some(id=>id.indexOf(norm(q))>=0)));
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
   function validateObject(o) {
      if(!text(o.designation).trim())throw Error('Enter a catalog identifier or a name for this position.');
      let p=position(o);if(p.ra===null||p.dec===null)throw Error('Enter valid J2000 RA and Dec, or use Look up.');
      if(!validDate(text(meta(o).imagedOn)))throw Error('Use a valid imaging date in YYYY-MM-DD format.');
      if(meta(o).angularSize!==undefined&&meta(o).angularSize!==null&&!validSize(meta(o).angularSize))throw Error('Invalid apparent object size.');
      o.ra=formatRA(p.ra);o.dec=formatDec(p.dec);o.constellation=constellation(p.ra,p.dec);return o;
   }
   const TYPES={G:'Galaxy',SBG:'Starburst galaxy',AGN:'Active galactic nucleus',LIN:'LINER galaxy nucleus',SyG:'Seyfert galaxy',GiG:'Galaxy in a group',GiP:'Galaxy in a pair',GiC:'Galaxy in a cluster',
      ClG:'Galaxy cluster',GrG:'Galaxy group',IG:'Interacting galaxies',PN:'Planetary nebula',PNc:'Planetary nebula candidate',HII:'H II region',SNR:'Supernova remnant',
      RNe:'Reflection nebula',DNe:'Dark nebula',MoC:'Molecular cloud',ISM:'Interstellar matter',Neb:'Nebula',GlC:'Globular cluster',OpC:'Open cluster','Cl*':'Star cluster',
      '*':'Star','**':'Double or multiple star','C*':'Carbon star','WR*':'Wolf-Rayet star','V*':'Variable star','Em*':'Emission-line star','Be*':'Be star','s*r':'Red supergiant'};
   // Parse explicit catalog fields; never infer coordinates from a display
   // name. New remote objects use coordinate markers for Stellarium portability.
   function parseSimbad(s,query,source) {
      s=text(s);let header=s.match(/^Object\s+(.+?)\s+---\s+(.+?)\s+---/m);
      if(!header)throw Error('SIMBAD did not identify '+query+'. Try a full identifier such as M 31, NGC 7000 or PN G075.5+01.7.');
      let coord=s.match(/Coordinates\(ICRS,ep=J2000,eq=2000\):\s*(\d+)\s+(\d+)\s+([\d.]+)\s+([+-])(\d+)\s+(\d+)\s+([\d.]+)/);
      if(!coord)throw Error('SIMBAD identifies this object but has no usable J2000 coordinates. Enter coordinates manually.');
      const ra=15*(Number(coord[1])+Number(coord[2])/60+Number(coord[3])/3600);
      const dec=(Number(coord[5])+Number(coord[6])/60+Number(coord[7])/3600)*(coord[4]==='-'?-1:1);
      const type=header[2].trim(),label=TYPES[type]||('Catalog object ('+type+')'),parts=[label,'SIMBAD identifier: '+header[1].trim()];
      for(let [pattern,title] of [[/^Morphological type:\s*(.+)$/m,'Morphology'],[/^Spectral type:\s*(.+)$/m,'Spectral type'],[/^Angular size:\s*(.+)$/m,'Angular size (arcmin)'],[/^Flux V\s*:\s*(.+)$/m,'V magnitude']]){
         let m=s.match(pattern);if(m&&!/^~(?:\s|$)/.test(m[1]))parts.push(title+': '+m[1].trim());}
      let aliases=[],block=s.match(/Identifiers\s*\(\d+\):\s*\n([\s\S]*?)(?:\n\s*\n|$)/);
      if(block)aliases=block[1].split(/\n| {2,}/).map(x=>x.trim()).filter(Boolean);
      let star=/\*|\*r/.test(type)&&!['Cl*'].includes(type),main=header[1].trim();
      // Use the entered designation for catalog selection. An explicit marker is
      // portable even when this SIMBAD identifier is absent from Stellarium.
      let o={designation:query.replace(/\s+marker$/i,'').trim()+' marker',name:main,nameI18n:main,type:'CustomObject',objtype:label,
         ra:formatRA(ra),dec:formatDec(dec),constellation:constellation(ra,dec),isVisibleMarker:true,fov:2};
      o[EXT]={objectId:uuid(),imaged:false,imagedOn:'',catalogMainId:main,aliases:aliases.concat([query]),
         catalogSummary:parts.join('\n'),catalogSource:source,catalogRetrieved:stamp(),catalogClass:star?'Star':'Nebula',positionFrame:'ICRS/J2000'};
      let dimensions=s.match(/^Angular size:[ \t]*(.*)$/m);
      meta(o).catalogAngularSize=dimensions?parseAngularSize(dimensions[1]):null;
      return o;
   }
   function lookupLocal(doc,query) {
      let n=norm(query);if(!n)return null;let matches=refs(doc).filter(r=>identifiers(r.object).indexOf(n)>=0);
      let exact=matches.find(r=>norm(r.object.designation)===n||norm(meta(r.object).catalogMainId)===n);
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
      monthKey,meta,config,refs,same,newDocument,normalizeDocument,parseDocument,parseListImport,addList,deleteList,removeFromList,deleteObject,transferObjects,importDocuments,importListChoices,importListDestination,importObjectsAsList,exportDocument,exportObjects,setState,duplicateMatches,validateNewObject,addObject,replaceObject,
      objectType,cleanNotes,cleanDocumentNotes,commentText,informationText,fetchedCatalogInformation,catalogInformation,consolidateObjectInformation,consolidateDocumentInformation,setCatalogInformation,filterInfo,BAND_LABELS,bandFilters,targetBand,setTargetBand,objectHeading,validSize,parseAngularSize,catalogSize,angularSize,sizeText,manualSize,chartFraming,defaultSkyCoverage,defaultInsetCoverage,parseOutlines,chartDetails,chartObjectDetails,refreshCatalog,record,records,adjacentMonths,filter,sortedRecords,validDate,validateObject,parseSimbad,lookupLocal,dssField,finderURL};
})();
// END ABL_PORTABLE

// Sky charts use the standard engines already installed by PixInsight.
/* Astro Bucket List 0.35.2 — Styled star maps using bundled PJSR engines.
 * Copyright (c) 2026 Thorsten Glebe. SPDX-License-Identifier: MIT
 * The included engines remain part of the user's PixInsight installation.
 */
#ifndef __ABL_CHARTS
#define __ABL_CHARTS
#define SETTINGS_MODULE "AstroBucketListCharts"
#define CSG_SETTINGS_MODULE "AstroBucketListChartsCSG"
#define ANNOT_SETTINGS_MODULE "AstroBucketListChartsAnnotate"
#define VERSION "0.35.2"
#define TITLE "Astro Bucket List"
#include <pjsr/astrometry/AstrometricMetadata.js>
#include <pjsr/astrometry/AstronomicalCatalogs.js>
// These src/scripts engines are internal components covered by this script's
// signature. Revalidate compatibility after PixInsight updates and re-sign
// AstroBucketList whenever any of these included components changes.
#include <../src/scripts/CatalogStarGenerator/CatalogStarGeneratorEngine.js>
#include <../src/scripts/AnnotateImage/Entity.js>
#include <../src/scripts/AnnotateImage/GraphicProperties.js>
#include <../src/scripts/AnnotateImage/Layer.js>
#include <../src/scripts/AnnotateImage/AnnotationEngine.js>
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
// Keep all object outlines, but label only a spaced subset. Separate marker
// and label passes let AnnotateImage optimize those labels without discarding
// faint objects just to make room for their text.
class ABLChartCatalogLayer extends CatalogLayer {
   Draw(g,metadata,bounds,imageWnd,engine,entities){
      if(!this.labelObjects)return super.Draw(g,metadata,bounds,imageWnd,engine,entities);
      let objects=this.objects,labels=this.gprops.showLabels,markers=this.gprops.showMarkers;
      try{
         this.gprops.showLabels=false;super.Draw(g,metadata,bounds,imageWnd,engine,entities);
         this.gprops.showMarkers=false;this.gprops.showLabels=labels;this.objects=objects.filter(o=>o&&this.labelObjects.has(o));
         super.Draw(g,metadata,bounds,imageWnd,engine,entities);
      }finally{this.objects=objects;this.gprops.showLabels=labels;this.gprops.showMarkers=markers;}
   }
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
// Contours are supplied by a local Stellarium/SkyChart file. Discover common
// installation paths, but let the user select any compatible local file.
// The chosen path is a local preference and is never written into a collection.
function ablDefaultContourPath(){
   for(let path of ['C:/Program Files/Stellarium/nebulae/default/outlines.dat',
      'C:/Program Files (x86)/Stellarium/nebulae/default/outlines.dat',
      '/usr/share/stellarium/nebulae/default/outlines.dat',
      '/Applications/Stellarium.app/Contents/Resources/nebulae/default/outlines.dat'])
      if(File.exists(path))return path;
   return '';
}
// Distinguish a validated outline file from a path that is empty, missing or
// invalid. Keep this UI state outside collection data and validate on selection.
function ablContourFileState(path){
   if(!path)return {path:'',status:'empty',count:0,error:''};
   if(!File.exists(path))return {path,status:'missing',count:0,error:'The selected file no longer exists.'};
   try{return {path,status:'loaded',count:ABL.parseOutlines(File.readTextFile(path)).length,error:''};}
   catch(e){return {path,status:'invalid',count:0,error:String(e)};}
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
// Build one concise label per star. Named stars take precedence at matching
// positions; unnamed Gaia stars can still carry magnitudes in a close-up.
function ablStarLabelLayer(generator,details,style){
   if(!details.starNames&&!details.starMagnitudes)return null;
   let layer=new ABLChartCatalogLayer(new NamedStarsCatalog),seen=new Set,objects=[];
   let catalogs=[generator.catalog,generator.catalog2].filter(c=>c&&c.objects);
   catalogs.sort((a,b)=>(b instanceof NamedStarsCatalog?1:0)-(a instanceof NamedStarsCatalog?1:0));
   for(let catalog of catalogs)for(let o of catalog.objects){
      if(!o||!Number.isFinite(o.magnitude)||o.magnitude>generator.maxMagnitude)continue;
      let key=o.posRD.x.toFixed(3)+','+o.posRD.y.toFixed(3);if(seen.has(key))continue;seen.add(key);
      let name=details.starNames&&catalog instanceof NamedStarsCatalog?String(o['Common name']||o.name||''):'';
      if(name&&catalog.translateGreekLetters)name=catalog.translateGreekLetters(name);
      let label=[name,details.starMagnitudes?'mag '+o.magnitude.toFixed(1):''].filter(Boolean).join(' · ');
      if(label)objects.push(Object.assign({},o,{'ABL star label':label}));
   }
   layer.objects=objects;layer.isStar=true;layer.visible=true;layer.gprops.showMarkers=false;
   layer.gprops.labelFields=['ABL star label','','','','','','',''];layer.gprops.labelFace=style.face;layer.gprops.labelSize=20;layer.gprops.labelColor=style.secondary;
   return layer;
}
// Appearance affects drawing only. Both styles share the same projection,
// catalog selection, magnitude limits, label spacing and angular scale.
function ablChartStyle(key){
   return key==='vintage-atlas'?{
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
      size:r.size?ABL.copy(r.size):null,type:r.objectType}));
}
function ablChartTargetPosition(t){return Number.isFinite(t.ra)&&t.ra>=0&&t.ra<360&&Number.isFinite(t.dec)&&Math.abs(t.dec)<=90;}
function ablTableChartFrame(targets,minimum=45){
   const rad=Math.PI/180,width=1440,height=780,valid=targets.filter(ablChartTargetPosition);
   if(!valid.length)throw Error(targets.length?'The shown objects need coordinates. Use Edit object or Update catalogs.':'No objects match the active filters.');
   const vector=(ra,dec)=>[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)];
   const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
   const unit=a=>{let n=Math.hypot(...a);if(n<1e-10)throw Error('These objects cannot fit in one finder chart. Narrow the filters.');return a.map(v=>v/n);};
   let centers=valid.map(t=>vector(t.ra*rad,t.dec*rad)),center=unit(centers.reduce((a,v)=>a.map((x,i)=>x+v[i]),[0,0,0]));
   let points=[];
   for(let t of valid){
      let ra=t.ra*rad,dec=t.dec*rad,c=vector(ra,dec),east=[-Math.sin(ra),Math.cos(ra),0],north=[-Math.sin(dec)*Math.cos(ra),-Math.sin(dec)*Math.sin(ra),Math.cos(dec)];points.push(c);
      // Bound the full major diameter conservatively in every direction,
      // without inventing a position angle for a catalog ellipse.
      let radius=t.size?t.size.majorArcmin/120*rad:0;
      if(radius)for(let i=0;i<32;++i){let a=i*Math.PI/16;points.push(c.map((v,j)=>v*Math.cos(radius)+(east[j]*Math.cos(a)+north[j]*Math.sin(a))*Math.sin(radius)));}
   }
   let ra,dec,east,north,bounds;
   for(let pass=0;pass<4;++pass){
      ra=Math.atan2(center[1],center[0]);dec=Math.asin(Math.max(-1,Math.min(1,center[2])));
      east=[-Math.sin(ra),Math.cos(ra),0];north=[-Math.sin(dec)*Math.cos(ra),-Math.sin(dec)*Math.sin(ra),Math.cos(dec)];
      bounds={x0:Infinity,x1:-Infinity,y0:Infinity,y1:-Infinity};
      for(let p of points){let z=dot(p,center);if(z<=.001)throw Error('These objects span too much sky for one finder chart. Narrow the filters.');
         let x=dot(p,east)/z,y=dot(p,north)/z;bounds.x0=Math.min(bounds.x0,x);bounds.x1=Math.max(bounds.x1,x);bounds.y0=Math.min(bounds.y0,y);bounds.y1=Math.max(bounds.y1,y);}
      if(pass<3){let x=(bounds.x0+bounds.x1)/2,y=(bounds.y0+bounds.y1)/2;center=unit(center.map((v,i)=>v+x*east[i]+y*north[i]));}
   }
   // Fit the shorter vertical dimension as well as the horizontal field.
   // Reserve space for markers/labels and round upward, never crop a target.
   let plane=Math.max(Math.abs(bounds.x0),Math.abs(bounds.x1))/(1-120/width);
   plane=Math.max(plane,Math.max(Math.abs(bounds.y0),Math.abs(bounds.y1))*width/(height-120));
   let coverage=Math.ceil(Math.max(minimum,2*Math.atan(plane)/rad)*100)/100;
   if(coverage>170)throw Error('These objects need more than 170° coverage. Narrow the filters.');
   return {ra:(ra/rad+360)%360,dec:dec/rad,coverage,plotted:valid.length,missing:targets.length-valid.length};
}
// Explicit table targets are always marked, independently of catalog switches,
// magnitude cutoffs and label density. Number labels use leader lines where
// needed; the complete names appear in a separate key below the sky map.
function ablDrawTableTargets(bitmap,metadata,targets,style){
   let g=new Graphics(bitmap),labels=[],markers=[];const w=bitmap.width,h=bitmap.height;
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
function ablSkyChart(object,fieldArcmin,skyDegrees,path,options={}){
   TGFileProtection.assertOutsideInstallation(path,"Finder chart image");
   if(File.exists(path)||File.directoryExists(path))throw Error("The temporary chart path is already occupied.");
   const position=ABL.position(object),mapOnly=options._mapOnly===true,width=mapOnly?600:1440,height=mapOnly?600:780,header=80,footer=100;
   const targets=Array.isArray(options.tableTargets)?options.tableTargets:null;
   const details=ABL.chartDetails(targets?Object.assign({},options,{inset:false}):options);
   const style=ablChartStyle(options.style);
   if(position.ra===null||position.dec===null)throw Error('This object needs valid coordinates first.');
   if(!Number.isFinite(fieldArcmin)||fieldArcmin<1||fieldArcmin>1800||!Number.isFinite(skyDegrees)||skyDegrees<.1||skyDegrees>(targets?170:120))
      throw Error('Choose a survey field of 1–1800 arcminutes and sky coverage of 0.1–120 degrees.');
   if(details.inset&&(!Number.isFinite(details.insetDegrees)||details.insetDegrees<.1||details.insetDegrees>=skyDegrees))
      throw Error('Choose a close-up coverage of at least 0.1° and smaller than the overview.');
   let outlineData=[];
   if(details.contours){
      if(!details.contourPath||!File.exists(details.contourPath))throw Error('Choose an available local nebula contour file.');
      outlineData=options.outlineData||ABL.parseOutlines(File.readTextFile(details.contourPath));
   }
   const title=String(object.designation||object.name||'Target').replace(/\s+marker$/i,'');
   let id;do{id='ABL_Sky_'+ABL.uuid().slice(1,9);}while(View.viewById(id));
   let stars=null,bitmap=null,insetMap=null;
   try{
      let generator=new CatalogStarGenerator;
      generator.useImageMetadata=false;generator.width=width;generator.height=height;generator.ra=position.ra;generator.dec=position.dec;
      generator.observationTime=2451545.0;generator.rotation=0;generator.projection=0;
      // The TAN plane scale is chosen from the actual edge-to-edge angle,
      // rather than treating degrees as a flat coordinate at large fields.
      generator.resolution=2*Math.tan(skyDegrees*Math.PI/360)*180/Math.PI/width;
      let local=ablLocalChartCatalog();
      generator.catalog=local||new NamedStarsCatalog;
      // Gaia has an incomplete bright end; named stars supply the familiar
      // constellation anchors. The generator removes positional duplicates.
      generator.catalog2=local?new NamedStarsCatalog:new NullCatalog;
      const source=local?'Local '+local.name:'Bundled named and bright stars';
      console.writeln('Sky chart catalog: '+source);
      // Sparse naked-eye context at wide scales, progressively deeper stars
      // when zooming in. This keeps small targets useful without a busy map.
      generator.maxMagnitude=Math.min(15,Math.max(5.5,6.7-3*Math.log10(skyDegrees/30)));
      generator.autoGraphics=true;generator.generateStars=true;generator.generateNoise=false;generator.outputImageId=id;
      stars=generator.render();
      // Draw catalog symbols on a solid background. The synthetic window
      // supplies astrometry; the selected style supplies the map's palette.
      bitmap=new Bitmap(width,height);bitmap.fill(style.sky);let symbols=new Graphics(bitmap),starCount=0;
      try{
         symbols.antialiasing=true;
         for(let catalog of [generator.catalog,generator.catalog2])for(let record of catalog.objects||[]){
            if(!record||!Number.isFinite(record.magnitude)||record.magnitude>generator.maxMagnitude)continue;
            let point=generator.metadata.Convert_RD_I(record.posRD);
            if(!point||point.x<0||point.y<0||point.x>=width||point.y>=height)continue;
            let brightness=generator.maxMagnitude-record.magnitude,radius=Math.max(1.8,Math.min(6,1.8+brightness*.65));
            let rect=new Rect(point.x-radius,point.y-radius,point.x+radius,point.y+radius);
            if(brightness>1.5||style.vintage)symbols.fillEllipse(rect,new Brush(brightness>1.5?style.star:style.faintStar));
            else{symbols.pen=new Pen(style.faintStar,1.5);symbols.strokeEllipse(rect);}
            ++starCount;
         }
      }finally{symbols.end();}
      stars.mainView.beginProcess(UndoFlag.NoSwapFile);
      // CatalogStarGenerator produces grayscale. Preserve the paper/sky and
      // ink colors when transferring our fully opaque bitmap into its image.
      try{stars.mainView.image.colorSpace=ColorSpace.RGB;stars.mainView.image.blend(bitmap);}finally{stars.mainView.endProcess();}
      bitmap.clear();bitmap=null;
      let annotation=new AnnotationEngine;annotation.window=stars;annotation.metadata=new AstrometricMetadata;
      annotation.metadata.ExtractMetadata(stars);annotation.applySTF=false;annotation.textScale=1;annotation.graphicsScale=1;
      annotation.observationTime=2451545.0;annotation.optimizeLabelPlacement=true;annotation.smallSizeThreshold=4;
      annotation.layers=[new GridLayer,new ABLConstellationLayer(skyDegrees>=5),new ABLChartCatalogLayer(new MessierCatalog),new ABLChartCatalogLayer(new NGCICCatalog)];
      let entries=ablChartCatalogs(),choices=ablChartCatalogOptions(options);
      for(let entry of entries.slice(2))annotation.layers.push(new ABLChartCatalogLayer(entry.catalog||new NullCatalog));
      for(let i=0;i<annotation.layers.length;++i){let layer=annotation.layers[i];layer.visible=true;
         layer.gprops.lineColor=i===0?style.grid:i===1?style.asterism:style.object;layer.gprops.labelColor=i===0?style.gridLabel:i===1?style.constellation:style.objectLabel;
         layer.gprops.labelFace=style.face;layer.gprops.labelItalic=style.vintage&&i===1;
         layer.gprops.lineWidth=i===0?1:1.8;layer.gprops.labelSize=i===1?32:i===0?20:25;
         if(i===0)layer.density=3;
         if(i===1)layer.margin=5;
         if(i>=2){let choice=choices[i-2];layer.visible=choice.enabled;
            layer.gprops.showLabels=choice.labels;layer.gprops.labelFields=['Name','','','','','','',''];layer.catalog.magMax=ablCatalogMagnitude(entries[i-2],choice,skyDegrees);}
         if(layer.visible&&layer.Load)layer.Load(annotation.metadata,annotation.vizierServer);}
      if(details.objectDetails){
         // Messier's local CSV references NGC/IC but lacks a Type column.
         // Join that local metadata before duplicate marker removal.
         let ngc=annotation.layers[3];if(!ngc.visible&&entries[1].available)ngc.Load(annotation.metadata,annotation.vizierServer);
         let types=new Map((ngc.objects||[]).filter(Boolean).map(o=>[ABL.norm(o.name),o.Type]));
         for(let layer of annotation.layers.slice(2))if(layer.visible)for(let o of layer.objects||[])if(o){
            if(!o.Type&&o['NGC/IC'])o.Type=types.get(ABL.norm(o['NGC/IC']));
            if(!o.Type&&ABL.norm(o.name)===ABL.norm(title)){let type=ABL.objectType(object);if(type!=='Unspecified')o.Type=type;}
            o['ABL details']=ABL.chartObjectDetails(Object.assign({},o,{Type:''}));o['ABL type']=o.Type||'';layer.gprops.labelSize=18;
            // Stack short lines instead of one long catalog sentence. A very
            // large marker needs room for its name; the inset's information
            // band still supplies the selected target's type and dimensions.
            if(o.diameter/annotation.metadata.resolution>width/3)o['ABL details']=o['ABL type']='';
            layer.gprops.labelFields=['','','Name','','ABL type','','','ABL details'];
         }
      }
      annotation.RemoveDuplicates();
      // Avoid a second catalog label/marker at an explicit table target.
      if(targets)for(let layer of annotation.layers.slice(2)){
         layer.gprops.labelSize=Math.min(layer.gprops.labelSize,20);layer.gprops.labelColor=style.secondary;
         layer.objects=(layer.objects||[]).filter(o=>!o||!targets.some(t=>ablChartTargetPosition(t)&&
            (t.designation&&[o.name,o['NGC/IC']].some(name=>name&&ABL.norm(name)===ABL.norm(t.designation))||
             Math.abs(t.dec-o.posRD.y)<.001&&Math.abs(((t.ra-o.posRD.x+540)%360)-180)*Math.cos(t.dec*Math.PI/180)<.001)));
      }
      let catalogLayers=annotation.layers.slice(2).filter(layer=>layer.visible),objectCount=catalogLayers.reduce((n,layer)=>n+(layer.objects||[]).filter(Boolean).length,0);
      let starLayer=ablStarLabelLayer(generator,details,style);
      if(starLayer)annotation.layers.push(starLayer);
      let labelCount=ablChartLabels(starLayer?catalogLayers.concat(starLayer):catalogLayers,annotation.metadata,width,height,details);
      let constellationLayer=annotation.layers[1],showBorders=options.borders!==false;
      // Put borders behind asterisms and catalog annotations. Keep them out
      // of object counts, duplicate removal and catalog-label selection.
      if(showBorders)annotation.layers.splice(1,0,new ABLConstellationBordersLayer(style.border));
      let contours=details.contours?new ABLNebulaContoursLayer(outlineData,style):null;
      if(contours)annotation.layers.unshift(contours);
      bitmap=annotation.generateRasterRenditions().bmp;
      let targetMarkers=targets?ablDrawTableTargets(bitmap,annotation.metadata,targets,style):[];
      let result={style:style.key,styleName:style.name,borders:showBorders,catalog:source,localGaia:!!local,
         stars:starCount,objectCount,labelCount,starLabelCount:starLayer?starLayer.labelObjects.size:0,
         contourCount:contours?contours.count:0,details,targetMarkers,tableTargetCount:targets?targets.length:0,
         catalogs:catalogLayers.map(layer=>layer.catalog.name),catalogOptions:choices,constellations:constellationLayer.visibleNames};
      if(mapOnly){result.bitmap=bitmap;bitmap=null;return result;}
      let inset=null;
      if(details.inset){
         inset=ablSkyChart(object,fieldArcmin,details.insetDegrees,'',Object.assign({},options,{inset:false,_mapOnly:true,outlineData}));
         insetMap=inset.bitmap;delete inset.bitmap;
      }
      // A landscape map uses the tab's width. Put identification, orientation
      // and the key in separate bands so no tiny footer obscures the sky.
      let keyFont=new Font(style.face,21,'px'),key=targets?ablTableChartKey(targets,keyFont,details):null;
      let map=bitmap;bitmap=new Bitmap(width+(inset?640:0),header+height+footer+(key?key.height:0));bitmap.fill(style.band);let g=new Graphics(bitmap);
      try{
         // Mark the selected target's center with a crosshair. Chart coverage
         // is supplied by the caller; this marker does not represent a camera
         // footprint or the target's apparent size.
         g.drawBitmap(0,header,map);let cx=width/2,cy=header+height/2;
         g.antialiasing=true;g.textAntialiasing=true;
         if(!targets){g.pen=new Pen(style.sky,6);for(let pass=0;pass<2;++pass){if(pass)g.pen=new Pen(style.accent,2.5);g.drawLine(cx-23,cy,cx-9,cy);g.drawLine(cx+9,cy,cx+23,cy);g.drawLine(cx,cy-23,cx,cy-9);g.drawLine(cx,cy+9,cx,cy+23);}}
         // A double rule evokes a printed atlas; a single accent rule and
         // bold sans-serif heading keep the modern style visually distinct.
         g.pen=new Pen(style.vintage?style.rule:style.accent,style.vintage?1:3);g.drawLine(24,7,width-24,7);
         if(style.vintage){g.drawLine(24,11,width-24,11);g.pen=new Pen(style.rule);g.strokeRect(1,header,width-1,header+height-1);}
         g.pen=new Pen(style.ink);g.font=new Font(style.face,31,'px');g.font.bold=!style.vintage;
         // Elide unusually long user names so they cannot run into the key.
         let heading=title;while(heading.length>1&&g.font.width(heading)>850)heading=heading.slice(0,-1);if(heading!==title)heading+='…';
         g.drawText(24,40,heading);g.font=new Font(style.face,20,'px');g.pen=new Pen(style.secondary);
         g.drawText(24,65,targets?targets.length+' shown objects · '+targetMarkers.length+' plotted'+(targetMarkers.length<targets.length?' · '+(targets.length-targetMarkers.length)+' without coordinates':''):'Apparent size  '+ABL.sizeText(ABL.angularSize(object)));
         g.drawText(1000,34,'Field width  '+skyDegrees+'°');g.drawText(1000,64,'N ↑   E ←   ·   J2000');
         let y=header+height;g.pen=new Pen(style.rule);g.drawLine(0,y,width,y);if(style.vintage)g.drawLine(24,y+5,width-24,y+5);g.font=new Font(style.face,21,'px');g.pen=new Pen(style.ink);
         g.drawText(24,y+34,'RA  '+ABL.formatRA(position.ra)+'     Dec  '+ABL.formatDec(position.dec));
         if(showBorders){g.pen=new Pen(style.border,1.5,PenStyle.Dash);g.drawLine(700,y+28,744,y+28);g.pen=new Pen(style.ink);g.font=new Font(style.face,18,'px');g.drawText(754,y+34,'Constellation borders');g.font=new Font(style.face,21,'px');}
         g.drawText(24,y+73,targets?'Numbered rings = table objects · Other symbols = catalog context':'Center crosshair = target   ·   Outlines / crosses = catalog objects');
         if(key){
            let top=header+height+footer;g.pen=new Pen(style.rule);g.drawLine(24,top,width-24,top);g.font=keyFont;g.pen=new Pen(style.ink);g.drawText(24,top+32,'Objects in table order');
            let offsets=[top+64];for(let rh of key.rowHeights)offsets.push(offsets[offsets.length-1]+rh);
            for(let cell of key.cells)for(let j=0;j<cell.lines.length;++j)g.drawText(24+cell.column*key.columnWidth,offsets[cell.row]+j*27,cell.lines[j]);
         }
         // Scale is angular separation at the field center, derived from the
         // same TAN projection as the map, not a degrees-per-pixel estimate.
         let barDegrees=skyDegrees/5,barPixels=2*Math.tan(barDegrees*Math.PI/360)/(generator.resolution*Math.PI/180),x=width-30-barPixels;
         g.drawLine(x,y+64,width-30,y+64);g.drawLine(x,y+57,x,y+71);g.drawLine(width-30,y+57,width-30,y+71);
         let scaleText=barDegrees>=1?Number(barDegrees.toPrecision(3))+'°':Number((barDegrees*60).toPrecision(3))+'′';g.drawText(x,y+40,scaleText+' at center');
         if(inset){
            // A separate square projection gives true additional sky detail.
            // Keep it beside the overview so no corner of the map is hidden.
            let x=width+20;g.pen=new Pen(style.rule);g.drawLine(width,0,width,bitmap.height);
            g.font=new Font(style.face,26,'px');g.pen=new Pen(style.ink);g.drawText(x,40,'Close-up · '+details.insetDegrees+'°');
            g.font=new Font(style.face,18,'px');g.pen=new Pen(style.secondary);g.drawText(x,66,'N ↑   E ←   ·   J2000   ·   target at center');
            g.drawBitmap(x,header,insetMap);g.pen=new Pen(style.rule);g.strokeRect(x,header,x+600,header+600);
            let cx=x+300,cy=header+300;g.pen=new Pen(style.accent,2);
            g.drawLine(cx-16,cy,cx-6,cy);g.drawLine(cx+6,cy,cx+16,cy);g.drawLine(cx,cy-16,cx,cy-6);g.drawLine(cx,cy+6,cx,cy+16);
            g.pen=new Pen(style.ink);g.font=new Font(style.face,20,'px');
            g.drawText(x,header+638,'Apparent size: '+ABL.sizeText(ABL.angularSize(object)));
            g.drawText(x,header+670,'Object type: '+ABL.objectType(object));
            g.pen=new Pen(style.secondary);g.drawText(x,header+707,'Same target · independently projected close-up');
            g.drawText(x,header+739,inset.objectCount+' catalog objects · '+inset.starLabelCount+' star labels');
            if(details.contours)g.drawText(x,header+771,inset.contourCount+' local nebula contours');
         }
      }finally{g.end();map.clear();}
      TGFileProtection.assertOutsideInstallation(path,"Finder chart image");
      if(File.exists(path)||File.directoryExists(path))throw Error("The temporary chart path is already occupied.");
      bitmap.save(path);return Object.assign(result,{path,inset:inset?{coverage:details.insetDegrees,stars:inset.stars,objectCount:inset.objectCount,starLabelCount:inset.starLabelCount,contourCount:inset.contourCount}:null});
   }finally{
      if(bitmap)bitmap.clear();if(insetMap)insetMap.clear();
      // Close only our uniquely named temporary field, including partial renders.
      let view=View.viewById(id);if(view)view.window.forceClose();
   }
}
#endif

// Native dialogs, file operations, and application entry point.

const ABL_VERSION='0.35.2';
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
// Bound downloads and allow console cancellation while keeping the UI alive.
function ablTransfer(url,maxBytes,timeoutSeconds=30){
   let data=new ByteArray,transfer=new NetworkTransfer,start=Date.now(),stopped='';
   transfer.setURL(url);transfer.setConnectionTimeout(10);
   transfer.setCustomHTTPHeaders(['User-Agent: '+CoreApplication.agentName+' AstroBucketList/'+ABL_VERSION,'Accept: */*']);
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
   return data;
}
function ablBusy(dialog,label,operation,showConsole=true){
   let wasEnabled=dialog.enabled,abort=console.abortEnabled;
   dialog.enabled=false;console.abortEnabled=true;if(showConsole)console.show();console.writeln(label);CoreApplication.processEvents();
   try{return operation();}finally{dialog.enabled=wasEnabled;console.abortEnabled=abort;}
}
function ablLookup(doc,query,serverIndex=0,refresh=false){
   query=String(query).trim();if(!query)throw Error('Enter a catalog identifier first.');
   if(query.length>200)throw Error('The catalog identifier is too long.');
   if(!refresh){let local=ABL.lookupLocal(doc,query);if(local)return local;}
   let errors=[];
   for(let index of [serverIndex,1-serverIndex]){
      if(console.abortRequested)throw Error('Cancelled.');
      let url=ABL_SERVERS[index]+'?Ident='+encodeURIComponent(query)+'&output.format=ASCII';
      try{return ABL.parseSimbad(ablTransfer(url,2*1024*1024).utf8ToString(),query,url);}
      catch(e){errors.push(e.message||String(e));if(/Cancelled/.test(String(e)))throw e;}
   }
   throw Error(errors.join('\n\n'));
}
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
   this.entries=new ComboBox(this);for(let match of matches)this.entries.addItem(ABL.objectHeading(match.object.designation,ABL.meta(match.object).displayName||match.object.name));
   this.entries.toolTip='Select the existing entry to inspect. Each object is shown once, even if it belongs to several lists.';
   this.details=new TextBox(this);this.details.readOnly=true;this.details.setMinHeight(this.logicalPixelsToPhysical(155));
   this.updateMatch=()=>{let match=matches[this.entries.currentItem],o=match.object,m=ABL.meta(o);
      this.details.text=ABL.html(['Entered: '+String(object.designation).replace(/\s+marker$/i,''),
         'Existing entry: '+ABL.objectHeading(o.designation,m.displayName||o.name),
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

// The editor works on a copy; only Apply returns a validated replacement.
class ABLObjectDialog extends Dialog { constructor(parent,object,initialIdentifier=''){
   super(parent);
   this.windowTitle=(object?'Edit object':'Add object')+' — '+ABL_TITLE;
   this.source=object?ABL.copy(object):{designation:'',name:'',type:'CustomObject',isVisibleMarker:true,ra:'',dec:''};
   ABL.consolidateObjectInformation(this.source);
   this.editedObject=null;this.lookupPerformed=false;this.setMinWidth(660);
   let m=ABL.meta(this.source);
   this.idEdit=new Edit(this);this.idEdit.text=object?String(object.designation||object.name||'').replace(/\s+marker$/i,''):String(initialIdentifier).trim();
   // Membership is optional. Add to the active list when one is selected;
   // All objects starts with collection-only storage, even with no lists.
   this.destinationListId='';
   if(!object){
      this.listSelect=new ComboBox(this);this.listIds=[''].concat(Object.keys(parent.doc.observingLists));this.listSelect.addItem('No list — collection only');
      for(let id of this.listIds.slice(1))this.listSelect.addItem(parent.doc.observingLists[id].name);
      this.listSelect.currentItem=parent.listId?this.listIds.indexOf(parent.listId):0;
      this.listSelect.toolTip='Optionally add this object to a logical list. No list stores it in the collection and makes it available in All objects.';
   }
   this.idEdit.toolTip='Examples: M 31, NGC 7000, LDN 1228, PK 164+31.1. Look up refreshes catalog information from SIMBAD, including available apparent dimensions.';
   this.server=new ComboBox(this);this.server.addItem('SIMBAD — Harvard');this.server.addItem('SIMBAD — Strasbourg');this.server.currentItem=parent.serverIndex||0;
   this.lookupButton=ablButton(this,'Look up',()=>{
      try{let previousObject=ABL.copy(this.source);ABL.setCatalogInformation(previousObject,this.catalogText.text);
         let previous=ABL.meta(previousObject);previous.notes=ABL.cleanNotes(this.notesEdit.text);previous.displayName=this.nameEdit.text;
         previous.imagedOn=this.imagedDate.text.trim();previous.imaged=this.imaged.checked||!!previous.imagedOn;previous.filters=this.filtersEdit.text;
         ABL.setTargetBand(previousObject,this.bandSelect.values[this.bandSelect.currentItem]);
         if(this.useCatalogSize.checked)delete previous.angularSize;else previous.angularSize=ABL.manualSize(this.majorEdit.text,this.minorEdit.text);
         let found=ablBusy(this,'Looking up '+this.idEdit.text+' in SIMBAD…',()=>parent.io.lookup(parent.doc,this.idEdit.text,this.server.currentItem,true));
         this.lookupPerformed=true;let fresh=ABL.copy(ABL.meta(found));
         this.source=ABL.copy(found);
         for(let k of ['objectId','imaged','imagedOn','notes','displayName'])if(ABL.own(previous,k)&&previous[k]!==''&&previous[k]!==undefined)fresh[k]=previous[k];
         fresh.filters=previous.filters;
         fresh.targetBand=ABL.copy(previous.targetBand);
         if(ABL.own(previous,'angularSize'))fresh.angularSize=previous.angularSize;
         if(ABL.own(previous,'catalogInformation'))fresh.catalogInformation=previous.catalogInformation;
         this.source[ABL.EXT]=fresh;this.idEdit.text=String(found.designation||this.idEdit.text).replace(/\s+marker$/i,'');this.fill();parent.serverIndex=this.server.currentItem;
      }catch(e){parent.error(e);}
   },'Resolve this identifier and fill J2000 coordinates and catalog information.');
   let idRow=new HorizontalSizer;idRow.spacing=6;idRow.add(this.idEdit,100);idRow.add(this.lookupButton);
   this.nameEdit=new Edit(this);this.raEdit=new Edit(this);this.decEdit=new Edit(this);
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
   let catalogRow=new VerticalSizer;catalogRow.spacing=4;catalogRow.add(this.catalogText);let catalogActions=new HorizontalSizer;catalogActions.addStretch();catalogActions.add(this.catalogResetButton);catalogRow.add(catalogActions);
   this.imaged=new CheckBox(this);this.imaged.text='I have imaged this object';
   this.imagedDate=new Edit(this);this.imagedDate.setFixedWidth(120);this.imagedDate.toolTip='Editable imaging date, YYYY-MM-DD. Entering a date marks this object as imaged. Clear the date to keep an imaged object without a known date.';
   this.imaged.onCheck=checked=>{if(!checked)this.imagedDate.text='';else if(!this.imagedDate.text)this.imagedDate.text=ABL.today();};
   this.imagedDate.onTextUpdated=value=>{if(value.trim()&&ABL.validDate(value.trim()))this.imaged.checked=true;};
   this.marker=new CheckBox(this);this.marker.text='Export as a named coordinate marker';
   this.marker.toolTip='A marker works in Stellarium even if this catalog identifier is absent from its local database. Native catalog entries can keep their original object type.';
   let status=new HorizontalSizer;status.spacing=8;status.add(this.imaged);status.addStretch();let dl=new Label(this);dl.text='Imaged on:';status.add(dl);status.add(this.imagedDate);
   this.applyButton=ablButton(this,'Apply',()=>{try{
      let value=this.value();
      if(!object){this.destinationListId=this.listIds[this.listSelect.currentItem];ABL.validateNewObject(parent.doc,this.destinationListId,value);}
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
   this.sizer.add(ablRow(this,'Catalog identifier:',idRow));this.sizer.add(ablRow(this,'Lookup service:',this.server));
   this.sizer.add(ablRow(this,'Display name:',this.nameEdit));this.sizer.add(ablRow(this,'RA (J2000):',this.raEdit));this.sizer.add(ablRow(this,'Dec (J2000):',this.decEdit));
   this.sizer.add(ablRow(this,'Constellation / month:',this.constellationLabel));
   this.sizer.add(ablRow(this,'Apparent size (arcmin):',sizeRow));this.sizer.add(ablRow(this,'',this.sizeSource));
   this.sizer.add(ablRow(this,'Filters:',this.filtersEdit));this.sizer.add(ablRow(this,'Target band:',bandRow));this.sizer.add(ablRow(this,'Comments:',this.notesEdit));this.sizer.add(ablRow(this,'Catalog information:',catalogRow));this.sizer.add(status);this.sizer.add(buttons);
   this.updateBand=()=>{
      let o=ABL.copy(this.source),m=ABL.meta(o);m.filters=this.filtersEdit.text;m.notes=this.notesEdit.text;o.name=o.nameI18n=m.displayName=this.nameEdit.text;
      ABL.setCatalogInformation(o,this.catalogText.text);ABL.setTargetBand(o,this.bandSelect.values[this.bandSelect.currentItem]);
      let c=ABL.targetBand(o);this.bandHint.text=c.mode==='auto'?'Automatic: '+c.label:'Manual classification';this.bandHint.toolTip=c.reason;
   };
   this.bandSelect.onItemSelected=this.filtersEdit.onTextUpdated=this.notesEdit.onTextUpdated=this.catalogText.onTextUpdated=this.nameEdit.onTextUpdated=()=>this.updateBand();
   this.updatePosition=()=>{let ra=ABL.coordinate(this.raEdit.text,true),dec=ABL.coordinate(this.decEdit.text,false);
      let code=ra!==null&&dec!==null?ABL.constellation(ra,dec):'',key=ABL.monthKey(code,ra),month=ABL.config(parent.doc).constellationMonths[key]||0;
      this.constellationLabel.text=code?((key==='SerCap'?'Serpens Caput':key==='SerCau'?'Serpens Cauda':ABL_CONSTELLATIONS[code])+' — '+ABL.MONTHS[month]):'Enter coordinates or use Look up';};
   this.raEdit.onTextUpdated=this.decEdit.onTextUpdated=()=>this.updatePosition();
   this.fill=()=>{let o=this.source,m=ABL.meta(o);this.nameEdit.text=m.displayName||o.name||o.nameI18n||'';this.raEdit.text=o.ra===undefined||o.ra===null?'':String(o.ra);this.decEdit.text=o.dec===undefined||o.dec===null?'':String(o.dec);
      // TextBox setters interpret console markup; escape literal prose so
      // ampersands and angle brackets survive a fill/edit/save cycle.
      this.notesEdit.text=ABL.html(ABL.cleanNotes(m.notes));this.filtersEdit.text=ABL.filterInfo(o).text;
      this.useCatalogSize.checked=!ABL.own(m,'angularSize');this.fillSize();
      this.catalogText.text=ABL.html(ABL.catalogInformation(o));this.catalogText.toolTip='Object description and catalog facts in one editable field. Repeated lines are removed when applied. Your edits survive catalog updates.'+(m.catalogSource?'\nCatalog source: '+m.catalogSource:'');
      this.imaged.checked=m.imaged===true;this.imagedDate.text=m.imagedOn||'';
      let band=ABL.targetBand(o);this.bandSelect.currentItem=band.mode==='manual'?this.bandSelect.values.indexOf(band.value):0;
      this.marker.checked=o.type==='CustomObject'||!o.type;this.updatePosition();this.updateBand();};
   this.formSignature=()=>JSON.stringify([this.idEdit.text,this.nameEdit.text,this.raEdit.text,this.decEdit.text,this.useCatalogSize.checked,this.majorEdit.text,this.minorEdit.text,this.filtersEdit.text,this.notesEdit.text,this.catalogText.text,this.bandSelect.currentItem,this.imaged.checked,this.imagedDate.text,this.marker.checked]);
   this.value=()=>{if(object&&!this.lookupPerformed&&!this.catalogReset&&this.formSignature()===this.initialForm)return ABL.copy(this.initialObject);let o=ABL.copy(this.source),m=ABL.meta(o);o.designation=this.idEdit.text.trim().replace(/\s+marker$/i,'');
      o.name=this.nameEdit.text.trim();o.nameI18n=o.name;o.ra=this.raEdit.text.trim();o.dec=this.decEdit.text.trim();
      m.displayName=o.name;m.notes=ABL.cleanNotes(this.notesEdit.text);m.filters=this.filtersEdit.text.trim();m.imagedOn=this.imagedDate.text.trim();m.imaged=this.imaged.checked||!!m.imagedOn;
      ABL.setCatalogInformation(o,this.catalogText.text);
      ABL.setTargetBand(o,this.bandSelect.values[this.bandSelect.currentItem]);
      if(this.useCatalogSize.checked)delete m.angularSize;else m.angularSize=ABL.manualSize(this.majorEdit.text,this.minorEdit.text);
      if(this.marker.checked){o.type='CustomObject';o.designation+=' marker';o.isVisibleMarker=true;}
      else{o.type=m.catalogClass||((o.type&&o.type!=='CustomObject')?o.type:'Nebula');o.isVisibleMarker=false;}
      if(!o.fov)o.fov=2;ABL.validateObject(o);
      // Applying one edit must not rewrite unrelated defaults or round the
      // original coordinate representation. This also lets a later edit
      // restore the original content and clear the unsaved-change prompt.
      if(object&&!this.lookupPerformed){
         let initial=JSON.parse(this.initialForm),current=JSON.parse(this.formSignature()),original=this.initialObject,old=ABL.meta(original);
         const unchanged=indices=>indices.every(i=>initial[i]===current[i]);
         const restore=(dest,source,keys)=>{for(let key of keys){if(ABL.own(source,key))dest[key]=ABL.copy(source[key]);else delete dest[key];}};
         if(unchanged([0,13]))restore(o,original,['designation','type','isVisibleMarker']);
         if(unchanged([1])){restore(o,original,['name','nameI18n']);restore(m,old,['displayName']);}
         if(unchanged([2,3]))restore(o,original,['ra','dec','constellation']);
         if(unchanged([4,5,6]))restore(m,old,['angularSize']);
         if(unchanged([7]))restore(m,old,['filters']);
         if(unchanged([8]))restore(m,old,['notes']);
         if(unchanged([9])&&!this.catalogReset)restore(m,old,['catalogInformation']);
         if(unchanged([10]))restore(m,old,['targetBand']);
         if(unchanged([11,12]))restore(m,old,['imaged','imagedOn']);
         restore(o,original,['fov']);
      }
      return o;};
   this.fill();this.initialForm=this.formSignature();this.initialObject=ABL.copy(this.source);this.adjustToContents();
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
function ablLoadPreviewPreferences(text,style='modern-editorial'){
   let defaults={sky:{coverage:45,fitObjectSize:false,style:ablChartStyle(style).key,labelDensity:'normal',inset:false,insetDegrees:2},dss:{coverage:30,fitObjectSize:true}},saved;
   try{saved=JSON.parse(text);}catch(e){return defaults;}
   for(let key of ['sky','dss']){let value=saved?.[key],target=defaults[key];if(!value||typeof value!=='object')continue;
      if(Number.isFinite(value.coverage)&&value.coverage>=(key==='sky'?.1:5)&&value.coverage<=120)target.coverage=value.coverage;
      if(typeof value.fitObjectSize==='boolean')target.fitObjectSize=value.fitObjectSize;
      if(key==='sky'){
         if(['modern-editorial','vintage-atlas'].includes(value.style))target.style=value.style;
         if(['sparse','normal','detailed'].includes(value.labelDensity))target.labelDensity=value.labelDensity;
         if(typeof value.inset==='boolean')target.inset=value.inset;
         if(Number.isFinite(value.insetDegrees)&&value.insetDegrees>=.1&&value.insetDegrees<=120)target.insetDegrees=value.insetDegrees;
      }
   }
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

// Configuration owns temporary controls and proposed values. Cancel leaves
// previews, local preferences and collection metadata untouched.
class ABLConfigurationDialog extends Dialog { constructor(manager){
   super(manager);this.windowTitle='Configuration — '+ABL_TITLE;this.autoDefaultButton=false;
   this.doc=ABL.newDocument();ABL.config(this.doc).constellationMonths=ABL.copy(ABL.config(manager.doc).constellationMonths);
   this.outlinePath=manager.contourPath;this.outlineState=ablContourFileState(this.outlinePath);
   this.startupGroup=ablGroup(this,'Startup');
   this.rememberCollection=new CheckBox(this.startupGroup);this.rememberCollection.text='Remember last opened or saved collection';this.rememberCollection.checked=manager.rememberCollection;
   this.rememberCollection.toolTip='Off by default. When enabled, successful Open, Save and Save as operations remember the collection path for normal startup. This independent preference is stored in PixInsight settings alongside the filename. It does not save unsaved object edits. Explicit process-instance paths still open their specified collection.';
   this.startupHint=new Label(this.startupGroup);this.startupHint.wordWrapping=true;this.startupHint.setFixedWidth(this.logicalPixelsToPhysical(510));
   this.startupHint.text='Off starts with an empty collection. On reopens the last opened or saved file. Turning this off clears the remembered path, leaving the current collection open.';
   this.startupGroup.sizer.add(this.rememberCollection);this.startupGroup.sizer.add(this.startupHint);
   this.finderGroup=ablGroup(this,'Finder chart');this.dssGroup=ablGroup(this,'DSS survey image');
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
   this.styleSelect=new ComboBox(this.finderGroup);this.styleSelect.values=['modern-editorial','vintage-atlas'];
   for(let key of this.styleSelect.values)this.styleSelect.addItem(ablChartStyle(key).name);
   this.styleSelect.currentItem=this.styleSelect.values.indexOf(manager.previewPreferences.sky.style);
   this.styleSelect.toolTip='Modern Editorial uses a dark sky and sans-serif labels. Vintage Atlas uses warm paper, sepia ink and serif labels.';
   this.labelDensity=new ComboBox(this.finderGroup);this.labelDensity.values=['sparse','normal','detailed'];
   for(let name of ['Sparse','Normal','Detailed'])this.labelDensity.addItem(name);
   this.labelDensity.currentItem=this.labelDensity.values.indexOf(manager.previewPreferences.sky.labelDensity);
   this.labelDensity.toolTip='Control the number and spacing of labels without hiding object markers.';
   this.inset=new CheckBox(this.finderGroup);this.inset.text='Close-up inset';this.inset.checked=manager.previewPreferences.sky.inset;
   this.inset.toolTip='Add a separate square close-up beside the overview, using the same style, catalogs and details.';
   this.insetField=widthEdit(this.finderGroup,'Coverage (°):',.1,manager.previewPreferences.sky.insetDegrees);
   this.insetField.toolTip='Preferred close-up width for all targets. If it is too large for the current overview, that chart uses half the overview width without changing this preference.';
   this.previewValues=()=>({sky:{coverage:this.skyCoverage.value,fitObjectSize:this.skyFit.checked,style:this.styleSelect.values[this.styleSelect.currentItem],labelDensity:this.labelDensity.values[this.labelDensity.currentItem],inset:this.inset.checked,insetDegrees:this.insetField.value},dss:{coverage:this.surveyField.value,fitObjectSize:this.dssFit.checked}});
   this.coverageHint=new Label(this);this.coverageHint.wordWrapping=true;this.coverageHint.setFixedWidth(this.logicalPixelsToPhysical(510));
   this.updating=false;
   this.updateFraming=()=>{
      this.skyCoverage.enabled=!this.skyFit.checked;this.surveyField.enabled=!this.dssFit.checked;this.insetField.enabled=this.inset.checked;
      let size=manager.dssPage.object?ABL.angularSize(manager.dssPage.object):null;
      this.coverageHint.text='Settings apply to all targets and are remembered between launches. With fitting enabled, the widths shown are used when object size is unknown.'+(size&&size.majorArcmin>120?' The current DSS target uses the 120′ maximum.':'');
   };
   this.skyFit.onCheck=this.dssFit.onCheck=this.inset.onCheck=this.updateFraming;
   const pair=(left,right)=>{left.setFixedWidth(optionWidth);let row=new HorizontalSizer;row.spacing=12;row.add(left);row.add(right);row.addStretch();return row;};
   // Reserve the same checkbox and label columns on every row. Fixed-width
   // choices align with the numeric fields without expanding across the group.
   const choiceRow=(caption,control)=>{control.setFixedWidth(this.logicalPixelsToPhysical(150));let label=new Label(this.finderGroup);label.text=caption;label.textAlignment=TextAlignment.Right|TextAlignment.VertCenter;label.setFixedWidth(labelWidth);let row=new HorizontalSizer;row.spacing=6;row.addSpacing(optionWidth+this.logicalPixelsToPhysical(12));row.add(label);row.add(control);row.addStretch();return row;};
   this.finderGroup.sizer.add(pair(this.skyFit,this.skyCoverage));
   this.finderGroup.sizer.add(pair(this.inset,this.insetField));
   this.finderGroup.sizer.add(choiceRow('Chart style:',this.styleSelect));
   this.finderGroup.sizer.add(choiceRow('Label density:',this.labelDensity));
   this.dssGroup.sizer.add(pair(this.dssFit,this.surveyField));this.updateFraming();
   this.outlineGroup=ablGroup(this,'Nebula outlines');this.outlineLabel=new Label(this.outlineGroup);this.outlineLabel.text='Outline file:';
   this.outlineStatus=new Label(this.outlineGroup);this.outlineStatus.wordWrapping=true;this.outlineStatus.setFixedWidth(this.logicalPixelsToPhysical(480));
   this.setOutlinePath=path=>{
      let state=ablContourFileState(path);if(path&&state.status!=='loaded')throw Error(state.error);
      this.outlinePath=path;this.outlineState=state;this.updateOutlineStatus();
   };
   this.chooseOutline=ablButton(this.outlineGroup,'Choose file…',()=>{try{
      let d=new OpenFileDialog;d.caption='Choose Stellarium outline file';d.filters=[['Stellarium / SkyChart outlines','*.dat'],['All files','*']];if(manager.executeDialog(d))this.setOutlinePath(d.filePath);
   }catch(e){manager.error(e);}},'Choose a local Stellarium outlines.dat file, also compatible with SkyChart. The data is validated before it is reported as Loaded.');
   this.clearOutline=ablButton(this.outlineGroup,'Clear file',()=>this.setOutlinePath(''),'Deselect the Stellarium outline file when applying. The file remains on disk.');
   this.updateOutlineStatus=()=>{let state=this.outlineState,name=this.outlinePath.replace(/.*[\\/]/,'');
      this.outlineStatus.text=state.status==='loaded'?'Loaded: '+name+' · '+state.count+' outlines':state.status==='empty'?'No outline file selected':state.status==='missing'?'File missing: '+name:'Not loaded: '+name;
      this.outlineStatus.toolTip='Stellarium outline file (usually outlines.dat), also compatible with SkyChart.\n'+(this.outlinePath||'Choose file to load outlines.')+(state.error?'\n'+state.error:'');this.clearOutline.enabled=!!this.outlinePath;
   };
   let outlineRow=new HorizontalSizer;outlineRow.spacing=8;outlineRow.add(this.outlineLabel);outlineRow.add(this.chooseOutline);outlineRow.add(this.clearOutline);outlineRow.addStretch();this.outlineGroup.sizer.add(outlineRow);this.outlineGroup.sizer.add(this.outlineStatus);this.updateOutlineStatus();
   this.monthsButton=ablButton(this,'Constellation months…',()=>{let d=new ABLMonthsDialog(this);if(manager.executeDialog(d))ABL.config(this.doc).constellationMonths=d.mapping;},'Edit planning months. The proposed mapping is stored with the collection only after applying Configuration.');
   this.values=()=>Object.assign(this.previewValues(),{rememberCollection:this.rememberCollection.checked,contourPath:this.outlinePath,constellationMonths:ABL.copy(ABL.config(this.doc).constellationMonths)});
   this.applyButton=ablButton(this,'Apply',()=>{try{manager.validateConfiguration(this.values());this.ok();}catch(e){manager.error(e);}});this.applyButton.defaultButton=true;
   this.cancelButton=ablButton(this,'Cancel',()=>this.cancel());
   let buttons=new HorizontalSizer;buttons.spacing=8;buttons.add(this.monthsButton);buttons.addStretch();buttons.add(this.applyButton);buttons.add(this.cancelButton);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=10;this.sizer.add(this.startupGroup);this.sizer.add(this.finderGroup);this.sizer.add(this.dssGroup);this.sizer.add(this.coverageHint);this.sizer.add(this.outlineGroup);this.sizer.add(buttons);this.adjustToContents();
}}

// Chart details is a modal proposal: preview rendering is paused while
// editing and one accepted change refreshes the active Finder chart.
class ABLChartDetailsDialog extends Dialog { constructor(manager){
   super(manager);this.windowTitle='Chart details — '+ABL_TITLE;this.autoDefaultButton=false;
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
      this.catalogSettings[n.entry.key].enabled=n.checked;this.updateCatalogEditor();};
   this.changeCatalogProperty=()=>{
      if(this.updatingCatalog)return;let entry=this.catalogTree.currentNode?.entry;if(!entry)return;
      Object.assign(this.catalogSettings[entry.key],{labels:this.catalogLabels.checked,mode:this.catalogLimit.values[this.catalogLimit.currentItem],magnitude:this.catalogMagnitude.value});
      this.updateCatalogEditor();
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
   this.contours.toolTip='Draw actual J2000 boundaries from a Stellarium outline file, usually outlines.dat (also compatible with SkyChart). Select the file with the bottom Configuration gear. Contours start enabled when a valid file is configured; uncheck to hide them.';
   for(let key of ['borders','contours','starNames','starMagnitudes','objectDetails']){
      this[key].checked=page.details[key];this.annotationPage.sizer.add(this[key]);
   }
   this.contours.enabled=manager.contourState.status==='loaded';if(!this.contours.enabled)this.contours.checked=false;
   this.values=()=>({catalogs:ABL.copy(this.catalogSettings),borders:this.borders.checked,starNames:this.starNames.checked,starMagnitudes:this.starMagnitudes.checked,objectDetails:this.objectDetails.checked,contours:this.contours.checked});
   this.applyButton=ablButton(this,'Apply',()=>{this.editedDetails=this.values();this.ok();});this.applyButton.defaultButton=true;
   this.cancelButton=ablButton(this,'Cancel',()=>this.cancel());let buttons=new HorizontalSizer;buttons.spacing=8;buttons.addStretch();buttons.add(this.applyButton);buttons.add(this.cancelButton);
   this.detailsGroup.sizer.add(this.annotationPage);this.detailsGroup.sizer.add(this.catalogPage);
   if(this.catalogNodes.length)this.catalogTree.currentNode=this.catalogNodes[0];this.updateCatalogEditor();
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=10;this.sizer.add(this.detailsGroup);this.sizer.add(buttons);this.adjustToContents();
}}

// Each tab page owns its preview bitmap; the manager owns temporary chart
// files and the render cache. Open as image loads independent pixels. Tab
// changes retain preview pixels; a changed target or chart key invalidates
// the affected page, and hidden pages defer rendering until activated.
class ABLChartPage extends Control { constructor(parent,manager,sky){
   super(parent);this.manager=manager;this.sky=sky;this.object=null;this.objectKey=null;this.bitmap=null;this.loadedPath='';this.updating=false;
   this.tableGroup=null;this.frameError='';
   this.previewState='idle';this.previewError='';this.renderSummary='';this.canPreview=false;
   this.settings=ablPreviewSettings(null,sky,manager.previewPreferences[sky?'sky':'dss']);
   this.catalogEntries=sky?ablChartCatalogs():[];
   this.details={catalogs:{},borders:true,starNames:false,starMagnitudes:false,objectDetails:false,contours:sky&&manager.contourState.status==='loaded'};
   for(let entry of this.catalogEntries)this.details.catalogs[entry.key]={enabled:entry.available&&['messier','ngc'].includes(entry.key),labels:true,mode:'auto',magnitude:12};
   this.availableDetails=()=>['borders','starNames','starMagnitudes','objectDetails'].concat(manager.contourState.status==='loaded'?['contours']:[]);
   this.allDetailsEnabled=()=>sky&&this.availableDetails().every(key=>this.details[key])&&this.catalogEntries.filter(e=>e.available).every(e=>this.details.catalogs[e.key].enabled);
   this.setAllDetails=checked=>{
      let available=this.availableDetails();for(let key of ['borders','starNames','starMagnitudes','objectDetails','contours'])this.details[key]=checked&&available.includes(key);
      for(let entry of this.catalogEntries)this.details.catalogs[entry.key].enabled=checked&&entry.available;
      this.optionsChanged();
   };
   this.applyDetails=value=>{if(JSON.stringify(value)===JSON.stringify(this.details))return;this.details=ABL.copy(value);this.optionsChanged();};
   this.setContourPath=path=>{
      let state=ablContourFileState(path);if(path&&state.status!=='loaded')throw Error(state.error);
      // Enable contours when an outline file first becomes available. Keep a
      // deliberate off choice when replacing one valid file with another.
      let wasLoaded=manager.contourState.status==='loaded';
      manager.contourPath=path;manager.contourState=state;if(!path)this.details.contours=false;else if(!wasLoaded)this.details.contours=true;
      if(manager.persistPreferences)Settings.write('AstroBucketList/contourPath',DataType.String,path);
      this.optionsChanged();
   };
   this.chartOptions=()=>Object.assign(ABL.copy(this.details),{style:this.settings.style,labelDensity:this.settings.labelDensity,contourPath:manager.contourPath,inset:this.settings.inset,insetDegrees:this.settings.insetDegrees},this.tableGroup?{tableTargets:ABL.copy(this.tableGroup.targets)}:{});
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
      if(this.bitmap)status+=' · View: '+(this.view.zoom===1?'Fit':Math.round(this.view.zoom*100)+'% of fit');
      lines.push(ABL.html(status));
      if(this.tableGroup){let missing=this.tableGroup.targets.filter(t=>!ablChartTargetPosition(t));
         if(missing.length)lines.push(ABL.html(missing.length+' without coordinates; listed in the object key but not plotted.'));
         else if(this.canPreview&&!this.bitmap)lines.push('Coverage fits all shown objects. Numbered markers match the object key; close-up is omitted.');
      }
      if(!sky&&size&&size.majorArcmin>120)lines.push('Object exceeds DSS coverage: the maximum 120′ field is used.');
      else if(sky&&size&&size.majorArcmin>7200)lines.push('Sky coverage is limited to 120°.');
      if(sky){let state=manager.contourState;lines.push(ABL.html(state.status==='loaded'?'Outline file loaded: '+manager.contourPath.replace(/.*[\\/]/,'')+(this.details.contours?' · contours enabled':' · contours off'):state.status==='empty'?'No outline file selected · configure with the bottom gear.':'Outline file '+(state.status==='missing'?'missing':'invalid')+' · check Configuration.'));}
      this.info.text=lines.join('<br/>');this.info.toolTip=this.previewError||this.frameError||(this.tableGroup?this.tableGroup.targets.filter(t=>!ablChartTargetPosition(t)).map(t=>t.name+' — coordinates missing').join('\n'):sky?manager.contourPath:'DSS2 Red survey at STScI');
   };
   this.clearPreview=()=>{if(this.bitmap){this.bitmap.clear();this.bitmap=null;}this.resetView(false);this.loadedPath='';this.renderSummary='';this.previewError='';this.previewState='idle';if(manager.updateImageAction)manager.updateImageAction();if(this.retryButton)this.retryButton.visible=false;this.updateInfo();this.chart.update();};
   this.effectiveSettings=preferences=>{
      let value=ablPreviewSettings(this.object,sky,preferences);
      if(this.tableGroup){value.inset=false;try{value.coverage=ablTableChartFrame(this.tableGroup.targets,preferences.coverage).coverage;}catch(e){/* updateFields presents framing errors in the information block. */}}
      return value;
   };
   this.updateFields=()=>{
      this.frameError='';
      if(this.tableGroup){
         try{let frame=ablTableChartFrame(this.tableGroup.targets,manager.previewPreferences.sky.coverage);
            this.object={designation:this.tableGroup.title,ra:ABL.formatRA(frame.ra),dec:ABL.formatDec(frame.dec)};
         }catch(e){this.object=null;this.frameError=String(e.message||e);}
      }
      let object=this.object,position=object?ABL.position(object):{ra:null,dec:null};
      this.settings=this.effectiveSettings(manager.previewPreferences[sky?'sky':'dss']);
      if(!manager.contourState||manager.contourState.path!==manager.contourPath||manager.contourState.status==='loaded'&&!File.exists(manager.contourPath))manager.contourState=ablContourFileState(manager.contourPath);
      let state=manager.contourState,loaded=state.status==='loaded';
      if(!loaded)this.details.contours=false;
      if(manager.updateFinderActions)manager.updateFinderActions();
      this.canPreview=position.ra!==null&&position.dec!==null;this.updateInfo();
      if(manager.updateMinimumSize)manager.updateMinimumSize();
   };
   this.setObject=(object,tableGroup=null)=>{
      let copy=object?ABL.copy(object):null,record=copy?ABL.record(copy,manager.doc):null;
      let key=tableGroup?JSON.stringify(tableGroup):copy?JSON.stringify([record.id,record.designation,record.name,ABL.position(copy),ABL.angularSize(copy),ABL.objectType(copy)]):'';
      if(key===this.objectKey)return;
      this.tableGroup=tableGroup?ABL.copy(tableGroup):null;
      this.object=copy;
      this.objectKey=key;this.redrawTimer.stop();this.pendingRedraw=false;this.clearPreview();this.updateFields();this.queueRedraw();
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
      this.clearPreview();this.bitmap=bitmap;this.loadedPath=path;this.loadedField=field;if(manager.updateImageAction)manager.updateImageAction();this.chart.update();
      this.previewState='ready';this.renderSummary=sky?ablChartStyle(this.settings.style).name+' · '+field+'° coverage · target at crosshair · '+(response.catalog||'local catalogs')+(Number.isFinite(response.objectCount)?' · '+response.objectCount+' catalog objects':''):'DSS2 Red · '+field+' × '+field+' arcmin · target at crosshair';
      if(this.tableGroup)this.renderSummary=ablChartStyle(this.settings.style).name+' · '+field+'° coverage · '+this.tableGroup.targets.filter(ablChartTargetPosition).length+' numbered table objects · '+(response.catalog||'local catalogs');
      if(sky&&this.details.contours)this.renderSummary+=' · '+(response.contourCount||0)+' nebula contours';
      if(sky&&response.inset)this.renderSummary+=' · close-up '+response.inset.coverage+'°';
      this.updateInfo();manager.updateMinimumSize();
   }catch(e){this.previewError=String(e.message||e);this.previewState='error';this.retryButton.visible=true;this.updateInfo();manager.updateMinimumSize();}finally{this.rendering=false;}
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
   this.optionsChanged=()=>{this.updateFields();this.clearPreview();this.queueRedraw();};
   this.activate=()=>{this.updateFields();if(!this.bitmap)this.queueRedraw();};
   let controls=new HorizontalSizer;controls.spacing=8;
   if(sky){
      this.scopeLabel=new Label(this);this.scopeLabel.text='Chart:';this.scopeLabel.textAlignment=TextAlignment.Left|TextAlignment.VertCenter;
      this.scopeSelect=new ComboBox(this);this.scopeSelect.addItem('Selected object');this.scopeSelect.addItem('All filtered objects');this.scopeSelect.enabled=false;
      this.scopeSelect.toolTip='With a constellation filter active, chart every object currently shown in the table. All other filters and the selected list apply; checks and highlighted rows do not limit the chart. Coverage expands to fit the objects and their sizes. Numbered markers match the object key. DSS remains a single-object image.';
      this.scopeSelect.onItemSelected=()=>manager.updateSelection();controls.add(this.scopeLabel);controls.add(this.scopeSelect);
   }
   controls.addStretch();controls.add(this.retryButton);
   this.chart=new Control(this);this.chart.setMinSize(620,360);
   // Zoom changes only the viewport transform. Reuse the original bitmap and
   // render cache: wheel and drag events never trigger a catalog/DSS request.
   // Store a normalized center so resizing keeps the viewed region centered.
   this.view={zoom:1,centerX:.5,centerY:.5,drag:null};
   const arrowCursor=new Cursor(StdCursor.Arrow),panCursor=new Cursor(StdCursor.OpenHand),dragCursor=new Cursor(StdCursor.ClosedHand);
   this.updateViewCursor=()=>{this.chart.cursor=this.view.drag?dragCursor:this.bitmap&&this.view.zoom>1?panCursor:arrowCursor;};
   this.resetView=(notify=true)=>{this.view={zoom:1,centerX:.5,centerY:.5,drag:null};this.updateViewCursor();if(notify){this.updateInfo();this.chart.update();}};
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
      this.previewRect();this.updateViewCursor();this.updateInfo();this.chart.update();return true;
   };
   this.chart.toolTip='Wheel up to zoom in at the pointer; wheel down to zoom out. Drag with the left mouse button to pan. Double-click to fit the whole image. This changes only the preview, not sky coverage or the saved image.';
   this.chart.onMouseWheel=(x,y,delta)=>this.zoomAt(x,y,delta);
   this.chart.onMousePress=(x,y,button)=>{
      if(button!==MouseButton.Left||!this.bitmap||this.view.zoom===1||this.disposed||this.rendering)return false;
      let rect=this.previewRect();this.view.drag={x,y,centerX:this.view.centerX,centerY:this.view.centerY,width:rect.width,height:rect.height};this.updateViewCursor();return true;
   };
   this.chart.onMouseMove=(x,y,buttons)=>{
      let drag=this.view.drag;if(!drag)return false;
      if(!(buttons&MouseButton.Left)){this.view.drag=null;this.updateViewCursor();return false;}
      this.view.centerX=drag.centerX-(x-drag.x)/drag.width;this.view.centerY=drag.centerY-(y-drag.y)/drag.height;
      this.previewRect();this.chart.update();return true;
   };
   this.chart.onMouseRelease=(x,y,button)=>{if(button!==MouseButton.Left||!this.view.drag)return false;this.view.drag=null;this.updateViewCursor();return true;};
   this.chart.onMouseDoubleClick=(x,y,buttons)=>{if(!this.bitmap||!(buttons&MouseButton.Left))return false;this.resetView();return true;};
   this.chart.onResize=()=>{this.view.drag=null;this.previewRect();this.updateViewCursor();this.chart.update();};
   this.chart.onHide=()=>{this.view.drag=null;this.updateViewCursor();};
   this.chart.onPaint=()=>{let g=new Graphics(this.chart);try{
      g.fillRect(this.chart.boundsRect,new Brush(0xff10141a));
      if(this.bitmap){let r=this.previewRect(),x=r.x,y=r.y,w=r.width,h=r.height;
         // Draw only the visible source region; do not allocate enlarged
         // bitmaps at high zoom. The DSS target marker follows image center.
         let x0=Math.max(0,x),y0=Math.max(0,y),x1=Math.min(this.chart.width,x+w),y1=Math.min(this.chart.height,y+h);
         if(x1>x0&&y1>y0)g.drawScaledBitmapRect(new Rect(x0,y0,x1,y1),this.bitmap,new Rect((x0-x)/r.scale,(y0-y)/r.scale,(x1-x)/r.scale,(y1-y)/r.scale));
         if(!sky){let cx=x+w/2,cy=y+h/2;g.pen=new Pen(0xff65ff99,1);g.drawLine(cx-18,cy,cx-6,cy);g.drawLine(cx+6,cy,cx+18,cy);g.drawLine(cx,cy-18,cx,cy-6);g.drawLine(cx,cy+6,cx,cy+18);}
      }
   }finally{g.end();}};
   this.sizer=new VerticalSizer;this.sizer.margin=10;this.sizer.spacing=8;this.sizer.add(controls);this.sizer.add(this.info);this.sizer.add(this.chart,100);this.setObject(null);
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
   this.doc=ABL.normalizeDocument(doc);this.path=path;ABL.cleanDocumentNotes(this.doc);ABL.consolidateDocumentInformation(this.doc);this.savedSignature=ablCollectionSignature(this.doc);this.dirty=false;this.building=false;this.serverIndex=0;this.exportIds=new Set;
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
      ++this.chartPauseDepth;for(let page of [this.finderPage,this.dssPage])if(page)page.redrawTimer.stop();
      try{return operation();}finally{
         --this.chartPauseDepth;
         if(!this.chartPauseDepth)for(let page of [this.finderPage,this.dssPage])if(page?.pendingRedraw)page.queueRedraw();
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
   this.contourPath=ablDefaultContourPath();
   if(this.persistPreferences){let saved=Settings.read('AstroBucketList/contourPath',DataType.String);if(Settings.lastReadOK)this.contourPath=saved;}
   this.contourState=ablContourFileState(this.contourPath);
   this.chartFiles=[];this.chartCache=new Map;
   this.io={read:ablRead,readListImport:ablReadListImport,write:ablWrite,lookup:ablLookup,finder:(o,fov)=>{
      let url=ABL.finderURL(o,fov);if(this.chartCache.has(url)&&File.exists(this.chartCache.get(url)))return this.chartCache.get(url);
      // A full 120-arcminute DSS2 field can exceed 24 MiB. Keep a bounded
      // allowance large enough for the full-resolution GIF and a longer,
      // cancellable transfer deadline for these survey images.
      let data=ablTransfer(url,128*1024*1024,90),file=File.systemTempDirectory+'/AstroBucketList-'+ABL.uuid().slice(1,-1)+'.gif';
      TGFileProtection.writeFile(file,data,"DSS preview image");this.chartFiles.push(file);
      let check=new Bitmap(file);if(check.isNull)throw Error('No survey image was returned. Try a smaller field.');check.clear();this.chartCache.set(url,file);return file;
   }};
   // Cache each chart variant only for this manager session. A chart never
   // changes list metadata, imaging flags, Gaia configuration or source images.
   this.io.skyChart=(o,field,sky,chartOptions={})=>{
      let details=ABL.chartDetails(chartOptions),outlineText='';
      if(details.contours){
         if(!details.contourPath||!File.exists(details.contourPath))throw Error('Choose an available local nebula contour file.');
         outlineText=File.readTextFile(details.contourPath);
      }
      // Include every display option and contour contents. Editing a local
      // contour file cannot silently reuse a stale preview.
      let cacheDetails=Object.assign({},details,{contourPath:details.contours?details.contourPath:'',insetDegrees:details.inset?details.insetDegrees:2});
      let key='sky:'+JSON.stringify([ABL.position(o),o.designation||o.name,ABL.angularSize(o),ABL.objectType(o),field,sky,ablChartCatalogOptions(chartOptions),ablChartStyle(chartOptions.style).key,chartOptions.borders!==false,cacheDetails,outlineText,chartOptions.tableTargets||null]);
      if(this.chartCache.has(key)&&File.exists(this.chartCache.get(key).path))return this.chartCache.get(key);
      let file=File.systemTempDirectory+'/AstroBucketList-'+ABL.uuid().slice(1,-1)+'.png';this.chartFiles.push(file);
      let result=ablSkyChart(o,field,sky,file,Object.assign({},chartOptions,{outlineData:details.contours?ABL.parseOutlines(outlineText):[]}));this.chartCache.set(key,result);return result;
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
   this.typeFilter.toolTip='Object types available after the selected list, Find, Month, Constellation, Target band and Imaging status filters. The current Object type choice does not hide alternative types. An unavailable selection resets to All object types.';
   this.bandFilter=new ComboBox(this.filterGroup);this.bandFilter.values=[null,'broadband','narrowband','unclassified'];
   for(let label of ['All target bands','Broadband','Narrowband','Unclassified'])this.bandFilter.addItem(label);
   this.bandFilter.toolTip='Filter by imaging target band. Unclassified finds objects that need a manual choice in Edit object.';
   this.clearFilters=()=>{this.searchEdit.text='';this.monthFilter.currentItem=0;this.statusFilter.currentItem=0;this.constellationFilter.currentItem=0;this.typeFilter.currentItem=0;this.bandFilter.currentItem=0;};
   this.resetFiltersButton=ablButton(this.filterGroup,'Reset filters',()=>{
      // Reset view filters only. Keep list choice, row order, export checks
      // and saved object metadata, including imaging/filter information.
      this.clearFilters();this.refreshTree();
   },'Clear Find, Month, imaging state, Constellation, Object type and Target band. Keep the sort order and checked objects.');
   this.sortModes=['constellation','month','month-desc','size','size-desc','ra','ra-desc','dec','dec-desc'];
   this.sortSelect=new ComboBox(this.sortGroup);this.secondarySortSelect=new ComboBox(this.sortGroup);this.tertiarySortSelect=new ComboBox(this.sortGroup);
   for(let control of [this.secondarySortSelect,this.tertiarySortSelect])control.addItem('None');
   for(let text of ['Constellation','Month: January–December','Month: December–January','Size: smallest first','Size: largest first','RA: increasing','RA: decreasing','Dec: increasing','Dec: decreasing'])for(let control of [this.sortSelect,this.secondarySortSelect,this.tertiarySortSelect])control.addItem(text);
   this.sortSelect.toolTip='Primary sort: change row order by constellation, calendar month, major diameter, or numeric J2000 RA/Dec. Then by breaks ties. Missing values stay last in either direction.';
   this.secondarySortSelect.toolTip='Optional secondary sort, used only when primary values are equal. For example: Sort by Dec: increasing, then Size: largest first. None skips this criterion.';
   this.tertiarySortSelect.toolTip='Optional third sort, used only when the preceding selected criteria tie. For example: Dec: increasing, then Size: largest first, finally RA: increasing. None skips this criterion. Missing values stay last.';
   // Align labelled filters in two compact columns. Search has its own row
   // above the filters, while sorting remains a separate operation.
   // Measure the actual font and right-align text so even short labels end
   // immediately before their controls, without a large blank label cell.
   this.filterLabels=[];
   const filterRow=(caption,control,width)=>{let row=new HorizontalSizer;row.spacing=6;let label=new Label(this.filterGroup);label.text=caption;label.textAlignment=TextAlignment.Right|TextAlignment.VertCenter;label.setFixedWidth(width);row.add(label);row.add(control,100);this.filterLabels.push({label,control});return row;};
   let leftLabelWidth=Math.max(...['Month:','Constellation:','Target band:'].map(t=>this.font.width(t))),rightLabelWidth=Math.max(...['Imaging status:','Object type:'].map(t=>this.font.width(t)));
   let filterLeft=new VerticalSizer;filterLeft.spacing=6;filterLeft.add(filterRow('Month:',this.monthFilter,leftLabelWidth));filterLeft.add(filterRow('Constellation:',this.constellationFilter,leftLabelWidth));filterLeft.add(filterRow('Target band:',this.bandFilter,leftLabelWidth));
   let filterRight=new VerticalSizer;filterRight.spacing=6;filterRight.add(filterRow('Imaging status:',this.statusFilter,rightLabelWidth));filterRight.add(filterRow('Object type:',this.typeFilter,rightLabelWidth));let resetRow=new HorizontalSizer;resetRow.addStretch();resetRow.add(this.resetFiltersButton);filterRight.add(resetRow);
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
   this.filterColumn.sizer=new VerticalSizer;this.filterColumn.sizer.spacing=8;this.filterColumn.sizer.add(searchRow);this.filterColumn.sizer.add(this.filterGroup);this.filterColumn.sizer.addStretch();
   this.filterSection.sizer=new HorizontalSizer;this.filterSection.sizer.spacing=8;this.filterSection.sizer.add(this.filterColumn);this.filterSection.sizer.add(this.sortGroup);this.filterSection.sizer.addStretch();
   // Use the native item view strictly as a flat table. Each object is a leaf
   // row; no constellation parents or expand/collapse controls are created.
   this.tree=new TreeBox(this.tablePage);this.tree.numberOfColumns=12;this.tree.headerVisible=true;this.tree.alternateRowColor=true;this.tree.rootDecoration=false;this.tree.multipleSelection=true;
   for(let [i,t]of ['Select / object','Constellation','Name','Object type','Target band','Apparent size','Filters','Comments','Month','RA (J2000)','Dec (J2000)','Imaging status'].entries())this.tree.setHeaderText(i,t);
   this.tree.toolTip='Use Ctrl-click to select individual rows or Shift-click to select a range, then Check selected to check those objects for export. Check shown checks every filtered row. Edit object works on the current row and records imaging status and date. Export checks survive filter changes.';
   this.tree.toolTip+=' Click the sole highlighted row again to deselect it. Double-click still opens its Finder chart. Clicking a checkbox changes only its export check.';
   // Leave room for the third sort row and the optional no-results notice
   // at the normal dialog height; the table expands into all spare space.
   this.tree.setMinHeight(210);this.nodes=[];
   this.details=new TextBox(this.tablePage);this.details.readOnly=true;this.details.font=this.font;this.details.setMinHeight(105);
   this.detailsBar=new SectionBar(this.tablePage,'Object information and imaging notes');this.detailsBar.setSection(this.details);
   this.searchNotice=new Label(this.tablePage);this.searchNotice.wordWrapping=true;this.searchNotice.visible=false;
   this.addButton=ablButton(this.tablePage,'Add object…',()=>this.safe(()=>{
      let query=this.nodes.length===0?this.searchEdit.text.trim():'';
      let d=new ABLObjectDialog(this,null,query);
      if(this.executeDialog(d)){
         if(d.existingObjectId){this.openExistingObject(d.existingObjectId);return;}
         let o=ABL.addObject(this.doc,d.destinationListId,d.editedObject);this.listId=d.destinationListId;this.changed();
         // A resolved catalog name or planning month may differ from the
         // search. Reveal the accepted entry without losing export checks.
         if(query)this.clearFilters();this.refreshLists(ABL.meta(o).objectId);
      }
   }));
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
      if(typeof value.rememberCollection!=='boolean')throw Error('Choose whether to remember the last opened or saved collection.');
      for(let [key,min]of [['sky',.1],['dss',5]])if(!value[key]||!Number.isFinite(value[key].coverage)||value[key].coverage<min||value[key].coverage>120)throw Error('Choose sky coverage from 0.1–120° and survey field from 5–120 arcminutes.');
      if(!['modern-editorial','vintage-atlas'].includes(value.sky.style)||!['sparse','normal','detailed'].includes(value.sky.labelDensity))throw Error('Choose a chart style and label density.');
      if(!Number.isFinite(value.sky.insetDegrees)||value.sky.insetDegrees<.1||value.sky.insetDegrees>120)throw Error('Choose close-up coverage from 0.1–120°.');
      let state=ablContourFileState(value.contourPath);if(value.contourPath!==this.contourPath&&value.contourPath&&state.status!=='loaded')throw Error(state.error);
      return state;
   };
   this.applyConfiguration=value=>{
      // Store the preferred values, not object-specific fitted or capped
      // results. Only changes affecting the current image invalidate it.
      this.validateConfiguration(value);
      if(value.rememberCollection!==this.rememberCollection){
         // Enabling starts with the currently open path (or no path for a new
         // collection). Clear the old path before changing the persisted flag
         // so a stale filename cannot be revived by a later opt-in.
         if(this.persistPreferences){this.collectionPreferenceStore.writePath(value.rememberCollection?this.path:'');this.collectionPreferenceStore.writeRemember(value.rememberCollection);}
         this.rememberCollection=value.rememberCollection;
      }
      let next={sky:ABL.copy(value.sky),dss:ABL.copy(value.dss)},p=this.finderPage,q=this.dssPage,sky=p.effectiveSettings(next.sky),dss=q.effectiveSettings(next.dss);
      let skyChanged=JSON.stringify(p.settings)!==JSON.stringify(sky),dssChanged=JSON.stringify(q.settings)!==JSON.stringify(dss),pathChanged=this.contourPath!==value.contourPath;
      if(this.persistPreferences&&JSON.stringify(next)!==JSON.stringify(this.previewPreferences))this.previewPreferenceStore.write(JSON.stringify(next));
      this.previewPreferences=next;p.settings=sky;q.settings=dss;this.chartStyle=next.sky.style;
      if(pathChanged)p.setContourPath(value.contourPath);else if(skyChanged)p.optionsChanged();
      if(dssChanged)q.optionsChanged();
      if(JSON.stringify(ABL.config(this.doc).constellationMonths)!==JSON.stringify(value.constellationMonths)){
         ABL.config(this.doc).constellationMonths=ABL.copy(value.constellationMonths);this.changed();this.refreshTree();
      }
   };
   this.configurationButton=ablTool(this,':/icons/gear.png','Configuration: startup preference, Finder and DSS settings, chart style, Stellarium outlines and constellation months.',()=>this.safe(()=>{
      this.finderPage.updateFields();this.dssPage.updateFields();let d=new ABLConfigurationDialog(this);if(this.executeDialog(d))this.applyConfiguration(d.values());
   }));
   this.activePreview=()=>this.tabs.currentPageIndex===1?this.finderPage:this.tabs.currentPageIndex===2?this.dssPage:null;
   this.updateImageAction=()=>{let p=this.activePreview();this.openImageButton.enabled=!!p&&!!p.bitmap&&!!p.loadedPath&&!p.disposed;this.openImageButton.toolTip='Open as image: '+(p?(p.sky?'Finder chart':'DSS survey image')+' in a native PixInsight image window.':'select the Finder chart or DSS survey image tab first.');};
   this.openImageButton=ablTool(this,':/icons/window-export.png','Open as image: select a preview tab.',()=>this.safe(()=>{
      let p=this.activePreview();if(!p||!p.bitmap||!p.loadedPath||p.disposed)return;
      let windows=ImageWindow.open(p.loadedPath);if(!windows.length)throw Error('Could not open the preview image.');for(let w of windows)w.show();
   }));this.openImageButton.enabled=false;
   this.updateFinderActions=()=>{
      let p=this.finderPage,active=this.tabs.currentPageIndex===1&&!!p&&!p.disposed;
      this.chartDetailsButton.enabled=this.allDetailsButton.enabled=active;
      this.allDetailsButton.checked=!!p&&p.allDetailsEnabled();
      this.allDetailsButton.toolTip='All details: '+(this.allDetailsButton.checked?'turn off all available annotations and catalogs.':'turn on all available annotations and catalogs.')+' Catalog label and magnitude settings are retained. Available only on Finder chart.';
   };
   this.allDetailsButton=ablTool(this,':/icons/select-all.png','All details',()=>{});this.allDetailsButton.checkable=true;this.allDetailsButton.enabled=false;
   this.allDetailsButton.onClick=checked=>{if(this.tabs.currentPageIndex!==1||this.finderPage.disposed)return;this.finderPage.setAllDetails(!!checked);};
   this.chartDetailsButton=ablTool(this,':/icons/properties.png','Chart details: choose annotations, catalogs, labels and magnitude limits. Available only on Finder chart.',()=>this.safe(()=>{
      if(this.tabs.currentPageIndex!==1||this.finderPage.disposed)return;this.finderPage.updateFields();let d=new ABLChartDetailsDialog(this);if(this.executeDialog(d))this.finderPage.applyDetails(d.editedDetails);
   }));this.chartDetailsButton.enabled=false;
   this.closeButton=ablTool(this,':/process-interface/cancel.png','Close the list manager; offer to save any changes.',()=>{if(this.canClose())this.ok();});
   // One section toggle hides both groups. Keep their distinct titles and
   // compact widths so file actions and list membership remain easy to find.
   this.collectionSection=new Control(this);
   this.collectionBar=new SectionBar(this,'Collection and lists');this.collectionBar.setSection(this.collectionSection);
   this.collectionGroup=ablGroup(this.collectionSection,'Collection');this.collectionGroup.sizer.add(this.fileLabel);this.collectionGroup.sizer.add(files);
   this.listsGroup=ablGroup(this.collectionSection,'Lists');this.listsGroup.sizer.add(lists);this.listsGroup.sizer.add(listActions);this.listsGroup.sizer.addStretch();
   this.collectionSection.sizer=new HorizontalSizer;this.collectionSection.sizer.spacing=8;this.collectionSection.sizer.add(this.collectionGroup);this.collectionSection.sizer.add(this.listsGroup);this.collectionSection.sizer.addStretch();
   this.objectsGroup=ablGroup(this.tablePage,'Objects');this.objectsGroup.sizer.add(this.tree,100);this.objectsGroup.sizer.add(this.searchNotice);this.objectsGroup.sizer.add(objects);this.objectsGroup.sizer.add(selectedObjects);
   let footer=new HorizontalSizer;footer.spacing=8;footer.add(this.instanceButton);footer.add(this.summary,100);footer.add(this.allDetailsButton);footer.add(this.chartDetailsButton);footer.add(this.openImageButton);footer.add(this.configurationButton);footer.add(this.closeButton);footer.add(this.helpButton);
   this.tablePage.sizer=new VerticalSizer;this.tablePage.sizer.margin=8;this.tablePage.sizer.spacing=8;this.tablePage.sizer.add(this.filterBar);this.tablePage.sizer.add(this.filterSection);this.tablePage.sizer.add(this.objectsGroup,100);this.tablePage.sizer.add(this.detailsBar);this.tablePage.sizer.add(this.details);
   this.finderPage=new ABLChartPage(this.tabs,this,true);this.dssPage=new ABLChartPage(this.tabs,this,false);
   this.tabs.addPage(this.tablePage,'Table');this.tabs.addPage(this.finderPage,'Finder chart');this.tabs.addPage(this.dssPage,'DSS survey image');this.tabs.currentPageIndex=0;
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
   this.changed=()=>{this.dirty=ablCollectionSignature(this.doc)!==this.savedSignature;this.updateHeader();};
   this.updateHeader=()=>{this.windowTitle=ABL_TITLE+' '+ABL_VERSION+(this.dirty?' *':'');this.fileLabel.text=(this.path||'Unsaved collection')+(this.dirty?' — modified':'');this.fileLabel.toolTip=this.path;this.listSelect.toolTip=this.listSelect.itemText(this.listSelect.currentItem);this.saveButton.enabled=this.dirty||!this.path;this.instanceButton.enabled=!!this.path;if(this.updateMinimumSize)this.updateMinimumSize();};
   this.refreshLists=(selectId='')=>{let ids=Object.keys(this.doc.observingLists);if(this.listId&&!ABL.own(this.doc.observingLists,this.listId))this.listId='';
      this.listIds=[''].concat(ids);this.listSelect.clear();this.listSelect.addItem('All objects');for(let id of ids)this.listSelect.addItem(this.doc.observingLists[id].name);
      this.listSelect.currentItem=Math.max(0,this.listIds.indexOf(this.listId||''));this.refreshTree(selectId);};
   this.filterOptions=()=>({search:this.searchEdit.text,month:this.monthFilter.values[this.monthFilter.currentItem],status:['all','not-imaged','imaged'][this.statusFilter.currentItem],constellation:this.constellationFilter.values[this.constellationFilter.currentItem],objectType:this.typeFilter.values[this.typeFilter.currentItem],band:this.bandFilter.values[this.bandFilter.currentItem]});
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
         this.searchNotice.text='No matches in this view. Use Add searched object to create an entry, or Reset filters to widen the search.';
         this.searchNotice.visible=noMatch;
      }finally{this.building=false;this.updateSelection();this.updateHeader();}
   };
   this.updateSummary=(all=ABL.records(this.doc,this.listId))=>{let highlighted=this.tree.selectedNodes.length;this.summary.text=this.nodes.length+' shown / '+all.length+' objects · '+all.filter(r=>r.imaged).length+' imaged · '+highlighted+' selected · '+this.exportIds.size+' checked';this.uncheckButton.enabled=this.exportIds.size>0;this.checkSelectedButton.enabled=highlighted>0;this.addToListButton.enabled=this.moveToListButton.enabled=this.exportSelectedButton.enabled=this.actionSelectionIds().length>0;this.checkShownButton.enabled=this.nodes.length>0;this.resetFiltersButton.enabled=!!this.searchEdit.text||this.monthFilter.currentItem!==0||this.statusFilter.currentItem!==0||this.constellationFilter.currentItem!==0||this.typeFilter.currentItem!==0||this.bandFilter.currentItem!==0;};
   this.updateSelection=()=>{let r=this.selected();this.editButton.enabled=this.deleteObjectButton.enabled=!!r;this.catalogButton.enabled=(this.listId?this.doc.observingLists[this.listId].objects:ABL.refs(this.doc)).length>0;this.removeButton.enabled=!!r&&!!this.listId;
      this.rowSelectionState={id:r?r.id:'',highlights:this.tree.selectedNodes.filter(n=>n.record).map(n=>n.record.id)};if(r)this.clearedSelectionId='';
      let p=this.finderPage,code=this.constellationFilter.values[this.constellationFilter.currentItem];p.scopeSelect.enabled=!!code;
      if(!code)p.scopeSelect.currentItem=0;
      let group=code&&p.scopeSelect.currentItem===1?{title:this.constellationFilter.itemText(this.constellationFilter.currentItem),targets:ablTableChartTargets(this.nodes.map(n=>n.record))}:null;
      p.setObject(r?r.object:null,group);this.dssPage.setObject(r?r.object:null);
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
   this.openExistingObject=id=>{
      if(!ABL.refs(this.doc).some(r=>ABL.meta(r.object).objectId===id))throw Error('The existing object is no longer in this collection.');
      this.tabs.currentPageIndex=0;this.tabs.onPageSelected();this.listId='';this.clearFilters();
      for(let n of this.nodes)n.selected=false;
      this.refreshLists(id);this.editSelected();
   };
   this.editSelected=()=>{let r=this.selected();if(!r)return;let d=new ABLObjectDialog(this,r.object);if(this.executeDialog(d)){ABL.replaceObject(this.doc,r.id,d.editedObject);this.changed();this.refreshTree(r.id);}};
   this.updateCatalogs=targets=>{
      // Each object is committed only after a successful lookup/validation.
      // Console cancellation keeps completed updates, which still require Save.
      let result={updated:0,withoutSize:0,errors:[],cancelled:false};
      try{ablBusy(this,'Updating '+targets.length+' catalog objects…',()=>{
         for(let i=0;i<targets.length;++i){
            CoreApplication.processEvents();if(console.abortRequested){result.cancelled=true;break;}
            let r=targets[i],query=String(r.designation).replace(/\s+marker$/i,'');
            console.writeln('['+(i+1)+'/'+targets.length+'] '+query);
            try{let found=this.io.lookup(this.doc,query,this.serverIndex,true),replacement=ABL.refreshCatalog(r.object,found);
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
      let info=new Label(d);info.wordWrapping=true;info.text='Retrieve current coordinates, types and available dimensions from SIMBAD. Only object identifiers are sent. Your comments, filters, imaging status and manual sizes are retained. Stop through the process console; completed updates remain available to save.';
      let start=ablButton(d,'Update',()=>d.ok()),cancel=ablButton(d,'Cancel',()=>d.cancel()),buttons=new HorizontalSizer;buttons.addStretch();buttons.add(start);buttons.add(cancel);
      d.sizer=new VerticalSizer;d.sizer.margin=12;d.sizer.spacing=10;d.sizer.add(info);d.sizer.add(scope);d.sizer.add(buttons);d.setFixedWidth(600);d.adjustToContents();
      if(!this.executeDialog(d))return;
      let targets=choices[scope.currentItem];if(!targets.length){this.notice('No objects need this update.');return;}
      let result=this.updateCatalogs(targets);
      this.notice((result.cancelled?'Stopped. ':'')+result.updated+' objects updated. '+result.withoutSize+' have no catalog size. '+result.errors.length+' failed.'+
         (result.errors.length?'\n\n'+result.errors.slice(0,5).join('\n'):'')+'\n\nSave the collection to retain completed updates.');
   };
   // Selection is transient UI state. Keep the native row alive inside its
   // checkbox callback, and never alter saved imaging information here.
   this.tree.onNodeUpdated=(n,column)=>{if(!this.building&&n.record&&column===0){if(this.rowClick)this.rowClick.checkbox=true;if(n.checked)this.exportIds.add(n.record.id);else this.exportIds.delete(n.record.id);this.updateSummary();}};
   // Batch checks update existing native rows in place, just like a single
   // checkbox click. They never rebuild the table or change imaging flags.
   this.checkForExport=(checked,selectedOnly=false)=>{this.building=true;try{
      if(checked)for(let n of selectedOnly?this.tree.selectedNodes:this.nodes)this.exportIds.add(n.record.id);else this.exportIds.clear();
      for(let n of this.nodes)n.checked=this.exportIds.has(n.record.id);
   }finally{this.building=false;this.updateSummary();}};
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
   this.tree.onNodeActivated=n=>{if(n&&n.record){this.selectionUpdateTimer.stop();this.rowClick=null;this.clearedSelectionId='';this.tree.currentNode=n;n.selected=true;this.updateSelection();this.updateSummary();this.tabs.currentPageIndex=1;this.tabs.onPageSelected();}};
   this.listSelect.onItemSelected=i=>{this.listId=this.listIds[i]||'';this.refreshTree();};
   this.searchEdit.onTextUpdated=()=>this.refreshTree();
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
   this.openPath=path=>{let next=this.io.read(path);this.doc=ABL.normalizeDocument(next);this.path=path;this.listId='';this.exportIds.clear();ABL.cleanDocumentNotes(this.doc);ABL.consolidateDocumentInformation(this.doc);this.savedSignature=ablCollectionSignature(this.doc);this.dirty=false;this.refreshLists();this.rememberCurrentCollection();};
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
   this.cleanup=()=>{this.finderPage.disposed=this.dssPage.disposed=true;this.finderPage.redrawTimer.stop();this.dssPage.redrawTimer.stop();this.stateRefreshTimer.stop();this.selectionUpdateTimer.stop();this.rowClick=null;this.finderPage.clearPreview();this.dssPage.clearPreview();this.updateFinderActions();for(let path of this.chartFiles)try{if(File.exists(path))TGFileProtection.removeFile(path,"Collection or preview file");}catch(e){}this.chartFiles=[];this.chartCache.clear();};
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
         else for(let pass=0;pass<3;++pass){
            // Wrapped hints can gain a line after the adjacent groups settle.
            // Reserve the actual preview bounds as well as the smart minimum,
            // including when entering this tab from a shorter collapsed table.
            let page=this.tabs.currentPageIndex===1?this.finderPage:this.dssPage;
            let shortfall=Math.max(0,page.chart.position.y+page.chart.height+gutter-page.height,
               page.info.position.y+page.info.height+gutter-page.chart.position.y);
            if(shortfall<=0)break;
            this.setMinHeight(this.height+shortfall);this.ensureLayoutUpdated();
         }
      }finally{this.updatingMinimumSize=false;}
   };
   this.onResize=()=>this.updateMinimumSize();
   this.tabs.onPageSelected=()=>{this.updateMinimumSize();for(let page of [this.finderPage,this.dssPage])page.redrawTimer.stop();let page=this.tabs.currentPageIndex===1?this.finderPage:this.tabs.currentPageIndex===2?this.dssPage:null;if(page)page.activate();this.updateImageAction();this.updateFinderActions();};
   this.onHide=()=>{this.finderPage.redrawTimer.stop();this.dssPage.redrawTimer.stop();};
   this.onShow=()=>this.tabs.onPageSelected();
   // Defer minimum-size measurement until the native section transition is
   // complete; measuring mid-toggle can reserve hidden space or overlap rows.
   ablStableSection(this,this.detailsBar,this.details);
   this.collectionBar.onToggleSection=(bar,begin)=>{this.togglingSection=begin;if(!begin)this.updateMinimumSize();};
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
