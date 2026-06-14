# CLD200 Incident Management

This repository contains the GitHub Pages edition of the CLD200 Incident
Management exercise.

## Live features

- Search and filter incidents by status and urgency
- Create, edit, and delete incident records
- View customer, status, urgency, and description details
- Add timestamped conversation entries
- Keep changes in browser `localStorage`
- Restore the original four sample incidents

## Run locally

Serve the folder with any static web server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

Run the model tests with Node.js:

```bash
node --test model.test.mjs
```

## GitHub Pages and SAP CAP

GitHub Pages serves static files only. It cannot execute the Node.js SAP CAP
service or provide an OData database. The Pages edition therefore implements
the exercise workflow in the browser and persists demo data locally.

The SAP Fiori elements application in Business Application Studio remains the
reference implementation for CAP, OData V4, draft handling, and deployment to
SAP BTP.

## Conversation annotation fix

For an inline CAP composition, annotate the generated child entity directly:

```cds
annotate service.Incidents.conversation with @UI.LineItem: [
  { $Type: 'UI.DataField', Value: author, Label: 'Author' },
  { $Type: 'UI.DataField', Value: message, Label: 'Message' },
  { $Type: 'UI.DataField', Value: timestamp, Label: 'Date' }
];
```

Annotating `conversation` inside an `annotate service.Incidents with { ... }`
block does not emit the child entity `UI.LineItem` into the OData metadata.
