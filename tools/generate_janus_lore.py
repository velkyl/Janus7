import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.rstrip() + "\n", encoding="utf-8")


regions = {
    "meta": {
        "moduleVersion": "0.9.12.46",
        "type": "world_lore",
        "description": "Kuratiertes Aventurien-Regionswissen für JANUS7, verdichtet aus lokalen Regionalordnern, Aventurischem Almanach und Geographia Aventurica.",
    },
    "regions": [
        {
            "id": "mittelreich",
            "name": "Mittelreich",
            "capital": "Gareth",
            "government": "Feudales Kaiserreich",
            "climate": "Überwiegend gemäßigt, nach Süden milder und trockener.",
            "religion": "Zwölfgötterglaube mit starkem Praios-, Rondra- und Travia-Einfluss.",
            "notable_locations": ["Gareth", "Punin", "Weiden", "Perricum", "Almada"],
            "description": "Das Neue Reich ist politisches und kulturelles Schwergewicht Aventuriens. Es vereint kaiserliche Zentralmacht, Provinzinteressen, Kirchenmacht und Rittertum in einer oft angespannten Balance.",
            "gm_summary": "Für Spielleitungen eignet sich das Mittelreich für Hofpolitik, Glaubenskonflikte, Grenzsicherung, Reichsverwaltung, Adelsfehden und klassische Heldenaufträge.",
            "source": {
                "primary": ["Aventurischer Almanach", "Geographia Aventurica"],
                "directories": [
                    "D:/RPG Lokal/DSA Wissen/Garethien und Almada",
                    "D:/RPG Lokal/DSA Wissen/Weiden",
                ],
            },
        },
        {
            "id": "almada",
            "name": "Almada",
            "capital": "Punin",
            "government": "Kaiserliche Provinz mit starkem Granden- und Caballero-Einfluss",
            "climate": "Warm, trocken und yaquirnah geprägt.",
            "religion": "Zwölfgötterglaube, besonders Rahja, Phex und Boron.",
            "notable_locations": ["Punin", "Taladur", "Yaquir", "Ragath"],
            "description": "Almada verbindet südländische Lebensart, Fehdekultur, Pferdezucht, Stadtgelehrsamkeit und alte Familiennetzwerke. Zwischen Punin, Yaquirtal und Grenzadel mischen sich Gelehrsamkeit und Klingenstolz.",
            "gm_summary": "Stark für Intrigen, Duelle, ehrverletzende Kleinigkeiten, romantische Verwicklungen, Phexhandel und gelehrte Ermittlungen.",
            "source": {
                "primary": ["Geographia Aventurica"],
                "directories": [
                    "D:/RPG Lokal/DSA Wissen/Garethien und Almada",
                    "D:/RPG Lokal/DSA Wissen/Yaquir",
                ],
            },
        },
        {
            "id": "bornland",
            "name": "Bornland",
            "capital": "Festum",
            "government": "Adelsrepublik unter Bronnjaren und freien Städten",
            "climate": "Kalt-gemäßigt bis rau, mit langen Wintern.",
            "religion": "Zwölfgötterglaube, regional stark durch Firun, Rondra und Travia geprägt.",
            "notable_locations": ["Festum", "Norburg", "Neersand", "Bornwald"],
            "description": "Das Bornland ist geprägt von Bronnjarenherrschaft, Stadtfreiheit, Handel über Festum und einer dauernden Spannung zwischen alter Leibeigenschaft und aufstrebenden Kräften.",
            "gm_summary": "Geeignet für Winterreisen, Standeskonflikte, Sumpf- und Waldexpeditionen, Goblinthemen und bornische Politik.",
            "source": {
                "primary": ["Aventurischer Almanach"],
                "directories": ["D:/RPG Lokal/DSA Wissen/Bornland"],
            },
        },
        {
            "id": "horasreich",
            "name": "Horasreich",
            "capital": "Vinsalt",
            "government": "Hochkultiviertes Kaiserreich mit starker Stadt- und Adelsschicht",
            "climate": "Mild bis mediterran.",
            "religion": "Zwölfgötterglaube, stark hesindisch, rahjagefärbt und höfisch ritualisiert.",
            "notable_locations": ["Vinsalt", "Kuslik", "Belhanka", "Grangor", "Bethana"],
            "description": "Das Liebliche Feld steht für Kunst, Wissenschaft, Mode, Diplomatie und Gift im selben Atemzug. Bildung, Seefahrt und Gesellschaftsspiel sind hier politische Machtmittel.",
            "gm_summary": "Optimal für Salons, Duellrecht, Gelehrtenzirkel, Reisen per Schiff, Handelskriege und elegante Intrigen.",
            "source": {
                "primary": ["Geographia Aventurica"],
                "directories": ["D:/RPG Lokal/DSA Wissen/Horasreich Liebliches Feld"],
            },
        },
        {
            "id": "thorwal",
            "name": "Thorwal",
            "capital": "Thorwal",
            "government": "Hetleute-System mit starkem Gemeinschaftsethos",
            "climate": "Raues Küsten- und Nordmeerklima.",
            "religion": "Swafnir, Efferd, Ifirn.",
            "notable_locations": ["Thorwal", "Olport", "Prem", "Bodir"],
            "description": "Thorwal lebt von Seefahrt, Sippenstolz, Erzählkultur und dem Ideal persönlicher Freiheit. Fremde werden an Taten gemessen, nicht an Titeln.",
            "gm_summary": "Gut für Fahrtenabenteuer, Ehrenfragen, Wettstreit, Sturmgeschichten und Begegnungen mit Skalden, Hetleuten und Runajasko-Tradition.",
            "source": {
                "primary": ["Aventurischer Almanach"],
                "directories": [
                    "D:/RPG Lokal/DSA Wissen/Thorwal",
                    "D:/RPG Lokal/DSA Wissen/See und Meer",
                ],
            },
        },
        {
            "id": "aranien",
            "name": "Aranien",
            "capital": "Zorgan",
            "government": "Mhaharani-Monarchie",
            "climate": "Warm bis heiß, entlang des Mhanadi fruchtbar.",
            "religion": "Zwölfgötter mit tulamidischer Prägung, besonders Rahja, Phex, Hesinde.",
            "notable_locations": ["Zorgan", "Baburin", "Llanka", "Mhanadi"],
            "description": "Aranien verbindet tulamidische Höflichkeit, matriarchale Machtstrukturen, Karawanenwirtschaft und eine ausgeprägte Kultur städtischer und höfischer Raffinesse.",
            "gm_summary": "Stark für Karawanenspiel, Handel, Hofintrige, Rosenromantik, Phexstreiche und urbane Abenteuer.",
            "source": {
                "primary": ["Aventurischer Almanach"],
                "directories": ["D:/RPG Lokal/DSA Wissen/Aranien"],
            },
        },
        {
            "id": "alanfa",
            "name": "Al'Anfa",
            "capital": "Al'Anfa",
            "government": "Grandenoligarchie mit schwarzem Boronkult",
            "climate": "Tropisch-heiß und schwer.",
            "religion": "Boron im alanfanischen Ritus, dazu Machtkulte und Familienfrömmigkeit.",
            "notable_locations": ["Al'Anfa", "Arena", "Silberberg", "Kolonialhäfen"],
            "description": "Die schwarze Perle des Südens ist reich, brutal, effizient und dekadent. Grandenpolitik, Sklavenwirtschaft, Flottenmacht und Intrigen greifen ineinander.",
            "gm_summary": "Geeignet für Unterwelt, Machtpolitik, Kolonialthemen, Gladiatoren, schwarze Liturgie und Schifffahrt.",
            "source": {
                "primary": ["Geographia Aventurica"],
                "directories": ["D:/RPG Lokal/DSA Wissen/Al Anfa"],
            },
        },
        {
            "id": "nostria_andergast",
            "name": "Nostria und Andergast",
            "capital": "Kein gemeinsames Zentrum",
            "government": "Zwei rivalisierende Königreiche",
            "climate": "Feucht, waldreich und regenlastig.",
            "religion": "Zwölfgötter, regional bodenständig und wenig prunkvoll.",
            "notable_locations": ["Nostria", "Andergast", "Salzerhaven", "Joborn"],
            "description": "Die alten Rivalen leben von Grenzstreit, Forstwirtschaft, regionalem Stolz und einer rauen Alltagskultur. Jeder kleine Vorfall kann zum Symbol eines großen Nachbarschaftskonflikts werden.",
            "gm_summary": "Perfekt für Grenzkonflikte, Waldabenteuer, diplomatische Missverständnisse und bodenständige Heldengeschichten.",
            "source": {
                "primary": ["Aventurischer Almanach"],
                "directories": ["D:/RPG Lokal/DSA Wissen/Nostria und Andergast"],
            },
        },
        {
            "id": "kosch_nordmarken",
            "name": "Kosch und Nordmarken",
            "capital": "Uneinheitlich regional organisiert",
            "government": "Herzogtümer, Grafschaften und Bergfreiheiten",
            "climate": "Mittelgebirgig, kühler und regenreicher in Höhenlagen.",
            "religion": "Zwölfgötter, besonders Ingerimm, Praios und Angrosch bei Zwergen.",
            "notable_locations": ["Angbar", "Xorlosch", "Nordmarken", "Eisenwald"],
            "description": "Zwischen Bergbau, Zwergenmacht, Reichstreue und Grenzsicherung entstehen Abenteuer an Handelswegen, Burgen, Klöstern und alten Stollen.",
            "gm_summary": "Gut für Zwerge, Tunnel, Ingerimm-Handwerk, Reichsdienst, Wagenzüge und Gebirgsreisen.",
            "source": {
                "primary": ["Geographia Aventurica"],
                "directories": ["D:/RPG Lokal/DSA Wissen/Kosch und die Nordmarken"],
            },
        },
        {
            "id": "weiden",
            "name": "Weiden",
            "capital": "Trallop",
            "government": "Herzogtum mit starkem Ritter- und Heerbanncharakter",
            "climate": "Gemäßigt, fruchtbar, aber grenzgefährdet.",
            "religion": "Rondra, Praios, Travia.",
            "notable_locations": ["Trallop", "Baliho", "Trollpforte"],
            "description": "Weiden ist vom Pflichtgefühl der Grenzverteidigung, Rondratreue und dem langen Gedächtnis vergangener Kriege geprägt.",
            "gm_summary": "Sehr geeignet für Ritterdrama, Orkabwehr, Heerschau, Wallfahrten und klassische Bedrohungsszenarien.",
            "source": {
                "primary": ["Aventurischer Almanach"],
                "directories": ["D:/RPG Lokal/DSA Wissen/Weiden"],
            },
        },
        {
            "id": "tobrien",
            "name": "Tobrien",
            "capital": "Perricum als Machtanker, regionale Zentren wechselhaft",
            "government": "Krisenregion mit militärischer und kirchlicher Präsenz",
            "climate": "Gemäßigt bis karg, durch Kriegsfolgen schwer gezeichnet.",
            "religion": "Rondra, Boron, Praios.",
            "notable_locations": ["Warunk", "Perricum", "Transysilien"],
            "description": "Tobrien ist von Verwüstung, Wiederaufbau, Grenzangst und Glaubenshärte geprägt. Viele Orte tragen sichtbar die Narben der Schwarzen Lande.",
            "gm_summary": "Stark für düstere Nachkriegsabenteuer, Wiederaufbau, Untotengefahr, Sühne und Rondra/Boron-Konflikte.",
            "source": {
                "primary": ["Aventurischer Almanach"],
                "directories": ["D:/RPG Lokal/DSA Wissen/Tobrien"],
            },
        },
        {
            "id": "havena_region",
            "name": "Havena und Großer Fluss",
            "capital": "Havena",
            "government": "Freie Stadt mit fürstlicher und städtischer Machtbalance",
            "climate": "Nass, windig, kühl und nebelreich.",
            "religion": "Efferd, Phex, Nandus und städtische Mischfrömmigkeit.",
            "notable_locations": ["Havena", "Unterstadt", "Großer Fluss"],
            "description": "Die Region um Havena ist maritim, feucht, nebelverhangen und voller alter Geheimnisse. Handel, Schmuggel, Fischerei und urbane Legenden sind allgegenwärtig.",
            "gm_summary": "Ideal für Hafenplots, Unterstadtmysterien, Schmuggler, Nebelabenteuer und sozial gemischte Stadtkampagnen.",
            "source": {
                "primary": ["Geographia Aventurica"],
                "directories": ["D:/RPG Lokal/DSA Wissen/Havena"],
            },
        },
    ],
}


