// ============================================================
// RISK DATA — 42 territories, 6 continents
// ============================================================

const CONTINENTS = {
  'Amérique du Nord': { bonus: 5, color: '#c17f3a', lightColor: '#e8a855', territories: ['Alaska','Alberta','Amérique Centrale',"États-Unis de l'Est",'Groenland','Nord-Ouest','Ontario','Québec',"États-Unis de l'Ouest"] },
  'Amérique du Sud': { bonus: 2, color: '#3a8c3a', lightColor: '#55b858', territories: ['Argentine','Brésil','Pérou','Venezuela'] },
  'Europe':           { bonus: 5, color: '#3a5ac1', lightColor: '#5578e0', territories: ['Grande-Bretagne','Islande','Europe du Nord','Scandinavie','Europe du Sud','Ukraine',"Europe de l'Ouest"] },
  'Afrique':          { bonus: 3, color: '#c1a03a', lightColor: '#e0c055', territories: ['Afrique Centrale',"Afrique de l'Est",'Égypte','Madagascar','Afrique du Nord','Afrique du Sud'] },
  'Asie':             { bonus: 7, color: '#8c3a8c', lightColor: '#b055b0', territories: ['Afghanistan','Chine','Inde','Irkoutsk','Japon','Kamchatka','Moyen-Orient','Mongolie','Siam','Sibérie','Oural','Yakoutsk'] },
  'Océanie':          { bonus: 2, color: '#3a8c8c', lightColor: '#55b0b0', territories: ["Australie de l'Est",'Indonésie','Nouvelle-Guinée',"Australie de l'Ouest"] }
};

const ADJACENCY = {
  'Alaska': ['Alberta','Nord-Ouest','Kamchatka'],
  'Alberta': ['Alaska','Nord-Ouest','Ontario',"États-Unis de l'Ouest"],
  'Amérique Centrale': ["États-Unis de l'Ouest","États-Unis de l'Est",'Venezuela'],
  "États-Unis de l'Est": ['Amérique Centrale','Ontario','Québec',"États-Unis de l'Ouest"],
  'Groenland': ['Nord-Ouest','Ontario','Québec','Islande'],
  'Nord-Ouest': ['Alaska','Alberta','Groenland','Ontario'],
  'Ontario': ['Alberta',"États-Unis de l'Est",'Groenland','Nord-Ouest','Québec',"États-Unis de l'Ouest"],
  'Québec': ["États-Unis de l'Est",'Groenland','Ontario'],
  "États-Unis de l'Ouest": ['Alberta','Amérique Centrale',"États-Unis de l'Est",'Ontario'],
  'Argentine': ['Brésil','Pérou'],
  'Brésil': ['Argentine','Pérou','Venezuela','Afrique du Nord'],
  'Pérou': ['Argentine','Brésil','Venezuela'],
  'Venezuela': ['Brésil','Pérou','Amérique Centrale'],
  'Grande-Bretagne': ['Islande','Europe du Nord','Scandinavie',"Europe de l'Ouest"],
  'Islande': ['Grande-Bretagne','Europe du Nord','Scandinavie','Groenland'],
  'Europe du Nord': ['Grande-Bretagne','Islande','Scandinavie','Europe du Sud','Ukraine',"Europe de l'Ouest"],
  'Scandinavie': ['Grande-Bretagne','Islande','Europe du Nord','Ukraine'],
  'Europe du Sud': ['Europe du Nord','Ukraine',"Europe de l'Ouest",'Afrique du Nord','Égypte','Moyen-Orient'],
  'Ukraine': ['Europe du Nord','Scandinavie','Europe du Sud','Afghanistan','Moyen-Orient','Oural'],
  "Europe de l'Ouest": ['Grande-Bretagne','Europe du Nord','Europe du Sud','Afrique du Nord'],
  'Afrique Centrale': ["Afrique de l'Est",'Afrique du Nord','Afrique du Sud'],
  "Afrique de l'Est": ['Afrique Centrale','Égypte','Madagascar','Afrique du Nord','Afrique du Sud','Moyen-Orient'],
  'Égypte': ["Afrique de l'Est",'Afrique du Nord','Europe du Sud','Moyen-Orient'],
  'Madagascar': ["Afrique de l'Est",'Afrique du Sud'],
  'Afrique du Nord': ['Afrique Centrale',"Afrique de l'Est",'Égypte','Europe du Sud',"Europe de l'Ouest",'Brésil'],
  'Afrique du Sud': ['Afrique Centrale',"Afrique de l'Est",'Madagascar'],
  'Afghanistan': ['Chine','Inde','Moyen-Orient','Oural','Ukraine'],
  'Chine': ['Afghanistan','Inde','Irkoutsk','Mongolie','Siam','Sibérie','Oural'],
  'Inde': ['Afghanistan','Chine','Moyen-Orient','Siam'],
  'Irkoutsk': ['Chine','Kamchatka','Mongolie','Yakoutsk'],
  'Japon': ['Kamchatka','Mongolie'],
  'Kamchatka': ['Irkoutsk','Japon','Mongolie','Yakoutsk','Alaska'],
  'Moyen-Orient': ['Afghanistan','Inde','Europe du Sud','Ukraine',"Afrique de l'Est",'Égypte'],
  'Mongolie': ['Chine','Irkoutsk','Japon','Kamchatka','Sibérie'],
  'Siam': ['Chine','Inde','Indonésie'],
  'Sibérie': ['Chine','Irkoutsk','Mongolie','Oural','Yakoutsk'],
  'Oural': ['Afghanistan','Chine','Sibérie','Ukraine'],
  'Yakoutsk': ['Irkoutsk','Kamchatka','Sibérie'],
  "Australie de l'Est": ['Nouvelle-Guinée',"Australie de l'Ouest"],
  'Indonésie': ['Nouvelle-Guinée',"Australie de l'Ouest",'Siam'],
  'Nouvelle-Guinée': ["Australie de l'Est",'Indonésie',"Australie de l'Ouest"],
  "Australie de l'Ouest": ["Australie de l'Est",'Indonésie','Nouvelle-Guinée']
};

