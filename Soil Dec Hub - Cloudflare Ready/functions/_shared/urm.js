import puppeteer from "@cloudflare/puppeteer";

const SITE_URL = "https://soil.urmaustralia.com.au/";
const RECAPTCHA_SITE_KEY = "6LeoDvsnAAAAAMc_4X-EyXhFK45nDqVPjQZnMijC";

const DEFAULT_ANSWERS = {
  customerEmail: "alan.fenner@earthlift.com.au",
  customer: "Earthlift",
  applicantName: "Chris Knight",
  applicantPosition: "Transport Manager",
  transportContractor: "Earthlift",
  siteUseHistory: "Residential",
  soilDescription: "Clean fill",
  planningZone: ["Domestic"],
  soilCondition: ["Dry", "Natural"],
  soilType: ["Clay"],
  soilColour: ["Brown", "Grey", "Red"],
  riskRating: ["Low"],
  siteUseReportsAttached: ["No", "None"],
};

const URM_HELPER_SCRIPT = `
(() => {
  const norm = value => String(value || '')
    .replace(/\\u00a0/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim()
    .toLowerCase();
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const allControls = selector => Array.from(document.querySelectorAll(selector)).filter(element => element.type !== 'hidden');
  const setNativeValue = (element, value) => {
    const proto =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : element instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    if (window.jQuery) window.jQuery(element).trigger('change');
  };
  const candidatesArray = candidates => Array.isArray(candidates) ? candidates : [candidates];
  const cssEscape = value => {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/["\\\\]/g, '\\\\$&');
  };
  const containerForText = label => {
    const expected = norm(label);
    const containers = Array.from(document.querySelectorAll('.form-group, .row, fieldset, div, section'));
    return containers.find(container => norm(container.innerText || container.textContent).includes(expected));
  };
  const findControl = (candidates, selector, optional = false) => {
    const names = candidatesArray(candidates).filter(Boolean);
    for (const name of names) {
      const direct =
        document.querySelector('#' + cssEscape(name)) ||
        document.querySelector('[name="' + cssEscape(name) + '"]');
      if (direct && direct.matches(selector) && direct.type !== 'hidden') return direct;
      const lower = norm(name);
      const byLooseName = allControls(selector).find(element =>
        norm(element.id) === lower ||
        norm(element.name) === lower ||
        norm(element.id).includes(lower) ||
        norm(element.name).includes(lower)
      );
      if (byLooseName) return byLooseName;
      const labelled = Array.from(document.querySelectorAll('label')).find(label => norm(label.innerText || label.textContent).includes(lower));
      if (labelled) {
        const forId = labelled.getAttribute('for');
        if (forId) {
          const forElement = document.getElementById(forId);
          if (forElement && forElement.matches(selector) && forElement.type !== 'hidden') return forElement;
        }
        const nested = labelled.querySelector(selector);
        if (nested && nested.type !== 'hidden') return nested;
      }
      const container = containerForText(name);
      const inside = container?.querySelector(selector);
      if (inside && inside.type !== 'hidden') return inside;
    }
    if (optional) return null;
    throw new Error('URM field not found: ' + names.join(' / '));
  };
  const chooseOption = (select, preferred) => {
    const preferences = candidatesArray(preferred).map(norm).filter(Boolean);
    const options = Array.from(select.options).filter(option => !option.disabled);
    const usable = options.filter(option => String(option.value || '').trim() !== '');
    const match = usable.find(option => preferences.some(pref => norm(option.textContent).includes(pref) || norm(option.value).includes(pref)));
    return match || usable[0] || options[0] || null;
  };
  const chooseOptionValue = (select, preferred) => {
    const option = chooseOption(select, preferred);
    if (!option) return false;
    setNativeValue(select, option.value);
    return true;
  };
  const clickElement = element => {
    if (!element) return false;
    element.scrollIntoView({ block: 'center' });
    if (typeof element.click === 'function') {
      element.click();
      return true;
    }
    const rect = element.getBoundingClientRect();
    element.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        clientX: rect.left + Math.max(2, Math.min(rect.width / 2, 18)),
        clientY: rect.top + Math.max(2, Math.min(rect.height / 2, 18)),
      }),
    );
    return true;
  };
  const setYesNo = (candidates, value, optional = false) => {
    const expected = norm(value);
    let select = null;
    try { select = findControl(candidates, 'select', true); } catch {}
    if (select) return chooseOptionValue(select, [value, expected === 'yes' ? 'true' : 'false']);
    let text = null;
    try { text = findControl(candidates, 'input:not([type="radio"]):not([type="checkbox"]), textarea', true); } catch {}
    if (text) {
      setNativeValue(text, String(value || ''));
      return true;
    }
    let checkbox = null;
    try { checkbox = findControl(candidates, 'input[type="checkbox"]', true); } catch {}
    if (checkbox) {
      const shouldCheck = expected === 'yes' || expected === 'true';
      if (Boolean(checkbox.checked) !== shouldCheck) clickElement(checkbox);
      checkbox.checked = shouldCheck;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    const names = candidatesArray(candidates);
    for (const name of names) {
      const lower = norm(name);
      const radios = allControls('input[type="radio"]').filter(input => norm(input.name).includes(lower) || norm(input.id).includes(lower));
      const match = radios.find(input => norm(input.value).includes(expected) || norm(input.closest('label')?.innerText).includes(expected));
      if (match) {
        match.checked = true;
        match.dispatchEvent(new Event('change', { bubbles: true }));
        clickElement(match);
        return true;
      }
      const group = containerForText(name);
      const grouped = Array.from(group?.querySelectorAll('input[type="radio"], label') || []);
      const groupedMatch = grouped.find(element => norm(element.value || element.innerText || element.textContent).includes(expected));
      if (groupedMatch) {
        clickElement(groupedMatch);
        return true;
      }
    }
    if (optional) return false;
    throw new Error('URM yes/no field not found: ' + names.join(' / '));
  };
  const clearOptionalSelect = candidates => {
    const select = findControl(candidates, 'select', true);
    if (!select) return false;
    const blank =
      Array.from(select.options).find(option => String(option.value || '').trim() === '') ||
      Array.from(select.options).find(option => norm(option.textContent).includes('select')) ||
      select.options[0];
    setNativeValue(select, blank ? blank.value : '');
    return true;
  };
  const inputForLabel = label => {
    const forId = label?.getAttribute('for');
    if (forId) {
      const element = document.getElementById(forId);
      if (element) return element;
    }
    return label?.querySelector('input[type="radio"]') || null;
  };
  const forceNoIndustrialWaste = () => {
    const labels = Array.from(document.querySelectorAll('label'));
    const exactLabel = labels.find(label => norm(label.innerText || label.textContent) === 'no industrial waste');
    const fallbackLabel = labels.find(label => norm(label.innerText || label.textContent).includes('no industrial waste'));
    let target = inputForLabel(exactLabel || fallbackLabel);

    if (!target) {
      target = allControls('input[type="radio"]').find(input => {
        const fieldName = norm(input.name || input.id);
        const value = norm(input.value || input.getAttribute('value'));
        return fieldName.includes('industrialwasteevidence') && value === 'no';
      });
    }

    if (!target) {
      target = allControls('input[type="radio"]').find(input => {
        const labelText = norm(input.closest('label')?.innerText || input.value || input.id || input.name);
        return labelText.includes('no industrial waste');
      });
    }
    if (!target) throw new Error('URM No Industrial Waste radio was not found.');

    if (target.name) {
      allControls('input[type="radio"]').filter(input => input.name === target.name).forEach(input => {
        input.checked = false;
      });
    }
    target.checked = true;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    clickElement(exactLabel || fallbackLabel || target);
    target.checked = true;
    target.dispatchEvent(new Event('change', { bubbles: true }));

    if (!target.checked) throw new Error('URM No Industrial Waste radio did not stay selected.');
    clearOptionalSelect(['IndustrialWasteTypeID', 'IndustrialWasteType', 'Industrial Waste Type']);
    const description = findControl(['IndustrialWasteDescription', 'IndustrialWasteDesc', 'Industrial Waste Description'], 'input:not([type="radio"]):not([type="checkbox"]), textarea', true);
    if (description) setNativeValue(description, '');
    return true;
  };
  window.__urm = {
    startCapture() {
      window.__urmAlerts = [];
      window.__urmSaveResponses = [];
      window.__urmNetworkResponses = [];
      window.alert = message => {
        window.__urmAlerts.push(String(message || ''));
      };
      if (!window.__urmXhrPatched) {
        const open = XMLHttpRequest.prototype.open;
        const send = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
          this.__urmMethod = method;
          this.__urmUrl = String(url || '');
          return open.call(this, method, url, ...rest);
        };
        XMLHttpRequest.prototype.send = function(...args) {
          this.addEventListener('loadend', () => {
            window.__urmNetworkResponses.push({
              method: this.__urmMethod,
              url: this.__urmUrl,
              status: this.status,
              responseText: String(this.responseText || '').slice(0, 1200),
            });
            if (String(this.__urmUrl || '').includes('/Home/Edit')) {
              window.__urmSaveResponses.push({
                method: this.__urmMethod,
                url: this.__urmUrl,
                status: this.status,
                responseText: this.responseText || '',
              });
            }
          });
          return send.apply(this, args);
        };
        window.__urmXhrPatched = true;
      }
      return true;
    },
    text(candidates, value, optional = false) {
      const element = findControl(candidates, 'input:not([type="radio"]):not([type="checkbox"]), textarea', optional);
      if (!element) return false;
      element.focus();
      setNativeValue(element, String(value ?? ''));
      return true;
    },
    select(candidates, preferred, optional = false) {
      const element = findControl(candidates, 'select', optional);
      if (!element) return false;
      return chooseOptionValue(element, preferred);
    },
    yesNo(candidates, value, optional = false) {
      return setYesNo(candidates, value, optional);
    },
    forceNoIndustrialWaste() {
      return forceNoIndustrialWaste();
    },
    checkbox(candidates, checked = true, optional = false) {
      const element = findControl(candidates, 'input[type="checkbox"]', optional);
      if (!element) return false;
      if (Boolean(element.checked) !== Boolean(checked)) {
        clickElement(element);
      }
      element.checked = Boolean(checked);
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    async openNewDeclaration() {
      const links = Array.from(document.querySelectorAll('.modal-link, button, a'));
      const link = links.find(element => norm(element.getAttribute('data-action')) === 'new') ||
        links.find(element => norm(element.innerText || element.value || '').includes('new soil declaration')) ||
        links.find(element => norm(element.innerText || element.value || '').includes('new'));
      if (!link) throw new Error('URM New Soil Declaration button was not found after login.');
      const targetUrl = link.getAttribute('data-targeturl');
      if (targetUrl) {
        const response = await fetch(targetUrl, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('URM New Soil Declaration form returned ' + response.status);
        const html = await response.text();
        const modalBody = document.querySelector('.modal-body');
        if (!modalBody) throw new Error('URM modal body was not found.');
        modalBody.innerHTML = html;
        if (window.jQuery && jQuery.validator && jQuery.validator.unobtrusive) {
          jQuery.validator.setDefaults({ ignore: [] });
          jQuery.validator.unobtrusive.parse(jQuery('#detail-record-form'));
        }
        const previousButton = document.querySelector('#btn-previous-tab');
        const nextButton = document.querySelector('#btn-next-tab');
        if (previousButton) previousButton.disabled = true;
        if (nextButton) nextButton.disabled = false;
        return true;
      }
      clickElement(link);
      return true;
    },
    async existingDeclaration(jobNumber, addressLine, suburb) {
      const scrub = value => norm(value).replace(/[^a-z0-9]+/g, ' ').trim();
      const extractUrx = value => String(value || '').match(/\\bURX\\d+\\b/i)?.[0]?.toUpperCase() || '';
      const addressTokens = value => scrub(value)
        .split(' ')
        .filter(token => token.length > 2 && !['lot', 'road', 'rd', 'street', 'st', 'avenue', 'ave', 'drive', 'dr', 'crescent', 'cres', 'court', 'ct'].includes(token));
      const expectedJob = scrub(jobNumber);
      const expectedAddress = scrub([addressLine, suburb].filter(Boolean).join(' '));
      const expectedAddressTokens = addressTokens([addressLine, suburb].filter(Boolean).join(' '));
      const rows = [];
      const addRow = (text, cells = []) => {
        const joined = [text, ...cells].filter(Boolean).join(' ');
        if (joined.trim()) rows.push({ text: joined, cells });
      };
      const collectDomRows = () => {
        Array.from(document.querySelectorAll('#soils-table tbody tr')).forEach(row => {
          const cells = Array.from(row.querySelectorAll('td')).map(cell => cell.innerText || cell.textContent || '');
          addRow(row.innerText || cells.join(' '), cells);
        });
      };
      if (window.jQuery && jQuery.fn?.DataTable && jQuery.fn.DataTable.isDataTable('#soils-table')) {
        const table = jQuery('#soils-table').DataTable();
        if (expectedJob) {
          table.search(String(jobNumber || '')).draw();
          await wait(1400);
        }
        table.rows({ search: 'applied' }).every(function() {
          const cells = Array.from(this.data() || []).map(value => String(value || ''));
          addRow(cells.join(' '), cells);
        });
      }
      collectDomRows();
      const match = rows.find(row => {
        const text = scrub(row.text);
        return text.includes(expectedJob) && (!expectedAddress || text.includes(expectedAddress));
      });
      const jobMatches = rows.filter(row => scrub(row.text || row.cells.join(' ')).includes(expectedJob));
      const looseAddressMatch = jobMatches.find(row => {
        const text = scrub(row.text || row.cells.join(' '));
        return expectedAddressTokens.length && expectedAddressTokens.every(token => text.includes(token));
      });
      const selected = match || looseAddressMatch || jobMatches[0] || null;
      if (!selected) return null;
      const joined = [selected.text, ...(selected.cells || [])].filter(Boolean).join(' ');
      const urmJobNumber = extractUrx(joined);
      return {
        rowText: joined,
        urmJobNumber,
      };
    },
    fillCustomerDefaults(customerName) {
      this.select(['CustomerID', 'Customer'], [customerName, 'Earthlift'], true);
      return true;
    },
    save() {
      const button = document.querySelector('#btn-save-detail-record') ||
        Array.from(document.querySelectorAll('button')).find(candidate => norm(candidate.innerText) === 'save');
      if (!button) throw new Error('URM Save button was not found.');
      clickElement(button);
      return true;
    },
    validationText() {
      return Array.from(document.querySelectorAll('.field-validation-error, .validation-summary-errors, .text-danger, .input-validation-error, [role="alert"], .alert-danger'))
        .map(element => (element.innerText || element.textContent || '').trim())
        .filter(Boolean)
        .join('\\n');
    },
    pageText() {
      return document.body.innerText || '';
    },
    alerts() {
      return window.__urmAlerts || [];
    },
    saveResponses() {
      return window.__urmSaveResponses || [];
    },
    networkResponses() {
      return window.__urmNetworkResponses || [];
    },
  };
  return true;
})()
`;

