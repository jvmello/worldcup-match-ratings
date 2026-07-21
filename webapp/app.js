const state = {
  lang: localStorage.getItem("lang") || "pt",
  colorBands: [],
  phases: [],
  teams: [],
  raw: {},
  topSort: { key: "final_score", asc: false },
  teamsSort: { key: "average_final_score", asc: false },
};

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

function scoreBadge(score) {
  if (score === null || score === undefined) {
    return `<span class="score-badge" style="color:var(--text-muted)">—</span>`;
  }
  const band = state.colorBands.find((b) =>
    b.upper_inclusive ? score >= b.lower && score <= b.upper : score >= b.lower && score < b.upper
  );
  const fg = band ? band.fg : "inherit";
  const bg = band ? band.bg : "transparent";
  return `<span class="score-badge" style="color:${fg};background:${bg}">${score.toFixed(2)}</span>`;
}

function matchLabel(m) {
  return `${translateTeam(m.home_team)} x ${translateTeam(m.away_team)}`;
}

// A handful of table columns show a translated string but sort by the
// canonical underlying field name in data-sort — map one to the other.
function effectiveSortKey(key) {
  if (key === "phase") return "phaseLabel";
  if (key === "team") return "teamLabel";
  return key;
}

// ---- static chrome (tabs, headers, labels) ----
function applyStaticTranslations() {
  document.documentElement.lang = state.lang === "en" ? "en" : "pt-BR";
  document.title = t("title");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-criterion]").forEach((el) => {
    el.textContent = translateCriterionAbbr(el.dataset.i18nCriterion);
  });
}

document.getElementById("lang-toggle").addEventListener("click", () => {
  state.lang = state.lang === "pt" ? "en" : "pt";
  localStorage.setItem("lang", state.lang);
  renderAll();
});

// ---- tabs ----
document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn || btn.id === "lang-toggle") return;
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(`view-${btn.dataset.view}`).classList.add("active");
});

// ---- shared chart/tile rendering ----
function renderBarChart(container, rows, { labelKey, valueKey, max }) {
  container.innerHTML = "";
  if (!rows.length) {
    container.innerHTML = `<div class="empty">${t("empty_no_rated")}</div>`;
    return;
  }
  const scale = max ?? Math.max(...rows.map((r) => r[valueKey] ?? 0), 1);
  for (const row of rows) {
    const value = row[valueKey];
    const pct = value == null ? 0 : Math.max((value / scale) * 100, 2);
    const el = document.createElement("div");
    el.className = "bar-row";
    el.innerHTML = `
      <div class="bar-label">${row[labelKey]}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="bar-value">${value == null ? "—" : value.toFixed(2)}</div>`;
    container.appendChild(el);
  }
}

function renderTiles(container, summary) {
  const tileData = [
    [t("tile_total"), summary.total_matches],
    [t("tile_rated"), summary.rated_matches],
    [t("tile_avg"), summary.overall_average?.toFixed(2) ?? "—"],
    [t("tile_max"), summary.highest_score?.toFixed(2) ?? "—"],
    [t("tile_min"), summary.lowest_score?.toFixed(2) ?? "—"],
  ];
  container.innerHTML = tileData
    .map(([label, value]) => `<div class="tile"><div class="label">${label}</div><div class="value">${value}</div></div>`)
    .join("");
}

// ---- top matches ----
function sortRows(rows, key, asc) {
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string") return asc ? av.localeCompare(bv) : bv.localeCompare(av);
    return asc ? av - bv : bv - av;
  });
}

const CRITERIA_KEYS = ["first_half", "second_half", "back_and_forth", "emotion", "historic_component"];

function renderTopTable(rows) {
  const tbody = document.querySelector("#top-table tbody");
  const enriched = rows.map((m) => ({
    ...m,
    ...m.scores,
    label: matchLabel(m),
    phaseLabel: translatePhase(m.phase),
  }));
  const sorted = sortRows(enriched, effectiveSortKey(state.topSort.key), state.topSort.asc);
  tbody.innerHTML = sorted
    .map(
      (m, i) => `
    <tr class="${i < 10 ? "top10" : ""}">
      <td>${i + 1}</td>
      <td>${m.phaseLabel}</td>
      <td>${m.label}</td>
      <td>${m.score ?? "—"}</td>
      ${CRITERIA_KEYS.map((k) => `<td>${scoreBadge(m[k])}</td>`).join("")}
      <td>${scoreBadge(m.final_score)}</td>
    </tr>`
    )
    .join("");
}