// ============================================================
// SVG POLYGON POINTS — viewBox 0 0 1000 540
// Each territory is a polygon with geographic shape
// ============================================================
const TERRITORY_PATHS = {
  // === AMÉRIQUE DU NORD ===
  'Alaska':
    '18,65 52,26 88,30 96,55 82,84 90,108 62,116 35,100',
  'Nord-Ouest':
    '88,30 202,20 215,52 202,80 188,110 155,122 118,118 96,108 85,85 96,55',
  'Groenland':
    '222,10 348,6 378,28 370,62 342,85 290,92 248,80 218,56',
  'Alberta':
    '96,112 118,118 155,122 165,175 138,182 95,178 82,152',
  'Ontario':
    '155,122 195,112 238,120 252,150 245,182 200,188 165,175',
  'Québec':
    '238,120 278,98 298,118 290,162 265,178 245,182 252,150',
  "États-Unis de l'Ouest":
    '85,178 138,185 165,178 178,232 162,255 100,250 68,222 75,192',
  "États-Unis de l'Est":
    '165,178 200,188 245,182 265,178 278,222 265,255 220,262 178,232',
  'Amérique Centrale':
    '102,252 162,255 178,235 220,262 225,280 200,298 162,292 130,275 110,262',

  // === AMÉRIQUE DU SUD ===
  'Venezuela':
    '200,298 225,280 248,280 268,295 260,320 228,325 200,315',
  'Pérou':
    '200,315 228,325 232,355 220,385 195,392 178,368 182,338',
  'Brésil':
    '228,325 260,320 282,305 318,310 330,348 322,382 295,402 258,408 232,390 232,355',
  'Argentine':
    '195,392 220,385 232,390 258,408 252,438 230,462 208,462 188,435 190,405',

  // === EUROPE ===
  'Islande':
    '346,46 382,40 392,62 379,80 352,78 340,60',
  'Scandinavie':
    '425,26 472,20 490,48 485,80 462,104 440,100 422,80 415,52',
  'Grande-Bretagne':
    '346,98 368,92 386,108 382,135 368,152 350,144 340,126',
  'Europe du Nord':
    '392,98 422,95 440,100 462,104 474,120 458,138 432,142 402,134',
  "Europe de l'Ouest":
    '352,148 368,152 382,135 404,140 410,160 402,182 380,190 354,172',
  'Europe du Sud':
    '404,140 432,142 458,138 474,120 500,130 502,158 490,186 462,198 432,192 410,178 410,160',
  'Ukraine':
    '474,120 485,80 518,68 572,72 588,98 572,130 542,148 512,148 500,158 500,130',

  // === AFRIQUE ===
  'Afrique du Nord':
    '356,210 406,200 490,200 530,205 540,225 518,252 495,270 450,272 408,266 378,252 360,228',
  'Égypte':
    '518,205 554,205 565,228 558,252 535,258 518,252 540,225',
  "Afrique de l'Est":
    '518,252 535,258 558,252 565,272 555,308 538,332 518,342 492,325 492,288 498,272',
  'Afrique Centrale':
    '408,266 450,272 495,270 498,288 492,325 472,342 440,348 412,325 408,295',
  'Afrique du Sud':
    '412,325 440,348 472,342 492,325 498,358 492,395 465,418 440,418 418,390 410,355',
  'Madagascar':
    '540,338 562,330 575,355 568,382 548,388 532,362',

  // === ASIE ===
  'Oural':
    '572,130 588,98 618,85 650,80 658,104 642,138 615,150 578,150',
  'Sibérie':
    '650,80 708,65 758,52 765,80 748,114 710,128 670,132 658,104',
  'Yakoutsk':
    '758,52 815,42 835,65 822,102 790,118 765,112 765,80',
  'Kamchatka':
    '835,65 882,52 888,82 875,118 850,138 822,132 822,102',
  'Irkoutsk':
    '710,128 748,114 765,112 790,118 800,142 782,168 755,175 728,165 710,148',
  'Mongolie':
    '728,165 755,175 782,168 800,142 822,152 825,180 810,202 772,208 734,200 715,184',
  'Japon':
    '838,148 868,140 878,165 862,182 838,178 828,162',
  'Chine':
    '658,104 670,132 710,148 728,165 715,184 734,200 740,225 725,248 700,258 672,258 645,245 620,220 612,192 612,170 642,138',
  'Afghanistan':
    '572,132 578,150 615,150 642,138 612,170 590,172 564,162 548,148 542,148',
  'Moyen-Orient':
    '542,148 548,148 564,162 590,172 600,198 596,225 572,242 548,245 530,232 528,210 535,188',
  'Inde':
    '612,170 620,220 645,245 652,275 638,302 618,308 598,295 588,265 590,225 600,198 590,172 612,170',
  'Siam':
    '700,258 725,248 740,225 755,245 760,272 748,295 722,302 700,285 692,265',

  // === OCÉANIE ===
  'Indonésie':
    '722,318 762,308 785,315 800,332 788,352 758,358 722,352 712,334',
  'Nouvelle-Guinée':
    '820,318 865,308 885,328 878,350 850,360 820,350 812,332',
  "Australie de l'Ouest":
    '762,370 815,360 850,372 858,408 850,445 818,465 782,465 754,445 746,405 754,382',
  "Australie de l'Est":
    '850,372 888,358 918,370 928,408 918,445 884,468 852,465 850,445 858,408'
};