cities = {
    "meta": {
        "moduleVersion": "0.9.12.46",
        "type": "city_lore",
        "description": "Kuratiertes Aventurien-Städtewissen für JANUS7, fokussiert auf schnell nutzbare Spielleiterinformationen.",
    },
    "cities": [
        {
            "id": "gareth",
            "name": "Gareth",
            "region": "mittelreich",
            "population": 200000,
            "academies": ["Akademie der Magischen Rüstung", "Akademie Schwert und Stab"],
            "description": "Kaiserstadt, Verwaltungszentrum und Brennglas für Reichspolitik. Tempel, Hof, Militär, Flüchtlingsquartiere und Unterwelt existieren dicht nebeneinander.",
            "notable_features": ["Stadt des Lichts", "Drom", "Alte Residenz", "Pentagontempel"],
            "gm_summary": "Für Reichspolitik, Großstadtintrigen, Kirchenmacht und soziale Kontraste.",
        },
        {
            "id": "punin",
            "name": "Punin",
            "region": "almada",
            "population": 21000,
            "academies": ["Akademie der Hohen Magie zu Punin"],
            "description": "Punin ist zugleich gelehrt, fromm und höfisch. Die Stadt verbindet Almadaner Lebensart mit hoher Dichte an Juristen, Magiern, Schreibern und Geweihten.",
            "notable_features": ["Akademie der Hohen Magie", "Boronanger Nähe", "Yaquir-Brücken", "Gelehrtenviertel"],
            "gm_summary": "Sehr stark für Magie, Gelehrsamkeit, Ermittlungen, Hof- und Familienintrigen.",
        },
        {
            "id": "festum",
            "name": "Festum",
            "region": "bornland",
            "population": 27000,
            "academies": ["Halle des Quecksilbers"],
            "description": "Freie Hafenstadt des Bornlands, kosmopolitisch, geschäftig und kulturell durchmischt. Handelshäuser, Goblins und bornländischer Adel reiben sich hier dauerhaft aneinander.",
            "notable_features": ["Speicherinsel", "Goblinviertel", "Hafen", "Nordlandbank"],
            "gm_summary": "Gut für Handel, Nordlandatmosphäre, Hafenpolitik und soziale Reibung.",
        },
        {
            "id": "lowangen",
            "name": "Lowangen",
            "region": "nostria_andergast",
            "population": 12000,
            "academies": ["Akademie der Verformungen zu Lowangen"],
            "description": "Stadt des Svelltlands, geprägt von Grenzlage, kultureller Durchmischung und dem langen Schatten orkischer Bedrohung.",
            "notable_features": ["Svelltmarkt", "Grenzhändler", "akademische Werkstätten"],
            "gm_summary": "Geeignet für Grenzlanddrama, Mischkultur, gefährliche Forschung und politische Unsicherheit.",
        },
        {
            "id": "kuslik",
            "name": "Kuslik",
            "region": "horasreich",
            "population": 22000,
            "academies": ["Halle der Metamorphosen zu Kuslik"],
            "description": "Kuslik ist Zentrum hesindegefälliger Gelehrsamkeit, Buchdruck und Debattenkultur. Wissen ist hier Währung und Statussymbol.",
            "notable_features": ["Großer Hesindetempel", "Buchdruckereien", "Gelehrtenviertel"],
            "gm_summary": "Ideal für Gelehrtenstreit, Druckwerke, Debatten und elegante Stadtabenteuer.",
        },
        {
            "id": "fasar",
            "name": "Fasar",
            "region": "aranien",
            "population": 30000,
            "academies": ["Akademie der Geistigen Kraft zu Fasar"],
            "description": "Fasar ist alt, dicht, gefährlich und von konkurrierenden Machtblöcken geprägt. Karawanen, Magie, Armut und Reichtum liegen eng beieinander.",
            "notable_features": ["Altstadtviertel", "Karawanenplätze", "Magierviertel"],
            "gm_summary": "Stark für urbane Härte, tulamidische Politik, Machtzirkel und magische Schattenseiten.",
        },
        {
            "id": "olport",
            "name": "Olport",
            "region": "thorwal",
            "population": 5000,
            "academies": ["Olporter Runajasko"],
            "description": "Ein rauer Hafenort des Nordens, geprägt von Thorwaler Freiheit, Swafnirfrömmigkeit und der eigenwilligen Tradition der Runajasko.",
            "notable_features": ["Hafen", "Langhäuser", "Wetterzeichen"],
            "gm_summary": "Für Seefahrt, nordische Rituale, harte Gemeinschaft und sturmgeprägte Abenteuer.",
        },
        {
            "id": "elburum",
            "name": "Elburum",
            "region": "aranien",
            "population": 9000,
            "academies": ["Schule der Schmerzen zu Elburum"],
            "description": "Grenznahe Stadt mit düsterem Ruf, militärischer Härte und einer Akademie, deren Ruf selbst unter Magiern polarisiert.",
            "notable_features": ["Befestigungen", "tulamidische Handelswege", "strenges Akademiegelände"],
            "gm_summary": "Gut für moralisch graue Akademieplots, Grenzdruck und dunklere Magiethemen.",
        },
        {
            "id": "bethana",
            "name": "Bethana",
            "region": "horasreich",
            "population": 8000,
            "academies": ["Bethanaer Magiertraditionen"],
            "description": "Horasische Provinzstadt mit alter Gelehrtentradition und starker Einbindung in die Kultur des Lieblichen Feldes.",
            "notable_features": ["Hesindenahe Zirkel", "Horasischer Stadtkern"],
            "gm_summary": "Für kleinere, höfisch-gelehrte Abenteuer mit starkem Kulturaspekt.",
        },
        {
            "id": "havena",
            "name": "Havena",
            "region": "havena_region",
            "population": 26000,
            "academies": ["Keine offene Gildenakademie im Stadtbild"],
            "description": "Nebelstadt, Hafenmetropole und Stadt der versunkenen Unterstadt. Havena lebt von Wasser, Geschichten, Schmuggel und urbaner Zähigkeit.",
            "notable_features": ["Unterstadt", "Prinzessin-Emer-Brücke", "Hafenbecken"],
            "gm_summary": "Ideal für Wasser, Nebel, Schmuggel, Unterstadtmysterien und soziale Abenteuer.",
        },
        {
            "id": "alanfa",
            "name": "Al'Anfa",
            "region": "alanfa",
            "population": 85000,
            "academies": ["Südaventurische Lehrhäuser und Tempelschulen"],
            "description": "Metropole des Südens, von Grandeninteressen, schwarzem Boron und imperialer Selbstsicherheit geprägt.",
            "notable_features": ["Arena", "Silberberg", "Tempelbezirke"],
            "gm_summary": "Für große Machtspiele, zynische Politik und gefährliche Patronage.",
        },
        {
            "id": "zorgan",
            "name": "Zorgan",
            "region": "aranien",
            "population": 18000,
            "academies": ["Aranische Lehrzirkel"],
            "description": "Blühende Hauptstadt Araniens mit höfischer Etikette, Handel, Gärten und Mhanadi-Anbindung.",
            "notable_features": ["Palastbezirke", "Gärten", "Karawanenhöfe"],
            "gm_summary": "Für Hofspiel, Diplomatie und tulamidisch-aranische Eleganz.",
        },
    ],
}


