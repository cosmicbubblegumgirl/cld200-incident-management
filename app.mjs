import {
  STATUS,
  URGENCY,
  addConversation,
  cloneSamples,
  filterIncidents,
  upsertIncident
} from "./model.mjs";

const STORAGE_KEY = "cld200.incident-management.v1";
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short"
});

const elements = {
  rows: document.querySelector("#incident-rows"),
  empty: document.querySelector("#empty-state"),
  resultCount: document.querySelector("#result-count"),
  search: document.querySelector("#search"),
  statusFilter: document.querySelector("#status-filter"),
  urgencyFilter: document.querySelector("#urgency-filter"),
  clearFilters: document.querySelector("#clear-filters"),
  create: document.querySelector("#create-incident"),
  reset: document.querySelector("#reset-data"),
  incidentDialog: document.querySelector("#incident-dialog"),
  incidentForm: document.querySelector("#incident-form"),
  detailDialog: document.querySelector("#detail-dialog"),
  detailContent: document.querySelector("#detail-content"),
  toast: document.querySelector("#toast")
};

let incidents = loadIncidents();
let selectedIncidentId = null;
let toastTimer;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadIncidents() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : cloneSamples();
  } catch {
    return cloneSamples();
  }
}

function saveIncidents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 2600);
}

function currentFilters() {
  return {
    query: elements.search.value,
    status: elements.statusFilter.value,
    urgency: elements.urgencyFilter.value
  };
}

function renderRows() {
  const visible = filterIncidents(incidents, currentFilters());
  elements.resultCount.textContent =
    `${visible.length} of ${incidents.length} incident${incidents.length === 1 ? "" : "s"}`;
  elements.empty.hidden = visible.length > 0;
  elements.rows.innerHTML = visible.map((incident) => {
    const status = STATUS[incident.status];
    const urgency = URGENCY[incident.urgency];
    return `
      <tr>
        <td>
          <button class="title-button" data-view="${incident.id}" type="button">
            ${escapeHtml(incident.title)}
          </button>
        </td>
        <td class="customer-cell">
          <strong>${escapeHtml(incident.customer.name)}</strong>
          <small>${escapeHtml(incident.customer.email)}</small>
        </td>
        <td><span class="badge ${status.className}">${status.label}</span></td>
        <td><strong class="${urgency.className}">${urgency.label}</strong></td>
        <td>${dateFormatter.format(new Date(incident.updatedAt))}</td>
        <td><button class="row-action" data-view="${incident.id}" type="button">Open</button></td>
      </tr>
    `;
  }).join("");
}

function getIncident(id) {
  return incidents.find((incident) => incident.id === id);
}

function openForm(incident) {
  document.querySelector("#form-title").textContent =
    incident ? "Edit incident" : "Create incident";
  document.querySelector("#incident-id").value = incident?.id ?? "";
  document.querySelector("#incident-title").value = incident?.title ?? "";
  document.querySelector("#customer-name").value = incident?.customer.name ?? "";
  document.querySelector("#customer-email").value = incident?.customer.email ?? "";
  document.querySelector("#incident-status").value = incident?.status ?? "N";
  document.querySelector("#incident-urgency").value = incident?.urgency ?? "M";
  document.querySelector("#incident-description").value = incident?.description ?? "";
  elements.incidentDialog.showModal();
  document.querySelector("#incident-title").focus();
}

function conversationMarkup(incident) {
  if (!incident.conversation?.length) {
    return '<li class="conversation-item"><p>No conversation entries yet.</p></li>';
  }
  return [...incident.conversation]
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp))
    .map((entry) => `
      <li class="conversation-item">
        <div>
          <strong>${escapeHtml(entry.author)}</strong>
          <time datetime="${escapeHtml(entry.timestamp)}">
            ${dateFormatter.format(new Date(entry.timestamp))}
          </time>
        </div>
        <p>${escapeHtml(entry.message)}</p>
      </li>
    `).join("");
}

