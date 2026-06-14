import assert from "node:assert/strict";
import test from "node:test";
import {
  addConversation,
  cloneSamples,
  filterIncidents,
  upsertIncident,
  validateIncident
} from "./model.mjs";

test("filters incidents by text, status, and urgency", () => {
  const incidents = cloneSamples();
  assert.equal(filterIncidents(incidents, { query: "inverter" }).length, 3);
  assert.equal(filterIncidents(incidents, { status: "I" }).length, 2);
  assert.equal(filterIncidents(incidents, { urgency: "L" }).length, 1);
  assert.equal(filterIncidents(incidents, { status: "C", urgency: "L" }).length, 1);
});

test("validates and inserts an incident", () => {
  const incidents = [];
  const saved = upsertIncident(incidents, {
    title: "Test issue",
    description: "A complete description",
    customer: { name: "Test Customer", email: "test@example.com" },
    status: "N",
    urgency: "M",
    conversation: []
  }, new Date("2026-06-14T12:00:00.000Z"));
  assert.equal(incidents.length, 1);
  assert.equal(saved.updatedAt, "2026-06-14T12:00:00.000Z");
});

test("updates an existing incident without losing its conversation", () => {
  const incidents = cloneSamples();
  const existing = incidents[0];
  const count = existing.conversation.length;
  upsertIncident(incidents, {
    ...existing,
    title: "Updated title",
    customer: { ...existing.customer }
  });
  assert.equal(incidents[0].title, "Updated title");
  assert.equal(incidents[0].conversation.length, count);
});

test("adds a conversation entry and updates the timestamp", () => {
  const incidents = cloneSamples();
  const now = new Date("2026-06-14T13:00:00.000Z");
  const entry = addConversation(incidents, incidents[0].id, "Tester", "Resolved", now);
  assert.equal(entry.author, "Tester");
  assert.equal(incidents[0].updatedAt, now.toISOString());
});

test("rejects an invalid email", () => {
  assert.throws(() => validateIncident({
    title: "Title",
    description: "Description",
    customer: { name: "Customer", email: "invalid" },
    status: "N",
    urgency: "M"
  }), /valid customer email/);
});
