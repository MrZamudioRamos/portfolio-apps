#!/usr/bin/env python3
"""Add missing i18n keys to CA, GL, EU, VAL locale files."""
import json
import os

BASE = r"c:\WorkSpace\portfolio-apps\apps\huerto-tracker\src\i18n\locales"

# ─── Shared seasonal tips ────────────────────────────────────────────────────

SEASONAL_CA = {
  "atlantica": {
    "1": "Aprofita els dies sense pluja per llaurar i preparar la terra.",
    "2": "Sembra patates i cols a l’exterior quan el sòl superi els 5°C.",
    "3": "Trasplanta els planters de tomàquet i pebrot a l’interior.",
    "4": "Aprofita la pluja per plantar mongetes i pèsols.",
    "5": "Sembra carbassó i cogombre a l’exterior; cuida els pol·linitzadors.",
    "6": "Rega al capvespre per evitar l’evaporació; protegeix els fruits de l’excés d’humitat.",
    "7": "Recull tomàquets i pebrots abans que arribin pluges intenses.",
    "8": "Mes de màxima collita: recull regularment per estimular més producció.",
    "9": "Sembra espinacs, bledes i encians de tardor.",
    "10": "Planta alls i cebes d’hivern abans de les primeres gelades.",
    "11": "Incorpora compost al sòl per millorar l’estructura per a l’any vinent.",
    "12": "Planifica l’hort de la pròxima temporada i demana llavors per catàleg."
  },
  "mediterranea": {
    "1": "Sembra en planter interior pebrot i albergínia; encara hi ha risc de gelades a l’exterior.",
    "2": "Trasplanta maduixes i planta faves; el temps fresc les afavoreix.",
    "3": "Sembra tomàquet en planter; trasplanta encians i cols a l’exterior.",
    "4": "Trasplanta el tomàquet i el pebrot a l’exterior quan les nits superin els 10°C.",
    "5": "Instal·la degoteig abans de la calor; sembra mongetes i carbassó.",
    "6": "Recull alls i cebes; encoberta per conservar la humitat del sòl.",
    "7": "Màxima producció de tomàquet: recull diàriament per estimular nous fruits.",
    "8": "Sembra mongetes d’estiu i prepara el bancal de tardor a zones amb ombra.",
    "9": "Sembra bledes, espinacs i encians de tardor; la calor remiteix.",
    "10": "Planta alls i cebes; prepara bancals amb adob per a l’hivern.",
    "11": "Trasplanta bròquil i coliflor; les pluges de tardor ajuden a l’arrelament.",
    "12": "Protegeix les plantes sensibles al fred i planifica la rotació de cultius."
  },
  "continental": {
    "1": "Prepara planters a l’interior; el fred encara impedeix sembrar a l’exterior.",
    "2": "Inicia planters de tomàquet, pebrot i albergínia sota coberta.",
    "3": "Trasplanta encians i pèsols; espera que no hi hagi gelades.",
    "4": "Sembra mongetes i bledes a l’exterior; trasplanta tomàquet només si no hi ha risc de gelada.",
    "5": "Rega amb regularitat: les nits encara són fresques però el dia pot ser calorós.",
    "6": "Recull alls i cebes primerenques; mantén el reg en èpoques de sequera.",
    "7": "Recull tomàquets i cucurbitàcies; extrema el reg els dies de més de 35°C.",
    "8": "Sembra espinacs i encians tardans; collita intensiva d’estiu.",
    "9": "La calor remiteix: sembra cols, bròquil i bledes.",
    "10": "Planta alls d’hivern; neteja bancals i aplica compost.",
    "11": "Collita tardana de cols; cobreix amb manta tèrmica si hi ha gelades.",
    "12": "Protegeix les plantes més sensibles; planifica la rotació de l’any vinent."
  },
  "subtropical": {
    "1": "Sembra tomàquets, pebrots i cogombres: les temperatures són ideals.",
    "2": "Planta maduixes i sembra encians; el clima temperat afavoreix l’arrelament.",
    "3": "Trasplanta cucurbitàcies; aprofita les pluges de primavera si n’hi ha.",
    "4": "Augmenta el reg a mesura que puja la temperatura; encoberta per retenir humitat.",
    "5": "Protegeix els cultius de l’excés de sol amb malla d’ombra.",
    "6": "Temporada de pluges: rega amb moderació i vigila els fongs.",
    "7": "Màximes precipitacions: bon drenatge és clau; recull abans de podridures.",
    "8": "Sembra mongetes i blat de moro dolç; les nits càlides afavoreixen la germinació.",
    "9": "Collita de final d’estiu; sembra encians i espinacs a l’ombra.",
    "10": "Temps fresc: ideal per a crucíferes, pastanagues i remolatxes.",
    "11": "Sembra cols i bròquil; les temperatures fresques milloren el sabor.",
    "12": "Recull i planifica: les plantes d’estiu acaben el seu cicle."
  }
}