// ============================================================
// CENTER POSITIONS — for army tokens & labels
// ============================================================
const POSITIONS = {
  'Alaska':                   [55,  72],
  'Nord-Ouest':               [148, 72],
  'Groenland':                [298, 50],
  'Alberta':                  [125, 148],
  'Ontario':                  [205, 148],
  'Québec':                   [268, 140],
  "États-Unis de l'Ouest":    [118, 215],
  "États-Unis de l'Est":      [218, 215],
  'Amérique Centrale':        [158, 272],
  'Venezuela':                [232, 302],
  'Pérou':                    [202, 355],
  'Brésil':                   [272, 358],
  'Argentine':                [222, 428],
  'Islande':                  [368, 62],
  'Scandinavie':              [452, 62],
  'Grande-Bretagne':          [365, 124],
  'Europe du Nord':           [440, 118],
  "Europe de l'Ouest":        [382, 165],
  'Europe du Sud':            [454, 162],
  'Ukraine':                  [535, 112],
  'Afrique du Nord':          [448, 235],
  'Égypte':                   [540, 230],
  "Afrique de l'Est":         [528, 298],
  'Afrique Centrale':         [452, 308],
  'Afrique du Sud':           [452, 371],
  'Madagascar':                [554, 360],
  'Oural':                    [615, 118],
  'Sibérie':                  [708, 92],
  'Yakoutsk':                 [790, 78],
  'Kamchatka':                [852, 92],
  'Irkoutsk':                 [755, 148],
  'Mongolie':                 [770, 185],
  'Japon':                    [855, 162],
  'Chine':                    [678, 195],
  'Afghanistan':              [580, 158],
  'Moyen-Orient':             [562, 202],
  'Inde':                     [618, 248],
  'Siam':                     [728, 275],
  'Indonésie':                [758, 335],
  'Nouvelle-Guinée':          [848, 335],
  "Australie de l'Ouest":     [802, 415],
  "Australie de l'Est":       [885, 415]
};

// ============================================================
// MARITIME ROUTES — sea connections drawn as dashed arcs
// ============================================================
const MARITIME_ROUTES = [
  ['Alaska',       'Kamchatka'],
  ['Groenland',    'Islande'],
  ['Brésil',       'Afrique du Nord'],
  ['Siam',         'Indonésie'],
  ['Indonésie',    "Australie de l'Ouest"],
  ['Indonésie',    'Nouvelle-Guinée'],
  ['Nouvelle-Guinée', "Australie de l'Est"],
  ['Japon',        'Mongolie'],
  ['Japon',        'Kamchatka']
];

// Grid positions for each die face (3x3 grid, 1-indexed)
const DIE_PIPS = {
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9]
};