academies = {
    "meta": {
        "moduleVersion": "0.9.12.46",
        "type": "academy_lore",
        "description": "Kuratiertes Akademienverzeichnis für JANUS7 auf Basis lokaler DSA4/DSA5-Magiequellen.",
    },
    "academies": [
        {
            "id": "punin_high_magic",
            "name": "Akademie der Hohen Magie zu Punin",
            "cityId": "punin",
            "regionId": "almada",
            "profileId": "punin",
            "guild": "grau",
            "focus": ["Verständigung", "Antimagie", "Metamagie"],
            "tone": "gelehrt, diszipliniert, prestigeträchtig",
            "description": "Eine der traditionsreichsten und politisch einflussreichsten Gildenakademien Aventuriens. Punin steht für theoretische Strenge, hohe Repräsentation und tiefen Zugriff auf Bibliotheken und gelehrte Netzwerke.",
            "janusHooks": ["akademische Intrigen", "Bibliotheksrecherchen", "Mentorenkonflikte", "reichsweite Korrespondenzen"],
            "source": {"verifiedBy": ["Hallen arkaner Macht", "Rohals Erben"], "notes": "Punin ist bestehendes Kernprofil in JANUS7."},
        },
        {
            "id": "festum_mercury",
            "name": "Halle des Quecksilbers zu Festum",
            "cityId": "festum",
            "regionId": "bornland",
            "profileId": "festum",
            "guild": "grau",
            "focus": ["Transformation", "Alchimie", "nördliche Gildenpraxis"],
            "tone": "nordisch, praktisch, forschungsnah",
            "description": "Festums Halle des Quecksilbers verbindet bornische Härte mit praxisnaher Magie und alchimistischer Experimentierfreude. Die Stadtlage macht Handel, Hafen und Außeneinflüsse ständig spürbar.",
            "janusHooks": ["Hafenaufträge", "Materialbeschaffung", "Goblinkontakte", "bornländische Winterereignisse"],
            "source": {"verifiedBy": ["Hallen arkaner Macht"], "notes": "In JANUS7 bereits als Profil angelegt, hier als Weltwissenseintrag normalisiert."},
        },
        {
            "id": "gareth_sword_staff",
            "name": "Akademie Schwert und Stab zu Gareth",
            "cityId": "gareth",
            "regionId": "mittelreich",
            "profileId": "gareth",
            "guild": "weiß",
            "focus": ["Kampfmagie", "Reichsdienst", "Gildenverwaltung"],
            "tone": "reichstreu, streng, militärisch",
            "description": "Die Akademie Schwert und Stab gilt als machtnahe Lehrstätte mit hoher Bedeutung für Gildenverwaltung und Reichsdienst. Ausbildung und Repräsentation sind eng mit Politik und Hierarchie verzahnt.",
            "janusHooks": ["reichsnahe Sonderaufträge", "Duellwesen", "Hofintrigen", "Militäreskorten"],
            "source": {"verifiedBy": ["Hallen arkaner Macht"], "notes": "Im DSA4-Band ausdrücklich als gildenverwaltungsrelevant genannt."},
        },
        {
            "id": "gareth_magic_armor",
            "name": "Akademie der Magischen Rüstung zu Gareth",
            "cityId": "gareth",
            "regionId": "mittelreich",
            "profileId": "gareth",
            "guild": "weiß",
            "focus": ["Antimagie", "Schutzmagie", "Abwehr"],
            "tone": "formal, defensiv, pflichtbetont",
            "description": "Die Akademie der Magischen Rüstung steht für Schutz, Bannung und die praktische Absicherung gegen feindliche Magie. Gareths politische Lage verleiht ihr besonderes strategisches Gewicht.",
            "janusHooks": ["Bannungsfälle", "Schutzgeleite", "Artefaktsicherung", "Reichsinspektionen"],
            "source": {"verifiedBy": ["Hallen arkaner Macht"], "notes": "Als Gareth-Akademie in lokalen Bestandsdaten bereits vorbereitet."},
        },
        {
            "id": "kuslik_metamorphosis",
            "name": "Halle der Metamorphosen zu Kuslik",
            "cityId": "kuslik",
            "regionId": "horasreich",
            "profileId": None,
            "guild": "grau",
            "focus": ["Verwandlung", "Theorie", "hesindische Gelehrsamkeit"],
            "tone": "elegant, anspruchsvoll, diskursiv",
            "description": "Kusliks Halle der Metamorphosen steht für horasische Feinkultur, starke Theoriebasis und ein Umfeld, in dem Wissen, Stil und Status ineinandergreifen.",
            "janusHooks": ["gelehrte Dispute", "salonfähige Magie", "verwandlungsmagische Experimente"],
            "source": {"verifiedBy": ["Hallen arkaner Macht"], "notes": "Im Inhaltsverzeichnis und Akademienetz des Bandes belegt."},
        },
        {
            "id": "lowangen_reformations",
            "name": "Akademie der Verformungen zu Lowangen",
            "cityId": "lowangen",
            "regionId": "nostria_andergast",
            "profileId": "lowangen",
            "guild": "grau",
            "focus": ["Formmagie", "Grenzlandpragmatik", "Anpassung"],
            "tone": "experimentell, robust, unsicher",
            "description": "Lowangen verbindet akademische Forschung mit der Unsicherheit des Svelltlandes. Die Lehre ist von Zweckmäßigkeit, Improvisation und dem Druck einer gefährdeten Region geprägt.",
            "janusHooks": ["Grenzkrisen", "orkische Bedrohung", "riskante Forschung", "städtische Loyalitätsfragen"],
            "source": {"verifiedBy": ["Hallen arkaner Macht"], "notes": "Im Band als eigene Schule geführt."},
        },
        {
            "id": "fasar_mind_power",
            "name": "Akademie der Geistigen Kraft zu Fasar",
            "cityId": "fasar",
            "regionId": "aranien",
            "profileId": None,
            "guild": "grau",
            "focus": ["Geistmagie", "Selbstbehauptung", "stadtnahe Machtspiele"],
            "tone": "hart, ehrgeizig, urban",
            "description": "Fasars Akademie steht für scharfen Konkurrenzdruck, geistige Stärke und einen Lehrbetrieb, der nicht von der rauen Stadtwirklichkeit zu trennen ist.",
            "janusHooks": ["Machtzirkel", "Schülerfehden", "Karawanenwissen", "Tulamidenintrigen"],
            "source": {"verifiedBy": ["Hallen arkaner Macht"], "notes": "Im Band unter den bedeutenden Schulen geführt."},
        },
        {
            "id": "olport_runajasko",
            "name": "Olporter Runajasko",
            "cityId": "olport",
            "regionId": "thorwal",
            "profileId": None,
            "guild": "traditionsnah",
            "focus": ["nordische Zaubertradition", "Runen", "Wetter- und Seefahrtseinfluss"],
            "tone": "rau, gemeinschaftlich, traditionsverbunden",
            "description": "Die Runajasko hebt sich im Lehrstil stark von klassischen Gildenhäusern ab. Klima, Langhäuser, Fahrt und Tradition prägen den Alltag stärker als formale Akademieroutine.",
            "janusHooks": ["Wetterorakel", "Fahrtvorbereitung", "Sippenkonflikte", "Nordmeeromene"],
            "source": {"verifiedBy": ["Hallen arkaner Macht"], "notes": "Im Band mehrfach als stark eigenständige Schule beschrieben."},
        },
        {
            "id": "elburum_pain",
            "name": "Schule der Schmerzen zu Elburum",
            "cityId": "elburum",
            "regionId": "aranien",
            "profileId": None,
            "guild": "schwarz",
            "focus": ["dunkle Disziplin", "Grenzrauhheit", "schmerzhafte Lehrmethoden"],
            "tone": "fremdartig, hart, umstritten",
            "description": "Elburums Schule besitzt einen schlechten Ruf selbst unter Magiern und ist mit strengen, abschreckenden Lehrbildern verbunden. Gerade dadurch bietet sie hohes Konfliktpotenzial für Janus-Ereignisse.",
            "janusHooks": ["moralische Dilemmata", "harte Prüfungen", "Grenzpolitik", "schwarze Gildenspannungen"],
            "source": {"verifiedBy": ["Hallen arkaner Macht"], "notes": "Lokal per Texttreffer zur Schule der Schmerzen in Elburum belegt."},
        },
        {
            "id": "rashdul_pentagram",
            "name": "Fächer der Macht zu Rashdul",
            "cityId": "zorgan",
            "regionId": "aranien",
            "profileId": None,
            "guild": "grau",
            "focus": ["Elemente", "Tulamidenmagie", "alte Machtlinien"],
            "tone": "traditionsreich, offen, astral aufgeladen",
            "description": "Rashdul steht im lokalen Quellenmaterial vor allem als markante Zauberstadt und Bibliotheksstandort. Für JANUS7 ist die Schule besonders als Quelle alter Linien, Elemente und tulamidischer Magiekultur interessant.",
            "janusHooks": ["Elementarereignisse", "Linienmagie", "Bibliotheksaufträge", "tulamidische Gelehrtenreisen"],
            "source": {"verifiedBy": ["Hallen arkaner Macht"], "notes": "Im Band mehrfach als prägende Zauberstadt und Bibliotheksort erwähnt; Detailverifikation bleibt ausbaubar."},
        },
    ],
}