SEASONAL_GL = {
  "atlantica": {
    "1": "Aproveita os días sen choiva para labrar e preparar a terra.",
    "2": "Sementade patacas e coles no exterior cando o chan supere os 5°C.",
    "3": "É o momento de transplantar os semilleiros de tomate e pemento ao interior.",
    "4": "Aproveita a choiva para plantar feixóos verdes e chícharos.",
    "5": "Sementade calabacín e pepino no exterior; coida os polinizadores.",
    "6": "Rega ao solpor para evitar a evaporación; protexe os froitos do exceso de humidade.",
    "7": "Recolle tomates e pementos antes de que cheguen choivas intensas.",
    "8": "Mes de máxima colleita: recolle regularmente para estimular máis produción.",
    "9": "Sementade espinacas, acelgas e leituga de outono.",
    "10": "Planta allos e cebolas de inverno antes das primeiras xeadas.",
    "11": "Incorpora compost ao chan para mellorar a estrutura para o ano seguinte.",
    "12": "Planifica a horta da próxima tempada e pide sementes por catálogo."
  },
  "mediterranea": {
    "1": "Sementade en semilleiro interior pemento e berexéna; aínda hai risco de xeadas no exterior.",
    "2": "Trasplanta amorodos e planta fabas; o tempo fresco favóreos.",
    "3": "Sementade tomate en semilleiro; trasplanta leituga e coles ao exterior.",
    "4": "Trasplanta o tomate e o pemento ao exterior cando as noites superen os 10°C.",
    "5": "Instala goteo antes do calor; sementade feixóos verdes e calabacín.",
    "6": "Recolle allos e cebolas; acolcha para conservar a humidade do chan.",
    "7": "Máxima produción de tomate: recolle a diario para estimular novos froitos.",
    "8": "Sementade feixóos de verán e prepara o bancal de outono en zonas con sombra.",
    "9": "Sementade acelgas, espinacas e leituga de outono; o calor remite.",
    "10": "Planta allos e cebolas; prepara bancais con abono para o inverno.",
    "11": "Trasplanta brócoli e coliflor; as choivas de outono axudan ao arraigamento.",
    "12": "Protexe as plantas sensíbeis ao frío e planifica a rotación de cultivos."
  },
  "continental": {
    "1": "Prepara semilleiros no interior; o frío aínda impide sementar no exterior.",
    "2": "Inicia semilleiros de tomate, pemento e berexéna baixo cuberta.",
    "3": "Trasplanta leituga e chícharos; agarda que non haxa xeadas.",
    "4": "Sementade feixóos e acelgas no exterior; trasplanta tomate só se non hai risco de xeada.",
    "5": "Rega con regularidade: as noites aínda son frescas pero o día pode ser caloroso.",
    "6": "Recolle allos e cebolas temperans; mantén o rego en épocas de seca.",
    "7": "Recolle tomates e cucurbitáceas; extrema o rego nos días de máis de 35°C.",
    "8": "Sementade espinacas e leituga tardía; colleita intensiva de verán.",
    "9": "O calor remite: sementade coles, brócoli e acelgas.",
    "10": "Planta allos de inverno; limpa bancais e aplica compost.",
    "11": "Colleita tardía de coles; cobre con manta térmica se hai xeadas.",
    "12": "Protexe as plantas máis sensíbeis; planifica a rotación do ano seguinte."
  },
  "subtropical": {
    "1": "Sementade tomates, pementos e pepinos: as temperaturas son ideais.",
    "2": "Planta amorodos e sementade leituga; o clima templado favorece o arraigamento.",
    "3": "Trasplanta cucurbitáceas; aproveita as choivas de primavera se as hai.",
    "4": "Aumenta o rego a medida que sobe a temperatura; acolcha para reter humidade.",
    "5": "Protexe os cultivos do exceso de sol con malla de sombra.",
    "6": "Tempada de choivas: rega con moderación e vixia os fungos.",
    "7": "Máximas precipitacións: bo drenaxe é clave; recolle antes de podredumes.",
    "8": "Sementade feixóos e millo doce; as noites cálidas favorecen a xerminación.",
    "9": "Colleita de final de verán; sementade leituga e espinacas á sombra.",
    "10": "Tempo fresco: ideal para crucíferas, cenoras e remolacha.",
    "11": "Sementade coles e brócoli; as temperaturas frescas melloran o sabor.",
    "12": "Recolle e planifica: as plantas de verán rematan o seu ciclo."
  }
}