function openDetails(id) {
  const incident = getIncident(id);
  if (!incident) return;
  selectedIncidentId = id;
  const status = STATUS[incident.status];
  const urgency = URGENCY[incident.urgency];
  elements.detailContent.innerHTML = `
    <div class="dialog-heading">
      <div>
        <p class="eyebrow">Incident details</p>
        <h2>${escapeHtml(incident.title)}</h2>
      </div>
      <button class="icon-button" data-close-detail aria-label="Close" type="button">&times;</button>
    </div>
    <div class="detail-body">
      <div class="detail-summary">
        <div class="detail-field">
          <span>Customer</span>
          <strong>${escapeHtml(incident.customer.name)}</strong>
          <small>${escapeHtml(incident.customer.email)}</small>
        </div>
        <div class="detail-field">
          <span>Status</span>
          <strong class="badge ${status.className}">${status.label}</strong>
        </div>
        <div class="detail-field">
          <span>Urgency</span>
          <strong class="${urgency.className}">${urgency.label}</strong>
        </div>
        <div class="detail-field">
          <span>Last updated</span>
          <strong>${dateFormatter.format(new Date(incident.updatedAt))}</strong>
        </div>
      </div>
      <p class="detail-description">${escapeHtml(incident.description)}</p>
      <div class="conversation-heading">
        <h3>Conversation</h3>
        <span>${incident.conversation?.length ?? 0} entries</span>
      </div>
      <ul class="conversation-list">${conversationMarkup(incident)}</ul>
      <form id="conversation-form" class="conversation-form">
        <label>
          <span>Author</span>
          <input id="conversation-author" required maxlength="60" placeholder="Your name">
        </label>
        <label>
          <span>Message</span>
          <input id="conversation-message" required maxlength="300" placeholder="Add an update">
        </label>
        <button class="button button-primary" type="submit">Add entry</button>
      </form>
    </div>
    <div class="dialog-actions">
      <button class="button button-danger" data-delete="${incident.id}" type="button">Delete</button>
      <button class="button button-secondary" data-edit="${incident.id}" type="button">Edit</button>
      <button class="button button-primary" data-close-detail type="button">Done</button>
    </div>
  `;
  if (!elements.detailDialog.open) elements.detailDialog.showModal();
  history.replaceState(null, "", `#incident=${encodeURIComponent(id)}`);
}

function closeDetails() {
  selectedIncidentId = null;
  elements.detailDialog.close();
  history.replaceState(null, "", location.pathname + location.search);
}

elements.rows.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-view]");
  if (trigger) openDetails(trigger.dataset.view);
});

[elements.search, elements.statusFilter, elements.urgencyFilter].forEach((control) => {
  control.addEventListener("input", renderRows);
  control.addEventListener("change", renderRows);
});

elements.clearFilters.addEventListener("click", () => {
  elements.search.value = "";
  elements.statusFilter.value = "";
  elements.urgencyFilter.value = "";
  renderRows();
});

elements.create.addEventListener("click", () => openForm());

elements.incidentForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const existing = getIncident(document.querySelector("#incident-id").value);
  const input = {
    id: existing?.id,
    title: document.querySelector("#incident-title").value,
    customer: {
      name: document.querySelector("#customer-name").value,
      email: document.querySelector("#customer-email").value
    },
    status: document.querySelector("#incident-status").value,
    urgency: document.querySelector("#incident-urgency").value,
    description: document.querySelector("#incident-description").value,
    conversation: existing?.conversation ?? []
  };
  try {
    const saved = upsertIncident(incidents, input);
    saveIncidents();
    elements.incidentDialog.close();
    renderRows();
    showToast(existing ? "Incident updated" : "Incident created");
    openDetails(saved.id);
  } catch (error) {
    showToast(error.message);
  }
});

elements.detailContent.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-detail]")) {
    closeDetails();
    return;
  }
  const edit = event.target.closest("[data-edit]");
  if (edit) {
    const incident = getIncident(edit.dataset.edit);
    elements.detailDialog.close();
    openForm(incident);
    return;
  }
  const remove = event.target.closest("[data-delete]");
  if (remove && confirm("Delete this incident?")) {
    incidents = incidents.filter((incident) => incident.id !== remove.dataset.delete);
    saveIncidents();
    closeDetails();
    renderRows();
    showToast("Incident deleted");
  }
});

elements.detailContent.addEventListener("submit", (event) => {
  if (event.target.id !== "conversation-form") return;
  event.preventDefault();
  try {
    addConversation(
      incidents,
      selectedIncidentId,
      document.querySelector("#conversation-author").value,
      document.querySelector("#conversation-message").value
    );
    saveIncidents();
    renderRows();
    openDetails(selectedIncidentId);
    showToast("Conversation entry added");
  } catch (error) {
    showToast(error.message);
  }
});

elements.reset.addEventListener("click", () => {
  if (!confirm("Reset all locally stored incidents to the sample data?")) return;
  incidents = cloneSamples();
  saveIncidents();
  if (elements.detailDialog.open) closeDetails();
  renderRows();
  showToast("Sample data restored");
});

elements.detailDialog.addEventListener("close", () => {
  if (selectedIncidentId) closeDetails();
});

renderRows();

const routeId = new URLSearchParams(location.hash.replace(/^#/, "")).get("incident");
if (routeId && getIncident(routeId)) openDetails(routeId);
