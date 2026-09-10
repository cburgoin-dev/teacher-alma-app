# Architecture

This document records the provisional technical direction for the MVP. It is intentionally lightweight and should be updated only when decisions are validated.

## System shape

The initial system should be a **modular monolith**, not microservices.

Reasoning:

- One developer is building the MVP.
- The product is still evolving.
- Microservices would add deployment, communication, observability and operational complexity without solving a current need.
- Clear module boundaries can still be maintained so parts can be extracted later if scale or team structure requires it.

## Mobile application

Provisional stack:

- React Native
- Expo
- TypeScript

Suggested organization by feature/domain rather than a large global layer folder:

```text
mobile/
  src/
    features/
      auth/
      home/
      courses/
      lessons/
      activities/
      progress/
      profile/
    components/
    navigation/
    services/
    hooks/
    store/
    types/
```

The exact state-management/query libraries are not fixed yet and should be selected when implementation needs are clearer.

## Backend

Provisional stack:

- Node.js
- Express
- TypeScript
- REST API

Backend architecture:

```text
Route
  -> Controller
      -> Service
          -> Repository
              -> PostgreSQL
```

Responsibilities:

- **Routes:** map HTTP paths/methods to controllers.
- **Controllers:** validate/interpret HTTP requests and return HTTP responses. Keep business logic minimal.
- **Services:** contain business rules and application logic.
- **Repositories:** isolate persistence/database access.
- **Models/entities/types:** represent domain data and contracts.

Suggested modular structure:

```text
backend/
  src/
    modules/
      auth/
      users/
      courses/
      lessons/
      activities/
      progress/
      gamification/
      payments/
    shared/
    config/
```

Each module can contain its own controller, service, repository, routes and domain types where useful.

## Database

- PostgreSQL is the preferred relational database.
- The final schema will be created after the key screens, states and business rules are sufficiently defined.
- Avoid persisting UI-derived state when it can be safely derived from domain data. For example, a conceptual Home state such as `ACTIVE` may be computed from diagnostic/progress/course data instead of stored as a dedicated column.

## Communication

- The mobile application communicates with the backend through a REST API.
- API contracts should be defined around user-facing use cases/vertical slices rather than exposing database tables directly.

## External services

Potential integrations, not yet finalized:

- Authentication provider or custom auth.
- Media/file storage.
- Video hosting/delivery.
- Payment/store integrations.
- AI APIs.
- Push notifications.

These should remain behind application/service abstractions where practical so the core domain is not tightly coupled to a provider.

## Development strategy

Prefer **vertical slices** over completing the entire frontend first or the entire backend first.

Example:

```text
Course data in PostgreSQL
  -> repository/service/controller
  -> REST endpoint
  -> React Native course UI
```

Then continue with the next complete use case, such as:

```text
Activity
  -> attempt validation
  -> save attempt
  -> return feedback
  -> render activity in mobile app
```

This keeps the system usable throughout development and reveals integration issues early.

## Current implementation status

At this stage:

- Repository structure exists.
- Product/screens/business rules are still being refined.
- Do not scaffold or implement irreversible architecture decisions prematurely.
- Next major technical milestone after screen definition is the real PostgreSQL/domain model and initial API contracts.
