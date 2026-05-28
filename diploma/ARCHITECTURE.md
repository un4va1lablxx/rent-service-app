# Clean Architecture migration plan

## Current stack

- Backend: Java 17, Spring Boot, Spring MVC, Spring Security, Spring Data JPA, PostgreSQL.
- Frontend: React 18, Vite.

## Target backend structure

```text
edu.belsu.rent_service
├── domain
│   ├── model              # Pure business entities and value objects
│   ├── policy             # Domain rules: moderation, booking, rental pricing
│   └── exception          # Domain-level exceptions only
├── application
│   ├── port
│   │   ├── in             # Use case interfaces
│   │   └── out            # Repository/gateway interfaces required by use cases
│   ├── usecase            # Use case implementations
│   └── dto                # Application commands/results, not HTTP DTOs
├── adapters
│   ├── in
│   │   ├── web            # Controllers and request/response DTOs
│   │   └── bot            # Telegram bot adapter
│   └── out
│       ├── persistence    # JPA entities, Spring Data repositories, mappers
│       ├── security       # JWT/Spring Security integration
│       ├── file           # Upload/storage adapter
│       └── messaging      # SMS/Telegram external clients
└── config                 # Spring wiring and bean configuration
```

Dependency rule:

```text
adapters -> application -> domain
```

`domain` must not import Spring, JPA, Lombok persistence annotations, HTTP DTOs, repositories, security classes, or external clients.

## Target frontend structure

```text
src
├── app                   # App bootstrap, providers, routing/layout composition
├── pages                 # Page-level screens: Discover, Messages, Profile, Admin
├── features              # Feature slices: auth, ads, favorites, messages, admin
├── entities              # Reusable domain UI: listing card, user badge, booking card
├── shared
│   ├── api               # HTTP client and endpoint modules
│   ├── config            # constants
│   ├── lib               # pure helpers/formatters
│   └── ui                # small generic UI primitives
└── components            # Temporary compatibility area during migration
```

The frontend should move gradually toward feature slices. `App.jsx` should only compose layout, global state, and page switching until routing is introduced.

## Migration steps

1. Create package boundaries without moving everything at once.
2. Extract pure domain rules from services into Spring-free domain policies.
3. Introduce application input ports for core use cases: create ad, update ad, search ads, favorite ad, send message, create booking.
4. Introduce output ports for persistence and external services.
5. Move current Spring services into `application/usecase`; replace direct Spring Data dependency with output ports.
6. Move JPA entities and repositories into `adapters/out/persistence`.
7. Add mappers between JPA persistence models and pure domain models.
8. Move controllers and HTTP DTOs into `adapters/in/web`.
9. Move Telegram bot integration into `adapters/in/bot` and Telegram/SMS clients into outbound adapters.
10. Add tests around domain policies first, then use cases with mocked ports, then adapter integration tests.

## First domain refactoring target

Start with advertisement creation rules because they are currently mixed into `AdService`:

- title is required;
- long-term rent requires `pricePerMonth`;
- short-term rent requires `pricePerDay` and `maxGuests`;
- default property type is `apartment`;
- default rental type is `long_term`;
- long-term rent should clear daily-only fields;
- short-term rent should clear monthly-only fields.

Suggested first backend extraction:

```text
domain/policy/AdPolicy.java
domain/model/RentalType.java
domain/model/PropertyType.java
```

After that, `AdService` should call domain policy methods instead of owning these rules itself. This is the smallest useful backend step because it moves real business behavior inward without forcing an immediate database rewrite.