chronicle = {
    "meta": {
        "version": "1.2.0",
        "source": "Historia Aventurica, Aventurischer Bote und kuratierte Tageshaken",
        "lastUpdate": "2026-04-09T00:00:00.000Z",
        "coverage": {"from": "1025-01-01", "to": "1047-12-31"},
        "note": "Diese Datei enthält kanonisch orientierte Fixereignisse plus spielbare Tageshaken. Sie ist kein vollständiges tägliches Kanonregister.",
    },
    "chronicle": [
        {"id": "bote_1025_01_01_01", "date": "1025-01-01", "label": "Neujahrssegen in Gareth", "description": "In Gareth wird das neue Jahr mit praiosgefälliger Öffentlichkeit, höfischem Pomp und ersten Gerüchten über Unruhe an den Reichsgrenzen eröffnet.", "location": "Gareth", "tags": ["politik", "praios", "reich"]},
        {"id": "bote_1025_01_01_02", "date": "1025-01-01", "label": "Akademische Korrespondenz aus Punin", "description": "Puniner Gelehrte nehmen den Jahreswechsel zum Anlass, offene Forschungsvorhaben, Reisepläne und Lehrbitten für das kommende Studienjahr neu zu ordnen.", "location": "Punin", "tags": ["magie", "gelehrsamkeit"]},
        {"id": "bote_1025_03_20_01", "date": "1025-03-20", "label": "Unruhige Träume in Punin", "description": "Mehrere Adepten berichten von ähnlichen Albträumen, die in Kollegenkreisen als mögliches Zeichen astraler Resonanz diskutiert werden.", "location": "Punin", "tags": ["magie", "omen"]},
        {"id": "bote_1025_06_15_01", "date": "1025-06-15", "label": "Schatten über Gareth", "description": "In der Reichsmetropole verdichten sich Berichte über düstere Vorzeichen, Gerüchte um dämonische Aktivitäten und allgemeine Verunsicherung.", "location": "Gareth", "tags": ["krieg", "horror", "reich"]},
        {"id": "bote_1026_02_03_01", "date": "1026-02-03", "label": "Bornländische Handelssorgen", "description": "Festumer und bornische Kaufleute melden wachsende Unsicherheit auf einigen Routen, was Preise, Vorräte und lokale Politik zugleich beeinflusst.", "location": "Festum", "tags": ["handel", "bornland"]},
        {"id": "bote_1026_08_11_01", "date": "1026-08-11", "label": "Diskussionen über magische Verantwortung", "description": "In mehreren Gelehrtenstädten wird die Rolle der Magier nach den Verheerungen der jüngsten Jahre schärfer debattiert als zuvor.", "location": "Aventurien", "tags": ["magie", "gesellschaft"]},
        {"id": "bote_1027_04_18_01", "date": "1027-04-18", "label": "Gerüchte über seltene Manuskripte", "description": "Zwischen Punin, Gareth und Festum kursieren Hinweise auf verschollene Handschriften, deren Besitz hohen Status und erhebliche Risiken verspricht.", "location": "Aventurien", "tags": ["bibliothek", "intrige"]},
        {"id": "bote_1030_09_07_01", "date": "1030-09-07", "label": "Reichsweite Klagen über Grenzbelastung", "description": "Aus mehreren Provinzen mehren sich Nachrichten über erschöpfte Garnisonen, belastete Landbevölkerung und stockende Wiederaufbauarbeiten.", "location": "Mittelreich", "tags": ["militär", "gesellschaft"]},
        {"id": "bote_1034_07_12_01", "date": "1034-07-12", "label": "Totenlichter in der Warunkei", "description": "Sumpflichter, Verschollene und Berichte über unruhige Tote nähren die Furcht in den verwundeten Landstrichen Tobriens.", "location": "Tobrien", "tags": ["tobrien", "untote", "horror"]},
        {"id": "bote_1035_03_22_01", "date": "1035-03-22", "label": "Horasische Druckwerke verbreiten neue Debatten", "description": "Aus Kuslik und anderen Städten gelangen vermehrt Traktate nach Aventurien, die alte Lehrmeinungen über Magie und Standesordnung in Frage stellen.", "location": "Kuslik", "tags": ["horasreich", "gelehrsamkeit"]},
        {"id": "bote_1038_05_16_01", "date": "1038-05-16", "label": "Wiederbelebter Handel in Festum", "description": "Nach harten Jahren fassen Händler vorsichtig wieder langfristige Pläne. Nordrouten, Flusshandel und Lagerhäuser gewinnen erneut Gewicht.", "location": "Festum", "tags": ["handel", "bornland"]},
        {"id": "bote_1039_11_03_01", "date": "1039-11-03", "label": "Nordmeerzeichen vor Olport", "description": "Seltsame Wetterlagen und ungewöhnliche Sichtungen werden in thorwalschen Häfen als mögliche Vorzeichen einer harten Saison gedeutet.", "location": "Olport", "tags": ["thorwal", "wetter", "omen"]},
        {"id": "bote_1041_01_14_01", "date": "1041-01-14", "label": "Diskrete Suche nach Gelehrten", "description": "Mehrere Häuser und Tempel entsenden Boten, um besonders fähige Schreiber, Magier und Kartografen für vertrauliche Unternehmungen anzuwerben.", "location": "Aventurien", "tags": ["gelehrsamkeit", "auftrag"]},
        {"id": "bote_1043_09_02_01", "date": "1043-09-02", "label": "Akademische Konkurrenz um Sponsoren", "description": "Zwischen mehreren Lehrhäusern entbrennt ein stiller Wettstreit um Mäzene, Druckkapazitäten und seltene Materialien.", "location": "Aventurien", "tags": ["magie", "intrige", "wirtschaft"]},
        {"id": "bote_1045_12_19_01", "date": "1045-12-19", "label": "Unruhe im Grenzgebiet Nostria-Andergast", "description": "Kleinere Überfälle und widersprüchliche Schuldzuweisungen nähren erneut das alte Misstrauen beider Reiche.", "location": "Nostria und Andergast", "tags": ["grenze", "konflikt"]},
        {"id": "bote_1046_08_09_01", "date": "1046-08-09", "label": "Almadanische Sagen gewinnen neue Popularität", "description": "Im Zuge neuer Wallfahrten, Sammlungen und Erzählabende gewinnen alte almadanische Legenden auch außerhalb der Region neue Hörer.", "location": "Almada", "tags": ["almada", "kultur", "sage"]},
        {"id": "bote_1046_11_19_01", "date": "1046-11-19", "label": "Zwergische Einigungsfragen bewegen den Norden", "description": "Berichte aus den Bergen lassen erkennen, dass Bündnisse, Bedrohungen und alte Schwüre der Zwergenvölker wieder an Gewicht gewinnen.", "location": "Kosch und Nordmarken", "tags": ["zwerge", "politik"]},
        {"id": "bote_1047_03_19_01", "date": "1047-03-19", "label": "Neue Meisterinformationen aus dem Boten", "description": "Die jüngeren Botenjahrgänge bieten zahlreiche Abenteueraufhänger zu Wiederaufbau, Lokalpolitik, Rätseln, gestohlenen Artefakten und verdeckten Konflikten.", "location": "Aventurien", "tags": ["bote", "quest_hook"]},
        {"id": "bote_1047_05_19_01", "date": "1047-05-19", "label": "Fasar im Fokus drachischer Gerüchte", "description": "Jüngere Berichte aus dem Aventurischen Boten stellen Fasar, isenhagische Machtfragen und regionale Eskalationsrisiken in einen gemeinsamen Horizont.", "location": "Fasar", "tags": ["drache", "fasar", "politik"]},
        {"id": "bote_1047_09_18_01", "date": "1047-09-18", "label": "Späte Ernte, spitze Klingen", "description": "Überregionale Nachrichten deuten auf angespannte Versorgungslagen, politische Schuldzuweisungen und einen raueren Ton zwischen mehreren Machtzentren hin.", "location": "Aventurien", "tags": ["versorgung", "politik"]},
    ],
}