SEASONAL_EU = {
  "atlantica": {
    "1": "Euri-gabe egunak aprobetxatu lurra goldatzeko eta prestatzeko.",
    "2": "Patata eta azak kanpoan erein lurrak 5°C gainditzen dituenean.",
    "3": "Unea da tomate eta piper plantak barrura trasplantatzeko.",
    "4": "Aprobetxatu euria babarrun berdeak eta ilarreak landatzeko.",
    "5": "Kalabazina eta pepinoa kanpoan erein; polinizatzaileak zaindu.",
    "6": "Ureztatu ilunabarrean ebaporazioa saihesteko; fruituak hezetasun gehiegitik babestu.",
    "7": "Bildu tomateak eta piperrak euri handiak iritsi baino lehen.",
    "8": "Uzta gehieneko hilabetea: bildu sarritan ekoizpen gehiago sustatzeko.",
    "9": "Erein espinakak, zikoria eta udazkeneko letxugak.",
    "10": "Landatu baratxuriak eta neguko tipulak lehen izotzak baino lehen.",
    "11": "Inkorporatu konposta lurrera datorren urterako egitura hobetzeko.",
    "12": "Planifikatu datorren denboraldiko baratzea eta eskatu haziak katalogoz."
  },
  "mediterranea": {
    "1": "Erein piper eta alberjinia barrualdeko plantelean; kanpoan oraindik izotz arriskua dago.",
    "2": "Marrubiak transplantatu eta babak landatu; eguraldi freskoak laguntzen die.",
    "3": "Tomatea plantelean erein; letxugak eta azak kanpoan transplantatu.",
    "4": "Tomatea eta piperra kanpoan transplantatu gauak 10°C gainditzen dituenean.",
    "5": "Tanta-tanta ureztatzea instalatu bero baino lehen; babarrun berdeak eta kalabazina erein.",
    "6": "Bildu baratxuriak eta tipulak; maltzak ezarri lurreko hezetasuna gordetzeko.",
    "7": "Tomate ekoizpen maximoa: bildu egunero fruitua sustatzeko.",
    "8": "Udako babarrunak erein eta udazkeneko oheak prestatu itzal-guneetan.",
    "9": "Zikoria, espinakak eta udazkeneko letxugak erein; beroa arintzen ari da.",
    "10": "Baratxuriak eta tipulak landatu; oheak ongarriarekin prestatu negurako.",
    "11": "Brokolia eta koliftorra transplantatu; udazkeneko euriak errotzen laguntzen du.",
    "12": "Hotza jasatzen ez duten landareak babestu eta labore txandakatzea planifikatu."
  },
  "continental": {
    "1": "Barrualdean plantelak prestatu; hotzak kanpoko ereitea oraindik eragozten du.",
    "2": "Tomate, piper eta alberjinia plantelak estalpe azpian hasi.",
    "3": "Letxugak eta ilarreak transplantatu; itxaron izotzik ez egon arte.",
    "4": "Babarrunak eta zikoria kanpoan erein; tomatea transplantatu izotz-arriskurik ez badago bakarrik.",
    "5": "Ureztatu erregularki: gauak oraindik freskoak dira baina egunak beroak izan daitezke.",
    "6": "Bildu goiztiako baratxuriak eta tipulak; ureztatzea mantendu lehortean.",
    "7": "Bildu tomateak eta kukorbitagoak; ureztatzea handitu 35°C baino gehiagoko egunetan.",
    "8": "Espinakak eta berantiako letxugak erein; udako uzta intentsiboa.",
    "9": "Beroa arintzen ari da: azak, brokolia eta zikoria erein.",
    "10": "Neguko baratxuriak landatu; oheak garbitu eta konposta aplikatu.",
    "11": "Azaren berantiako uzta; estali vellonarekin izotza bada.",
    "12": "Landare sentikorragoak babestu; datorren urterako txandakatzea planifikatu."
  },
  "subtropical": {
    "1": "Tomateak, piperrak eta pepinoak erein: tenperaturak aproposak dira.",
    "2": "Marrubiak landatu eta letxugak erein; eguraldi epelak errotzen laguntzen du.",
    "3": "Kukorbitagoak transplantatu; udaberriko euriak aprobetxatu badaude.",
    "4": "Ureztatze gehitu tenperatura igotzen den heinean; maltzak ezarri hezetasuna gordetzeko.",
    "5": "Eguzkitze gehiegitik babestu laboreek sare batekin.",
    "6": "Euri garaia: neurriz ureztatu eta onddoen bila egon.",
    "7": "Prezipitazio maximoak: drainatze ona giltzarria da; usteldu baino lehen bildu.",
    "8": "Babarrunak eta arto gozoa erein; gau beroak ernamuintza sustatzen dute.",
    "9": "Uda bukaerako uzta; letxugak eta espinakak itzalean erein.",
    "10": "Eguraldi freskoa: gurutzatuetarako, azenarioentzat eta erremolatxarentzat ezin hobea.",
    "11": "Azak eta brokolia erein; tenperatura freskoak zaporea hobetzen dute.",
    "12": "Bildu eta planifikatu: udako landareak bere zikloa amaitzen ari dira."
  }
}

