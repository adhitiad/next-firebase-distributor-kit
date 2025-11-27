flowchart TD
    User[User] --> Auth[Login or Register]
    Auth --> Middleware[Auth Middleware]
    Middleware --> Dashboard[Dashboard]
    Dashboard --> Price[Price Scheme CRUD]
    Dashboard --> POS[POS Cart]
    Dashboard --> ImportExport[Bulk Import Export]
    Price --> FetchSchemes[Fetch Schemes via API]
    POS --> Zustand[Manage Cart State via Zustand]
    POS --> Offline[Offline Storage IndexedDB]
    Zustand --> Sync[Sync Cart with Backend]
    ImportExport --> CSV[Upload Download CSV]
    CSV --> API
    FetchSchemes --> API
    Sync --> API
    API[Express Backend] --> DB[MongoDB via Prisma]
    API --> RealTime[SocketIO RealTime]
    API --> Worker[Background Jobs via BullMQ]
    Worker --> Redis[Redis Queue]