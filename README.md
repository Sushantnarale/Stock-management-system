Welcome to new project.
# Stock Management System

## Project Overview

The **Stock Management System** is an enterprise-level application designed to streamline the management of stock items and material requests. It supports a comprehensive request workflow, from creating material requests to managing approvals and stock updates. Built using **SAP Cloud Application Programming (CAP)** for backend services and **SAPUI5** for frontend user interfaces, this system aims to simplify inventory management for businesses.

This application facilitates:
- Material Request Creation and Approval
- Real-time Stock Availability Monitoring
- Importing Material Data via Excel File Upload
- Audit Logging and Tracking for Request Approvals

---

## Key Features

- **Material Request Management**: 
  - Employees can submit material requests with details like material type, quantity, and requested date.
  - Requests can be approved or rejected by managers at various stages.

- **Stock Availability Tracking**: 
  - Stock items and their quantities are tracked in real-time.
  - Store managers can view request statuses, material availability, and approve or reject stock allocation.

- **Excel File Upload**: 
  - Users can upload Excel files containing bulk material data, which is processed and displayed in a table for review before submission.

- **Audit Log**: 
  - Tracks and logs all actions taken on material requests and approvals for transparency and compliance.

---

## Technologies Used

- **Backend**: 
  - SAP Cloud Application Programming (CAP), Node.js
  - SAP HANA or SQLite (as the database)
  
- **Frontend**: 
  - SAPUI5 (Fiori-like UI components)
  
- **Excel Processing**: 
  - **XLSX.js** for parsing Excel files

- **Others**: 
  - SAP Fiori for a responsive, modern UI
  - AJAX requests for communication with the backend services

---

## Getting Started
### Prerequisites

To run this project in SAP Business Application Studio (BAS), ensure the following:

- **SAP BAS** with a *Full Stack Cloud Application* dev space
- **Node.js** (v14 or later) – pre-installed in BAS
- **CAP CLI** – available by default in BAS
- **SAPUI5 extensions** enabled in BAS
- **SAP HANA Cloud** instance (configured and bound via BTP Cockpit)
- **Cloud Foundry CLI (`cf`)** for deployment

### Installation Steps

1. **Clone the Repository**:
   Clone this repository to your local machine using the following command:
   ```bash
   git clone https://github.com/Sushantnarale/Stock-management-system.git
   cd stock-management-system

It contains these folders and files, following our recommended project layout:

File or Folder | Purpose
---------|----------
`app/` | content for UI frontends goes here
`db/` | your domain models and data go here
`srv/` | your service models and code go here
`package.json` | project metadata and configuration
`readme.md` | this getting started guide


## Next Steps

- Open a new terminal and run `cds watch`
- (in VS Code simply choose _**Terminal** > Run Task > cds watch_)
- Start adding content, for example, a [db/schema.cds](db/schema.cds).