function populatePhaseFilterOptions() {
  const select = document.getElementById("top-phase-filter");
  const previous = select.value;
  select.innerHTML =
    `<option value="">${t("filter_phase_all")}</option>` +
    state.phases.map((p) => `<option value="${p}">${translatePhase(p)}</option>`).join("");
  select.value = previous;
}

function refreshTopTable() {
  const phase = document.getElementById("top-phase-filter").value; // canonical (Portuguese) phase name
  const teamQuery = document.getElementById("top-team-filter").value.trim().toLowerCase();
  let rows = state.raw.allMatches;
  if (phase) rows = rows.filter((m) => m.phase === phase);
  if (teamQuery) rows = rows.filter((m) => matchLabel(m).toLowerCase().includes(teamQuery));
  renderTopTable(rows);
}

document.getElementById("top-phase-filter").addEventListener("change", refreshTopTable);
document.getElementById("top-team-filter").addEventListener("input", debounce(refreshTopTable, 250));

document.querySelector("#top-table thead").addEventListener("click", (e) => {
  const th = e.target.closest("th[data-sort]");
  if (!th) return;
  const key = th.dataset.sort;
  state.topSort.asc = state.topSort.key === key ? !state.topSort.asc : false;
  state.topSort.key = key;
  document.querySelectorAll("#top-table th").forEach((h) => h.classList.remove("sorted-asc", "sorted-desc"));
  th.classList.add(state.topSort.asc ? "sorted-asc" : "sorted-desc");
  refreshTopTable();
});

// ---- teams ----
function renderTeamsTable() {
  const tbody = document.querySelector("#teams-table tbody");
  const enriched = state.teams.map((tm) => ({ ...tm, teamLabel: translateTeam(tm.team) }));
  const sorted = sortRows(enriched, effectiveSortKey(state.teamsSort.key), state.teamsSort.asc);
  tbody.innerHTML = sorted
    .map(
      (tm, i) => `
    <tr class="${i < 10 ? "top10" : ""}">
      <td>${i + 1}</td>
      <td>${tm.teamLabel}</td>
      <td>${tm.matches_played}</td>
      <td>${scoreBadge(tm.average_final_score)}</td>
      <td>${matchLabel(tm.best_match)} (${scoreBadge(tm.best_match.final_score)})</td>
      <td>${matchLabel(tm.worst_match)} (${scoreBadge(tm.worst_match.final_score)})</td>
    </tr>`
    )
    .join("");
}

document.querySelector("#teams-table thead").addEventListener("click", (e) => {
  const th = e.target.closest("th[data-sort]");
  if (!th) return;
  const key = th.dataset.sort;
  state.teamsSort.asc = state.teamsSort.key === key ? !state.teamsSort.asc : false;
  state.teamsSort.key = key;
  document.querySelectorAll("#teams-table th").forEach((h) => h.classList.remove("sorted-asc", "sorted-desc"));
  th.classList.add(state.teamsSort.asc ? "sorted-asc" : "sorted-desc");
  renderTeamsTable();
});

// ---- criteria ----
function renderCriteria() {
  const rows = state.raw.criteria.map((c) => ({ ...c, translatedLabel: translateCriterionLabel(c.criterion) }));
  renderBarChart(document.getElementById("criteria-chart"), rows, {
    labelKey: "translatedLabel",
    valueKey: "average",
    max: 10,
  });
  renderCriteriaTens(rows);
}

