const state = {
  colorBands: [],
  topSort: { key: "final_score", asc: false },
  teamsSort: { key: "average_final_score", asc: false },
  teams: [],
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
  return `${m.home_team} x ${m.away_team}`;
}

// ---- tabs ----
document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(`view-${btn.dataset.view}`).classList.add("active");
});

// ---- shared chart/tile rendering ----
function renderBarChart(container, rows, { labelKey, valueKey, max }) {
  container.innerHTML = "";
  if (!rows.length) {
    container.innerHTML = `<div class="empty">Sem partidas avaliadas ainda.</div>`;
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
    ["Total de partidas", summary.total_matches],
    ["Partidas avaliadas", summary.rated_matches],
    ["Média geral", summary.overall_average?.toFixed(2) ?? "—"],
    ["Maior nota", summary.highest_score?.toFixed(2) ?? "—"],
    ["Menor nota", summary.lowest_score?.toFixed(2) ?? "—"],
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
  const sorted = sortRows(
    rows.map((m) => ({ ...m, ...m.scores, label: matchLabel(m) })),
    state.topSort.key,
    state.topSort.asc
  );
  tbody.innerHTML = sorted
    .map(
      (m, i) => `
    <tr class="${i < 10 ? "top10" : ""}">
      <td>${i + 1}</td>
      <td>${m.phase}</td>
      <td>${m.label}</td>
      <td>${m.score ?? "—"}</td>
      ${CRITERIA_KEYS.map((k) => `<td>${scoreBadge(m[k])}</td>`).join("")}
      <td>${scoreBadge(m.final_score)}</td>
    </tr>`
    )
    .join("");
}

async function loadTop() {
  const meta = await getJSON("/api/meta");
  const phaseSelect = document.getElementById("top-phase-filter");
  if (phaseSelect.options.length <= 1) {
    for (const phase of meta.phases) {
      const opt = document.createElement("option");
      opt.value = phase;
      opt.textContent = phase;
      phaseSelect.appendChild(opt);
    }
  }
  await refreshTopTable();
}

async function refreshTopTable() {
  const phase = document.getElementById("top-phase-filter").value;
  const team = document.getElementById("top-team-filter").value.trim();
  const params = new URLSearchParams();
  if (phase) params.set("phase", phase);
  if (team) params.set("team", team);
  const rows = await getJSON(`/api/matches?${params.toString()}`);
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
  const sorted = sortRows(state.teams, state.teamsSort.key, state.teamsSort.asc);
  tbody.innerHTML = sorted
    .map(
      (t, i) => `
    <tr class="${i < 10 ? "top10" : ""}">
      <td>${i + 1}</td>
      <td>${t.team}</td>
      <td>${t.matches_played}</td>
      <td>${scoreBadge(t.average_final_score)}</td>
      <td>${matchLabel(t.best_match)} (${scoreBadge(t.best_match.final_score)})</td>
      <td>${matchLabel(t.worst_match)} (${scoreBadge(t.worst_match.final_score)})</td>
    </tr>`
    )
    .join("");
}

async function loadTeams() {
  state.teams = await getJSON("/api/teams");
  renderTeamsTable();
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
async function loadCriteria() {
  const rows = await getJSON("/api/criteria");
  renderBarChart(document.getElementById("criteria-chart"), rows, {
    labelKey: "label",
    valueKey: "average",
    max: 10,
  });
  await renderCriteriaTens(rows);
}

async function renderCriteriaTens(criteria) {
  const container = document.getElementById("criteria-tens");
  const perCriterion = await Promise.all(
    criteria.map((c) => getJSON(`/api/matches?criterion=${c.criterion}&criterion_min=10`))
  );
  container.innerHTML = criteria
    .map((c, i) => {
      const tens = perCriterion[i];
      const chips = tens
        .map((m) => `<span class="chip">${m.phase} · ${matchLabel(m)} <b>${scoreBadge(m.final_score)}</b></span>`)
        .join("");
      return `
        <div class="tens-card">
          <div class="tens-card-header">
            <span class="tens-card-title">${c.label}</span>
            <span class="tens-card-count">${tens.length}</span>
          </div>
          <div class="chip-list">${chips || '<span class="empty-inline">Nenhuma partida com nota 10 aqui ainda.</span>'}</div>
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

async function loadDashboards() {
  const summary = await getJSON("/api/summary");
  renderTiles(document.getElementById("dashboards-tiles"), summary);
  renderBarChart(document.getElementById("phase-chart"), summary.by_phase, {
    labelKey: "phase",
    valueKey: "average_final_score",
    max: 10,
  });

  const grid = document.getElementById("dashboards-grid");
  grid.innerHTML = "";

  const [bestTeams, worstTeams] = await Promise.all([
    getJSON("/api/teams/top?limit=10&ascending=false"),
    getJSON("/api/teams/top?limit=10&ascending=true"),
  ]);
  grid.appendChild(dashPanel("Top melhores times", bestTeams, "team", "average_final_score"));
  grid.appendChild(dashPanel("Top piores times", worstTeams, "team", "average_final_score"));

  const criteria = await getJSON("/api/criteria");
  for (const c of criteria) {
    const [best, worst] = await Promise.all([
      getJSON(`/api/matches/by-criterion?criterion=${c.criterion}&limit=10&ascending=false`),
      getJSON(`/api/matches/by-criterion?criterion=${c.criterion}&limit=10&ascending=true`),
    ]);
    const withValue = (rows) => rows.map((m) => ({ ...m, __label: matchLabel(m), __value: m.scores[c.criterion] }));
    grid.appendChild(dashPanel(`Top melhores — ${c.label}`, withValue(best), "__label", "__value"));
    grid.appendChild(dashPanel(`Top piores — ${c.label}`, withValue(worst), "__label", "__value"));
  }
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

async function main() {
  const meta = await getJSON("/api/meta");
  state.colorBands = meta.color_bands;
  await Promise.all([loadDashboards(), loadTop(), loadTeams(), loadCriteria()]);
}

main().catch((err) => {
  document.getElementById("app").innerHTML = `<div class="empty">Erro ao carregar dados: ${err.message}</div>`;
  console.error(err);
});