function assertRequired(value, label) {
  if (!String(value ?? "").trim()) throw new Error(`${label} is required.`);
  return String(value).trim();
}

function sanitizePayload(rawPayload = {}) {
  const volume = assertRequired(rawPayload.volume, "Volume");
  if (Number(volume) <= 0) throw new Error("Volume must be greater than zero.");
  return {
    customerJobNumber: assertRequired(rawPayload.customerJobNumber || rawPayload.jobNumber, "Customer job number"),
    principalContractor: assertRequired(rawPayload.principalContractor, "Principal Contractor"),
    jobAddress: assertRequired(rawPayload.jobAddress, "Job address"),
    volume,
    demolition: String(rawPayload.demolition ?? "No").toLowerCase() === "yes" ? "Yes" : "No",
    dryRun: rawPayload.dryRun === true,
  };
}

function parseAddress(address) {
  const clean = String(address || "").replace(/\s+/g, " ").trim();
  const parts = clean.split(",").map((part) => part.trim()).filter(Boolean);
  const first = parts[0] || clean;
  const remainder = (parts.slice(1).join(" ") || clean.replace(first, "")).trim();
  const match = remainder.match(/^(.+?)\s+(?:VIC|Victoria)\s+(\d{4})$/i);
  const postcodeMatch = clean.match(/(?:\bVIC\b|\bVictoria\b)?\s+(\d{4})\s*$/i);
  let suburb = match?.[1]?.trim() || "";

  if (!suburb && parts.length >= 2) {
    suburb = parts[1]
      .replace(/\b(?:VIC|Victoria)\b/gi, "")
      .replace(/\b\d{4}\b/g, "")
      .trim();
  }
  if (!suburb) {
    const withoutPostcode = clean.replace(/\b(?:VIC|Victoria)\b/gi, "").replace(/\b\d{4}\b/g, "").trim();
    const words = withoutPostcode.split(/\s+/);
    suburb = words.slice(-2).join(" ");
  }

  const postcodeBySuburb = {
    aintree: "3336",
    beveridge: "3753",
    bulleen: "3105",
    clayton: "3168",
    clyde: "3978",
    "clyde north": "3978",
    craigieburn: "3064",
    deanside: "3336",
    donnybrook: "3064",
    eynesbury: "3338",
    kilmore: "3764",
    mambourin: "3024",
    melton: "3337",
    mickleham: "3064",
    officer: "3809",
    pakenham: "3810",
    rockbank: "3335",
    strathtulloh: "3338",
    tarneit: "3029",
    "thornhill park": "3335",
    truganina: "3029",
    wallan: "3756",
    werribee: "3030",
    wollert: "3750",
  };

  return {
    line1: first,
    suburb,
    postcode: match?.[2] || postcodeMatch?.[1] || postcodeBySuburb[suburb.toLowerCase()] || "",
    state: "VIC",
  };
}