function renderCriteriaTens(criteria) {
  const container = document.getElementById("criteria-tens");
  container.innerHTML = criteria
    .map((c) => {
      const tens = state.raw.criteriaTens[c.criterion];
      const chips = tens
        .map((m) => `<span class="chip">${translatePhase(m.phase)} · ${matchLabel(m)} <b>${scoreBadge(m.final_score)}</b></span>`)
        .join("");
      return `
        <div class="tens-card">
          <div class="tens-card-header">
            <span class="tens-card-title">${c.translatedLabel}</span>
            <span class="tens-card-count">${tens.length}</span>
          </div>
          <div class="chip-list">${chips || `<span class="empty-inline">${t("empty_no_tens")}</span>`}</div>
        </div>`;
    })
    .join("");
}

// ---- dashboards ----
function dashPanel(title, rows, labelKey, valueKey) {
  const panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML = `<h2>${title}</h2><div class="chart"></div>`;
  renderBarChart(panel.querySelector(".chart"), rows, { labelKey, valueKey, max: 10 });
  return panel;
}

function renderDashboards() {
  renderTiles(document.getElementById("dashboards-tiles"), state.raw.summary);
  renderBarChart(
    document.getElementById("phase-chart"),
    state.raw.summary.by_phase.map((p) => ({ ...p, phaseLabel: translatePhase(p.phase) })),
    { labelKey: "phaseLabel", valueKey: "average_final_score", max: 10 }
  );

  const grid = document.getElementById("dashboards-grid");
  grid.innerHTML = "";

  const withTeamLabel = (rows) => rows.map((tm) => ({ ...tm, teamLabel: translateTeam(tm.team) }));
  grid.appendChild(dashPanel(t("dash_best_teams"), withTeamLabel(state.raw.bestTeams), "teamLabel", "average_final_score"));
  grid.appendChild(dashPanel(t("dash_worst_teams"), withTeamLabel(state.raw.worstTeams), "teamLabel", "average_final_score"));

  for (const c of state.raw.criteria) {
    const label = translateCriterionLabel(c.criterion);
    const { best, worst } = state.raw.criteriaRankings[c.criterion];
    const withValue = (rows) => rows.map((m) => ({ ...m, __label: matchLabel(m), __value: m.scores[c.criterion] }));
    grid.appendChild(dashPanel(t("dash_best_criterion", { label }), withValue(best), "__label", "__value"));
    grid.appendChild(dashPanel(t("dash_worst_criterion", { label }), withValue(worst), "__label", "__value"));
  }
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ---- load once, render (and re-render on language toggle) from cache ----
async function loadAll() {
  const meta = await getJSON("/api/meta");
  state.colorBands = meta.color_bands;
  state.phases = meta.phases;

  const [summary, allMatches, teams, criteria] = await Promise.all([
    getJSON("/api/summary"),
    getJSON("/api/matches"),
    getJSON("/api/teams"),
    getJSON("/api/criteria"),
  ]);
  state.raw.summary = summary;
  state.raw.allMatches = allMatches;
  state.teams = teams;
  state.raw.criteria = criteria;

  const [bestTeams, worstTeams] = await Promise.all([
    getJSON("/api/teams/top?limit=10&ascending=false"),
    getJSON("/api/teams/top?limit=10&ascending=true"),
  ]);
  state.raw.bestTeams = bestTeams;
  state.raw.worstTeams = worstTeams;

  state.raw.criteriaRankings = {};
  state.raw.criteriaTens = {};
  for (const c of criteria) {
    const [best, worst, tens] = await Promise.all([
      getJSON(`/api/matches/by-criterion?criterion=${c.criterion}&limit=10&ascending=false`),
      getJSON(`/api/matches/by-criterion?criterion=${c.criterion}&limit=10&ascending=true`),
      getJSON(`/api/matches?criterion=${c.criterion}&criterion_min=10`),
    ]);
    state.raw.criteriaRankings[c.criterion] = { best, worst };
    state.raw.criteriaTens[c.criterion] = tens;
  }
}

function renderAll() {
  applyStaticTranslations();
  populatePhaseFilterOptions();
  renderDashboards();
  refreshTopTable();
  renderTeamsTable();
  renderCriteria();
}

async function main() {
  applyStaticTranslations();
  await loadAll();
  renderAll();
}

main().catch((err) => {
  document.getElementById("app").innerHTML = `<div class="empty">${t("error_prefix")}${err.message}</div>`;
  console.error(err);
});