bote_daily_tables = {
    "meta": {
        "moduleVersion": "0.9.12.46",
        "description": "Tägliche Boten-/Chronik-Hooks für JANUS7. Drei Kategorien pro Tag ermöglichen mehrere Einträge ohne vollständigen Kanonanspruch.",
    },
    "categories": [
        {"id": "headline_politics", "name": "Politik und Macht", "entries": ["Ein lokaler Würdenträger dementiert Gerüchte, die gestern noch als sicher galten.", "Ein Bote aus einer Nachbarprovinz fordert Unterstützung, ohne alle Gründe offenzulegen.", "Eine Tempel- oder Hofentscheidung sorgt in Kaufmanns- und Gelehrtenkreisen für sichtbare Unruhe.", "Mehrere Parteien deuten dasselbe Ereignis öffentlich völlig gegensätzlich."]},
        {"id": "headline_local_color", "name": "Alltag und Stadtleben", "entries": ["Markt, Hafen oder Karawanenplatz geraten wegen eines seltenen Fundes in Aufruhr.", "Eine kleine Festivität zieht mehr wichtige Beobachter an, als dem Veranstalter lieb ist.", "Eine Handwerker- oder Händlerzunft bittet diskret um Hilfe gegen Sabotage oder schlechte Gerüchte.", "Ein lokales Wunder, Missgeschick oder Omen wird von jedem Viertel anders erzählt."]},
        {"id": "headline_arcane", "name": "Magie und Geheimnisse", "entries": ["Ein Lehrhaus sucht seltenes Material, das auf legalem Weg kaum kurzfristig zu beschaffen ist.", "Mehrere Gelehrte berichten voneinander unabhängig von demselben Symbol, Traum oder Zitat.", "Ein harmlos wirkendes Randereignis entpuppt sich bei genauer Betrachtung als Folge älterer Forschung.", "Eine alte Handschrift, Sternkonstellation oder Störung des Astralflusses liefert neuen Gesprächsstoff."]},
    ],
    "usage": {
        "perDaySuggestion": ["headline_politics", "headline_local_color", "headline_arcane"],
        "notes": "Für jeden Ingame-Tag kann JANUS mindestens einen Eintrag aus jeder Kategorie ziehen und mit Region, Stadt, Akademie oder NSC verknüpfen.",
    },
}


