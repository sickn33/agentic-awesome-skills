# HIS/PEP & Interoperability Guide

Technical reference for the management of core hospital information systems and standard integrations.

## 1. Leading ERPs in Brazil

### MV-SOUL & MV-PEP
- **Architecture:** Robust clinical and administrative integration.
- **Key Focus:** Beira-leito (Bedside) automation, clinical pharmacy integration, and strategic faturamento (billing) modules.
- **Optimization:** Focus on Reducing "Click-Counts" for physicians and nurses to improve clinical adoption.

### Philips Tasy
- **Architecture:** Deeply integrated clinical workflows and process-oriented management.
- **Key Focus:** Integration with imaging (PACS) and laboratory systems (LIS).
- **Strategy:** Ensuring the "Single Source of Truth" for patient data across all Tasy modules.

## 2. Interoperability Standards

### HL7 (Health Level Seven)
- The global standard for messaging between disparate health systems (e.g., ADT - Admission, Discharge, Transfer).
- **v2.x:** Common for legacy system integrations.
- **FHIR (Fast Healthcare Interoperability Resources):** The modern, RESTful API standard for health data. Check the current model/version and applicable assessment criteria; FHIR alone does not establish a maturity stage.

### DICOM (Digital Imaging and Communications in Medicine)
- Protocol for handling, storing, and transmitting medical imaging information and related data.
- Essential for **PACS** (Picture Archiving and Communication System) and **RIS** (Radiology Information System).

### RNDS (Rede Nacional de Dados em Saúde)
- The Brazilian national health data network.
- Integration requirements: Authenticating via Gov.br, complying with the "Modelo de Informação" (RAC, Sumário de Alta), and securing data transmission.

## 3. Critical Infrastructure & Availability
Set clinically approved availability, RTO/RPO and downtime procedures for:
- Main HIS Database.
- Clinical Decision Support (CDSS).
- Laboratory Results delivery.
- Radiology (PACS) access in the Operating Room.

*Recommendation:* Derive RTO/RPO and topology from the clinical impact assessment and vendor-supported architecture. Active-active is not universally safe/supported; test failover, data consistency, rollback and downtime workflows. No topology guarantees zero downtime.

---
*Reference for it-manager-hospital HIS/PEP domain expertise.*
