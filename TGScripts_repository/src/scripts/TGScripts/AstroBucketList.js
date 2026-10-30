#engine v8
#ifndef ABL_LIBRARY
#feature-id AstroBucketList : TG Scripts > Astro Bucket List
#feature-info Maintain astronomical imaging bucket lists by constellation and month; exchange Stellarium SOL files, look up catalog objects, view DSS finder charts, and retain imaging status.
#endif

/* Astro Bucket List 0.8.0 — PixInsight 1.9.5+, PJSR V8.
 * Copyright (c) 2026 Thorsten Glebe. SPDX-License-Identifier: MIT
 * Files are saved only on an explicit Save / Export command.
 */
// BEGIN ABL_PORTABLE
// Constellation tables and the portable list model live here so the
// installed tool needs only this JavaScript file. Tests read this
// section directly; there is no generated or separate runtime copy.
// Astro Bucket List 0.8.0. IAU boundaries: Roman (1987), CDS VI/42, via Astropy.
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
  "Boo": "BoÃ¶tes",
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

/* Astro Bucket List 0.8.0 — portable data model and astronomy functions.
 * Copyright (c) 2026 Thorsten Glebe. SPDX-License-Identifier: MIT
 * This file has no GUI or filesystem dependencies; used by PJSR V8 and tests.
 */
