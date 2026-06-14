export const STATUS = {
  N: { label: "New", className: "badge-new" },
  I: { label: "In progress", className: "badge-progress" },
  C: { label: "Closed", className: "badge-closed" }
};

export const URGENCY = {
  H: { label: "High", className: "urgency-high" },
  M: { label: "Medium", className: "urgency-medium" },
  L: { label: "Low", className: "urgency-low" }
};

export const SAMPLE_INCIDENTS = [
  {
    id: "3b23bb4b-4ac7-4a24-ac02-aa10cabd842c",
    title: "Solar panel broken",
    customer: { name: "Sunny Sunshine", email: "sunny@example.com" },
    status: "I",
    urgency: "H",
    description: "The panel has visible damage and no longer supplies power to the inverter.",
    updatedAt: "2026-06-14T08:30:00.000Z",
    conversation: [
      {
        id: "4ea33d42-5295-4a62-98aa-870ef3108d75",
        author: "Customer Support",
        message: "A technician has been assigned and will contact the customer.",
        timestamp: "2026-06-14T08:30:00.000Z"
      }
    ]
  },
  {
    id: "f5b0d9ba-91c4-4bc7-9378-8cb74c7f09f4",
    title: "No current on a sunny day",
    customer: { name: "Mango Solar", email: "service@mangosolar.example" },
    status: "N",
    urgency: "M",
    description: "The monitoring app reports zero current although weather conditions are clear.",
    updatedAt: "2026-06-13T11:10:00.000Z",
    conversation: []
  },
  {
    id: "61d2a23c-0031-4a94-bc9e-6e064d85c333",
    title: "Inverter not functional",
    customer: { name: "Green Light Industries", email: "ops@greenlight.example" },
    status: "I",
    urgency: "H",
    description: "The inverter display is blank after the latest power interruption.",
    updatedAt: "2026-06-12T15:45:00.000Z",
    conversation: [
      {
        id: "66708a9e-2769-4a47-a82d-237bf749f6c2",
        author: "A. Patel",
        message: "Requested a photo of the inverter status LEDs.",
        timestamp: "2026-06-12T15:45:00.000Z"
      }
    ]
  },
  {
    id: "e43fe0c0-7ee1-4c86-9426-22d45dc9bb33",
    title: "Strange noise when switching off inverter",
    customer: { name: "Bright Future Homes", email: "admin@brightfuture.example" },
    status: "C",
    urgency: "L",
    description: "A short clicking sound occurs during shutdown. The installation is otherwise operational.",
    updatedAt: "2026-06-10T09:05:00.000Z",
    conversation: [
      {
        id: "d1472e6d-17cd-4bb7-b978-36d6a968bb85",
        author: "Technical Team",
        message: "Confirmed this is the normal relay disconnect sound.",
        timestamp: "2026-06-10T09:05:00.000Z"
      }
    ]
  }
];

export function cloneSamples() {
  return structuredClone(SAMPLE_INCIDENTS);
}

export function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function filterIncidents(incidents, filters = {}) {
  const query = String(filters.query ?? "").trim().toLowerCase();
  return incidents
    .filter((incident) => !filters.status || incident.status === filters.status)
    .filter((incident) => !filters.urgency || incident.urgency === filters.urgency)
    .filter((incident) => {
      if (!query) return true;
      return [
        incident.title,
        incident.description,
        incident.customer?.name,
        incident.customer?.email
      ].some((value) => String(value ?? "").toLowerCase().includes(query));
    })
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
}

export function validateIncident(input) {
  const required = ["title", "description", "status", "urgency"];
  for (const field of required) {
    if (!String(input[field] ?? "").trim()) {
      throw new Error(`${field} is required`);
    }
  }
  if (!String(input.customer?.name ?? "").trim()) {
    throw new Error("customer name is required");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.customer?.email ?? ""))) {
    throw new Error("a valid customer email is required");
  }
  if (!STATUS[input.status] || !URGENCY[input.urgency]) {
    throw new Error("status or urgency is invalid");
  }
  return true;
}

export function upsertIncident(incidents, input, now = new Date()) {
  validateIncident(input);
  const existingIndex = incidents.findIndex((incident) => incident.id === input.id);
  const record = {
    id: input.id || createId(),
    title: input.title.trim(),
    description: input.description.trim(),
    customer: {
      name: input.customer.name.trim(),
      email: input.customer.email.trim()
    },
    status: input.status,
    urgency: input.urgency,
    updatedAt: now.toISOString(),
    conversation: input.conversation ?? []
  };

  if (existingIndex >= 0) {
    record.conversation = incidents[existingIndex].conversation ?? [];
    incidents.splice(existingIndex, 1, record);
  } else {
    incidents.push(record);
  }
  return record;
}

export function addConversation(incidents, incidentId, author, message, now = new Date()) {
  const incident = incidents.find((item) => item.id === incidentId);
  if (!incident) throw new Error("incident not found");
  if (!author.trim() || !message.trim()) {
    throw new Error("author and message are required");
  }
  const entry = {
    id: createId(),
    author: author.trim(),
    message: message.trim(),
    timestamp: now.toISOString()
  };
  incident.conversation ??= [];
  incident.conversation.push(entry);
  incident.updatedAt = now.toISOString();
  return entry;
}