SEASONAL_VAL = {
  "atlantica": {
    "1": "Aprofita els dies sense pluja per llaurar i preparar la terra.",
    "2": "Sembra creïllles i cols a l’exterior quan el sòl supere els 5°C.",
    "3": "Trasplanta els planters de tomaca i pebrot a l’interior.",
    "4": "Aprofita la pluja per plantar mongetes i pésols.",
    "5": "Sembra carabasseta i cogombre a l’exterior; cuida els pol·linitzadors.",
    "6": "Rega al capvespre per a evitar l’evaporació; protegeix els fruits de l’excés d’humitat.",
    "7": "Recull tomaques i pebrots abans que arriben pluges intenses.",
    "8": "Mes de màxima collita: recull regularment per a estimular més producció.",
    "9": "Sembra espinacs, bledes i encians de tardor.",
    "10": "Planta alls i cebes d’hivern abans de les primeres gelades.",
    "11": "Incorpora compost al sòl per a millorar l’estructura per a l’any vinent.",
    "12": "Planifica l’hort de la pròxima temporada i demana llavors per catàleg."
  },
  "mediterranea": {
    "1": "Sembra en planter interior pebrot i albergínia; encara hi ha risc de gelades a l’exterior.",
    "2": "Trasplanta maduixes i planta faves; el temps fresc les afavoreix.",
    "3": "Sembra tomaca en planter; trasplanta encians i cols a l’exterior.",
    "4": "Trasplanta la tomaca i el pebrot a l’exterior quan les nits superen els 10°C.",
    "5": "Instal·la goteig abans de la calor; sembra mongetes i carabasseta.",
    "6": "Recull alls i cebes; encoberta per a conservar la humitat del sòl.",
    "7": "Màxima producció de tomaca: recull diàriament per a estimular nous fruits.",
    "8": "Sembra mongetes d’estiu i prepara el bancal de tardor en zones amb ombra.",
    "9": "Sembra bledes, espinacs i encians de tardor; la calor remiteix.",
    "10": "Planta alls i cebes; prepara bancals amb adob per a l’hivern.",
    "11": "Trasplanta bròquil i coliflor; les pluges de tardor ajuden a l’arrelament.",
    "12": "Protegeix les plantes sensibles al fred i planifica la rotació de cultius."
  },
  "continental": {
    "1": "Prepara planters a l’interior; el fred encara impedeix sembrar a l’exterior.",
    "2": "Inicia planters de tomaca, pebrot i albergínia sota coberta.",
    "3": "Trasplanta encians i pésols; espera que no hi haja gelades.",
    "4": "Sembra mongetes i bledes a l’exterior; trasplanta tomaca només si no hi ha risc de gelada.",
    "5": "Rega amb regularitat: les nits encara són fresques però el dia pot ser calorós.",
    "6": "Recull alls i cebes primerenques; mantén el reg en èpoques de sequera.",
    "7": "Recull tomaques i cucurbitàcies; extrema el reg els dies de més de 35°C.",
    "8": "Sembra espinacs i encians tardans; collita intensiva d’estiu.",
    "9": "La calor remiteix: sembra cols, bròquil i bledes.",
    "10": "Planta alls d’hivern; neteja bancals i aplica compost.",
    "11": "Collita tardana de cols; cobreix amb manta tèrmica si hi ha gelades.",
    "12": "Protegeix les plantes més sensibles; planifica la rotació de l’any vinent."
  },
  "subtropical": {
    "1": "Sembra tomaques, pebrots i cogombres: les temperatures són ideals.",
    "2": "Planta maduixes i sembra encians; el clima temperat afavoreix l’arrelament.",
    "3": "Trasplanta cucurbitàcies; aprofita les pluges de primavera si n’hi ha.",
    "4": "Augmenta el reg a mesura que puja la temperatura; encoberta per a retenir humitat.",
    "5": "Protegeix els cultius de l’excés de sol amb malla d’ombra.",
    "6": "Temporada de pluges: rega amb moderació i vigila els fongs.",
    "7": "Màximes precipitacions: bon drenatge és clau; recull abans de podridures.",
    "8": "Sembra mongetes i dacsa dolça; les nits càlides afavorixen la germinació.",
    "9": "Collita de final d’estiu; sembra encians i espinacs a l’ombra.",
    "10": "Temps fresc: ideal per a crucíferes, pastanagues i remolatxes.",
    "11": "Sembra cols i bròquil; les temperatures fresques milloren el sabor.",
    "12": "Recull i planifica: les plantes d’estiu acaben el seu cicle."
  }
}

