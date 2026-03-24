// src/data/hyundai.js
// Hyundai USA 2024–2025 vehicle knowledge base
// Injected into the Knowledge Worker's system prompt on every turn.

const HYUNDAI_KNOWLEDGE = `
HYUNDAI USA — 2024/2025 COMPLETE VEHICLE LINEUP

════════════════════════════════════════════
SEDANS
════════════════════════════════════════════

ELANTRA (Compact Sedan) — Starting at $21,450
Trims:
• SE       — Base. 2.0L 4-cyl (147hp). 6-speed auto. 35mpg hwy.
• SEL      — Adds heated front seats, 8" touchscreen, blind-spot monitoring.
• N Line   — Sport-tuned 1.6T (201hp), 7-speed DCT, aggressive styling, sport seats.
• Limited  — Top luxury trim. Heated/ventilated seats, 10.25" digital cluster, sunroof.
• N        — Performance model. 2.0T (276hp), 6-speed manual or 8-speed DCT, track-tuned.
Hybrid: 1.6L + electric motor (139hp combined), 54mpg hwy — available SE, SEL, Limited.

SONATA (Midsize Sedan) — Starting at $27,200
Trims:
• SE       — 2.5L 4-cyl (191hp). 8-speed auto. 38mpg hwy.
• SEL      — Adds 8" touchscreen, dual-zone climate, wireless charging, 16" alloys.
• SEL Plus — Adds panoramic sunroof, 12.3" digital cluster, Bose audio, highway drive assist.
• N Line   — 2.5T (290hp), Sport suspension, red accents, unique interior.
• Limited  — Full luxury. 12.3" screens, ventilated seats, HDA2 semi-autonomous driving.
Hybrid: 2.0L + electric (192hp combined), 52mpg hwy — available SE, SEL, Limited.

════════════════════════════════════════════
CROSSOVERS & SUVs
════════════════════════════════════════════

KONA (Subcompact Crossover) — Starting at $23,350
Trims:
• SE       — 2.0L (147hp). CVT. 32mpg hwy. Entry-level.
• SEL      — Adds 8" touchscreen, heated seats, blind-spot monitoring.
• N Line   — 1.6T (195hp), sport-tuned suspension, aggressive styling.
• Limited  — 12.3" touchscreen, Bose audio, sunroof, ventilated seats.
• N        — 2.0T (276hp), all-wheel drive, performance chassis, 8-speed DCT.
Electric: Single motor (201hp) or dual motor AWD (217hp). Up to 261mi range.

TUCSON (Compact SUV) — Starting at $29,150
Trims:
• SE       — 2.5L (187hp). 8-speed auto. 29mpg hwy.
• SEL      — Adds 10.25" touchscreen, heated seats, blind-spot monitoring, 18" alloys.
• XRT      — Off-road styling. Dark exterior, all-terrain tires, 2" lift.
• N Line   — Sport appearance. 1.6T (180hp), sport suspension, red accents.
• Limited  — Full luxury. Panoramic sunroof, Bose audio, ventilated seats, 20" alloys.
Hybrid: 1.6T + electric (261hp combined), 38mpg hwy — SE, SEL, N Line, Limited.
PHEV: 32mi electric-only range, 261hp combined — SEL, N Line, Limited.

SANTA FE (Midsize SUV) — Starting at $35,500
Trims:
• SE       — 2.5T (277hp). 8-speed auto. AWD available. 25mpg hwy.
• SEL      — Adds 12.3" touchscreen, heated seats, wireless charging, 18" alloys.
• XRT      — Off-road package. Dark cladding, 19" dark alloys, all-terrain capability.
• Calligraphy — Luxury top. Nappa leather, quilted seats, 20" alloys, 2-row or 3-row.
Hybrid: 1.6T + electric (239hp combined), 32mpg hwy.
PHEV: 31mi electric range, AWD standard, 261hp combined.

PALISADE (3-Row Midsize SUV) — Starting at $37,350
Trims:
• SE       — 3.8L V6 (291hp). 8-speed auto. FWD or AWD. 26mpg hwy.
• SEL      — Adds 12.3" touchscreen, heated 2nd row, wireless charging, power tailgate.
• XRT      — Off-road styling, dark exterior/roof rails, terrain modes.
• Limited  — 2nd row captain's chairs, ventilated seats, 20" alloys, Harman Kardon audio.
• Calligraphy — Range-topping. Nappa leather, quilted seats, head-up display, 20" alloys.
Key feature: Available with 8 seats or 7 seats (captain's chairs in row 2).

════════════════════════════════════════════
TRUCKS
════════════════════════════════════════════

SANTA CRUZ (Sport Adventure Truck) — Starting at $29,500
Trims:
• SE       — 2.5L (190hp). 8-speed auto. FWD. 30mpg hwy.
• SEL      — Adds heated seats, 8" touchscreen, blind-spot monitoring.
• N Line   — 2.5T (281hp), AWD, sport-tuned suspension, unique styling.
• Limited  — Top trim. 10.25" touchscreen, Bose audio, ventilated seats, 20" alloys.
Key feature: Open cargo bed + locking storage underneath. Not a full-size truck — designed for lifestyle use.

════════════════════════════════════════════
ELECTRIC VEHICLES (Ioniq lineup)
════════════════════════════════════════════

IONIQ 5 (Midsize Electric Crossover) — Starting at $43,450
Trims:
• Standard Range  — Single motor (168hp). 266mi EPA range.
• SE              — Long range single motor (225hp). 303mi range. 800V ultra-fast charging.
• SEL             — Adds heated/ventilated seats, larger battery options, solar roof.
• Limited         — Top trim. 77.4kWh battery, AWD available (320hp), vehicle-to-load (power your gear).
• N               — Performance model. 641hp, 0-60 in 3.4s, drift mode, 18" summer tires.
Fast charging: 800V architecture — 10–80% in 18 min on 350kW charger.

IONIQ 6 (Aerodynamic Electric Sedan) — Starting at $38,615
Trims:
• SE             — Single motor RWD (149hp). 361mi EPA range — best in class.
• SEL            — Adds 12.3" displays, heated seats, 18" alloys.
• Limited        — Adds AWD (320hp, 316mi), ventilated seats, head-up display, digital mirrors.
Key feature: 0.21 drag coefficient — most aerodynamic Hyundai ever. 800V charging same as Ioniq 5.

IONIQ 9 (3-Row Electric SUV) — Arriving 2025
• 3-row, 6 or 7 seat configurations
• ~620hp AWD, projected 300+ miles range
• 800V charging platform
• Pricing TBD — estimated mid-$50k range

════════════════════════════════════════════
FUEL CELL
════════════════════════════════════════════

NEXO (Hydrogen Fuel Cell SUV) — Starting at $59,435
• Available in CA only (where hydrogen stations exist)
• 380mi range. 5-min hydrogen fill. Zero tailpipe emissions (only water vapor).
• Blue and Limited trims.

════════════════════════════════════════════
KEY PROGRAMS & OFFERS
════════════════════════════════════════════

WARRANTY: America's Best Warranty
• 5-year/60,000-mile basic
• 10-year/100,000-mile powertrain
• 7-year/unlimited-mile anti-perforation
• Complimentary maintenance: 3 years / 36,000 miles (oil, tire rotation)

IONIQ EV BENEFITS:
• Free home charger installation ($600 value)
• 3 years complimentary charging at Electrify America stations
• Federal tax credit up to $7,500 (check eligibility)

FINANCING: Hyundai Motor Finance available at all dealers
Current offers vary — direct callers to their local dealer for current APR and lease deals.
`;

module.exports = { HYUNDAI_KNOWLEDGE };