tables = {
    "meta": {
        "moduleVersion": "0.9.12.46",
        "description": "Aggregierte Zufallstabellen für Spielleitung, Weltwissen und Akademiealltag in JANUS7.",
    },
    "tables": [
        {"id": "aventurian_rumors", "name": "Aventurische Gerüchte", "entries": ["In Gareth wurde ein Falschmünzerring ausgehoben, der angeblich bis in den hohen Adel reicht.", "Man sagt, die Seeschlange im Golf von Perricum sei wieder erwacht.", "Ein reisender Händler behauptet, im Bornland liege ein Fluch auf dem Winterweizen.", "In den Kneipen von Kuslik wird gemunkelt, eine Expedition suche nach einer verlorenen Bibliothek.", "Ein Bote aus Thorwal berichtet von seltsamen Lichtern über dem Olporter Hafen.", "Angeblich wurde in Al'Anfa ein Sklave mit magischem Talent entdeckt, der die Flucht ergriff."]},
        {"id": "academy_daily_events", "name": "Akademie-Werkalltag", "entries": ["Ein Magister vermisst eine kommentierte Abschrift seines letzten Traktats.", "Im Labor führt ein harmlos gemeinter Versuch zu einem peinlichen Geruchsproblem.", "Ein Adept behauptet, ein bestimmtes Buch habe ihm nachts geantwortet.", "Der Küchendienst ist heute so unbeliebt wie eine Nachprüfung.", "Im Innenhof wird ein Duell verabredet, das offiziell niemals stattgefunden haben wird.", "Ein Hausmeister entdeckt einen Zugang, den laut Bauplan niemand kennen dürfte."]},
        {"id": "academy_city_hooks", "name": "Akademie und Stadt", "entries": ["Die Stadtwache bittet die Akademie um diskrete Unterstützung in einer peinlichen Angelegenheit.", "Ein Händler bietet der Akademie Material an, das zu selten und zu billig zugleich ist.", "Ein Tempel fordert Aufklärung über eine magische Nebenwirkung im Viertel.", "Ein Adliger sucht einen Tutor, meint aber in Wahrheit einen Problemlöser.", "Eine Gildenentscheidung stößt im Stadtrat auf Widerstand.", "Eine Studentengruppe gerät außerhalb der Mauern in Schwierigkeiten und braucht Rückendeckung."]},
        {"id": "bote_daily_hooks", "name": "Aventurischer-Bote-Tageshaken", "entries": ["Politische Gegendarstellungen machen die Wahrheit wertvoller als Gold.", "Ein lokales Omen wird zur Schlagzeile, bevor jemand es geprüft hat.", "Eine überregionale Nachricht lässt sich hervorragend für private Fehden ausschlachten.", "Jemand nutzt die Botenlage, um einen eigenen Skandal im Schatten zu halten.", "Ein Meisterinformation-Splitter deutet auf ein kommendes Abenteuer statt auf eine abgeschlossene Geschichte.", "Eine Randnotiz im Boten ist für Helden bedeutsamer als die eigentliche Schlagzeile."]},
        {"id": "weather_aventuria", "name": "Wetter in Aventurien", "entries": ["Strahlender Sonnenschein (Praios' Lächeln).", "Leichter Nieselregen und träge Straßen.", "Aufziehendes Gewitter mit kräftigen Blitzen.", "Dichter Nebel, der Stimmen näher wirken lässt als sie sind.", "Unerwarteter Hagelschauer bedroht Feld und Reiseplan.", "Klarer, sternreicher Himmel mit ungewöhnlich scharfer Sicht."]},
        {"id": "npc_moods", "name": "NPC-Stimmung", "entries": ["Geistesabwesend", "Gereizt", "Euphorisch", "Verschwiegen", "Herablassend", "Hektisch"]},
    ],
}