# ─── Costs sections ──────────────────────────────────────────────────────────

COSTS_CA = {
  "title": "Costos i ROI",
  "summaryLabel": "RESUM",
  "totalExpense": "Total despeses",
  "harvestValue": "Valor collita",
  "netProfit": "Benefici net:",
  "netLoss": "Pèrdua neta:",
  "expensesLabel": "DESPESES",
  "harvestLabel": "VALOR COLLITA",
  "waterLabel": "AIGUA",
  "recentLabel": "ÚTIMES DESPESES",
  "totalKg": "Kg collits",
  "pricePerKg": "Preu estimat",
  "estimatedValue": "Valor estimat",
  "totalLiters": "Litres regats",
  "pricePerLiter": "Preu de l’aigua",
  "waterCost": "Cost de l’aigua",
  "waterAuto": "Aigua (auto)",
  "addExpense": "Afegir despesa",
  "categoryLabel": "CATEGORIA",
  "amountLabel": "IMPORT",
  "descLabel": "DESCRIPCIÓ (opcional)",
  "descPlaceholder": "Ex. llavors de tomàquet cherry...",
  "save": "Desar despesa",
  "cat": {
    "seeds": "Llavors",
    "fertilizer": "Adob",
    "treatment": "Tractaments",
    "tools": "Eines",
    "other": "Altres"
  }
}

COSTS_GL = {
  "title": "Custos e ROI",
  "summaryLabel": "RESUMO",
  "totalExpense": "Total gastos",
  "harvestValue": "Valor colleita",
  "netProfit": "Beneficio neto:",
  "netLoss": "Perda neta:",
  "expensesLabel": "GASTOS",
  "harvestLabel": "VALOR COLLEITA",
  "waterLabel": "AUGA",
  "recentLabel": "ÚTIMOS GASTOS",
  "totalKg": "Kg colleitados",
  "pricePerKg": "Prezo estimado",
  "estimatedValue": "Valor estimado",
  "totalLiters": "Litros regados",
  "pricePerLiter": "Prezo da auga",
  "waterCost": "Custo da auga",
  "waterAuto": "Auga (auto)",
  "addExpense": "Engadir gasto",
  "categoryLabel": "CATEGORÍA",
  "amountLabel": "IMPORTE",
  "descLabel": "DESCRICIÓN (opcional)",
  "descPlaceholder": "Ex. sementes de tomate cherry...",
  "save": "Gardar gasto",
  "cat": {
    "seeds": "Sementes",
    "fertilizer": "Abono",
    "treatment": "Tratamentos",
    "tools": "Ferramentas",
    "other": "Outros"
  }
}

