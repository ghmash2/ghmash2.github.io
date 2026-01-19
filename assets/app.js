const GH_USER = "ghmash2"; // your username

const el = (id) => document.getElementById(id);

const state = {
  repos: [],
  filtered: [],
  search: "",
  sort: "stars",
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function repoScoreStars(r) {
  return (r.stargazers_count || 0);
}
function repoScoreUpdated(r) {
  return new Date(r.updated_at).getTime();
}

function sortRepos(repos, sortKey) {
  const arr = [...repos];
  if (sortKey === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
  if (sortKey === "updated") arr.sort((a, b) => repoScoreUpdated(b) - repoScoreUpdated(a));
  if (sortKey === "stars") arr.sort((a, b) => repoScoreStars(b) - repoScoreStars(a));
  return arr;
}

function applyFilters() {
  const q = state.search.trim().toLowerCase();
  const filtered = q
    ? state.repos.filter((r) => {
        const hay = `${r.name} ${r.description || ""} ${r.language || ""}`.toLowerCase();
        return hay.includes(q);
      })
    : [...state.repos];

  state.filtered = sortRepos(filtered, state.sort);
  renderRepos();
}

function repoCard(repo) {
  const desc = repo.description ? repo.description : "No description provided.";
  const lang = repo.language || "—";
  const stars = repo.stargazers_count ?? 0;
  const forks = repo.forks_count ?? 0;
  const updated = formatDate(repo.updated_at);

  const homepage = repo.homepage && repo.homepage.startsWith("http") ? repo.homepage : null;

  return `
    <div class="repo">
      <div class="repoTitleRow">
        <a href="${repo.html_url}" target="_blank" rel="noreferrer">${repo.name}</a>
        ${repo.fork ? `<span class="badge">Fork</span>` : ``}
      </div>
      <div class="muted">${escapeHtml(desc)}</div>
      <div class="badges">
        <span class="badge"><strong>${stars}</strong>&nbsp;Stars</span>
        <span class="badge"><strong>${forks}</strong>&nbsp;Forks</span>
        <span class="badge">${escapeHtml(lang)}</span>
        <span class="badge">Updated: ${updated}</span>
        ${homepage ? `<a class="badge" href="${homepage}" target="_blank" rel="noreferrer">Live</a>` : ``}
      </div>
    </div>
  `;
}

// basic XSS-safe escape for text-only fields
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderRepos() {
  const grid = el("repoGrid");
  const status = el("status");

  if (!state.filtered.length) {
    grid.innerHTML = "";
    status.textContent = "No repositories found.";
    return;
  }

  status.textContent = `${state.filtered.length} repositories`;
  grid.innerHTML = state.filtered.map(repoCard).join("");
}

async function fetchGitHubJSON(url) {
  const res = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GitHub API error ${res.status}: ${txt || res.statusText}`);
  }
  return res.json();
}

async function init() {
  el("year").textContent = new Date().getFullYear();

  try {
    // Profile
    const profile = await fetchGitHubJSON(`https://api.github.com/users/${GH_USER}`);
    el("name").textContent = profile.name || profile.login;
    el("bio").textContent = profile.bio || "Software developer.";
    el("followers").textContent = profile.followers ?? "—";
    el("publicRepos").textContent = profile.public_repos ?? "—";
    el("location").textContent = profile.location || "—";
    const ghLink = el("githubLink");
    ghLink.href = profile.html_url;

    // Repos
    const repos = await fetchGitHubJSON(
      `https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=updated`
    );

    // Filter out archived + optionally forks
    state.repos = repos
      .filter((r) => !r.archived)
      .filter((r) => !r.private); // public only (Pages is public)

    // Default: remove forks (toggle this if you want forks)
    state.repos = state.repos.filter((r) => !r.fork);

    applyFilters();
  } catch (e) {
    el("status").textContent = "Failed to load GitHub data.";
    el("repoGrid").innerHTML = `<div class="muted">${escapeHtml(e.message || String(e))}</div>`;
  }

  // UI events
  el("search").addEventListener("input", (ev) => {
    state.search = ev.target.value || "";
    applyFilters();
  });
  el("sort").addEventListener("change", (ev) => {
    state.sort = ev.target.value;
    applyFilters();
  });
}

init();