profile_payloads = {
    "gareth": {
        "academy/academy-data.json": {
            "meta": {"moduleVersion": "0.9.12.46", "profile": "gareth", "description": "Akademie-Basisdaten für die Garether Lehrhäuser."},
            "academy": {"id": "gareth", "name": "Garether Akademien", "trimester": 1, "year": 1039, "week": 1, "day": "Praiostag", "phase": "Morgen"},
            "configuration": {"autoSave": True, "enableUI": True, "enableSimulation": True},
        },
        "locations.json": {
            "meta": {"version": "1.1.0-gareth", "description": "Kurze Garether Profilorte."},
            "locations": [
                {"id": "gareth_schwert_und_stab", "name": "Akademie Schwert und Stab", "type": "academy", "description": "Reichsnahe Lehrstätte mit klarer Hierarchie, Übungshöfen und strengem Auftreten.", "features": ["Exerzierhof", "Duellsaal", "Instruktionsräume"]},
                {"id": "gareth_magische_ruestung", "name": "Akademie der Magischen Rüstung", "type": "academy", "description": "Auf Schutz, Bannung und Abwehr ausgerichtete Lehrstätte mit nüchterner, pflichtbetonter Atmosphäre.", "features": ["Bannzirkel", "Artefaktkammer", "Abwehrsaal"]},
                {"id": "gareth_drom", "name": "Drom", "type": "district", "description": "Ein sozial spannungsreicher Ort, an dem Flüchtlinge, Gerüchte und Gewalt jederzeit ineinandergreifen können.", "features": ["Flüchtlingsunterkünfte", "Schwarzmärkte", "verdeckte Informanten"]},
            ],
        },
        "npcs.json": {
            "meta": {"version": "1.1.0-gareth", "description": "Kurze Garether Profil-NSC."},
            "npcs": [
                {"id": "gareth_mentor_bann", "name": "Magistra Leudara von Eslamshagen", "role": "Dozentin für Bann- und Schutzmagie", "personality": "Pflichtbewusst, höfisch kontrolliert, wenig humorvoll.", "hooks": ["Sucht belastbare Adepten für diskrete Reichsaufträge."]},
                {"id": "gareth_cadet_duelist", "name": "Adept Corvin von Hirschfurt", "role": "Schüler des Schwert-und-Stab-Zirkels", "personality": "Ehrgeizig, duellfreudig, politisch leicht lenkbar.", "hooks": ["Hat sich öffentlich mit dem Sohn eines Reichsbeamten überworfen."]},
            ],
        },
        "events.json": {
            "meta": {"version": "1.1.0-gareth", "description": "Kurze Garether Profilereignisse."},
            "events": [
                {"id": "gareth_event_inspection", "name": "Reichsinspektion", "type": "political", "summary": "Ein Besuch hochrangiger Prüfer zwingt Lehrkörper und Adepten zu makellosem Auftreten.", "locationId": "gareth_schwert_und_stab"},
                {"id": "gareth_event_duel", "name": "Unerlaubte Herausforderung", "type": "social", "summary": "Eine formell verbotene Herausforderung droht in einen größeren Konflikt umzuschlagen.", "locationId": "gareth_magische_ruestung"},
            ],
        },
    },
    "lowangen": {
        "academy/academy-data.json": {
            "meta": {"moduleVersion": "0.9.12.46", "profile": "lowangen", "description": "Akademie-Basisdaten für die Akademie der Verformungen zu Lowangen."},
            "academy": {"id": "lowangen", "name": "Akademie der Verformungen zu Lowangen", "trimester": 1, "year": 1039, "week": 1, "day": "Feuertag", "phase": "Morgen"},
            "configuration": {"autoSave": True, "enableUI": True, "enableSimulation": True},
        },
        "locations.json": {
            "meta": {"version": "1.1.0-lowangen", "description": "Kurze Lowanger Profilorte."},
            "locations": [
                {"id": "lowangen_verformungen", "name": "Akademie der Verformungen", "type": "academy", "description": "Werkstattnahe Lehrstätte mit improvisiertem, aber zähem Forschergeist.", "features": ["Transformationsräume", "Werkhof", "Grenzarchiv"]},
                {"id": "lowangen_svelltmarkt", "name": "Svelltmarkt", "type": "public", "description": "Knotenpunkt für Gerüchte, Grenzhandel und politisch heikle Begegnungen.", "features": ["Karawanen", "Grenzhändler", "Informanten"]},
                {"id": "lowangen_ostwall", "name": "Ostwall", "type": "fortification", "description": "Mauerwerk und Wachposten erinnern täglich daran, dass Lowangen im Grenzland lebt.", "features": ["Wachgänge", "Alarmglocke", "provisorische Reparaturen"]},
            ],
        },
        "npcs.json": {
            "meta": {"version": "1.1.0-lowangen", "description": "Kurze Lowanger Profil-NSC."},
            "npcs": [
                {"id": "lowangen_formmeister", "name": "Magister Dario Svelt", "role": "Lehrer für Formmagie", "personality": "Pragmatisch, nervös, innovationsfreudig.", "hooks": ["Benötigt seltenes Material, das offiziell nicht verfügbar ist."]},
                {"id": "lowangen_border_student", "name": "Adeptin Jadvige Rhen", "role": "Schülerin aus dem Grenzland", "personality": "Misstrauisch, belastbar, scharf beobachtend.", "hooks": ["Kennt Schmugglerpfade, die auch für Reichsfeinde nützlich wären."]},
            ],
        },
        "events.json": {
            "meta": {"version": "1.1.0-lowangen", "description": "Kurze Lowanger Profilereignisse."},
            "events": [
                {"id": "lowangen_event_border_alarm", "name": "Grenzalarm", "type": "threat", "summary": "Ein falscher oder echter Alarm bringt Stadtwache, Händler und Akademie gleichzeitig in Bewegung.", "locationId": "lowangen_ostwall"},
                {"id": "lowangen_event_market_offer", "name": "Seltenes Angebot am Markt", "type": "opportunity", "summary": "Ein Händler bietet Material an, das für Formmagie hochinteressant und politisch heikel ist.", "locationId": "lowangen_svelltmarkt"},
            ],
        },
    },
}


