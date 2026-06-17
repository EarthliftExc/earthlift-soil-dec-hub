let SITES = [
  ["harkaway", "Harkaway", "Webform"],
  ["urm", "URM", "Webform"],
  ["landfix", "Landfix", "Webform"],
  ["daisys", "Daisy's", "Webform"],
  ["esg", "ESG", "Webform"],
  ["scope", "Scope", "Webform"],
  ["lte-monk", "LTE / Monk", "Google Form"],
  ["galcon", "Galcon", "Webform"],
  ["hanson", "Hanson / Heidelberg", "PDF email"],
  ["landformx", "LandformX", "PDF email"],
  ["antech", "Antech", "PDF email"],
];

const form = document.querySelector("#hubForm");
const connectionStatus = document.querySelector("#connectionStatus");
const submitterId = document.querySelector("#submitterId");
const jobNumber = document.querySelector("#jobNumber");
const pasteJobButton = document.querySelector("#pasteJobButton");
const principalContractor = document.querySelector("#principalContractor");
const jobAddress = document.querySelector("#jobAddress");
const volume = document.querySelector("#volume");
const reportFile = document.querySelector("#reportFile");
const reportPathWrap = document.querySelector("#reportPathWrap");
const emailAction = document.querySelector("#emailAction");
const esgSiteId = document.querySelector("#esgSiteId");
const esgOption = document.querySelector("#esgOption");
const lteDestination = document.querySelector("#lteDestination");
const lteOption = document.querySelector("#lteOption");
const siteGrid = document.querySelector("#siteGrid");
const sendButton = document.querySelector("#sendButton");
const searchInput = document.querySelector("#searchInput");
const searchResults = document.querySelector("#searchResults");
const copiedJobStorageKey = "earthlift-soil-hub-copied-job";
let searchCompletionResults = [];
const siteProgressTimers = new Map();
const siteProgressDurationMs = 10000;
let copiedJob = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadCopiedJob() {
  try {
    const saved = JSON.parse(localStorage.getItem(copiedJobStorageKey) || "null");
    return saved && saved.jobNumber ? saved : null;
  } catch {
    return null;
  }
}

function saveCopiedJob(job) {
  copiedJob = job;
  localStorage.setItem(copiedJobStorageKey, JSON.stringify(job));
  updatePasteJobButton();
}

function updatePasteJobButton() {
  pasteJobButton.disabled = !copiedJob;
  pasteJobButton.title = copiedJob?.jobNumber ? `Paste job ${copiedJob.jobNumber}` : "No copied job yet";
}

function copyJobFromCompletion(item) {
  return {
    jobNumber: item.jobNumber || "",
    principalContractor: item.principalContractor || "",
    jobAddress: item.jobAddress || "",
    volume: item.volume || "",
    demolition: item.demolition || "No",
  };
}

function pasteCopiedJob() {
  if (!copiedJob) return;
  jobNumber.value = copiedJob.jobNumber || "";
  principalContractor.value = copiedJob.principalContractor || "";
  jobAddress.value = copiedJob.jobAddress || "";
  volume.value = copiedJob.volume || "";
  const demolitionInput = document.querySelector(`input[name="demolition"][value="${CSS.escape(copiedJob.demolition || "No")}"]`);
  if (demolitionInput) demolitionInput.checked = true;
  clearSiteResultStates();
  jobNumber.focus();
}

function setConnection(message, tone = "") {
  connectionStatus.textContent = message;
  connectionStatus.className = `status-pill ${tone}`.trim();
}

function renderSites() {
  siteGrid.innerHTML = SITES.map(([id, name]) => `
    <label class="site-card">
      <input type="checkbox" name="sites" value="${escapeHtml(id)}" />
      <strong>${escapeHtml(name)}</strong>
      <span class="site-result" aria-live="polite"></span>
    </label>
  `).join("");
}

function selectedSites() {
  return Array.from(document.querySelectorAll('input[name="sites"]:checked')).map((input) => input.value);
}

function demolitionValue() {
  return document.querySelector('input[name="demolition"]:checked')?.value || "No";
}

function payload() {
  return {
    submitterId: submitterId.value,
    jobNumber: jobNumber.value.trim(),
    principalContractor: principalContractor.value.trim(),
    jobAddress: jobAddress.value.trim(),
    volume: volume.value.trim(),
    demolition: demolitionValue(),
    selectedSites: selectedSites(),
    esgSiteId: esgSiteId.value,
    lteDestination: lteDestination.value,
    reportPath: "",
    emailAction: emailAction.value,
  };
}