function formatToday() {
  return new Date().toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne" });
}

function parseSaveResponse(responses) {
  const latest = [...responses].reverse().find((response) => response.responseText);
  if (!latest) return null;
  try {
    return JSON.parse(latest.responseText);
  } catch {
    return { raw: latest.responseText, statusCode: latest.status };
  }
}

function buildConfirmation(saveResult, payload) {
  const details = [];
  if (saveResult?.savedSoilDeclarationNumber) details.push(`Soil Dec ${saveResult.savedSoilDeclarationNumber}`);
  if (saveResult?.newUrmJobNumber) details.push(`URM Job ${saveResult.newUrmJobNumber}`);
  if (saveResult?.emailedTo) details.push(`emailed to ${saveResult.emailedTo}`);
  const suffix = details.length ? ` ${details.join(", ")}.` : "";
  return `URM confirmed: Soil Declaration saved for ${payload.customerJobNumber}.${suffix}`;
}

async function waitFor(page, expression, label, timeoutMs = 45000) {
  await page.waitForFunction(expression, { timeout: timeoutMs }).catch((error) => {
    throw new Error(`Timed out waiting for ${label}. ${error.message || ""}`.trim());
  });
}

async function evaluateUrm(page, expression) {
  return page.evaluate(`(() => ${expression})()`);
}