COSTS_EU = {
  "title": "Kostuak eta ROI",
  "summaryLabel": "LABURPENA",
  "totalExpense": "Gastu guztira",
  "harvestValue": "Uzta balioa",
  "netProfit": "Irabazi garbia:",
  "netLoss": "Galera garbia:",
  "expensesLabel": "GASTUAK",
  "harvestLabel": "UZTA BALIOA",
  "waterLabel": "URA",
  "recentLabel": "AZKEN GASTUAK",
  "totalKg": "Bildutako kg",
  "pricePerKg": "Prezio estimatua",
  "estimatedValue": "Balio estimatua",
  "totalLiters": "Ureztaturiko litroak",
  "pricePerLiter": "Uraren prezioa",
  "waterCost": "Uraren kostua",
  "waterAuto": "Ura (auto)",
  "addExpense": "Gastua gehitu",
  "categoryLabel": "KATEGORIA",
  "amountLabel": "ZENBATEKOA",
  "descLabel": "DESKRIBAPENA (hautazkoa)",
  "descPlaceholder": "Ad. cherry tomate haziak...",
  "save": "Gastua gorde",
  "cat": {
    "seeds": "Haziak",
    "fertilizer": "Ongarria",
    "treatment": "Tratamenduak",
    "tools": "Tresnak",
    "other": "Bestelakoak"
  }
}

COSTS_VAL = {
  "title": "Costos i ROI",
  "summaryLabel": "RESUM",
  "totalExpense": "Total despeses",
  "harvestValue": "Valor collita",
  "netProfit": "Benefici net:",
  "netLoss": "Pèrdua neta:",
  "expensesLabel": "DESPESES",
  "harvestLabel": "VALOR COLLITA",
  "waterLabel": "AIGUA",
  "recentLabel": "ÚTIMES DESPESES",
  "totalKg": "Kg collits",
  "pricePerKg": "Preu estimat",
  "estimatedValue": "Valor estimat",
  "totalLiters": "Litres regats",
  "pricePerLiter": "Preu de l’aigua",
  "waterCost": "Cost de l’aigua",
  "waterAuto": "Aigua (auto)",
  "addExpense": "Afig despesa",
  "categoryLabel": "CATEGORIA",
  "amountLabel": "IMPORT",
  "descLabel": "DESCRIPCIÓ (opcional)",
  "descPlaceholder": "Ex. llavors de tomaca cherry...",
  "save": "Guardar despesa",
  "cat": {
    "seeds": "Llavors",
    "fertilizer": "Adob",
    "treatment": "Tractaments",
    "tools": "Ferramentes",
    "other": "Altres"
  }
}

# ─── Per-locale patch data ───────────────────────────────────────────────────