function saveDraftState() {
  localStorage.setItem(
    "earthlift-soil-hub-preferences",
    JSON.stringify({
      submitterId: submitterId.value,
      emailAction: emailAction.value,
      esgSiteId: esgSiteId.value,
      lteDestination: lteDestination.value,
      selectedSites: selectedSites(),
    }),
  );
}

function restorePreferences(settings = {}) {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem("earthlift-soil-hub-preferences") || "{}");
  } catch {
    saved = {};
  }
  submitterId.value = settings.machineSubmitter || saved.submitterId || settings.defaultSubmitter || "chris";
  emailAction.value = saved.emailAction || settings.emailAction || "send";
  esgSiteId.value = saved.esgSiteId || settings.esgSiteId || "85";
  lteDestination.value = saved.lteDestination || settings.lteDestination || "LTE Langwarrin - Soil";
  const savedSites = new Set(saved.selectedSites || []);
  document.querySelectorAll('input[name="sites"]').forEach((input) => {
    input.checked = savedSites.has(input.value);
  });
  updateConditionalFields();
}

function validate(data) {
  const missing = [];
  if (!data.jobNumber) missing.push("job number");
  if (!data.principalContractor) missing.push("Principal Contractor");
  if (!data.jobAddress) missing.push("job address");
  if (!data.volume || Number(data.volume) <= 0) missing.push("volume");
  if (!data.selectedSites.length) missing.push("at least one tip site");
  if (missing.length) throw new Error(`Please enter ${missing.join(", ")}.`);
}

function clearJobDetails() {
  jobNumber.value = "";
  principalContractor.value = "";
  jobAddress.value = "";
  volume.value = "";
  reportFile.value = "";
  document.querySelector('input[name="demolition"][value="No"]').checked = true;
  jobNumber.focus();
}

function updateConditionalFields() {
  const selected = new Set(selectedSites());
  reportPathWrap.classList.toggle("hidden", !selected.has("daisys"));
  esgOption.classList.toggle("hidden", !selected.has("esg"));
  lteOption.classList.toggle("hidden", !selected.has("lte-monk"));
  if (!selected.has("daisys")) reportFile.value = "";
}

function clearSiteResultStates() {
  document.querySelectorAll(".site-card").forEach((card) => {
    card.classList.remove("done", "failed", "skipped", "running");
    card.removeAttribute("title");
    card.style.removeProperty("--site-progress");
    const status = card.querySelector(".site-result");
    if (status) status.textContent = "";
  });
  siteProgressTimers.forEach((timer) => clearInterval(timer));
  siteProgressTimers.clear();
}

function setSiteState(siteId, state, label = "", detail = "") {
  const input = document.querySelector(`input[name="sites"][value="${CSS.escape(siteId)}"]`);
  const card = input?.closest(".site-card");
  if (!card) return;
  if (siteProgressTimers.has(siteId)) {
    clearInterval(siteProgressTimers.get(siteId));
    siteProgressTimers.delete(siteId);
  }
  card.classList.add(state);
  if (detail) card.title = detail;
  const status = card.querySelector(".site-result");
  if (status) status.textContent = label;
  if (state === "running") startSiteProgress(siteId, card);
  if (state === "done") card.style.setProperty("--site-progress", "1");
}

function startSiteProgress(siteId, card) {
  const startedAt = Date.now();
  card.style.setProperty("--site-progress", "0");
  const tick = () => {
    const progress = Math.min((Date.now() - startedAt) / siteProgressDurationMs, 0.98);
    card.style.setProperty("--site-progress", progress.toFixed(3));
  };
  tick();
  siteProgressTimers.set(siteId, setInterval(tick, 250));
}

function resultClass(status) {
  const lower = String(status || "").toLowerCase();
  if (lower.includes("fail")) return "failed";
  if (lower.includes("skip") || lower.includes("already") || lower.includes("needed") || lower.includes("planned")) return "skipped";
  return "done";
}

function renderRunResults(results) {
  clearSiteResultStates();
  results.forEach((result) => {
    const state = resultClass(result.status);
    const detail = result.urmJobNumber ? `${result.summary || ""}\n${result.urmJobNumber}`.trim() : result.summary || "";
    const label = state === "done" ? "Completed" : result.urmJobNumber ? `${result.status}\n${result.urmJobNumber}` : result.status || "Done";
    setSiteState(result.siteId, state, label, detail);
  });
}

async function api(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok || result.ok === false) throw new Error(result.summary || "Hub request failed.");
  return result;
}

