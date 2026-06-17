const adminStatus = document.querySelector("#adminStatus");
const setupWarning = document.querySelector("#setupWarning");
const siteList = document.querySelector("#siteList");
const newSiteButton = document.querySelector("#newSiteButton");
const siteForm = document.querySelector("#siteForm");
const editorTitle = document.querySelector("#editorTitle");
const saveSiteButton = document.querySelector("#saveSiteButton");
const fields = {
  id: document.querySelector("#siteId"),
  name: document.querySelector("#siteName"),
  method: document.querySelector("#siteMethod"),
  senderStatus: document.querySelector("#senderStatus"),
  sortOrder: document.querySelector("#sortOrder"),
  enabled: document.querySelector("#enabled"),
  loginUrl: document.querySelector("#loginUrl"),
  notes: document.querySelector("#notes"),
};

let sites = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(message, tone = "") {
  adminStatus.textContent = message;
  adminStatus.className = `status-pill ${tone}`.trim();
}

async function api(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok || result.ok === false) throw new Error(result.summary || "Request failed.");
  return result;
}

function showWarning(message) {
  setupWarning.textContent = message || "";
  setupWarning.classList.toggle("hidden", !message);
}

function renderSites() {
  siteList.innerHTML = sites.map((site) => `
    <article class="admin-row">
      <div>
        <strong>${escapeHtml(site.name)}</strong>
        <div class="meta">${escapeHtml(site.method)} - ${escapeHtml(site.senderStatus || "planned")} ${site.enabled ? "" : "- hidden"}</div>
      </div>
      <button class="inline-action copy-job-button" type="button" data-edit-site="${escapeHtml(site.id)}">Edit</button>
    </article>
  `).join("");
}

function editSite(site) {
  editorTitle.textContent = site?.id ? `Edit ${site.name}` : "New Site";
  fields.id.value = site?.id || "";
  fields.id.disabled = Boolean(site?.id);
  fields.name.value = site?.name || "";
  fields.method.value = site?.method || "Webform";
  fields.senderStatus.value = site?.senderStatus || "planned";
  fields.sortOrder.value = site?.sortOrder || "";
  fields.enabled.checked = site?.enabled !== false;
  fields.loginUrl.value = site?.loginUrl || "";
  fields.notes.value = site?.notes || "";
  fields.name.focus();
}

async function loadSites() {
  try {
    const result = await api("/api/admin/sites");
    sites = result.sites || [];
    renderSites();
    if (result.databaseReady) {
      setStatus("Admin ready", "ready");
      showWarning("");
      saveSiteButton.disabled = false;
    } else {
      setStatus("Database needed", "bad");
      showWarning("The admin screen is ready, but saving is disabled until Cloudflare D1 is connected.");
      saveSiteButton.disabled = true;
    }
    editSite(sites[0] || null);
  } catch (error) {
    setStatus("Admin offline", "bad");
    showWarning(error.message);
  }
}

siteList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit-site]");
  if (!button) return;
  const site = sites.find((item) => item.id === button.dataset.editSite);
  if (site) editSite(site);
});

newSiteButton.addEventListener("click", () => editSite(null));

siteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    id: fields.id.value,
    name: fields.name.value,
    method: fields.method.value,
    senderStatus: fields.senderStatus.value,
    sortOrder: fields.sortOrder.value,
    enabled: fields.enabled.checked,
    loginUrl: fields.loginUrl.value,
    notes: fields.notes.value,
  };

  try {
    saveSiteButton.disabled = true;
    setStatus("Saving...");
    const result = await api("/api/admin/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    sites = result.sites || [];
    renderSites();
    const savedSite = sites.find((site) => site.id === result.saved?.id);
    editSite(savedSite || null);
    setStatus("Saved", "ready");
  } catch (error) {
    setStatus("Save failed", "bad");
    showWarning(error.message);
  } finally {
    saveSiteButton.disabled = false;
  }
});

loadSites();