async function pageTextSnippet(page) {
  const text = await page
    .evaluate(() => document.body?.innerText || document.body?.textContent || "")
    .catch(() => "");
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 800);
}

async function urmNetworkSnippet(page) {
  const responses = await evaluateUrm(page, "__urm.networkResponses()").catch(() => []);
  return responses
    .slice(-4)
    .map((response) => {
      const body = String(response.responseText || "").replace(/\s+/g, " ").trim().slice(0, 400);
      return `${response.status || "?"} ${response.url || ""} ${body}`.trim();
    })
    .filter(Boolean)
    .join(" | ")
    .slice(0, 1200);
}

async function waitForUrmDeclarationsList(page) {
  try {
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || "";
        const hasList = text.includes("New Soil Declaration") || Boolean(document.querySelector("#soils-table"));
        const hasError = Boolean(
          document.querySelector(".alert-danger, .validation-summary-errors, [role='alert']"),
        );
        return hasList || hasError || /recaptcha|captcha|robot|bot|try again|not registered/i.test(text);
      },
      { timeout: 120000 },
    );
  } catch (error) {
    const snippet = await pageTextSnippet(page);
    const network = await urmNetworkSnippet(page);
    throw new Error(
      `URM did not show the declarations list after entering Alan's email. Page says: ${snippet || "nothing useful"}. Background response: ${network || "none captured"}`,
    );
  }

  const hasList = await page
    .evaluate(() => {
      const text = document.body?.innerText || "";
      return text.includes("New Soil Declaration") || Boolean(document.querySelector("#soils-table"));
    })
    .catch(() => false);
  const snippet = await pageTextSnippet(page);
  if (!hasList && /recaptcha|captcha|robot|bot|try again|not registered|error/i.test(snippet)) {
    throw new Error(`URM did not allow the cloud browser through. Page says: ${snippet}`);
  }
  if (!hasList) {
    const network = await urmNetworkSnippet(page);
    throw new Error(
      `URM loaded a page, but not the declaration list. Page says: ${snippet || "nothing useful"}. Background response: ${network || "none captured"}`,
    );
  }
}