async function uploadDaisyReportIfNeeded(data) {
  if (!data.selectedSites.includes("daisys")) return data;
  const file = reportFile.files[0];
  if (!file) return data;
  const response = await fetch(`/api/upload-report?filename=${encodeURIComponent(file.name)}`, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  const result = await response.json();
  if (!response.ok || result.ok === false) throw new Error(result.summary || "Could not upload the Daisy soil report.");
  return { ...data, reportPath: result.reportPath, reportFileName: result.fileName || file.name };
}

async function loadHealth() {
  try {
    const health = await api("/api/health");
    SITES = (health.sites || []).map((site) => [site.id, site.name, site.method || "Webform"]);
    submitterId.innerHTML = health.submitters.map((profile) => `
      <option value="${escapeHtml(profile.id)}">${escapeHtml(profile.label)}</option>
    `).join("");
    renderSites();
    restorePreferences(health.settings);
    if (health.databaseReady) {
      setConnection("Hub ready", "ready");
    } else {
      setConnection("Cloud setup needed", "bad");
    }
  } catch (error) {
    renderSites();
    setConnection("Hub offline", "bad");
    setConnection(error.message, "bad");
  }
}

let searchTimer = null;
async function searchCompletions() {
  const q = searchInput.value.trim();
  try {
    const result = await api(`/api/completions?q=${encodeURIComponent(q)}`);
    if (!result.completions.length) {
      searchCompletionResults = [];
      searchResults.innerHTML = q ? "<div class='meta'>No matching completed declarations found.</div>" : "";
      return;
    }
    searchCompletionResults = result.completions.slice(0, 12);
    searchResults.innerHTML = searchCompletionResults.map((item, index) => `
      <article class="search-item">
        <div class="search-item-head">
          <strong>${escapeHtml(item.jobNumber || "")} - ${escapeHtml(item.siteName || item.siteId || "")}</strong>
          <button class="inline-action copy-job-button" type="button" data-copy-index="${index}">Copy Job</button>
        </div>
        <div class="meta">${escapeHtml(item.jobAddress || "")}</div>
        <div class="meta">${escapeHtml(item.status || "Completed")} ${item.completedAt ? `- ${escapeHtml(new Date(item.completedAt).toLocaleString())}` : ""}</div>
      </article>
    `).join("");
  } catch (error) {
    searchResults.innerHTML = `<div class="meta">${escapeHtml(error.message)}</div>`;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = payload();
  try {
    validate(data);
    saveDraftState();
    clearSiteResultStates();
    data.selectedSites.forEach((siteId) => setSiteState(siteId, "running", "Running"));
    sendButton.disabled = true;
    setConnection(`Sending ${data.jobNumber}...`);
    const submitData = await uploadDaisyReportIfNeeded(data);
    const result = await api("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submitData),
    });
    renderRunResults(result.results || []);
    const statuses = (result.results || []).map((item) => String(item.status || "").toLowerCase());
    if (statuses.some((status) => status.includes("fail"))) {
      setConnection("Some failed", "bad");
    } else if (statuses.some((status) => status.includes("needed") || status.includes("planned"))) {
      setConnection("Cloud sender needed", "bad");
    } else {
      setConnection("Run complete", "ready");
      clearJobDetails();
      searchCompletions();
    }
  } catch (error) {
    data.selectedSites.forEach((siteId) => setSiteState(siteId, "failed", "Failed", error.message));
    setConnection(error.message || "Needs attention", "bad");
  } finally {
    sendButton.disabled = false;
  }
});

pasteJobButton.addEventListener("click", pasteCopiedJob);
searchResults.addEventListener("click", (event) => {
  const button = event.target.closest(".copy-job-button");
  if (!button) return;
  const item = searchCompletionResults[Number(button.dataset.copyIndex)];
  if (!item) return;
  saveCopiedJob(copyJobFromCompletion(item));
  button.textContent = "Copied";
  window.setTimeout(() => {
    button.textContent = "Copy Job";
  }, 1200);
});

[submitterId, emailAction, esgSiteId, lteDestination].forEach((element) => {
  element.addEventListener("change", saveDraftState);
});
siteGrid.addEventListener("change", () => {
  clearSiteResultStates();
  updateConditionalFields();
  saveDraftState();
});
[jobNumber, principalContractor, jobAddress, volume].forEach((element) => {
  element.addEventListener("input", clearSiteResultStates);
});
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(searchCompletions, 220);
});

copiedJob = loadCopiedJob();
updatePasteJobButton();
loadHealth().then(searchCompletions);