PATCHES = {
  "ca.json": {
    "seasonal": SEASONAL_CA,
    "costs": COSTS_CA,
    "home_extra": {
      "taskCarencia": "{{name}}: no collir {{days}} dia(s) més (carència)",
      "waterAllLitersHint": "es repartiran entre les plantes actives"
    },
    "diary_extra": {
      "exportCsv": "Exportar CSV"
    },
    "settings_extra": {
      "rotation": "Rotació de cultius",
      "rotationDesc": "Historial per parcel·la i recomanacions"
    },
    "plantDetail_extra": {
      "treatmentActive": "Tractament actiu",
      "treatmentSafeIn": "Segur per collir en {{days}} dia(s)",
      "treatmentSafeToday": "Ja és segur collir",
      "soilSection": "Sòl",
      "soilPh": "pH",
      "bedName": "Parcel·la",
      "soilTexture": "Textura",
      "successionSow": "Nova tanda (sembra escalonada)",
      "successionSowDesc": "Crea una nova planta del mateix cultiu sembrada avui",
      "successionNote": "Sembra escalonada de {{original}}"
    }
  },
  "gl.json": {
    "seasonal": SEASONAL_GL,
    "costs": COSTS_GL,
    "home_extra": {
      "taskCarencia": "{{name}}: non coseitar {{days}} día(s) máis (carencia)",
      "waterAllLitersHint": "repartiránse entre as plantas activas"
    },
    "diary_extra": {
      "exportCsv": "Exportar CSV"
    },
    "settings_extra": {
      "rotation": "Rotación de cultivos",
      "rotationDesc": "Historial por parcela e recomendacións"
    },
    "plantDetail_extra": {
      "treatmentActive": "Tratamento activo",
      "treatmentSafeIn": "Seguro para coseitar en {{days}} día(s)",
      "treatmentSafeToday": "Xa é seguro coseitar",
      "soilSection": "Solo",
      "soilPh": "pH",
      "bedName": "Parcela",
      "soilTexture": "Textura",
      "successionSow": "Nova quenda (sementeira escalonada)",
      "successionSowDesc": "Crea unha nova planta do mesmo cultivo sementada hoxe",
      "successionNote": "Sementeira escalonada de {{original}}"
    }
  },
  "eu.json": {
    "seasonal": SEASONAL_EU,
    "costs": COSTS_EU,
    "home_extra": {
      "taskCarencia": "{{name}}: ez bildu {{days}} egun gehiago (itxaronaldia)",
      "waterAllLitersHint": "landare aktiboen artean banatuko dira"
    },
    "diary_extra": {
      "exportCsv": "CSV esportatu"
    },
    "settings_extra": {
      "rotation": "Labore txandakatzea",
      "rotationDesc": "Lursaileko historia eta gomendioak"
    },
    "plantDetail_extra": {
      "treatmentActive": "Tratamendua aktibo",
      "treatmentSafeIn": "Biltzeko segurua {{days}} egun barru",
      "treatmentSafeToday": "Dagoeneko segurua da biltzea",
      "soilSection": "Lurra",
      "soilPh": "pH",
      "bedName": "Lursaila",
      "soilTexture": "Textura",
      "successionSow": "Txanda berria (ereintza eskalatu)",
      "successionSowDesc": "Sortu gaur ereindako labore bereko landare berria",
      "successionNote": "Ereintza eskalatuak {{original}}"
    }
  },
  "val.json": {
    "seasonal": SEASONAL_VAL,
    "costs": COSTS_VAL,
    "home_extra": {
      "taskCarencia": "{{name}}: no collir {{days}} dia(s) més (carència)",
      "waterAllLitersHint": "es repartiran entre les plantes actives"
    },
    "diary_extra": {
      "exportCsv": "Exportar CSV"
    },
    "settings_extra": {
      "rotation": "Rotació de cultius",
      "rotationDesc": "Historial per parcel·la i recomanacions"
    },
    "plantDetail_extra": {
      "treatmentActive": "Tractament actiu",
      "treatmentSafeIn": "Segur per a collir en {{days}} dia(s)",
      "treatmentSafeToday": "Ja és segur collir",
      "soilSection": "Sòl",
      "soilPh": "pH",
      "bedName": "Parcel·la",
      "soilTexture": "Textura",
      "successionSow": "Nova tanda (sembra escalonada)",
      "successionSowDesc": "Crea una nova planta del mateix cultiu sembrada hui",
      "successionNote": "Sembra escalonada de {{original}}"
    }
  }
}

def patch_locale(filename, patch):
    path = os.path.join(BASE, filename)
    with open(path, encoding="utf-8-sig") as f:
        data = json.load(f)

    # home
    for k, v in patch["home_extra"].items():
        if k not in data.get("home", {}):
            data["home"][k] = v

    # diary
    for k, v in patch["diary_extra"].items():
        if k not in data.get("diary", {}):
            data["diary"][k] = v

    # settings (top-level keys in the settings object)
    for k, v in patch["settings_extra"].items():
        if k not in data.get("settings", {}):
            data["settings"][k] = v

    # plantDetail
    for k, v in patch["plantDetail_extra"].items():
        if k not in data.get("plantDetail", {}):
            data["plantDetail"][k] = v

    # seasonalTips
    if "seasonalTips" not in data:
        data["seasonalTips"] = patch["seasonal"]

    # costs
    if "costs" not in data:
        data["costs"] = patch["costs"]

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Patched: {filename}")

for fname, patch in PATCHES.items():
    patch_locale(fname, patch)

# Also add exportCsv to ES and EN
for locale_file, key_val in [("es.json", "Exportar CSV"), ("en.json", "Export CSV")]:
    path = os.path.join(BASE, locale_file)
    with open(path, encoding="utf-8-sig") as f:
        data = json.load(f)
    if "exportCsv" not in data.get("diary", {}):
        data["diary"]["exportCsv"] = key_val
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Patched diary.exportCsv: {locale_file}")

print("Done.")