export async function runUrmSubmission(env, rawPayload) {
  if (!env?.BROWSER) {
    throw new Error("Cloudflare Browser Run is not connected. Add a Browser binding named BROWSER before URM can submit.");
  }

  const payload = sanitizePayload(rawPayload);
  const address = parseAddress(payload.jobAddress);
  const today = formatToday();
  const browser = await puppeteer.launch(env.BROWSER, { keep_alive: 120000 });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    );

    await page.goto(SITE_URL, { waitUntil: "domcontentloaded" });
    await waitFor(page, `document.body && document.body.innerText.includes('URM Soil')`, "URM home page");
    await waitFor(
      page,
      `typeof window.grecaptcha === 'object' && typeof window.refreshSoilDecsByCustomer === 'function' && document.querySelector('#CustomerEmail')`,
      "URM login scripts",
      60000,
    );
    await page.evaluate(URM_HELPER_SCRIPT);
    await evaluateUrm(page, "__urm.startCapture()");
    await evaluateUrm(page, `__urm.text(['CustomerEmail', 'Email'], ${JSON.stringify(DEFAULT_ANSWERS.customerEmail)})`);
    await page.evaluate(
      ({ recaptchaSiteKey }) =>
        new Promise((resolve, reject) => {
          if (!window.grecaptcha || typeof window.refreshSoilDecsByCustomer !== "function") {
            reject(new Error("URM login helpers were not ready."));
            return;
          }
          window.grecaptcha.ready(() => {
            window.grecaptcha
              .execute(recaptchaSiteKey, { action: "getSoilDecs" })
              .then((token) => {
                document.querySelector("#GoogleRecaptchaToken").value = token;
                window.refreshSoilDecsByCustomer();
                resolve(true);
              })
              .catch((error) => reject(error));
          });
        }),
      { recaptchaSiteKey: RECAPTCHA_SITE_KEY },
    );

    await waitForUrmDeclarationsList(page);
    await page.evaluate(URM_HELPER_SCRIPT);

    const existing = await evaluateUrm(
      page,
      `__urm.existingDeclaration(${JSON.stringify(payload.customerJobNumber)}, ${JSON.stringify(address.line1)}, ${JSON.stringify(address.suburb)})`,
    );
    if (existing) {
      const reference = existing.urmJobNumber ? ` ${existing.urmJobNumber}.` : "";
      return {
        ok: true,
        status: "Already Submitted",
        submitted: false,
        summary: `URM already shows job ${payload.customerJobNumber} for ${address.line1}, ${address.suburb}.${reference} I stopped before creating another one.`,
        urmJobNumber: existing.urmJobNumber || "",
        existing,
      };
    }

    await evaluateUrm(page, "__urm.openNewDeclaration()");
    await waitFor(page, `Boolean(document.querySelector('#detail-record-form'))`, "URM declaration form", 45000);
    await page.evaluate(URM_HELPER_SCRIPT);
    await evaluateUrm(page, "__urm.startCapture()");

    await evaluateUrm(page, `__urm.fillCustomerDefaults(${JSON.stringify(DEFAULT_ANSWERS.customer)})`);
    await evaluateUrm(page, `__urm.text(['PrincipalContractor', 'Principal Contractor'], ${JSON.stringify(payload.principalContractor)})`);
    await evaluateUrm(page, `__urm.text(['TransportationContractor', 'Transport Contractor'], ${JSON.stringify(DEFAULT_ANSWERS.transportContractor)})`);
    await evaluateUrm(page, `__urm.text(['CustomerJobNo', 'CustomerJobNumber', 'Customer Job No', 'JobNumber'], ${JSON.stringify(payload.customerJobNumber)}, true)`);
    await evaluateUrm(page, `__urm.text(['ApplicationDate'], ${JSON.stringify(today)}, true)`);
    await evaluateUrm(page, `__urm.text(['SiteAddress1', 'Site Address 1', 'Address1'], ${JSON.stringify(address.line1)})`);
    await evaluateUrm(page, `__urm.text(['SiteAddress2', 'Site Address 2', 'Address2'], '', true)`);
    await evaluateUrm(page, `__urm.text(['SiteSuburb', 'Suburb'], ${JSON.stringify(address.suburb)})`);
    await evaluateUrm(page, `__urm.text(['SiteState', 'State'], ${JSON.stringify(address.state)}, true)`);
    await evaluateUrm(page, `__urm.text(['SitePostCode', 'SitePostcode', 'Postcode'], ${JSON.stringify(address.postcode)}, true)`);
    await evaluateUrm(page, `__urm.text(['SiteUseHistory', 'Site Use History'], ${JSON.stringify(DEFAULT_ANSWERS.siteUseHistory)})`);
    await evaluateUrm(page, `__urm.text(['Volume', 'EstimatedVolume', 'Quantity', 'SoilVolume', 'Estimated Quantity'], ${JSON.stringify(payload.volume)}, true)`);
    await evaluateUrm(page, `__urm.select(['PlanningZoneID', 'PlanningZone', 'Planning Zone'], ${JSON.stringify(DEFAULT_ANSWERS.planningZone)})`);
    await evaluateUrm(page, `__urm.text(['SoilDescription', 'Soil Description'], ${JSON.stringify(DEFAULT_ANSWERS.soilDescription)})`);
    await evaluateUrm(page, `__urm.select(['SoilConditionID', 'SoilCondition', 'Soil Condition'], ${JSON.stringify(DEFAULT_ANSWERS.soilCondition)})`);
    await evaluateUrm(page, `__urm.select(['SoilTypeID', 'SoilType', 'Soil Type'], ${JSON.stringify(DEFAULT_ANSWERS.soilType)})`);
    await evaluateUrm(page, `__urm.select(['SoilColourID', 'SoilColour', 'Soil Colour'], ${JSON.stringify(DEFAULT_ANSWERS.soilColour)})`);
    await evaluateUrm(page, "__urm.forceNoIndustrialWaste()");
    await evaluateUrm(page, `__urm.select(['RiskRatingID', 'RiskRating', 'Risk Rating'], ${JSON.stringify(DEFAULT_ANSWERS.riskRating)}, true)`);
    await evaluateUrm(page, `__urm.yesNo(['SiteUseReportsAttached', 'Reports Attached', 'Site Use Reports'], ${JSON.stringify(DEFAULT_ANSWERS.siteUseReportsAttached[0])}, true)`);
    await evaluateUrm(page, `__urm.yesNo(['Demolition', 'Demolition Activities'], ${JSON.stringify(payload.demolition)}, true)`);
    await evaluateUrm(page, `__urm.text(['ApplicantName', 'Applicant Name'], ${JSON.stringify(DEFAULT_ANSWERS.applicantName)})`);
    await evaluateUrm(page, `__urm.text(['ApplicantPosition', 'Applicant Position'], ${JSON.stringify(DEFAULT_ANSWERS.applicantPosition)})`);
    await evaluateUrm(page, "__urm.checkbox(['DeclarationConfirmed', 'Declaration Confirmed'], true)");

    const valid = await page.evaluate(`
      !window.jQuery ||
      !jQuery('#detail-record-form').data('validator') ||
      jQuery('#detail-record-form').valid()
    `);
    if (!valid) {
      const validationText = await evaluateUrm(page, "__urm.validationText()").catch(() => "");
      throw new Error(`URM validation failed before Save. Page said: ${validationText || "missing required field"}`);
    }

    if (payload.dryRun) {
      return {
        ok: true,
        status: "Ready",
        summary: "Dry run filled the URM form and stopped before Save.",
      };
    }

    await evaluateUrm(page, "__urm.save()");
    await waitFor(
      page,
      `(__urm.saveResponses && __urm.saveResponses().length > 0) || (__urm.alerts && __urm.alerts().length > 0) || (document.body.innerText || '').includes(${JSON.stringify(payload.customerJobNumber)})`,
      "URM save confirmation",
      60000,
    );

    const alerts = await evaluateUrm(page, "__urm.alerts()").catch(() => []);
    if (alerts.length) {
      const validationText = await evaluateUrm(page, "__urm.validationText()").catch(() => "");
      const message = [alerts.join(" "), validationText].filter(Boolean).join(" ");
      throw new Error(`URM did not save the declaration. Page said: ${message}`);
    }

    const responses = await evaluateUrm(page, "__urm.saveResponses()").catch(() => []);
    const saveResult = parseSaveResponse(responses);
    if (saveResult && saveResult.status === false) {
      throw new Error(saveResult.message || "URM returned a failed save response.");
    }
    if (!saveResult && !(await page.evaluate(`(document.body.innerText || '').includes(${JSON.stringify(payload.customerJobNumber)})`))) {
      const validationText = await evaluateUrm(page, "__urm.validationText()").catch(() => "");
      const pageText = await evaluateUrm(page, "__urm.pageText()").catch(() => "");
      const diagnostic = [validationText, pageText]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1200);
      throw new Error(`URM did not show a save confirmation. Page said: ${diagnostic}`);
    }

    return {
      ok: true,
      status: "Completed",
      submitted: true,
      summary: buildConfirmation(saveResult, payload),
      saveResult,
      urmJobNumber: saveResult?.newUrmJobNumber || "",
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
