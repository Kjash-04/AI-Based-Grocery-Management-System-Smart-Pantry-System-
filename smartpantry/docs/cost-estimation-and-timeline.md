# Practical-10

**Aim:** To study cost estimation and preparation of timeline chart.

## 10.1 Introduction

Cost estimation is used to predict the effort, duration, and budget required to develop a software project. A timeline chart is used to schedule the major activities of the project over a fixed period so that development can be planned, monitored, and completed in an organized manner.

For the SmartPantry project, cost estimation is based on the actual modules implemented in the system:

- Authentication and profile management
- Inventory management
- Shopping list management
- OCR and barcode features
- Recipe recommendation module
- Admin dashboard
- Frontend integration and testing

The estimation below assumes a small academic project team and a short development cycle.

## 10.2 Project Assumptions

The following assumptions are used for estimation:

- Team size: `1 member`
- Project duration: `24 weeks`
- Working days per week: `5`
- Working hours per day per member: `4`
- Hourly cost per member: `Rs. 200`

Therefore:

- Total hours = `24 x 5 x 4 = 480 hours`
- Total team effort = `480 hours`

## 10.3 Module-Wise Effort Estimation

| Sr. No. | Module / Activity | Estimated Effort (Hours) | Team Members Involved | Remarks |
|---|---|---:|---:|---|
| 1 | Requirement study and planning | 32 | 3 | Understanding problem statement and defining modules |
| 2 | Database design and backend setup | 40 | 2 | MongoDB collections, FastAPI setup, auth base |
| 3 | Authentication and profile module | 48 | 2 | Signup, login, JWT, profile update |
| 4 | Inventory management module | 72 | 3 | Add, list, update, delete inventory items |
| 5 | Shopping list module | 48 | 2 | CRUD and merge logic |
| 6 | OCR, barcode, and quick add module | 64 | 2 | Tesseract, Gemini cleanup, Open Food Facts |
| 7 | Recipe recommendation module | 56 | 2 | Local recommendations and Gemini integration |
| 8 | Admin module | 36 | 2 | Admin role, backend APIs, admin dashboard |
| 9 | Frontend integration and styling | 52 | 3 | React pages, API integration, UI polishing |
| 10 | Testing, debugging, and documentation | 32 | 3 | Test execution, bug fixes, report preparation |
|  | **Total** | **480** |  |  |

## 10.4 Cost Estimation

Cost is calculated using the formula:

`Cost = Total Effort (hours) x Hourly Rate`

### A. Total Development Cost

- Total effort = `480 hours`
- Hourly rate = `Rs. 200`
- Total estimated cost = `480 x 200 = Rs. 96,000`

## 10.5 Cost Breakdown by Module

| Sr. No. | Module / Activity | Effort (Hours) | Rate per Hour | Estimated Cost |
|---|---|---:|---:|---:|
| 1 | Requirement study and planning | 32 | Rs. 200 | Rs. 6,400 |
| 2 | Database design and backend setup | 40 | Rs. 200 | Rs. 8,000 |
| 3 | Authentication and profile module | 48 | Rs. 200 | Rs. 9,600 |
| 4 | Inventory management module | 72 | Rs. 200 | Rs. 14,400 |
| 5 | Shopping list module | 48 | Rs. 200 | Rs. 9,600 |
| 6 | OCR, barcode, and quick add module | 64 | Rs. 200 | Rs. 12,800 |
| 7 | Recipe recommendation module | 56 | Rs. 200 | Rs. 11,200 |
| 8 | Admin module | 36 | Rs. 200 | Rs. 7,200 |
| 9 | Frontend integration and styling | 52 | Rs. 200 | Rs. 10,400 |
| 10 | Testing, debugging, and documentation | 32 | Rs. 200 | Rs. 6,400 |
|  | **Total** | **480** |  | **Rs. 96,000** |

## 10.6 Timeline Chart

The SmartPantry project timeline is planned for `24 weeks`. Since the team size is one, the work is spread across a longer duration so that all modules can be completed realistically in sequence while still allowing time for integration and testing.

Note: In the timeline chart, each week represents a calendar week of `7 days` (`Day 1` to `Day 7`), while the effort estimation above is still based on `5 working days per week`.

### A. Week-Wise Plan

| Task / Activity | W1-W2 | W3-W4 | W5-W7 | W8-W11 | W12-W14 | W15-W17 | W18-W19 | W20-W22 | W23-W24 |
|---|---|---|---|---|---|---|---|---|---|
| Requirement study and planning | X |  |  |  |  |  |  |  |  |
| Database design and backend setup |  | X |  |  |  |  |  |  |  |
| Authentication and profile module |  |  | X |  |  |  |  |  |  |
| Inventory management module |  |  |  | X |  |  |  |  |  |
| Shopping list module |  |  |  |  | X |  |  |  |  |
| OCR, barcode, and quick add module |  |  |  |  | X |  |  |  |  |
| Recipe recommendation module |  |  |  |  |  | X |  |  |  |
| Admin module |  |  |  |  |  |  | X |  |  |
| Frontend integration and styling |  |  | X | X | X | X | X | X |  |
| Testing, debugging, and documentation |  |  |  |  |  |  |  | X | X |

### B. Gantt-Style Representation

```text
Task / Week                         1-2 3-4 5-7 8-11 12-14 15-17 18-19 20-22 23-24
Requirement study and planning      ██
Database design and backend setup       ██
Authentication and profile                  ██
Inventory management                           ██
Shopping list                                      ██
OCR / Barcode / Quick add                         ██
Recipe recommendation                                     ██
Admin module                                                     ██
Frontend integration and styling              ██   ██    ██    ██    ██    ██
Testing and documentation                                              ██    ██
```

## 10.7 Resource Allocation

| Team Member | Responsibility |
|---|---|
| Member 1 | Requirement study, backend APIs, database design, frontend, AI integration, testing, and documentation |

This allocation reflects a single-developer project where one team member handles all technical and documentation activities.

## 10.8 Observations

- Inventory management and AI-related modules require the highest effort because they contain more business logic and integration work.
- Frontend integration takes significant time because all backend modules must be connected and validated in the UI.
- Testing and documentation are planned at the end, but small verification activities should still be performed throughout the project.
- Since there is only one team member, the project timeline is extended to `24 weeks` to keep the plan realistic and manageable.

## 10.9 Conclusion

The SmartPantry project cost estimation shows that the total development effort is approximately `480 hours`, with an estimated total cost of `Rs. 96,000` for a single-member team. The timeline chart provides a clear week-wise schedule for completing the project modules in a structured manner. Thus, cost estimation and timeline planning help in understanding project feasibility, assigning resources, and ensuring timely project completion.