var ABL = (function () {
   'use strict';
   const VERSION = '0.8.0', EXT = '_astroBucketList';
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

   // Public coordinate values are always decimal degrees. Sexagesimal RA
   // without an explicit degree suffix is interpreted as hours on input.
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
      return Object.keys(ABL_CONSTELLATIONS).find(k=>k.toLowerCase()===s.toLowerCase()||ABL_CONSTELLATIONS[k].toLowerCase()===s.toLowerCase())||'';
   }
   function monthKey(code,ra) {return code==='Ser'?(Number.isFinite(ra)&&ra>=255?'SerCau':'SerCap'):code;}
   function meta(o) {if(!plain(o[EXT]))o[EXT]={};return o[EXT];}
   function config(doc) {
      if(!plain(doc[EXT]))doc[EXT]={};
      let c=doc[EXT];c.schemaVersion=1;
      if(!plain(c.constellationMonths))c.constellationMonths=copy(ABL_DEFAULT_MONTHS);
      return c;
   }
   function refs(doc) {
      let result=[];
      for(let id of Object.keys(doc.observingLists))for(let object of doc.observingLists[id].objects)result.push({listId:id,object});
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
      let registry=[];
      for(let r of refs(doc)) {
         let o=r.object,m=meta(o),match=registry.find(x=>same(x,o));
         if(match){m.objectId=meta(match).objectId;
            if(m.imaged){meta(match).imaged=true;if(m.imagedOn)meta(match).imagedOn=m.imagedOn;}}
         else{if(typeof m.objectId!=='string'||!m.objectId)m.objectId=uuid();registry.push(o);}
      }
      for(let r of refs(doc)){
         let m=meta(r.object),shared=registry.find(o=>meta(o).objectId===m.objectId);
         m.imaged=meta(shared).imaged===true;
         m.imagedOn=m.imaged?text(meta(shared).imagedOn):'';
      }
   }
   function newDocument() {let d={defaultListOlud:'',observingLists:{},shortName:'Observing list for Stellarium',version:'2.1'};config(d);return d;}
   // Work on a deep copy and retain unknown Stellarium fields. Stable target
   // IDs link repeated memberships without merging different galaxy members.
   function normalizeDocument(raw) {
      if(!plain(raw)||!plain(raw.observingLists))throw Error('This file does not contain Stellarium observingLists.');
      let doc=copy(raw),ids=Object.keys(doc.observingLists);
      if(ids.length>1000)throw Error('This file contains too many lists (limit 1,000).');
      for(let id of ids){let list=doc.observingLists[id];
         if(!plain(list)||!Array.isArray(list.objects))throw Error('Invalid object array in list '+id+'.');
         if(list.objects.length>100000)throw Error('A list exceeds the 100,000-object limit.');
         if(typeof list.name!=='string')list.name='Imported list';
         for(let o of list.objects){
            if(!plain(o))throw Error('An invalid object occurs in '+list.name+'.');
            if(!text(o.designation).trim()&&!text(o.name).trim()&&position(o).ra===null)throw Error('An object has neither a name nor coordinates in '+list.name+'.');
            let m=meta(o);m.imaged=m.imaged===true;m.imagedOn=text(m.imagedOn);
         }
      }
      if(typeof doc.shortName!=='string')doc.shortName='Observing list for Stellarium';
      if(typeof doc.version!=='string')doc.version='2.1';
      config(doc);linkObjects(doc);return doc;
   }
   function parseDocument(s) {return normalizeDocument(JSON.parse(text(s).replace(/^\uFEFF/,'')));}
   function addList(doc,name) {
      name=text(name).trim();if(!name)throw Error('Enter a list name.');
      let id=uuid();doc.observingLists[id]={name,description:'','creation date':stamp(),'last edit':stamp(),objects:[],sorting:''};return id;
   }
   // Validate every selected document before committing a merged copy. This
   // keeps a malformed later file from partially changing the open collection.
   function importDocuments(doc,raws) {
      const incoming=raws.map(x=>typeof x==='string'?parseDocument(x):normalizeDocument(x));
      let next=copy(doc),addedLists=0,addedObjects=0;
      for(let source of incoming){
         for(let key of Object.keys(source))if(key!==EXT&&!own(next,key))Object.defineProperty(next,key,{value:copy(source[key]),enumerable:true,writable:true,configurable:true});
         for(let id of Object.keys(source.observingLists)){
            let list=source.observingLists[id];
            if(!own(next.observingLists,id)){Object.defineProperty(next.observingLists,id,{value:copy(list),enumerable:true,writable:true,configurable:true});++addedLists;addedObjects+=list.objects.length;continue;}
            let existing=next.observingLists[id];
            for(let o of list.objects){let match=existing.objects.find(x=>same(x,o));
               if(match){if(meta(o).imaged){meta(match).imaged=true;if(meta(o).imagedOn)meta(match).imagedOn=meta(o).imagedOn;}
                  for(let k of Object.keys(meta(o)))if(!own(meta(match),k))Object.defineProperty(meta(match),k,{value:copy(meta(o)[k]),enumerable:true,writable:true,configurable:true});
                  for(let k of Object.keys(o))if(!own(match,k))Object.defineProperty(match,k,{value:copy(o[k]),enumerable:true,writable:true,configurable:true});
               }else{existing.objects.push(copy(o));++addedObjects;}}
            existing['last edit']=stamp();
         }
      }
      linkObjects(next);cleanDocumentNotes(next);return {doc:next,addedLists,addedObjects};
   }
   function exportDocument(doc,ids) {
      let d=copy(doc);if(ids){for(let id of Object.keys(d.observingLists))if(ids.indexOf(id)<0)delete d.observingLists[id];}
      if(!Object.keys(d.observingLists).length)throw Error('Select at least one list to export.');
      if(!own(d.observingLists,d.defaultListOlud))d.defaultListOlud='';
      cleanDocumentNotes(d);return d;
   }
   // A checked-object export is a new single Stellarium list. Keep each
   // target once even when it belongs to several lists in the collection.
   function exportObjects(doc,ids) {
      let d=exportDocument(doc),wanted=new Set(ids),seen=new Set,objects=[];
      for(let r of refs(d)){let id=meta(r.object).objectId;if(wanted.has(id)&&!seen.has(id)){seen.add(id);objects.push(r.object);}}
      if(!objects.length)throw Error('Check at least one object to export.');
      d.observingLists={};let id=addList(d,'Selected objects');d.observingLists[id].objects=objects;d.defaultListOlud=id;return d;
   }
   // Apply imaging state to every list membership of the same linked target.
   function setState(doc,id,patch) {
      let count=0;
      for(let r of refs(doc))if(meta(r.object).objectId===id){
         for(let k of Object.keys(patch))meta(r.object)[k]=k==='notes'?cleanNotes(patch[k]):copy(patch[k]);
         r.listId&& (doc.observingLists[r.listId]['last edit']=stamp());++count;
      }
      return count;
   }
   function addObject(doc,listId,object) {
      let l=doc.observingLists[listId];if(!l)throw Error('Create or select a list first.');
      let matches=refs(doc).filter(r=>same(r.object,object));
      if(matches.length){let names=Array.from(new Set(matches.map(r=>text(doc.observingLists[r.listId].name))));
         throw Error('This object is already in the collection, in '+names.join(', ')+'. Select the existing object to edit it.');}
      let o=copy(object);if(!meta(o).objectId)meta(o).objectId=uuid();
      if(own(meta(o),'notes'))meta(o).notes=cleanNotes(meta(o).notes);
      l.objects.push(o);l['last edit']=stamp();return o;
   }
   function replaceObject(doc,id,replacement) {
      let others=refs(doc).filter(r=>meta(r.object).objectId!==id);
      if(others.some(r=>same(r.object,replacement)))throw Error('That identifier belongs to another object. Edit the existing object instead.');
      for(let r of refs(doc))if(meta(r.object).objectId===id){let old=r.object;
         for(let k of Object.keys(replacement))old[k]=copy(replacement[k]);
         if(own(meta(old),'notes'))meta(old).notes=cleanNotes(meta(old).notes);
         meta(old).objectId=id;doc.observingLists[r.listId]['last edit']=stamp();}
   }
   // objtype is the astronomical classification. Stellarium's type field is
   // a selection category: "Nebula" also covers galaxies and star clusters,
   // and "CustomObject" says only that the entry is a coordinate marker.
   function objectType(o) {
      let label=text(o.objtype).trim();
      if(label&&!/^(?:custom\s*object|coordinate marker|unknown|unspecified)$/i.test(label))
         return own(TYPES,label)?TYPES[label]:label.charAt(0).toUpperCase()+label.slice(1);
      let category=text((plain(o[EXT])?o[EXT].catalogClass:'')||o.type).trim();
      if(category==='Nebula')return 'Deep-sky object';
      if(!category||category==='CustomObject')return 'Unspecified';
      return category.replace(/([a-z])([A-Z])/g,'$1 $2');
   }
   // Hollow circles are obsolete source-list markers, not comment content.
   // Preserve other characters and line breaks, including degree symbols.
   function cleanNotes(notes) {
      return text(notes).replace(/^[ \t]*[○◯][ \t]*/gm,'').replace(/[○◯]/g,'');
   }
   function cleanDocumentNotes(doc) {
      let count=0;
      for(let r of refs(doc)){let m=meta(r.object);if(own(m,'notes')){
         let cleaned=cleanNotes(m.notes);if(cleaned!==m.notes){m.notes=cleaned;++count;}
      }}
      return count;
   }
   // Provenance headings are still omitted only from the compact column.
   function commentText(notes) {
      return cleanNotes(notes).split(/\r\n|\r|\n/).filter(line=>!/^\s*\[[^\]\r\n]+\/[^\]\r\n]+;\s*source line\s+\d+\s*\]\s*$/i.test(line)).join('\n').trim();
   }
   // Keep a user's editable prose separate from fetched catalog fields, so a
   // refresh can update measurements without silently replacing corrections.
   function catalogInformation(o) {
      let m=meta(o);return text(own(m,'catalogInformation')?m.catalogInformation:m.catalogSummary||o.objtype);
   }
   function setCatalogInformation(o,value) {
      let m=meta(o);value=text(value);
      if(value===text(m.catalogSummary||o.objtype))delete m.catalogInformation;
      else m.catalogInformation=value;
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
   // Refresh only catalog-owned fields. Preserve identifier, list membership,
   // imaging state, filters, personal prose, and any manual size override.
   function refreshCatalog(object,found) {
      let o=copy(object),m=meta(o),fresh=meta(found);
      for(let k of ['ra','dec','constellation','objtype'])if(own(found,k))o[k]=copy(found[k]);
      for(let k of ['catalogMainId','aliases','catalogSummary','catalogSource','catalogRetrieved','catalogClass','positionFrame'])if(own(fresh,k))m[k]=copy(fresh[k]);
      m.catalogAngularSize=catalogSize(found);
      if(!m.description)m.description=fresh.description||'';
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
   function record(o,doc) {
      let m=meta(o),p=position(o),code=p.ra!==null&&p.dec!==null?constellation(p.ra,p.dec):normalizeConstellation(o.constellation);
      let key=monthKey(code,p.ra),month=Number(config(doc).constellationMonths[key])||0,filters=filterInfo(o);
      return {object:o,id:m.objectId,designation:text(o.designation||o.name||'Unnamed position'),name:text(m.displayName||o.name||o.nameI18n),
         description:text(m.description||o.description||o.objtype),objectType:objectType(o),size:angularSize(o),sizeText:sizeText(angularSize(o)),notes:cleanNotes(m.notes),comments:commentText(m.notes),filters:filters.text,filtersFromNotes:filters.fromNotes,catalogSummary:catalogInformation(o),
         ra:p.ra,dec:p.dec,code,key,constellation:code?(key==='SerCap'?'Serpens Caput':key==='SerCau'?'Serpens Cauda':ABL_CONSTELLATIONS[code]):'Unassigned constellation',
         month,monthName:MONTHS[month],imaged:m.imaged===true,imagedOn:text(m.imagedOn)};
   }
   function records(doc,listId) {
      let arr=listId?(doc.observingLists[listId]||{objects:[]}).objects:refs(doc).map(r=>r.object),seen=new Set();
      return arr.filter(o=>{let id=meta(o).objectId;if(seen.has(id))return false;seen.add(id);return true;}).map(o=>record(o,doc));
   }
   function filter(records,options) {
      let q=text(options.search).trim().toLowerCase();
      return records.filter(r=>(options.month===undefined||options.month===-1||r.month===options.month)&&
         (!options.status||options.status==='all'||options.status==='imaged'&&r.imaged||options.status==='not-imaged'&&!r.imaged)&&
         (!q||[r.designation,r.name,r.objectType,r.filters,r.description,r.notes,r.constellation,r.code].join(' ').toLowerCase().indexOf(q)>=0));
   }
   // Sort constellation groups by their numeric planning month, not by the
   // localized month label. Unassigned groups remain last in either direction.
   function sortedRecords(records,mode='constellation') {
      return records.slice().sort((a,b)=>{
         if(mode==='month'||mode==='month-desc'){
            if(!a.month&&b.month)return 1;if(a.month&&!b.month)return -1;
            let order=(a.month-b.month)*(mode==='month-desc'?-1:1);if(order)return order;
         }
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
   const TYPES={G:'Galaxy',AGN:'Active galactic nucleus',LIN:'LINER galaxy nucleus',SyG:'Seyfert galaxy',GiG:'Galaxy in a group',GiP:'Galaxy in a pair',GiC:'Galaxy in a cluster',
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
      o[EXT]={objectId:uuid(),imaged:false,imagedOn:'',catalogMainId:main,aliases:aliases.concat([query]),description:label,
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
      monthKey,meta,config,refs,same,newDocument,normalizeDocument,parseDocument,addList,importDocuments,exportDocument,exportObjects,setState,addObject,replaceObject,
      objectType,cleanNotes,cleanDocumentNotes,commentText,catalogInformation,setCatalogInformation,filterInfo,validSize,parseAngularSize,catalogSize,angularSize,sizeText,manualSize,chartFraming,refreshCatalog,record,records,filter,sortedRecords,validDate,validateObject,parseSimbad,lookupLocal,dssField,finderURL};
})();
// END ABL_PORTABLE

// Sky charts use the standard engines already installed by PixInsight.
/* Astro Bucket List 0.8.0 — Monochrome star maps using bundled PJSR engines.
 * Copyright (c) 2026 Thorsten Glebe. SPDX-License-Identifier: MIT
 * The included engines remain part of the user's PixInsight installation.
 */
#ifndef __ABL_CHARTS
#define __ABL_CHARTS
#define SETTINGS_MODULE "AstroBucketListCharts"
#define CSG_SETTINGS_MODULE "AstroBucketListChartsCSG"
#define ANNOT_SETTINGS_MODULE "AstroBucketListChartsAnnotate"
#define VERSION "0.8.0"
#define TITLE "Astro Bucket List"
#include <pjsr/astrometry/AstrometricMetadata.js>
#include <pjsr/astrometry/AstronomicalCatalogs.js>
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

// This uses the same bundled rendering libraries as FindingChart, called as
// libraries to avoid the process's legacy invocation of nested script dialogs.
// Every catalog used here is local; DSS downloads remain a separate mode.
// Place constellation names in the visible part of their IAU regions. The
// bundled asterism centroid can lie outside a cropped map (notably Serpens).
class ABLConstellationLayer extends ConstLinesLayer {
   constructor(showNames){super();this.showNames=showNames;this.visibleNames=[];}
   Draw(g,metadata,bounds,imageWnd,engine,entities){
      let labels=this.gprops.showLabels;this.gprops.showLabels=false;
      try{super.Draw(g,metadata,bounds,imageWnd,engine,entities);}finally{this.gprops.showLabels=labels;}
      if(!labels||!this.showNames)return;
      let regions=new Map,w=metadata.scaledWidth,h=metadata.scaledHeight;
      for(let y=0;y<17;++y)for(let x=0;x<17;++x){let px=(x+.5)*w/17,py=(y+.5)*(h-60)/17,rd=metadata.Convert_I_RD(new Point(px,py));
         if(!rd)continue;let code=ABL.constellation(rd.x,rd.y);if(!code)continue;
         let key=ABL.monthKey(code,rd.x),region=regions.get(key)||{code,n:0,x:0,y:0};++region.n;region.x+=px;region.y+=py;regions.set(key,region);
      }
      g.pen=this.newLabelPen();g.font=this.newLabelFont(engine.graphicsScale*engine.textScale);this.visibleNames=[];
      for(let region of regions.values())if(region.n>=4){
         let name=ABL_CONSTELLATIONS[region.code],rect=g.font.tightBoundingRect(name),x=region.x/region.n,y=region.y/region.n;
         if(Math.abs(x-w/2)<100&&Math.abs(y-h/2)<70)y-=90;
         x=Math.max(16,Math.min(w-rect.width-16,x-rect.width/2));y=Math.max(rect.height+16,Math.min(h-76,y));
         this.visibleNames.push(name);
         if(entities)entities.push(new LabelEntity({x0:x,y0:y-rect.height,x1:x+rect.width,y1:y},{x:x+rect.width/2,y:y-rect.height/2},0,name,this));
         else g.drawText(x,y,name);
      }
   }
}
function ablSkyChart(object,fieldArcmin,skyDegrees,path,options={}){
   const position=ABL.position(object),size=1024;
   if(position.ra===null||position.dec===null)throw Error('This object needs valid coordinates first.');
   if(!Number.isFinite(fieldArcmin)||fieldArcmin<1||fieldArcmin>1800||!Number.isFinite(skyDegrees)||skyDegrees<.1||skyDegrees>120)
      throw Error('Choose a survey field of 1–1800 arcminutes and sky coverage of 0.1–120 degrees.');
   const title=String(object.designation||object.name||'Target').replace(/\s+marker$/i,'');
   let id;do{id='ABL_Sky_'+ABL.uuid().slice(1,9);}while(View.viewById(id));
   let stars=null,bitmap=null;
   try{
      let generator=new CatalogStarGenerator;
      generator.useImageMetadata=false;generator.width=generator.height=size;generator.ra=position.ra;generator.dec=position.dec;
      generator.observationTime=2451545.0;generator.rotation=0;generator.projection=0;
      // The TAN plane scale is chosen from the actual edge-to-edge angle,
      // rather than treating degrees as a flat coordinate at large fields.
      generator.resolution=2*Math.tan(skyDegrees*Math.PI/360)*180/Math.PI/size;
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
      // Use a flat black map with restrained gray glyphs. The synthetic
      // window supplies astrometry; its photographic PSF is not the map style.
      bitmap=new Bitmap(size,size);bitmap.fill(0xff000000);let symbols=new Graphics(bitmap),starCount=0;
      try{
         symbols.antialiasing=true;
         for(let catalog of [generator.catalog,generator.catalog2])for(let record of catalog.objects||[]){
            if(!record||!Number.isFinite(record.magnitude)||record.magnitude>generator.maxMagnitude)continue;
            let point=generator.metadata.Convert_RD_I(record.posRD);
            if(!point||point.x<0||point.y<0||point.x>=size||point.y>=size)continue;
            let brightness=generator.maxMagnitude-record.magnitude,radius=Math.max(1.5,Math.min(5.5,1.5+brightness*.65));
            let rect=new Rect(point.x-radius,point.y-radius,point.x+radius,point.y+radius);
            if(brightness>1.5)symbols.fillEllipse(rect,new Brush(0xffa0a0a0));
            else{symbols.pen=new Pen(0xff707070,1.4);symbols.strokeEllipse(rect);}
            ++starCount;
         }
      }finally{symbols.end();}
      stars.mainView.beginProcess(UndoFlag.NoSwapFile);
      try{stars.mainView.image.blend(bitmap);}finally{stars.mainView.endProcess();}
      bitmap.clear();bitmap=null;
      let annotation=new AnnotationEngine;annotation.window=stars;annotation.metadata=new AstrometricMetadata;
      annotation.metadata.ExtractMetadata(stars);annotation.applySTF=false;annotation.textScale=1;annotation.graphicsScale=1;
      annotation.observationTime=2451545.0;annotation.optimizeLabelPlacement=true;annotation.smallSizeThreshold=4;
      annotation.layers=[new GridLayer,new ABLConstellationLayer(skyDegrees>=5),new CatalogLayer(new MessierCatalog),new CatalogLayer(new NGCICCatalog)];
      for(let i=0;i<annotation.layers.length;++i){let layer=annotation.layers[i];layer.visible=true;
         layer.gprops.lineColor=i===0?0xff303030:0xff606060;layer.gprops.labelColor=i===0?0xff707070:0xff909090;
         layer.gprops.lineWidth=i===0?1.3:1.8;layer.gprops.labelSize=i===1?30:20;
         if(i===0)layer.density=4;
         if(i===1)layer.margin=5;
         if(i>=2){layer.gprops.labelFields=['Name','','','','','','',''];layer.catalog.magMax=Math.min(14,9-2*Math.log10(skyDegrees/30));}
         if(i===3)layer.visible=options.ngc===true;
         if(layer.visible&&layer.Load)layer.Load(annotation.metadata,annotation.vizierServer);}
      annotation.RemoveDuplicates();
      bitmap=annotation.generateRasterRenditions().bmp;
      let g=new Graphics(bitmap);
      try{
         // Mark the object's center only: no rectangle implying an image or
         // camera field of view. Object size determines automatic chart zoom.
         let center=size/2;
         g.antialiasing=true;g.textAntialiasing=true;
         g.pen=new Pen(0xffd0d0d0,1.5);
         g.drawLine(center-12,center,center-5,center);g.drawLine(center+5,center,center+12,center);
         g.drawLine(center,center-12,center,center-5);g.drawLine(center,center+5,center,center+12);
         g.fillRect(new Rect(0,size-50,size,size),new Brush(0xff000000));g.pen=new Pen(0xff909090);g.font=new Font('DejaVu Sans',12);
         g.drawText(14,size-29,title+'  |  Size '+ABL.sizeText(ABL.angularSize(object))+'  |  Sky '+skyDegrees+'°');
         g.drawText(14,size-9,'J2000  '+ABL.formatRA(position.ra)+'  '+ABL.formatDec(position.dec)+'  |  North up · East left');
      }finally{g.end();}
      bitmap.save(path);return {path:path,catalog:source,localGaia:!!local,stars:starCount,constellations:annotation.layers[1].visibleNames};
   }finally{
      if(bitmap)bitmap.clear();
      // Close only our uniquely named temporary field, including partial renders.
      let view=View.viewById(id);if(view)view.window.forceClose();
   }
}
#endif

// Native dialogs, file operations, and application entry point.

const ABL_VERSION='0.8.0';
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
function ablRow(parent,label,control){let l=new Label(parent);l.text=label;l.textAlignment=TextAlignment.Right|TextAlignment.VertCenter;l.setFixedWidth(parent.logicalPixelsToPhysical(150));let s=new HorizontalSizer;s.spacing=8;s.add(l);s.add(control,100);return s;}
function ablRead(path){let s=File.readTextFile(path);if(s.length>32*1024*1024)throw Error('This observing-list file exceeds 32 MB.');return ABL.parseDocument(s);}
// Validate a complete temporary document before replacing a saved collection.
// Keep the previous version beside it so a failed replacement can be restored.
function ablWrite(path,doc){
   const output=JSON.stringify(doc,null,2)+'\n',suffix=String(Date.now())+'-'+ABL.uuid().slice(1,9);
   const temp=path+'.tmp-'+suffix,backup=path+'.bak-'+suffix;
   let moved=false;
   try{
      File.writeTextFile(temp,output);
      ABL.parseDocument(File.readTextFile(temp));
      if(File.exists(path)){File.move(path,backup);moved=true;}
      try{File.move(temp,path);}catch(e){if(moved&&!File.exists(path))File.move(backup,path);throw e;}
   }finally{if(File.exists(temp))File.remove(temp);}
   return moved?backup:'';
}
// Bound downloads and allow console cancellation while keeping the UI alive.
function ablTransfer(url,maxBytes,timeoutSeconds=30){
   let data=new ByteArray,transfer=new NetworkTransfer,start=Date.now(),stopped='';
   transfer.setURL(url);transfer.setConnectionTimeout(10);
   transfer.setCustomHTTPHeaders(['User-Agent: AstroBucketList/'+ABL_VERSION+' (PixInsight)','Accept: */*']);
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
function ablBusy(dialog,label,operation){
   let wasEnabled=dialog.enabled,abort=console.abortEnabled;
   dialog.enabled=false;console.abortEnabled=true;console.show();console.writeln(label);CoreApplication.processEvents();
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
   return d.execute()?{name:d.nameEdit.text.trim(),description:d.descriptionEdit.text}:null;
}

// The editor works on a copy; only Apply returns a validated replacement.
class ABLObjectDialog extends Dialog { constructor(parent,object){
   super(parent);
   this.windowTitle=(object?'Edit object':'Add object')+' — '+ABL_TITLE;
   this.source=object?ABL.copy(object):{designation:'',name:'',type:'CustomObject',isVisibleMarker:true,ra:'',dec:''};
   this.editedObject=null;this.setMinWidth(660);
   let m=ABL.meta(this.source);
   this.idEdit=new Edit(this);this.idEdit.text=object?String(object.designation||object.name||'').replace(/\s+marker$/i,''):'';
   this.idEdit.toolTip='Examples: M 31, NGC 7000, LDN 1228, PK 164+31.1. Look up refreshes catalog information from SIMBAD, including available apparent dimensions.';
   this.server=new ComboBox(this);this.server.addItem('SIMBAD — Harvard');this.server.addItem('SIMBAD — Strasbourg');this.server.currentItem=parent.serverIndex||0;
   this.lookupButton=ablButton(this,'Look up',()=>{
      try{let previousObject=ABL.copy(this.source);ABL.setCatalogInformation(previousObject,this.catalogText.text);
         let previous=ABL.meta(previousObject);previous.notes=ABL.cleanNotes(this.notesEdit.text);previous.description=this.descriptionEdit.text;previous.displayName=this.nameEdit.text;
         previous.imagedOn=this.imagedDate.text.trim();previous.imaged=this.imaged.checked||!!previous.imagedOn;previous.filters=this.filtersEdit.text;
         if(this.useCatalogSize.checked)delete previous.angularSize;else previous.angularSize=ABL.manualSize(this.majorEdit.text,this.minorEdit.text);
         let found=ablBusy(this,'Looking up '+this.idEdit.text+' in SIMBAD…',()=>parent.io.lookup(parent.doc,this.idEdit.text,this.server.currentItem,true));
         let fresh=ABL.copy(ABL.meta(found));
         this.source=ABL.copy(found);
         for(let k of ['objectId','imaged','imagedOn','notes','description','displayName'])if(ABL.own(previous,k)&&previous[k]!==''&&previous[k]!==undefined)fresh[k]=previous[k];
         fresh.filters=previous.filters;
         if(ABL.own(previous,'angularSize'))fresh.angularSize=previous.angularSize;
         if(ABL.own(previous,'catalogInformation'))fresh.catalogInformation=previous.catalogInformation;
         this.source[ABL.EXT]=fresh;this.idEdit.text=String(found.designation||this.idEdit.text).replace(/\s+marker$/i,'');this.fill();parent.serverIndex=this.server.currentItem;
      }catch(e){parent.error(e);}
   },'Resolve this identifier and fill J2000 coordinates and the catalog description.');
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
   this.descriptionEdit=new TextBox(this);this.descriptionEdit.setFixedHeight(this.logicalPixelsToPhysical(76));
   this.filtersEdit=new Edit(this);this.filtersEdit.toolTip='Filter information for this object. Explicit filter mentions in existing comments are offered initially; edit or clear this field to override them.';
   this.notesEdit=new TextBox(this);this.notesEdit.setFixedHeight(this.logicalPixelsToPhysical(120));
   this.catalogText=new TextBox(this);this.catalogText.setFixedHeight(this.logicalPixelsToPhysical(108));
   this.catalogResetButton=ablButton(this,'Use catalog text',()=>{
      delete ABL.meta(this.source).catalogInformation;this.catalogText.text=ABL.html(ABL.catalogInformation(this.source));
   },'Replace your edited text with the latest retrieved catalog information. Apply to keep this change.');
   let catalogRow=new VerticalSizer;catalogRow.spacing=4;catalogRow.add(this.catalogText);let catalogActions=new HorizontalSizer;catalogActions.addStretch();catalogActions.add(this.catalogResetButton);catalogRow.add(catalogActions);
   this.imaged=new CheckBox(this);this.imaged.text='I have imaged this object';
   this.imagedDate=new Edit(this);this.imagedDate.setFixedWidth(120);this.imagedDate.toolTip='Editable imaging date, YYYY-MM-DD. Entering a date marks this object as imaged. Clear the date to keep an imaged object without a known date.';
   this.imaged.onCheck=checked=>{if(!checked)this.imagedDate.text='';else if(!this.imagedDate.text)this.imagedDate.text=ABL.today();};
   this.imagedDate.onTextUpdated=value=>{if(value.trim()&&ABL.validDate(value.trim()))this.imaged.checked=true;};
   this.marker=new CheckBox(this);this.marker.text='Export as a named coordinate marker';
   this.marker.toolTip='A marker works in Stellarium even if this catalog identifier is absent from its local database. Native catalog entries can keep their original object type.';
   let status=new HorizontalSizer;status.spacing=8;status.add(this.imaged);status.addStretch();let dl=new Label(this);dl.text='Imaged on:';status.add(dl);status.add(this.imagedDate);
   this.applyButton=ablButton(this,'Apply',()=>{try{this.editedObject=this.value();this.ok();}catch(e){parent.error(e);}});
   this.cancelButton=ablButton(this,'Cancel',()=>this.cancel());this.applyButton.defaultButton=true;
   let buttons=new HorizontalSizer;buttons.spacing=6;buttons.add(this.marker);buttons.addStretch();buttons.add(this.applyButton);buttons.add(this.cancelButton);
   this.sizer=new VerticalSizer;this.sizer.margin=12;this.sizer.spacing=7;
   this.sizer.add(ablRow(this,'Catalog identifier:',idRow));this.sizer.add(ablRow(this,'Lookup service:',this.server));
   this.sizer.add(ablRow(this,'Display name:',this.nameEdit));this.sizer.add(ablRow(this,'RA (J2000):',this.raEdit));this.sizer.add(ablRow(this,'Dec (J2000):',this.decEdit));
   this.sizer.add(ablRow(this,'Constellation / month:',this.constellationLabel));this.sizer.add(ablRow(this,'Description:',this.descriptionEdit));
   this.sizer.add(ablRow(this,'Apparent size (arcmin):',sizeRow));this.sizer.add(ablRow(this,'',this.sizeSource));
   this.sizer.add(ablRow(this,'Filters:',this.filtersEdit));this.sizer.add(ablRow(this,'Comments:',this.notesEdit));this.sizer.add(ablRow(this,'Catalog information:',catalogRow));this.sizer.add(status);this.sizer.add(buttons);
   this.updatePosition=()=>{let ra=ABL.coordinate(this.raEdit.text,true),dec=ABL.coordinate(this.decEdit.text,false);
      let code=ra!==null&&dec!==null?ABL.constellation(ra,dec):'',key=ABL.monthKey(code,ra),month=ABL.config(parent.doc).constellationMonths[key]||0;
      this.constellationLabel.text=code?((key==='SerCap'?'Serpens Caput':key==='SerCau'?'Serpens Cauda':ABL_CONSTELLATIONS[code])+' — '+ABL.MONTHS[month]):'Enter coordinates or use Look up';};
   this.raEdit.onTextUpdated=this.decEdit.onTextUpdated=()=>this.updatePosition();
   this.fill=()=>{let o=this.source,m=ABL.meta(o);this.nameEdit.text=m.displayName||o.name||o.nameI18n||'';this.raEdit.text=o.ra===undefined||o.ra===null?'':String(o.ra);this.decEdit.text=o.dec===undefined||o.dec===null?'':String(o.dec);
      // TextBox setters interpret console markup; escape literal prose so
      // ampersands and angle brackets survive a fill/edit/save cycle.
      this.descriptionEdit.text=ABL.html(m.description||o.description||o.objtype||'');this.notesEdit.text=ABL.html(ABL.cleanNotes(m.notes));this.filtersEdit.text=ABL.filterInfo(o).text;
      this.useCatalogSize.checked=!ABL.own(m,'angularSize');this.fillSize();
      this.catalogText.text=ABL.html(ABL.catalogInformation(o));this.catalogText.toolTip='Editable catalog information. Your changes survive catalog updates.'+(m.catalogSource?'\nCatalog source: '+m.catalogSource:'');
      this.imaged.checked=m.imaged===true;this.imagedDate.text=m.imagedOn||'';
      this.marker.checked=o.type==='CustomObject'||!o.type;this.updatePosition();};
   this.value=()=>{let o=ABL.copy(this.source),m=ABL.meta(o);o.designation=this.idEdit.text.trim().replace(/\s+marker$/i,'');
      o.name=this.nameEdit.text.trim();o.nameI18n=o.name;o.ra=this.raEdit.text.trim();o.dec=this.decEdit.text.trim();
      m.displayName=o.name;m.description=this.descriptionEdit.text;m.notes=ABL.cleanNotes(this.notesEdit.text);m.filters=this.filtersEdit.text.trim();m.imagedOn=this.imagedDate.text.trim();m.imaged=this.imaged.checked||!!m.imagedOn;
      ABL.setCatalogInformation(o,this.catalogText.text);
      if(this.useCatalogSize.checked)delete m.angularSize;else m.angularSize=ABL.manualSize(this.majorEdit.text,this.minorEdit.text);
      if(this.marker.checked){o.type='CustomObject';o.designation+=' marker';o.isVisibleMarker=true;}
      else{o.type=m.catalogClass||((o.type&&o.type!=='CustomObject')?o.type:'Nebula');o.isVisibleMarker=false;}
      if(!o.fov)o.fov=2;return ABL.validateObject(o);};
   this.fill();this.adjustToContents();
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

// The dialog owns only its preview bitmap. Parent-owned temporary chart files
// survive until the manager closes; Open as image loads independent pixels.
// Both preview pages belong to the main TabBox. Changing tabs never closes
// a bitmap; selecting a different target invalidates both previews instead.
class ABLChartPage extends Control { constructor(parent,manager,sky){
   super(parent);this.manager=manager;this.sky=sky;this.object=null;this.objectKey=null;this.bitmap=null;this.loadedPath='';this.updating=false;
   this.targetLabel=new Label(this);this.targetLabel.wordWrapping=true;
   this.field=new NumericEdit(this);this.field.fixed=true;this.field.autoEditWidth=false;this.field.setRange(sky ? .1 : 5,120);this.field.setPrecision(2);this.field.setValue(30);this.field.edit.setFixedWidth(90);
   this.field.toolTip=sky?'Width of the sky chart in degrees. North is up and east is left.':'Square DSS survey width, 5–120 arcminutes. Objects larger than 120 arcminutes always use the maximum width.';
   this.autoSize=new CheckBox(this);this.autoSize.text='Fit object size';
   this.autoSize.toolTip=sky?'Fit sky coverage to the saved major diameter. Uncheck for manual coverage.':'Fit the survey width to the saved major diameter. Objects larger than the DSS limit always use 120 arcminutes, regardless of this setting.';
   this.ngc=new CheckBox(this);this.ngc.text='Include NGC/IC objects';this.ngc.visible=sky;
   this.ngc.toolTip='Add deep-sky outlines and labels from the bundled NGC/IC catalog.';
   this.sizeHint=new Label(this);this.sizeHint.wordWrapping=true;
   this.caption=new Label(this);this.caption.wordWrapping=true;
   this.clearPreview=()=>{if(this.bitmap){this.bitmap.clear();this.bitmap=null;}this.loadedPath='';this.openImageButton.enabled=false;this.caption.text='';this.chart.update();};
   this.updateFields=()=>{
      let object=this.object,position=object?ABL.position(object):{ra:null,dec:null},size=object?ABL.angularSize(object):null,framing=object?ABL.chartFraming(object,sky):null;
      const forced=!sky&&size&&size.majorArcmin>120;
      this.updating=true;
      try{if(forced)this.field.setValue(120);else if(framing&&this.autoSize.checked)this.field.setValue(sky?framing.sky:framing.field);}
      finally{this.updating=false;}
      this.autoSize.enabled=!!size;this.field.enabled=!!object&&!this.autoSize.checked&&!forced;this.ngc.enabled=!!object&&sky;
      this.loadButton.enabled=position.ra!==null&&position.dec!==null;
      this.sizeHint.text=!object?'Select an object in the Table tab.':'Apparent size: '+ABL.sizeText(size)+(forced?' · Object exceeds the DSS limit: 120′ is used regardless of Fit object size.':
         (this.autoSize.checked?' · Width fitted to size':' · Manual width')+(framing.limited&&this.autoSize.checked?(sky?' · Sky coverage limited to 120°.':' · Survey width limited to 120′.'):'') );
      if(object&&(position.ra===null||position.dec===null))this.sizeHint.text+=' · Enter coordinates through Edit object.';
   };
   this.setObject=object=>{
      let copy=object?ABL.copy(object):null,record=copy?ABL.record(copy,manager.doc):null;
      let key=copy?JSON.stringify([record.id,record.designation,record.name,ABL.position(copy),ABL.angularSize(copy)]):'';
      this.object=copy;this.targetLabel.text=record?record.designation.replace(/\s+marker$/i,'')+(record.name?' — '+record.name:'')+'  |  J2000: '+(copy.ra===undefined?'?':copy.ra)+'  '+(copy.dec===undefined?'?':copy.dec):'No object selected';
      if(key===this.objectKey)return;
      this.objectKey=key;this.clearPreview();this.autoSize.checked=!!(record&&record.size);this.field.setValue(30);this.updateFields();
   };
   this.loadButton=ablButton(this,sky?'Create chart':'Load survey image',()=>{try{
      if(!this.object)throw Error('Select an object in the Table tab first.');
      // Enforce the DSS cap again immediately before every request, including
      // when a manual width was entered or automatic fitting was unchecked.
      this.updateFields();let object=this.object,field=this.field.value;
      let response=ablBusy(manager,sky?'Creating a monochrome star map…':'Loading DSS2 Red survey image…',()=>sky?
         manager.io.skyChart(object,ABL.chartFraming(object,true).field,field,{ngc:this.ngc.checked}):manager.io.finder(object,ABL.dssField(object,field)));
      let path=typeof response==='string'?response:response.path,bitmap=new Bitmap(path);
      if(bitmap.isNull)throw Error('No chart image was returned. Try again with a different field.');
      this.clearPreview();this.bitmap=bitmap;this.loadedPath=path;this.loadedField=field;this.openImageButton.enabled=true;this.chart.update();
      this.caption.text=sky?'Sky chart · '+field+'° coverage · target at crosshair · '+(response.catalog||'local catalogs'):'DSS2 Red · '+field+' × '+field+' arcmin · target at crosshair';
   }catch(e){manager.error(e);}},sky?'Render the selected object in this tab using local star and annotation catalogs.':'Download the selected DSS field and display it in this tab.');
   this.openImageButton=ablButton(this,'Open as image',()=>{try{let windows=ImageWindow.open(this.loadedPath);if(!windows.length)throw Error('Could not open the chart image.');for(let w of windows)w.show();}catch(e){manager.error(e);}},'Optional: open a native PixInsight image for saving or further processing. The preview stays in this tab.');this.openImageButton.enabled=false;
   this.field.onValueUpdated=()=>{if(!this.updating){this.updateFields();this.clearPreview();}};
   this.autoSize.onCheck=()=>{this.updateFields();this.clearPreview();};this.ngc.onCheck=()=>this.clearPreview();
   let controls=new HorizontalSizer;controls.spacing=8;let label=new Label(this);label.text=sky?'Sky coverage (°):':'Survey field (arcmin):';controls.add(label);controls.add(this.field);controls.add(this.autoSize);if(sky)controls.add(this.ngc);controls.addStretch();controls.add(this.loadButton);controls.add(this.openImageButton);
   this.chart=new Control(this);this.chart.setMinSize(620,360);
   this.chart.onPaint=()=>{let g=new Graphics(this.chart);try{
      g.fillRect(this.chart.boundsRect,new Brush(0xff10141a));
      if(this.bitmap){let scale=Math.min((this.chart.width-24)/this.bitmap.width,(this.chart.height-24)/this.bitmap.height),w=Math.round(this.bitmap.width*scale),h=Math.round(this.bitmap.height*scale);
         let x=Math.round((this.chart.width-w)/2),y=Math.round((this.chart.height-h)/2);g.drawScaledBitmap(new Rect(x,y,x+w,y+h),this.bitmap);
         if(!sky){let cx=x+w/2,cy=y+h/2;g.pen=new Pen(0xff65ff99,1);g.drawLine(cx-18,cy,cx-6,cy);g.drawLine(cx+6,cy,cx+18,cy);g.drawLine(cx,cy-18,cx,cy-6);g.drawLine(cx,cy+6,cx,cy+18);}
      }else{g.pen=new Pen(0xffb7c1cc);g.drawText(25,40,this.object?(sky?'Choose Create chart to render the selected object.':'Choose Load survey image to preview the selected object.'):'Select an object in the Table tab.');}
   }finally{g.end();}};
   this.sizer=new VerticalSizer;this.sizer.margin=10;this.sizer.spacing=8;this.sizer.add(this.targetLabel);this.sizer.add(controls);this.sizer.add(this.sizeHint);this.sizer.add(this.caption);this.sizer.add(this.chart,100);this.setObject(null);
}}

class ABLDialog extends Dialog { constructor(doc,path='',options={}){
   super();
   this.doc=ABL.normalizeDocument(doc);this.path=path;this.dirty=ABL.cleanDocumentNotes(this.doc)>0;this.building=false;this.serverIndex=0;this.exportIds=new Set;
   this.persistPreferences=options.persistPreferences!==false;this.error=options.error||ablError;this.notice=options.notice||ablNotice;
   this.chartFiles=[];this.chartCache=new Map;
   this.io={read:ablRead,write:ablWrite,lookup:ablLookup,finder:(o,fov)=>{
      let url=ABL.finderURL(o,fov);if(this.chartCache.has(url)&&File.exists(this.chartCache.get(url)))return this.chartCache.get(url);
      // A full 120-arcminute DSS2 field can exceed 24 MiB. Keep a bounded
      // allowance large enough for the full-resolution GIF and a longer,
      // cancellable transfer deadline for these survey images.
      let data=ablTransfer(url,128*1024*1024,90),file=File.systemTempDirectory+'/AstroBucketList-'+ABL.uuid().slice(1,-1)+'.gif';
      File.writeFile(file,data);this.chartFiles.push(file);
      let check=new Bitmap(file);if(check.isNull)throw Error('No survey image was returned. Try a smaller field.');check.clear();this.chartCache.set(url,file);return file;
   }};
   // Cache each chart variant only for this manager session. A chart never
   // changes list metadata, imaging flags, Gaia configuration or source images.
   this.io.skyChart=(o,field,sky,chartOptions={})=>{
      let key='sky:'+JSON.stringify([ABL.position(o),o.designation||o.name,ABL.angularSize(o),field,sky,chartOptions.ngc===true]);
      if(this.chartCache.has(key)&&File.exists(this.chartCache.get(key).path))return this.chartCache.get(key);
      let file=File.systemTempDirectory+'/AstroBucketList-'+ABL.uuid().slice(1,-1)+'.png';this.chartFiles.push(file);
      let result=ablSkyChart(o,field,sky,file,chartOptions);this.chartCache.set(key,result);return result;
   };
   if(options.io)for(let k of Object.keys(options.io))this.io[k]=options.io[k];
   this.windowTitle=ABL_TITLE+' '+ABL_VERSION;this.setMinSize(1040,700);
   this.titleLabel=new Label(this);this.titleLabel.wordWrapping=true;this.titleLabel.text='Plan your imaging by constellation and month, maintain Stellarium lists, and record the objects you have imaged.';
   this.fileLabel=new Label(this);this.fileLabel.wordWrapping=true;
   this.listSelect=new ComboBox(this);this.listSelect.setMinWidth(300);
   this.newListButton=ablButton(this,'New list',()=>this.safe(()=>{let v=ablDialogValue(this,'New observing list','','');if(v){this.listId=ABL.addList(this.doc,v.name);this.doc.observingLists[this.listId].description=v.description;this.changed();this.refreshLists();}}));
   this.renameListButton=ablButton(this,'List details',()=>this.safe(()=>{let l=this.doc.observingLists[this.listId];if(!l)return;let v=ablDialogValue(this,'List details',l.name,l.description);if(v){if(!v.name)throw Error('Enter a list name.');l.name=v.name;l.description=v.description;l['last edit']=ABL.stamp();this.changed();this.refreshLists();}}));
   this.deleteListButton=ablButton(this,'Delete list',()=>this.safe(()=>{let l=this.doc.observingLists[this.listId];if(!l)return;
      if(!this.confirm('Delete the list “'+l.name+'”? Its objects remain in any other lists.'))return;delete this.doc.observingLists[this.listId];this.listId='';this.changed();this.refreshLists();}));
   let lists=new HorizontalSizer;lists.spacing=6;let ll=new Label(this);ll.text='List:';lists.add(ll);lists.add(this.listSelect,100);lists.add(this.newListButton);lists.add(this.renameListButton);lists.add(this.deleteListButton);
   this.openButton=ablButton(this,'Open…',()=>this.safe(()=>this.openFile()));
   this.importButton=ablButton(this,'Import…',()=>this.safe(()=>this.importFiles()));
   this.saveButton=ablButton(this,'Save',()=>this.safe(()=>this.save()));
   this.saveAsButton=ablButton(this,'Save as…',()=>this.safe(()=>this.save(true)));
   this.exportButton=ablButton(this,'Export…',()=>this.safe(()=>this.exportFiles()));
   let files=new HorizontalSizer;files.spacing=6;for(let b of [this.openButton,this.importButton,this.saveButton,this.saveAsButton,this.exportButton])files.add(b);files.addStretch();
   this.tabs=new TabBox(this);this.tablePage=new Control(this.tabs);
   this.searchEdit=new Edit(this.tablePage);this.searchEdit.toolTip='Search identifiers, names, object types, filters, descriptions, comments, or constellations.';
   this.monthFilter=new ComboBox(this.tablePage);this.monthFilter.addItem('All months');for(let i=1;i<=12;++i)this.monthFilter.addItem(ABL.MONTHS[i]);this.monthFilter.addItem('Unassigned month');
   this.statusFilter=new ComboBox(this.tablePage);for(let s of ['All imaging states','Not yet imaged','Imaged'])this.statusFilter.addItem(s);
   this.sortSelect=new ComboBox(this.tablePage);for(let text of ['Constellation','Month: January–December','Month: December–January'])this.sortSelect.addItem(text);this.sortSelect.toolTip='Sort constellation groups by name or numeric planning month. Unassigned months remain last.';
   let filters=new HorizontalSizer;filters.spacing=8;let sl=new Label(this.tablePage);sl.text='Find:';filters.add(sl);filters.add(this.searchEdit,100);filters.add(this.monthFilter);filters.add(this.statusFilter);let sortLabel=new Label(this.tablePage);sortLabel.text='Sort by:';filters.add(sortLabel);filters.add(this.sortSelect);
   this.tree=new TreeBox(this.tablePage);this.tree.numberOfColumns=10;this.tree.headerVisible=true;this.tree.alternateRowColor=true;this.tree.rootDecoration=true;this.tree.multipleSelection=false;
   for(let [i,t]of ['Export / object / constellation','Name / description','Object type','Apparent size','Filters','Comments','Month','RA (J2000)','Dec (J2000)','Imaging status'].entries())this.tree.setHeaderText(i,t);
   this.tree.toolTip='Check objects to select them for Export. Use Edit object to record imaging status and date. Checked objects stay selected when filters change.';
   this.tree.setMinHeight(340);this.nodes=[];
   this.details=new TextBox(this.tablePage);this.details.readOnly=true;this.details.font=this.font;this.details.setMinHeight(105);
   this.detailsBar=new SectionBar(this.tablePage,'Object information and imaging notes');this.detailsBar.setSection(this.details);
   this.addButton=ablButton(this.tablePage,'Add object…',()=>this.safe(()=>{if(!this.listId)throw Error('Select a list, or create a new list, before adding an object.');let d=new ABLObjectDialog(this,null);if(d.execute()){let o=ABL.addObject(this.doc,this.listId,d.editedObject);this.changed();this.refreshTree(ABL.meta(o).objectId);}}));
   this.editButton=ablButton(this.tablePage,'Edit object…',()=>this.safe(()=>this.editSelected()));
   this.removeButton=ablButton(this.tablePage,'Remove from list',()=>this.safe(()=>{let r=this.selected();if(!r||!this.listId)return;
      if(!this.confirm('Remove '+r.designation+' from this list?'))return;
      let l=this.doc.observingLists[this.listId];l.objects=l.objects.filter(o=>ABL.meta(o).objectId!==r.id);l['last edit']=ABL.stamp();this.changed();this.refreshTree();}));
   this.catalogButton=ablButton(this.tablePage,'Update catalogs…',()=>this.safe(()=>this.chooseCatalogUpdate()),'Refresh coordinates, object type and available angular dimensions from SIMBAD. Personal notes, imaging status, filters and manual sizes are retained.');
   this.checkShownButton=ablButton(this.tablePage,'Check shown',()=>this.checkForExport(true),'Select all currently displayed objects for export, retaining any already checked objects hidden by filters.');
   this.uncheckButton=ablButton(this.tablePage,'Uncheck all',()=>this.checkForExport(false),'Clear the entire export selection, including objects hidden by filters.');
   this.finderButton=ablButton(this.tablePage,'Finder chart',()=>{this.tabs.currentPageIndex=1;});
   this.surveyButton=ablButton(this.tablePage,'DSS survey image',()=>{this.tabs.currentPageIndex=2;});
   let objects=new HorizontalSizer;objects.spacing=6;for(let b of [this.addButton,this.editButton,this.removeButton,this.catalogButton,this.checkShownButton,this.uncheckButton])objects.add(b);objects.addStretch();objects.add(this.finderButton);objects.add(this.surveyButton);
   this.summary=new Label(this);this.summary.wordWrapping=true;
   this.instanceButton=ablTool(this,':/process-interface/new-instance.png','Drag to save this collection path as a process icon. Save the collection first; unsaved edits are not stored in the icon.',()=>{});
   this.instanceButton.onMousePress=()=>this.safe(()=>{ablStoreInstance(this.path);this.newInstance();});
   this.helpButton=ablTool(this,':/process-interface/browse-documentation.png','Open the PiDoc user guide.',()=>ablShowDocumentation());
   this.monthsButton=ablTool(this,':/icons/gear.png','Configuration: assign imaging months to constellations.',()=>this.safe(()=>{let d=new ABLMonthsDialog(this);if(d.execute()){ABL.config(this.doc).constellationMonths=d.mapping;this.changed();this.refreshTree();}}));
   this.closeButton=ablTool(this,':/process-interface/cancel.png','Close the list manager; offer to save any changes.',()=>{if(this.canClose())this.ok();});
   this.collectionGroup=ablGroup(this,'Observing lists');this.collectionGroup.sizer.add(this.fileLabel);this.collectionGroup.sizer.add(files);this.collectionGroup.sizer.add(lists);
   this.objectsGroup=ablGroup(this.tablePage,'Objects by constellation');this.objectsGroup.sizer.add(filters);this.objectsGroup.sizer.add(this.tree,100);this.objectsGroup.sizer.add(objects);
   let footer=new HorizontalSizer;footer.spacing=8;footer.add(this.instanceButton);footer.add(this.summary,100);footer.add(this.monthsButton);footer.add(this.closeButton);footer.add(this.helpButton);
   this.tablePage.sizer=new VerticalSizer;this.tablePage.sizer.margin=8;this.tablePage.sizer.spacing=8;this.tablePage.sizer.add(this.objectsGroup,100);this.tablePage.sizer.add(this.detailsBar);this.tablePage.sizer.add(this.details);
   this.finderPage=new ABLChartPage(this.tabs,this,true);this.dssPage=new ABLChartPage(this.tabs,this,false);
   this.tabs.addPage(this.tablePage,'Table');this.tabs.addPage(this.finderPage,'Finder chart');this.tabs.addPage(this.dssPage,'DSS survey image');this.tabs.currentPageIndex=0;
   this.sizer=new VerticalSizer;this.sizer.margin=10;this.sizer.spacing=8;this.sizer.add(this.titleLabel);this.sizer.add(this.collectionGroup);this.sizer.add(this.tabs,100);this.sizer.add(footer);
   this.safe=f=>{try{return f();}catch(e){this.error(e);return false;}};
   // A checkbox's native item must outlive Qt's mouse/keyboard event handler.
   // Only remove rows after that handler returns to the event loop.
   this.stateRefreshTimer=new Timer(.01,false);
   this.stateRefreshTimer.onTimeout=()=>this.safe(()=>this.refreshTree());
   this.confirm=s=>(new MessageBox(ABL.html(s),ABL_TITLE,StdIcon.Question,StdButton.Yes,StdButton.No)).execute()===StdButton.Yes;
   this.selected=()=>{let n=this.tree.currentNode;return n&&n.record?ABL.record(n.record.object,this.doc):null;};
   this.changed=()=>{this.dirty=true;this.updateHeader();};
   this.updateHeader=()=>{this.windowTitle=ABL_TITLE+' '+ABL_VERSION+(this.dirty?' *':'');this.fileLabel.text=(this.path||'Unsaved collection')+(this.dirty?' — modified':'');this.saveButton.enabled=this.dirty||!this.path;this.instanceButton.enabled=!!this.path;};
   this.refreshLists=()=>{let ids=Object.keys(this.doc.observingLists);if(this.listId&&!ABL.own(this.doc.observingLists,this.listId))this.listId='';
      this.listIds=[''].concat(ids);this.listSelect.clear();this.listSelect.addItem('All objects (unique)');for(let id of ids)this.listSelect.addItem(this.doc.observingLists[id].name);
      this.listSelect.currentItem=Math.max(0,this.listIds.indexOf(this.listId||''));this.refreshTree();};
   // Rebuild only for changes to membership, sorting or filters. The checkbox
   // callback below keeps native tree items alive throughout their Qt event.
   this.refreshTree=(selectId='')=>{
      this.stateRefreshTimer.stop();
      this.building=true;
      try{
         let existingIds=new Set(ABL.refs(this.doc).map(r=>ABL.meta(r.object).objectId));for(let id of this.exportIds)if(!existingIds.has(id))this.exportIds.delete(id);
         let previous=this.selected();if(!selectId&&previous)selectId=previous.id;
         let all=ABL.records(this.doc,this.listId),month=this.monthFilter.currentItem,filtered=ABL.filter(all,{search:this.searchEdit.text,month:month===0?-1:month===13?0:month,status:['all','not-imaged','imaged'][this.statusFilter.currentItem]});
         let visible=ABL.sortedRecords(filtered,['constellation','month','month-desc'][this.sortSelect.currentItem]);
         this.tree.clear();this.nodes=[];let group=null,key=null,selected=null;
         for(let r of visible){if(key!==r.key){key=r.key;group=new TreeBoxNode(this.tree);group.setText(0,r.constellation+(r.code?' ('+r.code+')':''));group.setText(6,r.monthName);group.expanded=true;}
            let n=new TreeBoxNode(group);n.record=r;n.checkable=true;n.checked=this.exportIds.has(r.id);n.setText(0,r.designation.replace(/\s+marker$/i,''));n.setText(1,r.name||r.description);n.setText(2,r.objectType);n.setText(3,r.sizeText);n.setText(4,r.filters);
            // Compact the preview only; preserve the original multiline notes
            // for editing, searching, details, tooltips and SOL persistence.
            n.setText(5,r.comments.replace(/\s+/g,' ').trim());n.setText(6,r.monthName);n.setText(7,r.ra===null?'Needs lookup':ABL.formatRA(r.ra));n.setText(8,r.dec===null?'Needs lookup':ABL.formatDec(r.dec));n.setText(9,r.imaged?'Imaged'+(r.imagedOn?' · '+r.imagedOn:''):'Not yet imaged');
            n.setToolTip(0,ABL.html(r.designation));n.setToolTip(1,ABL.html(r.description));n.setToolTip(2,ABL.html(r.objectType));n.setToolTip(3,ABL.html(r.size?r.sizeText+' (arcminutes) · '+(r.size.source||'imported measurement'):'No measured size available. Use Update catalogs or Edit object.'));n.setToolTip(4,ABL.html((r.filtersFromNotes?'Filter mentions from comments: ':'')+r.filters));n.setToolTip(5,r.comments?'<p>'+ABL.html(r.comments).replace(/\r?\n/g,'<br/>')+'</p>':'');this.nodes.push(n);if(r.id===selectId)selected=n;
         }
         for(let i=0;i<10;++i)this.tree.adjustColumnWidthToContents(i);
         this.tree.setColumnWidth(0,Math.min(this.logicalPixelsToPhysical(270),Math.max(this.logicalPixelsToPhysical(180),this.tree.columnWidth(0))));
         this.tree.setColumnWidth(1,this.logicalPixelsToPhysical(210));
         this.tree.setColumnWidth(2,this.logicalPixelsToPhysical(160));
         this.tree.setColumnWidth(3,this.logicalPixelsToPhysical(140));this.tree.setColumnWidth(4,this.logicalPixelsToPhysical(120));this.tree.setColumnWidth(5,this.logicalPixelsToPhysical(230));
         if(selected){selected.selected=true;this.tree.currentNode=selected;}
         this.updateSummary(all);
         this.renameListButton.enabled=this.deleteListButton.enabled=!!this.listId;this.addButton.enabled=!!this.listId;
      }finally{this.building=false;this.updateSelection();this.updateHeader();}
   };
   this.updateSummary=(all=ABL.records(this.doc,this.listId))=>{this.summary.text=this.nodes.length+' shown / '+all.length+' objects · '+all.filter(r=>r.imaged).length+' imaged · '+this.exportIds.size+' checked for export';this.uncheckButton.enabled=this.exportIds.size>0;this.checkShownButton.enabled=this.nodes.length>0;};
   this.updateSelection=()=>{let r=this.selected();this.editButton.enabled=!!r;this.catalogButton.enabled=(this.listId?this.doc.observingLists[this.listId].objects:ABL.refs(this.doc)).length>0;this.removeButton.enabled=!!r&&!!this.listId;this.finderButton.enabled=this.surveyButton.enabled=!!r&&r.ra!==null&&r.dec!==null;
      this.finderPage.setObject(r?r.object:null);this.dssPage.setObject(r?r.object:null);
      this.details.text=r?ABL.html([r.designation+(r.name?' — '+r.name:''),r.constellation+' · '+r.monthName+' · '+(r.imaged?'Imaged '+r.imagedOn:'Not yet imaged'),'Apparent size: '+r.sizeText,r.description,r.notes,r.catalogSummary].filter(Boolean).join('\n')):'Check objects for export. Use Edit object to record imaging status and date.';
   };
   this.setImaged=(id,flag)=>{
      let current=ABL.refs(this.doc).find(r=>ABL.meta(r.object).objectId===id),date=current?ABL.meta(current.object).imagedOn:'';
      ABL.setState(this.doc,id,{imaged:flag,imagedOn:flag?(date||ABL.today()):''});
      this.building=true;
      try{
         for(let n of this.nodes)if(n.record.id===id){let r=n.record=ABL.record(n.record.object,this.doc);
            n.checked=this.exportIds.has(r.id);n.setText(9,r.imaged?'Imaged'+(r.imagedOn?' · '+r.imagedOn:''):'Not yet imaged');}
      }finally{this.building=false;}
      this.changed();this.updateSelection();this.updateSummary();
      if(this.statusFilter.currentItem!==0){this.stateRefreshTimer.stop();this.stateRefreshTimer.start();}
   };
   this.editSelected=()=>{let r=this.selected();if(!r)return;let d=new ABLObjectDialog(this,r.object);if(d.execute()){ABL.replaceObject(this.doc,r.id,d.editedObject);this.changed();this.refreshTree(r.id);}};
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
      if(!d.execute())return;
      let targets=choices[scope.currentItem];if(!targets.length){this.notice('No objects need this update.');return;}
      let result=this.updateCatalogs(targets);
      this.notice((result.cancelled?'Stopped. ':'')+result.updated+' objects updated. '+result.withoutSize+' have no catalog size. '+result.errors.length+' failed.'+
         (result.errors.length?'\n\n'+result.errors.slice(0,5).join('\n'):'')+'\n\nSave the collection to retain completed updates.');
   };
   // Selection is transient UI state. Keep the native row alive inside its
   // checkbox callback, and never alter saved imaging information here.
   this.tree.onNodeUpdated=(n,column)=>{if(!this.building&&n.record&&column===0){if(n.checked)this.exportIds.add(n.record.id);else this.exportIds.delete(n.record.id);this.updateSummary();}};
   this.checkForExport=checked=>{this.building=true;try{
      if(checked)for(let n of this.nodes)this.exportIds.add(n.record.id);else this.exportIds.clear();
      for(let n of this.nodes)n.checked=this.exportIds.has(n.record.id);
   }finally{this.building=false;this.updateSummary();}};
   this.tree.onCurrentNodeUpdated=()=>{if(!this.building)this.updateSelection();};
   this.tree.onNodeActivated=n=>{if(n.record)this.safe(()=>this.editSelected());};
   this.listSelect.onItemSelected=i=>{this.listId=this.listIds[i]||'';this.refreshTree();};
   this.searchEdit.onTextUpdated=()=>this.refreshTree();this.monthFilter.onItemSelected=this.statusFilter.onItemSelected=this.sortSelect.onItemSelected=()=>this.refreshTree();
   this.chooseSavePath=(name)=>{let d=new SaveFileDialog;d.caption='Save observing lists';d.filters=[['Stellarium observing lists','*.sol'],['Stellarium observing-list collection','*.ol']];d.defaultExtension='sol';d.initialPath=name||'Astro_Bucket_List.sol';d.overwritePrompt=true;return d.execute()?d.filePath:'';};
   this.save=(as=false)=>{let target=as||!this.path?this.chooseSavePath(this.path||'Astro_Bucket_List.sol'):this.path;if(!target)return false;
      let data=ABL.exportDocument(this.doc);this.io.write(target,data);this.path=target;this.dirty=false;this.updateHeader();
      if(this.persistPreferences)Settings.write('AstroBucketList/lastFile',DataType.String,target);return true;};
   this.canClose=()=>{if(!this.dirty)return true;let answer=(new MessageBox('Save changes to your observing lists?',ABL_TITLE,StdIcon.Question,StdButton.Yes,StdButton.No,StdButton.Cancel)).execute();
      if(answer===StdButton.Cancel)return false;if(answer===StdButton.No)return true;return this.safe(()=>this.save());};
   this.openFile=()=>{if(!this.canClose())return;let d=new OpenFileDialog;d.caption='Open observing lists';d.filters=[['Stellarium lists','*.sol','*.ol','*.json']];if(!d.execute())return;
      let next=this.io.read(d.filePath);this.doc=ABL.normalizeDocument(next);this.path=d.filePath;this.listId='';this.exportIds.clear();this.dirty=ABL.cleanDocumentNotes(this.doc)>0;this.refreshLists();};
   this.importPaths=paths=>{let raws=paths.map(p=>this.io.read(p)),merged=ABL.importDocuments(this.doc,raws);this.doc=merged.doc;this.changed();this.refreshLists();return merged;};
   this.importFiles=()=>{let d=new OpenFileDialog;d.caption='Import one or more observing-list files';d.multipleSelections=true;d.filters=[['Stellarium lists','*.sol','*.ol','*.json']];if(!d.execute())return;let r=this.importPaths(d.filePaths);this.notice('Imported '+r.addedLists+' new lists and '+r.addedObjects+' new object entries. Existing imaged flags were retained.');};
   this.exportToPath=(target,mode)=>{
      if(!['checked','list','all'].includes(mode))throw Error('Select an export scope.');
      if(mode==='list'&&!this.listId)throw Error('Select a specific list first.');
      let samePath=this.path&&File.fullPath(target).replace(/\\/g,'/').toLowerCase()===File.fullPath(this.path).replace(/\\/g,'/').toLowerCase();
      if(mode!=='all'&&samePath)throw Error('Use a different filename for a partial export, so your complete collection stays intact.');
      let data=mode==='checked'?ABL.exportObjects(this.doc,Array.from(this.exportIds)):ABL.exportDocument(this.doc,mode==='list'?[this.listId]:null);
      this.io.write(target,data);if(mode==='all'&&samePath){this.dirty=false;this.updateHeader();}return data;
   };
   this.exportFiles=()=>{let d=new Dialog(this);d.windowTitle='Export Stellarium lists';let choice=new ComboBox(d),modes=[];
      if(this.exportIds.size){choice.addItem('Checked objects ('+this.exportIds.size+') — new list');modes.push('checked');}
      choice.addItem('All lists');modes.push('all');if(this.listId){choice.addItem('Selected list only');modes.push('list');}
      let ok=ablButton(d,'Export…',()=>d.ok()),cancel=ablButton(d,'Cancel',()=>d.cancel());let buttons=new HorizontalSizer;buttons.spacing=8;buttons.addStretch();buttons.add(ok);buttons.add(cancel);
      d.sizer=new VerticalSizer;d.sizer.margin=12;d.sizer.spacing=8;d.sizer.add(choice);d.sizer.add(buttons);if(!d.execute())return;
      let mode=modes[choice.currentItem],target=this.chooseSavePath(mode==='checked'?'Selected_Objects.sol':'Astro_Bucket_List_Export.sol');if(!target)return;
      this.exportToPath(target,mode);
   };
   this.onClose=()=>this.canClose();
   this.cleanup=()=>{this.stateRefreshTimer.stop();this.finderPage.clearPreview();this.dssPage.clearPreview();for(let path of this.chartFiles)try{if(File.exists(path))File.remove(path);}catch(e){}this.chartFiles=[];this.chartCache.clear();};
   let initialLists=Object.keys(this.doc.observingLists);this.listId=initialLists.length===1?initialLists[0]:'';
   this.refreshLists();this.adjustToContents();this.resize(this.logicalPixelsToPhysical(1560),this.logicalPixelsToPhysical(820));
}}

// Process icons store only the user-selected path. Collection contents and
// unsaved edits remain owned by the SOL document, never by the process icon.
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
   }else if(lastPath&&io.exists(lastPath)){
      try{doc=io.read(lastPath);path=lastPath;}
      catch(e){io.notice('The last saved collection could not be opened. You can choose another file with Open.\n'+e.message);}
   }
   if(!doc){doc=ABL.newDocument();ABL.addList(doc,'My imaging bucket list');}
   return {doc,path};
}
function ablMain(){
   if(Parameters.isViewTarget)throw Error('Run Astro Bucket List globally to open its collection manager.');
   let instancePath=Parameters.has('collectionPath')?Parameters.getString('collectionPath'):null,last='';
   if(instancePath===null){let saved=Settings.read('AstroBucketList/lastFile',DataType.String);if(Settings.lastReadOK)last=saved;}
   let initial=ablStartupCollection(instancePath,last),dialog=new ABLDialog(initial.doc,initial.path);
   try{dialog.execute();}finally{dialog.cleanup();}
}
#ifndef ABL_LIBRARY
ablMain();
#endif