text_docs = {
    ROOT / "data/world_lore/entries/regions/almada.txt": "Almada verbindet Yaquir-Kultur, alte Familien, Puniner Gelehrsamkeit, Pferdezucht, Fehden und subtile Hofpolitik. Für Spielleitungen ist die Region stark, wenn Stolz, Ehre, Leidenschaft und Bildungsnähe zusammenwirken sollen.",
    ROOT / "data/world_lore/entries/regions/bornland.txt": "Das Bornland eignet sich für Winterdruck, Adelskonflikte, Stadtfreiheit, Goblinbeziehungen und Expeditionen in Wälder, Moore und an Handelsrouten. Festum ist dabei das offenste Tor nach außen.",
    ROOT / "data/world_lore/entries/cities/punin.txt": "Punin ist Magiestadt, Gelehrtenzentrum und zugleich almadanische Hauptstadt. Akademie, Schreibstuben, Tempel und höfische Netzwerke sorgen dafür, dass fast jedes Wissensabenteuer schnell politische Farbe annimmt.",
    ROOT / "data/world_lore/entries/cities/festum.txt": "Festum lebt von Hafen, Handel, bornischer Härte und kultureller Durchmischung. Goblins, Kaufleute, Bronnjaren und Gelehrte teilen die Stadt, ohne dieselben Ziele zu verfolgen.",
    ROOT / "data/world_lore/entries/academies/gareth_schwert_und_stab.txt": "Schwert und Stab steht für reichsnahe, disziplinierte Ausbildung. Wer hier lernt, bewegt sich nahe an Macht, Pflicht, Kontrolle und den Erwartungen der weißen Gilde.",
    ROOT / "data/world_lore/entries/academies/lowangen_verformungen.txt": "Die Akademie der Verformungen arbeitet im Schatten des Grenzlands. Forschung ist hier selten bequem, oft improvisiert und fast immer von realen Gefahren eingerahmt.",
}


def main() -> None:
    write_json(ROOT / "data/world_lore/regions.json", regions)
    write_json(ROOT / "data/world_lore/cities.json", cities)
    write_json(ROOT / "data/world_lore/academies.json", academies)
    write_json(ROOT / "data/events/bote_chronicle.json", chronicle)
    write_json(ROOT / "data/events/bote_daily_tables.json", bote_daily_tables)
    write_json(ROOT / "data/tables.json", tables)

    for profile, files in profile_payloads.items():
        for rel, payload in files.items():
            write_json(ROOT / "data/profiles" / profile / rel, payload)

    for path, text in text_docs.items():
        write_text(path, text)

    print("generated lore datasets")


if __name__ == "__main__":
    main()
