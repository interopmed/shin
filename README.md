# SHIN — Connected EHR & LIS Clinical Interoperability Testbed

[![Live Demo](https://img.shields.io/badge/Demo-shin.interopmed.com-0d9488?style=for-the-badge&logo=google-chrome&logoColor=white)](https://shin.interopmed.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015%20%7C%20React%2019-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Django](https://img.shields.io/badge/Backend-Django%205%20%7C%20DRF-092e20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Standards](https://img.shields.io/badge/Standards-FHIR%20R4%20%7C%20HL7%20v2%20%7C%20LOINC%20%7C%20SNOMED-0284c7?style=for-the-badge)](https://www.hl7.org/fhir/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**SHIN** (Smart Healthcare Interoperability Network / System for Healthcare Informatics & Networking) is an open-source, full-stack clinical testbed and modular hospital operations platform developed by [InteropMed](https://www.interopmed.com).

It combines an **Electronic Health Record (EHR)** and a **Laboratory Information System (LIS)** into a unified environment designed for clinical informaticians, researchers, doctors, and healthcare software engineers to simulate, validate, and research clinical order-to-result data flows using international healthcare standards (**HL7 v2**, **FHIR R4**, **LOINC**, and **SNOMED CT**).

---

## Table of Contents

- [Key Capabilities & Clinical Workflows](#key-capabilities--clinical-workflows)
- [Architecture Overview](#architecture-overview)
- [Interoperability & Data Standards](#interoperability--data-standards)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Quick Start / Local Setup](#quick-start--local-setup)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Database Configuration](#2-database-configuration)
  - [3. Backend Setup (Django + DRF)](#3-backend-setup-django--drf)
  - [4. Frontend Setup (Next.js + TypeScript)](#4-frontend-setup-nextjs--typescript)
  - [5. Run Unified Development Environment](#5-run-unified-development-environment)
- [Seed Data & Clinical Test Scripts](#seed-data--clinical-test-scripts)
- [Core API Routes](#core-api-routes)
- [Production Deployment](#production-deployment)
- [Contributing & Ecosystem](#contributing--ecosystem)
- [License](#license)

---

## Key Capabilities & Clinical Workflows

### 1. Electronic Health Record (EHR)
* **Master Patient Index (MPI):** Unique national / hospital health identifiers, patient demographics, duplicate detection, and emergency triage assignment (`FHIR Patient`, `HL7 ADT^A04`).
* **Encounter & Ward Management:** Inpatient bed allocation, care team assignment, discharge planning, and longitudinal progress tracking (`FHIR Encounter`).
* **Clinical Documentation & Charting:** Structured observations, problem lists, allergies, and diagnoses mapped to standard terminologies (`SNOMED CT`, `FHIR Condition`).
* **Computerized Physician Order Entry (CPOE):** Structured ordering for laboratory tests, radiology imaging studies, and pharmacy items (`FHIR ServiceRequest`, `HL7 ORM^O01`).
* **Clinical Decision Support (CDS):** Context-aware drug-drug interaction warnings, abnormal lab flags, and practice guideline alerts.

### 2. Laboratory Information System (LIS)
* **Order Ingestion & Accessioning:** Automated receipt of clinical lab orders, specimen barcoding, tube routing, and accession tracking (`FHIR Specimen`, `HL7 ORM Inbound`).
* **Analyzer Interfacing:** Communication protocols for bi-directional analyzer interfacing and telemetry (`ASTM 1381/1394`, `HL7 v2.5.1`).
* **Result Verification & Delta Checks:** Quality control checks against patient historical baselines, panic-value critical alerts, and pathologist approval queues (`LOINC Observation`).
* **Diagnostic Report Delivery:** Real-time transmission of finalized laboratory and pathology reports directly back into the patient's EMR chart (`HL7 ORU^R01`, `FHIR DiagnosticReport`).

### 3. Hospital Operations & Administration
* **Scheduling & Appointments:** Outpatient bookings, doctor clinics, session limits, and calendar scheduling (`/api/appointment/`, `/api/schedule/`).
* **Pharmacy & Prescriptions:** Digital prescription authoring, dosage calculators, dispensing logs, and formulary validation (`/api/prescription/`).
* **Billing & Finance:** Service billing, insurance categorization, transaction history, and fee invoicing (`/api/finance/`, `/api/sales/`).
* **Stock & Inventory Control:** Pharmaceutical batches, re-order thresholds, expiry date warnings, and equipment inventory (`/api/stocks/`).
* **Human Resources & Directory:** Clinician credentialing, nurse and physician role grouping, and department rosters (`/api/employees/`, `/api/doctors/`).

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Client ["Frontend (Next.js 15 + React 19)"]
        UI["Clinician / Admin Portal\n(Tailwind CSS + Lucide)"]
        State["Contexts & Hooks\n(Auth, Clinical, LIS)"]
        PDF["Report Generator\n(jsPDF + html2canvas)"]
        UI --> State
        UI --> PDF
    end

    subgraph Gateway ["API Layer & Security"]
        Nginx["Reverse Proxy / SSL"]
        Auth["SimpleJWT Authentication\n(/api/auth/login, /api/auth/refresh)"]
    end

    subgraph Backend ["Backend (Django 5 + Django REST Framework)"]
        Core["Core & Patient MPI"]
        Lab["Lab & LIS Engine"]
        Rx["Prescriptions & Formulary"]
        Ops["Billing, Stocks & Scheduling"]
    end

    subgraph Database ["Data & Persistence"]
        PG[("PostgreSQL\nClinical & Operations Tables")]
    end

    subgraph Interop ["Interoperability Ecosystem"]
        FHIR["FHIR R4 Gateway\n(Patient, Observation, DiagnosticReport)"]
        HL7["HL7 v2 Interface Engine\n(ADT, ORM, ORU via MLLP)"]
        Engine["InteropMed Transform Engine"]
    end

    State -->|REST HTTPS / JSON| Gateway
    Gateway --> Backend
    Backend --> PG
    Backend <--> Interop
```

---

## Interoperability & Data Standards

| Clinical Domain | Legacy Standard (HL7 v2) | Modern Standard (FHIR R4) | Terminology System |
|---|---|---|---|
| **Patient Demographics & MPI** | `ADT^A01` (Admit), `ADT^A04` (Register), `ADT^A08` (Update) | `Patient`, `Person` | Hospital MRN System, National Health ID |
| **Encounter & Triage** | `PV1` (Patient Visit), `PV2` | `Encounter` | HL7 ActEncounterCode |
| **Laboratory Orders** | `ORM^O01` (Order Message), `OBR` segment | `ServiceRequest` | LOINC (Order Codes) |
| **Specimen Accessioning** | `SPM` (Specimen) segment | `Specimen` | SNOMED CT (Specimen Types) |
| **Discrete Lab Results** | `ORU^R01` (Observational Report), `OBX` segment | `Observation` | LOINC (Test Codes), UCUM (Units) |
| **Final Diagnostic Report** | `ORU^R01` (Final status), `MDM^T02` | `DiagnosticReport` | LOINC, SNOMED CT |
| **Clinical Conditions** | `DG1` (Diagnosis) segment | `Condition` | SNOMED CT, ICD-10-CM / ICD-11 |
| **Medication & Prescriptions**| `RDE^O11`, `OMP^O09` | `MedicationRequest`, `Medication` | RxNorm, ATC |

---

## Repository Structure

```text
shin/
├── backend/                  # Python Django 5 backend application
│   ├── apps/
│   │   ├── appointment/      # Clinic scheduling & appointment booking
│   │   ├── authentication.py # SimpleJWT token authentication views
│   │   ├── core/             # Patient MPI, encounters & system-wide models
│   │   ├── doctors/          # Physician directories & specializations
│   │   ├── employees/        # Hospital staff & HR administration
│   │   ├── finance/          # Accounts, invoices, billing ledgers
│   │   ├── lab/              # Laboratory Information System (LIS) & accessioning
│   │   ├── patients/         # Patient demographics, allergy records, vitals
│   │   ├── prescription/     # CPOE medication orders & pharmacy dispensing
│   │   ├── sales/            # Point-of-sale & pharmacy checkout
│   │   ├── schedule/         # Clinician rosters & shift schedules
│   │   ├── settings/         # System configurations & hospital preferences
│   │   ├── sms/              # Automated SMS notifications & alerts
│   │   └── stocks/           # Inventory management, pharmaceuticals & supply batches
│   ├── config/               # Django project settings (settings.py, urls.py, wsgi/asgi)
│   ├── scripts/              # Seed scripts (SNOMED, imaging, demo staff & test cases)
│   ├── manage.py             # Django CLI entry point
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # Next.js 15 App Router frontend application
│   ├── app/
│   │   ├── (clinical)/       # Clinical workflows (patients, lab, prescriptions, ward, radiology)
│   │   ├── (operations)/     # Operational workflows (billing, scheduling, stocks, HR)
│   │   ├── (shared)/         # Common layout views & breadcrumbs
│   │   ├── (system)/         # Hospital administration & configuration
│   │   └── login/            # Authentication view
│   ├── components/           # Reusable UI widgets, charts, modals, and data tables
│   ├── hooks/ & contexts/    # React context providers (Auth, Theme, Clinical State)
│   ├── lib/                  # Client API callers & PDF export utilities
│   └── package.json          # Frontend dependencies & Next.js scripts
│
├── scripts/
│   └── dev.mjs               # Node.js concurrent runner for Frontend + Backend
├── .env.example              # Environment variable template
└── package.json              # Root project orchestration scripts
```

---

## Prerequisites

Before running SHIN locally, ensure you have the following installed:

* **Node.js**: `v20.x` or later (`npm v10+`)
* **Python**: `v3.11` or `v3.12`
* **PostgreSQL**: `v14` or later
* **Git**

---

## Quick Start / Local Setup

### 1. Clone Repository

```bash
git clone https://github.com/interopmed/shin.git
cd shin
```

### 2. Database Configuration

Create a dedicated PostgreSQL database named `shin`:

```sql
CREATE DATABASE shin;
```

Copy the example environment configuration in the root directory:

```bash
cp .env.example .env
```

Set your database credentials:
```env
SHIN_DATABASE_URL="postgres://postgres:your_password@localhost:5432/shin"
```

---

### 3. Backend Setup (Django + DRF)

1. Navigate to `backend`:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # On macOS / Linux
   python3 -m venv venv
   source venv/bin/activate

   # On Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure backend environment:
   Ensure `backend/.env` or system environment variables contain:
   ```env
   DEBUG=True
   SECRET_KEY=your-insecure-development-secret-key
   DATABASE_URL=postgres://postgres:your_password@localhost:5432/shin
   ALLOWED_HOSTS=localhost,127.0.0.1
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   ```

5. Run database migrations:
   ```bash
   python manage.py migrate
   ```

6. Seed initial test data and clinical users (optional but recommended):
   ```bash
   python scripts/reset_and_seed.py
   python scripts/seed_ehr_users.py
   python scripts/seed_snomed.py
   ```

7. Return to repository root:
   ```bash
   cd ..
   ```

---

### 4. Frontend Setup (Next.js + TypeScript)

1. Install frontend dependencies:
   ```bash
   npm --prefix frontend install
   ```

2. Configure frontend environment in `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   ```

---

### 5. Run Unified Development Environment

From the root directory, install root dependencies and run the unified dev command:

```bash
npm install
npm run dev
```

* **Frontend:** `http://localhost:3000`
* **Django API & Admin:** `http://127.0.0.1:8000`
* **API Documentation:** `http://127.0.0.1:8000/admin/`

> **Note for Windows users:** Running `npm run dev` will automatically launch the Frontend and Backend in separate dedicated CMD windows for clear terminal logs.

---

## Seed Data & Clinical Test Scripts

SHIN includes pre-configured clinical informatics seed scripts under `backend/scripts/`:

* `python scripts/reset_and_seed.py`: Resets and seeds standard departments, clinical facilities, and sample encounters.
* `python scripts/seed_ehr_users.py`: Populates test accounts for clinicians, lab technicians, pharmacists, and billing staff.
* `python scripts/seed_snomed.py`: Imports standard SNOMED CT clinical finding codes and concept designations.
* `python scripts/seed_imaging_studies.py`: Generates synthetic radiology imaging orders and DICOMweb references.
* `python scripts/create_nurse.py`: Adds specialized nursing staff accounts for inpatient ward management.

---

## Core API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login/` | `POST` | Authenticate clinician/user and return JWT access/refresh tokens |
| `/api/auth/refresh/` | `POST` | Refresh expired JWT access token |
| `/api/patients/` | `GET`, `POST` | Query Master Patient Index (MPI) and register new patients |
| `/api/appointment/` | `GET`, `POST` | Manage outpatient appointments and clinic schedules |
| `/api/lab/` | `GET`, `POST` | LIS order accessioning, analyzer telemetry, and lab result entry |
| `/api/prescription/` | `GET`, `POST` | Computerized Physician Order Entry (CPOE) and prescriptions |
| `/api/doctors/` | `GET` | Physician directory, clinical roles, and active assignments |
| `/api/stocks/` | `GET`, `POST` | Inventory batches, pharmaceutical tracking, and stock refills |
| `/api/finance/` | `GET`, `POST` | Patient billing, invoicing, and payment processing |
| `/api/settings/` | `GET`, `PATCH` | Facility configuration, hospital metadata, and system flags |

---

## Production Deployment

SHIN is configured for deployment with standard PaaS providers (Render, Railway, Fly.io, or AWS / GCP):

* **Backend (`render.yaml` & `Procfile`):**
  Uses Gunicorn with WhiteNoise for static assets:
  ```bash
  web: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
  ```
* **Frontend:**
  Standard Next.js production build:
  ```bash
  npm run build
  npm run start
  ```

---

## Contributing & Ecosystem

SHIN is part of the **[InteropMed](https://www.interopmed.com)** digital health interoperability open-source family:

* **[InteropMed Website](https://github.com/interopmed/interopmed-website):** Main community platform, learning hub, and health informatics documentation.
* **[InteropMed Transform Engine](https://github.com/interopmed):** High-throughput HL7 v2, FHIR R4, and DICOM transformation pipelines.
* **[InteropMind AI](https://www.interopmed.com/interopmind):** Clinical interoperability reasoning assistant and standards copilot.

Contributions, issue reports, and pull requests are warmly welcomed! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting code.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
