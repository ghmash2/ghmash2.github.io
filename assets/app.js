const GH_USER = "ghmash2";

const el = (id) => document.getElementById(id);

const state = {
  repos: [],
  filtered: [],
  search: "",
  sort: "stars",
};

const MAX_FEATURED = 3;
const MAX_SKILLS = 8;

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function normalizeUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

function setLink(id, url) {
  const link = el(id);
  if (!link) return;
  if (url) {
    link.href = url;
    link.style.display = "inline-flex";
  } else {
    link.style.display = "none";
  }
}

function setText(id, value) {
  const node = el(id);
  if (node) node.textContent = value;
}

function repoScoreStars(r) {
  return r.stargazers_count || 0;
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

function repoCard(repo, index) {
  const desc = repo.description ? repo.description : "No description provided.";
  const lang = repo.language || "N/A";
  const stars = repo.stargazers_count ?? 0;
  const forks = repo.forks_count ?? 0;
  const updated = formatDate(repo.updated_at);

  const homepage = normalizeUrl(repo.homepage);
  const delay = Math.min(index * 40, 240);

  return `
    <div class="repo" style="animation-delay:${delay}ms">
      <div class="repoTitleRow">
        <a href="${repo.html_url}" target="_blank" rel="noreferrer">${escapeHtml(repo.name)}</a>
        ${repo.fork ? `<span class="badge">Fork</span>` : ``}
      </div>
      <div class="muted">${escapeHtml(desc)}</div>
      <div class="badges">
        <span class="badge"><strong>${stars}</strong> Stars</span>
        <span class="badge"><strong>${forks}</strong> Forks</span>
        <span class="badge">${escapeHtml(lang)}</span>
        <span class="badge">Updated: ${updated}</span>
        ${homepage ? `<a class="badge" href="${homepage}" target="_blank" rel="noreferrer">Live</a>` : ``}
      </div>
    </div>
  `;
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

function renderFeatured() {
  const featuredGrid = el("featuredGrid");
  const featured = sortRepos(state.repos, "stars").slice(0, MAX_FEATURED);
  if (!featured.length) {
    featuredGrid.innerHTML = `<div class="muted">No featured repositories yet.</div>`;
    return;
  }
  featuredGrid.innerHTML = featured.map((repo, index) => repoCard(repo, index)).join("");
}

function renderSkills() {
  const list = el("skillsList");
  const counts = new Map();
  state.repos.forEach((repo) => {
    if (repo.language) {
      counts.set(repo.language, (counts.get(repo.language) || 0) + 1);
    }
  });
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_SKILLS)
    .map(([name, count]) => `${name} · ${count}`);

  if (!top.length) {
    list.innerHTML = `<span class="skill">JavaScript</span><span class="skill">HTML</span>`;
    return;
  }
  list.innerHTML = top.map((label) => `<span class="skill">${escapeHtml(label)}</span>`).join("");
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

async function fetchGitHubJSON(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GitHub API error ${res.status}: ${txt || res.statusText}`);
  }
  return res.json();
}

async function init() {
  setText("year", new Date().getFullYear());

  try {
    const profile = await fetchGitHubJSON(`https://api.github.com/users/${GH_USER}`);
    const name = profile.name || profile.login;
    const location = profile.location || "Remote";
    const company = profile.company ? profile.company.replace(/^@/, "") : "Independent";
    const blog = normalizeUrl(profile.blog);
    const twitter = profile.twitter_username
      ? `https://twitter.com/${profile.twitter_username}`
      : "";

    setText("name", name);
    setText("tagline", profile.company ? `Building at ${company}` : "Software Developer");
    setText("bio", profile.bio || "Software developer focused on clean UI and reliable systems.");
    setText("followers", profile.followers ?? "-");
    setText("publicRepos", profile.public_repos ?? "-");
    setText("location", location);
    setText("locationInline", location);
    setText("company", company);

    const aboutText = profile.bio
      ? `${profile.bio} I focus on shipping polished, reliable software.`
      : "I focus on shipping polished, reliable software.";
    setText("aboutText", aboutText);

    const avatar = el("avatar");
    if (avatar) {
      avatar.src = profile.avatar_url;
      avatar.alt = `${name} avatar`;
    }

    setLink("githubLink", profile.html_url);
    setLink("githubContact", profile.html_url);
    setLink("blogLink", blog);
    setLink("twitterLink", twitter);

    const blogInline = el("blogInline");
    if (blogInline) {
      blogInline.textContent = blog ? blog.replace(/^https?:\/\//, "") : "No website";
    }
  } catch (e) {
    setText("bio", "Failed to load GitHub profile.");
  }

  try {
    const repos = await fetchGitHubJSON(
      `https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=updated`
    );

    state.repos = repos
      .filter((r) => !r.archived)
      .filter((r) => !r.private)
      .filter((r) => !r.fork);

    renderSkills();
    renderFeatured();
    applyFilters();
  } catch (e) {
    setText("status", "Failed to load GitHub data.");
    const grid = el("repoGrid");
    if (grid) {
      grid.innerHTML = `<div class="muted">${escapeHtml(e.message || String(e))}</div>`;
    }
  }

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
