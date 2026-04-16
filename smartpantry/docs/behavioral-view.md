# SmartPantry Behavioral View

This document captures the main runtime behavior of SmartPantry using a sequence diagram and an activity diagram derived from the current React frontend and FastAPI backend.

## Sequence Diagram

The sequence below models a common end-to-end scenario:

- the user signs in
- loads inventory
- adds items using receipt OCR
- requests recipe recommendations
- sends missing ingredients to the shopping list

```mermaid
sequenceDiagram
    actor User
    participant UI as React Frontend
    participant API as FastAPI Backend
    participant Auth as Auth Service
    participant OCR as OCR + Gemini Cleanup
    participant Inv as Inventory Collection
    participant Recipes as Recipe Engine
    participant Shop as Shopping List Collection

    User->>UI: Login with email and password
    UI->>API: POST /auth/login
    API->>Auth: verify_password()
    Auth-->>API: Valid credentials
    API-->>UI: JWT token
    UI->>UI: Store token in localStorage

    User->>UI: Open dashboard
    UI->>API: GET /inventory
    API->>Auth: get_current_user()
    Auth-->>API: Authenticated user
    API->>Inv: find items by user_id
    Inv-->>API: Inventory items
    API-->>UI: Inventory response

    User->>UI: Upload receipt image
    UI->>API: POST /ai/ocr-receipt
    API->>Auth: get_current_user()
    Auth-->>API: Authenticated user
    API->>OCR: try_tesseract(image)
    OCR-->>API: Raw receipt text
    API->>OCR: parse_receipt_text(raw_text)
    alt Local OCR result is weak
        API->>OCR: clean_ocr_text_with_gemini(raw_text)
        OCR-->>API: Cleaned structured items
    end
    API-->>UI: Extracted items for review

    User->>UI: Confirm extracted items
    UI->>API: POST /ai/ocr-commit
    API->>Auth: get_current_user()
    Auth-->>API: Authenticated user
    API->>Inv: insert_many(normalized items)
    Inv-->>API: Items saved
    API-->>UI: Commit success

    User->>UI: Request recipe suggestions
    UI->>API: GET /ai/recipes-gemini
    API->>Auth: get_current_user()
    Auth-->>API: Authenticated user
    API->>Inv: find items by user_id
    Inv-->>API: Current inventory
    API->>Recipes: recommend_recipes_with_gemini(...)
    alt Gemini succeeds
        Recipes-->>API: Recipe recommendations
    else Gemini fails or quota is exhausted
        API->>Recipes: build_local_recipe_recommendations(...)
        Recipes-->>API: Local fallback recipes
    end
    API-->>UI: Recipes + at-risk items

    User->>UI: Add missing ingredients to shopping list
    loop For each missing ingredient
        UI->>API: POST /shopping-list
        API->>Auth: get_current_user()
        Auth-->>API: Authenticated user
        API->>Shop: find existing item by name_key
        alt Item already exists
            API->>Shop: update quantity and notes
            Shop-->>API: Merged item
            API-->>UI: action = merged
        else Item does not exist
            API->>Shop: insert new shopping item
            Shop-->>API: Created item
            API-->>UI: action = created
        end
    end
```

## Activity Diagram

The activity diagram below shows the main pantry-management workflow supported by the current system.

```mermaid
flowchart TD
    A([Start]) --> B[User opens SmartPantry]
    B --> C{Authenticated?}

    C -- No --> D[Sign up or log in]
    D --> E[Backend validates OTP or password]
    E --> F[JWT token issued]
    F --> G[Load user profile and pantry dashboard]

    C -- Yes --> G

    G --> H{Choose action}

    H --> I[Add item manually]
    I --> J[POST /inventory]
    J --> K[Normalize category and expiry]
    K --> L[Save item in inventory]
    L --> G

    H --> M[Quick add with voice or text]
    M --> N[POST /ai/quick-add]
    N --> O{Gemini parse works?}
    O -- Yes --> P[Build structured items]
    O -- No --> Q[Use local NLP parser]
    P --> R[Normalize and save items]
    Q --> R
    R --> G

    H --> S[Scan barcode]
    S --> T[POST /ai/barcode-lookup]
    T --> U[Fetch product from Open Food Facts]
    U --> V[Estimate category and expiry]
    V --> W[Autofill item form]
    W --> I

    H --> X[Upload receipt]
    X --> Y[POST /ai/ocr-receipt]
    Y --> Z[Run Tesseract OCR]
    Z --> AA{Need Gemini cleanup?}
    AA -- Yes --> AB[Clean OCR text with Gemini]
    AA -- No --> AC[Keep local OCR results]
    AB --> AD[Review extracted items]
    AC --> AD
    AD --> AE{User confirms items?}
    AE -- Yes --> AF[POST /ai/ocr-commit]
    AF --> AG[Save extracted items to inventory]
    AG --> G
    AE -- No --> G

    H --> AH[Get recipe suggestions]
    AH --> AI[GET /ai/recipes-gemini]
    AI --> AJ[Read inventory and profile preferences]
    AJ --> AK{Gemini available?}
    AK -- Yes --> AL[Generate personalized recipes]
    AK -- No --> AM[Use local recipe matching]
    AL --> AN[Show recipes and at-risk items]
    AM --> AN
    AN --> AO{Missing ingredients?}
    AO -- Yes --> AP[Add missing items to shopping list]
    AP --> AQ[Merge or create shopping entries]
    AQ --> G
    AO -- No --> G

    H --> AR[Manage shopping list]
    AR --> AS[Create, update, mark bought, or delete]
    AS --> AT[Persist shopping list changes]
    AT --> G

    G --> AU{Logout?}
    AU -- No --> H
    AU -- Yes --> AV([End])
```
