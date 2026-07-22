// Display-only translation layer. The workbook itself stays in Portuguese
// (phase/criterion/team names are read from it as-is); this only maps
// those known, closed sets of strings to English for rendering. Filtering
// against the API still uses the canonical Portuguese values underneath —
// see app.js for where translated vs. canonical values are kept apart.

const UI_STRINGS = {
  pt: {
    title: "Notas da Copa 2026",
    tab_dashboards: "Dashboards",
    tab_top: "Melhores notas",
    tab_teams: "Por time",
    tab_criteria: "Por quesito",
    tile_total: "Total de partidas",
    tile_rated: "Partidas avaliadas",
    tile_avg: "Média geral",
    tile_max: "Maior nota",
    tile_min: "Menor nota",
    phase_avg_title: "Média por fase",
    dash_best_teams: "Top melhores times",
    dash_worst_teams: "Top piores times",
    dash_best_criterion: "Top melhores - {label}",
    dash_worst_criterion: "Top piores - {label}",
    filter_phase_label: "Fase",
    filter_phase_all: "Todas",
    filter_team_label: "Time",
    filter_team_placeholder: "ex: Brasil",
    th_hash: "#",
    th_phase: "Fase",
    th_match: "Partida",
    th_score: "Placar",
    th_final_score: "Nota final",
    th_team: "Time",
    th_matches_played: "Partidas",
    th_avg_score: "Nota média",
    th_best_match: "Melhor partida",
    th_worst_match: "Pior partida",
    criteria_avg_title: "Média de cada quesito no torneio",
    tens_title: "Notas 10 por quesito",
    tens_hint: "Partidas que tiraram nota máxima em cada quesito individualmente.",
    empty_no_rated: "Sem partidas avaliadas ainda.",
    empty_no_tens: "Nenhuma partida com nota 10 aqui ainda.",
    error_prefix: "Erro ao carregar dados: ",
    lang_toggle: "EN",
    footer_credit: 'Feito por <a href="https://jvmello.dev">jvmello.dev</a>',
  },
  en: {
    title: "2026 World Cup Match Ratings",
    tab_dashboards: "Dashboards",
    tab_top: "Top ratings",
    tab_teams: "By team",
    tab_criteria: "By criterion",
    tile_total: "Total matches",
    tile_rated: "Rated matches",
    tile_avg: "Overall average",
    tile_max: "Highest score",
    tile_min: "Lowest score",
    phase_avg_title: "Average by phase",
    dash_best_teams: "Top best teams",
    dash_worst_teams: "Top worst teams",
    dash_best_criterion: "Top best - {label}",
    dash_worst_criterion: "Top worst - {label}",
    filter_phase_label: "Phase",
    filter_phase_all: "All",
    filter_team_label: "Team",
    filter_team_placeholder: "e.g. Brazil",
    th_hash: "#",
    th_phase: "Phase",
    th_match: "Match",
    th_score: "Score",
    th_final_score: "Final score",
    th_team: "Team",
    th_matches_played: "Matches",
    th_avg_score: "Average score",
    th_best_match: "Best match",
    th_worst_match: "Worst match",
    criteria_avg_title: "Average of each criterion in the tournament",
    tens_title: "Perfect 10s by criterion",
    tens_hint: "Matches that scored a perfect 10 in each criterion individually.",
    empty_no_rated: "No rated matches yet.",
    empty_no_tens: "No matches with a perfect 10 here yet.",
    error_prefix: "Error loading data: ",
    lang_toggle: "PT",
    footer_credit: 'Made by <a href="https://jvmello.dev">jvmello.dev</a>',
  },
};

const PHASE_EN = {
  "Fase de grupos": "Group stage",
  "16 avos": "Round of 32",
  "Oitavas de final": "Round of 16",
  "Quartas de final": "Quarterfinals",
  Semifinais: "Semifinals",
  "3º lugar": "Third place",
  Final: "Final",
};

// criterion key -> {pt: [label, abbr], en: [label, abbr]}
const CRITERION_I18N = {
  first_half: { pt: ["1º tempo", "1ºT"], en: ["First half", "1H"] },
  second_half: { pt: ["2º tempo", "2ºT"], en: ["Second half", "2H"] },
  back_and_forth: { pt: ["Lá e cá", "Lá e cá"], en: ["Back and forth", "B&F"] },
  emotion: { pt: ["Emoção", "Emoção"], en: ["Emotion", "Emotion"] },
  historic_component: { pt: ["Componente histórico", "Histórico"], en: ["Historic component", "History"] },
};

const TEAM_EN = {
  Alemanha: "Germany",
  Argentina: "Argentina",
  Argélia: "Algeria",
  "Arábia Saudita": "Saudi Arabia",
  Austrália: "Australia",
  Brasil: "Brazil",
  Bélgica: "Belgium",
  "Bósnia e Herzegovina": "Bosnia and Herzegovina",
  "Cabo Verde": "Cape Verde",
  Canadá: "Canada",
  Catar: "Qatar",
  Colômbia: "Colombia",
  "Coreia do Sul": "South Korea",
  "Costa do Marfim": "Ivory Coast",
  Croácia: "Croatia",
  Curaçao: "Curaçao",
  Egito: "Egypt",
  Equador: "Ecuador",
  Escócia: "Scotland",
  Espanha: "Spain",
  "Estados Unidos": "United States",
  França: "France",
  Gana: "Ghana",
  Haiti: "Haiti",
  Holanda: "Netherlands",
  Inglaterra: "England",
  Iraque: "Iraq",
  Irã: "Iran",
  Japão: "Japan",
  Jordânia: "Jordan",
  Marrocos: "Morocco",
  México: "Mexico",
  Noruega: "Norway",
  "Nova Zelândia": "New Zealand",
  Panamá: "Panama",
  Paraguai: "Paraguay",
  Portugal: "Portugal",
  "RD Congo": "DR Congo",
  Senegal: "Senegal",
  Suécia: "Sweden",
  Suíça: "Switzerland",
  Tchéquia: "Czechia",
  Tunísia: "Tunisia",
  Turquia: "Turkey",
  Uruguai: "Uruguay",
  Uzbequistão: "Uzbekistan",
  "África do Sul": "South Africa",
  Áustria: "Austria",
};

function t(key, vars) {
  let text = UI_STRINGS[state.lang][key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, v);
  }
  return text;
}

function translatePhase(name) {
  return state.lang === "en" ? PHASE_EN[name] ?? name : name;
}

function translateTeam(name) {
  return state.lang === "en" ? TEAM_EN[name] ?? name : name;
}

function translateCriterionLabel(criterionKey) {
  const entry = CRITERION_I18N[criterionKey];
  return entry ? entry[state.lang][0] : criterionKey;
}

function translateCriterionAbbr(criterionKey) {
  const entry = CRITERION_I18N[criterionKey];
  return entry ? entry[state.lang][1] : criterionKey;
}
